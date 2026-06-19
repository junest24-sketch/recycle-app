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

  // Auto-save เมื่อ value เปลี่ยน
  useEffect(() => {
    if (!loaded || !isSupabaseReady) return
    if (isFirstRender.current) { isFirstRender.current = false; return }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      isSaving.current = true
      saveToSupabase(key, value).finally(() => {
        isSaving.current = false
      })
    }, 2000)
    return () => clearTimeout(saveTimer.current)
  }, [key, value, loaded])

  // Polling: โหลดข้อมูลใหม่ทุก 10 วินาที
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return
    const interval = setInterval(async () => {
      if (isSaving.current) return // ถ้ากำลัง save อยู่ ข้ามรอบนี้ไป
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', key)
        .single()
      if (!error && data) {
        setValue(data.value)
      }
    }, 5000) // ทุก 5 วินาที
    return () => clearInterval(interval)
  }, [key, setValue, loaded])
}
