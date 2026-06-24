import { useEffect, useRef } from 'react'
import { supabase, isSupabaseReady } from './supabase'

export async function saveToSupabase(key, value) {
  if (!isSupabaseReady) return
  await supabase
    .from('app_data')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

export async function loadAllFromSupabase() {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase.from('app_data').select('key, value')
  if (error || !data) return null
  const result = {}
  data.forEach(row => { result[row.key] = row.value })
  return result
}

export function useSupabaseSync(key, value, setValue, loaded) {
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const saveTimer = useRef(null)
  const maxWaitTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const lastSaveTime = useRef(0)
  const isLoadingFromRemote = useRef(false)

  // ---------- SAVE ----------
  useEffect(() => {
    if (!loaded || !isSupabaseReady) return
    if (isFirstRender.current) { isFirstRender.current = false; return }

    const doSave = () => {
      clearTimeout(saveTimer.current)
      clearTimeout(maxWaitTimer.current)
      saveTimer.current = null
      maxWaitTimer.current = null
      isSaving.current = true
      lastSaveTime.current = Date.now()
      saveToSupabase(key, valueRef.current).finally(() => {
        isSaving.current = false
      })
    }

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 1500)
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(doSave, 4000)
    }

    return () => { clearTimeout(saveTimer.current) }
  }, [key, value, loaded])

  // ---------- REALTIME ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const channel = supabase
      .channel(`sync-${key}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_data', filter: `key=eq.${key}` },
        async () => {
          // ข้ามถ้ากำลัง save หรือเพิ่ง save ไปไม่ถึง 10 วิ
          if (isSaving.current || Date.now() - lastSaveTime.current < 10000) return
          // ข้ามถ้ากำลังโหลดจาก remote อยู่แล้ว
          if (isLoadingFromRemote.current) return

          isLoadingFromRemote.current = true
          const { data, error } = await supabase
            .from('app_data')
            .select('value')
            .eq('key', key)
            .single()

          isLoadingFromRemote.current = false
          if (error || !data) return

          const remoteValue = data.value
          const localValue = valueRef.current

          if (Array.isArray(remoteValue) && Array.isArray(localValue)) {
            // เพิ่มเฉพาะ record ใหม่จาก remote ที่ local ไม่มี
            // ไม่ทับ record ที่ local มีอยู่แล้ว — local เป็น truth
            const localIds = new Set(localValue.map(x => x.id).filter(Boolean))
            const newItems = remoteValue.filter(x => x.id && !localIds.has(x.id))
            if (newItems.length > 0) {
              setValue([...localValue, ...newItems])
            }
            return
          }

          // non-array: ใช้ remote เฉพาะถ้า local ว่างอยู่
          if (!localValue || (typeof localValue === 'object' && Object.keys(localValue).length === 0)) {
            setValue(remoteValue)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [key, setValue, loaded])
}
