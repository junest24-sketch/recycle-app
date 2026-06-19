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
  const saveTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const lastSavedValue = useRef(null)  // ← เก็บค่าล่าสุดที่ save ไป

  useEffect(() => {
    if (!loaded || !isSupabaseReady) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      lastSavedValue.current = JSON.stringify(value)  // ← จำค่าตอนโหลด
      return
    }
    // ถ้าค่าไม่เปลี่ยนจากที่โหลดมา ไม่ต้อง save
    const serialized = JSON.stringify(value)
    if (serialized === lastSavedValue.current) return  // ← เพิ่ม
    clearTimeout(saveTimer.current)
    isSaving.current = true
    saveTimer.current = setTimeout(() => {
      saveToSupabase(key, value).finally(() => {
        lastSavedValue.current = serialized  // ← อัพเดทค่าล่าสุด
        isSaving.current = false
      })
    }, 1500)
    return () => clearTimeout(saveTimer.current)
  }, [key, value, loaded])

  useEffect(() => {
    if (!isSupabaseReady) return
    const channel = supabase
      .channel(`app_data_${key}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_data',
        filter: `key=eq.${key}`
      }, (payload) => {
        if (payload.new?.value !== undefined && loaded && !isSaving.current) {
          lastSavedValue.current = JSON.stringify(payload.new.value)  // ← อัพเดทด้วย
          setValue(payload.new.value)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [key, setValue, loaded])
}
