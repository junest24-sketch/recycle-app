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

  // ---------- SAVE: debounce 1.5 วิ บังคับ save ภายใน 4 วิ ----------
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

  // ---------- REALTIME: รับการเปลี่ยนแปลงจากเครื่องอื่นทันที ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const channel = supabase
      .channel(`sync-${key}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_data', filter: `key=eq.${key}` },
        async (payload) => {
          // ข้ามถ้าเครื่องนี้เพิ่ง save ไปเอง (ไม่ต้องโหลดกลับมาทับ)
          if (isSaving.current || Date.now() - lastSaveTime.current < 5000) return

          // โหลด key นี้ใหม่จาก Supabase — ได้ข้อมูลหลัง save เสร็จแน่นอน
          const { data, error } = await supabase
            .from('app_data')
            .select('value')
            .eq('key', key)
            .single()

          if (error || !data) return

          const remoteValue = data.value
          const localValue = valueRef.current

          if (Array.isArray(remoteValue) && Array.isArray(localValue)) {
            // เพิ่มเฉพาะ record ใหม่จาก remote ที่ local ไม่มี
            // (ป้องกันกรณีที่ 2 เครื่องแก้ record เดิมพร้อมกัน — local ยังเป็น truth)
            const localIds = new Set(localValue.map(x => x.id))
            const newItems = remoteValue.filter(x => x.id && !localIds.has(x.id))
            
            // อัปเดต record ที่มีอยู่แล้วถ้า remote ใหม่กว่า (updated_at)
            const updatedLocal = localValue.map(localItem => {
              const remoteItem = remoteValue.find(r => r.id === localItem.id)
              if (!remoteItem) return localItem
              const localTime = localItem.updated_at || ''
              const remoteTime = remoteItem.updated_at || ''
              // ใช้ remote เฉพาะถ้า remote มี updated_at และใหม่กว่า local อย่างชัดเจน
              if (remoteTime && remoteTime > localTime) return remoteItem
              return localItem
            })

            const merged = [...updatedLocal, ...newItems]
            const hasChanges = newItems.length > 0 || 
              updatedLocal.some((item, i) => item !== localValue[i])
            
            if (hasChanges) setValue(merged)
            return
          }

          // non-array: ใช้ remote (settings, companyProfile ฯลฯ)
          setValue(remoteValue)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [key, setValue, loaded])
}
