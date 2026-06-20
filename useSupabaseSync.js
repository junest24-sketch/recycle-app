import { useEffect, useRef } from 'react'
import { supabase, isSupabaseReady } from './supabase'

export async function saveToSupabase(key, value) {
  if (!isSupabaseReady) return
  await supabase.from('app_data').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
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
  const maxWaitTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const lastSaveTime = useRef(0)
  const lastChangeTime = useRef(0)

  // --- บันทึกขึ้น Supabase (debounce 2 วิ + บังคับ save ทุก 5 วิ แม้พิมพ์ต่อเนื่อง) ---
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
      saveToSupabase(key, value).finally(() => { isSaving.current = false })
    }

    lastChangeTime.current = Date.now()
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 2000)

    // ถ้ายังไม่มี max-wait timer ทำงานอยู่ ให้ตั้งใหม่
    // เพื่อบังคับ save อย่างน้อยทุก 5 วิ แม้ค่าจะเปลี่ยนรัวๆ จน debounce ถูก reset ตลอด
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(doSave, 5000)
    }

    return () => clearTimeout(saveTimer.current)
  }, [key, value, loaded])

  // --- Polling ดึงข้อมูลจาก Supabase กลับมา (กันข้อมูลเก่ากว่าทับข้อมูลใหม่กว่า) ---
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return
    const interval = setInterval(async () => {
      if (isSaving.current || Date.now() - lastSaveTime.current < 30000) return
      const { data, error } = await supabase.from('app_data').select('value').eq('key', key).single()
      if (error || !data) return

      // กันทับ: ถ้าทั้งสองฝั่งเป็น array และฝั่ง Supabase มีรายการน้อยกว่าฝั่งเครื่อง
      // แปลว่า Supabase อาจมีข้อมูลเก่ากว่า/ไม่ครบ -> ไม่ทับ
      if (Array.isArray(data.value) && Array.isArray(value) && data.value.length < value.length) {
        return
      }

      setValue(data.value)
    }, 10000)
    return () => clearInterval(interval)
  }, [key, value, setValue, loaded])
}
