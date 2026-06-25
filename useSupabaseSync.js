import { useEffect, useRef } from 'react'
import { supabase, isSupabaseReady } from './supabase'

// ID ของเครื่องนี้ — ใช้แยกแยะว่า event มาจากเครื่องเราเองหรือเครื่องอื่น
const DEVICE_ID = Math.random().toString(36).slice(2)

export async function saveToSupabase(key, value) {
  if (!isSupabaseReady) return
  await supabase
    .from('app_data')
    .upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: DEVICE_ID },
      { onConflict: 'key' }
    )
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

  // ---------- SAVE (debounce 2s, max wait 6s) ----------
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
    saveTimer.current = setTimeout(doSave, 2000)
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(doSave, 6000)
    }

    return () => {
      clearTimeout(saveTimer.current)
      clearTimeout(maxWaitTimer.current)
    }
  }, [key, value, loaded])

  // ---------- REALTIME ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const channel = supabase
      .channel(`sync-${key}-${DEVICE_ID}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_data', filter: `key=eq.${key}` },
        async (payload) => {
          // ข้ามถ้า event มาจากเครื่องเราเอง
          const updatedBy = payload.new?.updated_by
          if (updatedBy === DEVICE_ID) return

          // ข้ามถ้ากำลัง save หรือกำลังโหลด
          if (isSaving.current || isLoadingFromRemote.current) return

          // ข้ามถ้าเพิ่ง save ไปไม่ถึง 3 วิ (ป้องกัน echo จากเครื่องอื่นที่ไม่มี updated_by)
          if (Date.now() - lastSaveTime.current < 3000) return

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
            // merge: รับทุก record จาก remote แทนที่ local ด้วย version ล่าสุด
            // local record ที่ไม่มีใน remote ให้คงไว้ (อาจกำลัง save อยู่)
            const remoteMap = new Map(remoteValue.filter(x => x.id).map(x => [x.id, x]))
            const merged = localValue.map(x => remoteMap.has(x.id) ? remoteMap.get(x.id) : x)
            // เพิ่ม record ใหม่จาก remote ที่ local ไม่มี
            const localIds = new Set(localValue.map(x => x.id).filter(Boolean))
            const newItems = remoteValue.filter(x => x.id && !localIds.has(x.id))
            if (newItems.length > 0 || merged.some((m, i) => m !== localValue[i])) {
              setValue([...merged, ...newItems])
            }
            return
          }

          // non-array (object เช่น companySettings, shopProfile)
          // รับค่า remote เสมอ เพราะ updated_by ยืนยันแล้วว่าไม่ใช่เครื่องเรา
          if (JSON.stringify(remoteValue) !== JSON.stringify(localValue)) {
            setValue(remoteValue)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [key, setValue, loaded])
}
