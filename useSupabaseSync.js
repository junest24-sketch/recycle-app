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

// --- Merge arrays by id: รวม local + remote โดยไม่ให้บิลซ้ำ ---
// กฎ:
//   1. local เป็น source of truth สำหรับรายการที่ local มีอยู่แล้ว (ใช้ค่า local ทับ remote เสมอ)
//   2. รายการที่ remote มีแต่ local ไม่มี → เพิ่มเข้า local (sync จากเครื่องอื่น)
//   3. ถ้า array ไม่มี id field → ใช้ remote ทั้งก้อน (fallback สำหรับ primitive arrays)
function mergeArrays(localArr, remoteArr) {
  if (!Array.isArray(localArr) || !Array.isArray(remoteArr)) return remoteArr

  const hasId = (item) => item && typeof item === 'object' && 'id' in item
  if (!localArr.every(hasId) || !remoteArr.every(hasId)) return remoteArr

  const localById = new Map(localArr.map(item => [item.id, item]))
  const remoteById = new Map(remoteArr.map(item => [item.id, item]))

  // รายการที่ local มี → ใช้ local เสมอ (local เป็น truth สำหรับรายการที่มีอยู่แล้ว)
  // รายการที่ remote มีแต่ local ไม่มี → เพิ่มจาก remote (บิลที่เครื่องอื่นบันทึก)
  const merged = [...localArr]
  for (const [id, remoteItem] of remoteById) {
    if (!localById.has(id)) {
      merged.push(remoteItem)
    }
  }

  return merged
}

export function useSupabaseSync(key, value, setValue, loaded) {
  const saveTimer = useRef(null)
  const maxWaitTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const lastSaveTime = useRef(0)

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

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 2000)

    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(doSave, 5000)
    }

    return () => clearTimeout(saveTimer.current)
  }, [key, value, loaded])

  // --- Polling ดึงข้อมูลจาก Supabase กลับมา พร้อม merge by id ---
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const interval = setInterval(async () => {
      // ข้ามถ้ากำลัง save อยู่ หรือเพิ่ง save ไปไม่ถึง 15 วิ
      if (isSaving.current || Date.now() - lastSaveTime.current < 15000) return

      const { data, error } = await supabase.from('app_data')
        .select('value, updated_at')
        .eq('key', key)
        .single()
      if (error || !data) return

      const remoteValue = data.value

      // ถ้าทั้งสองฝั่งเป็น array ให้ merge by id แทนการเปรียบ length
      if (Array.isArray(remoteValue) && Array.isArray(value)) {
        const merged = mergeArrays(value, remoteValue)
        // อัปเดตเฉพาะถ้า merged มีรายการใหม่จาก remote
        if (merged.length > value.length) {
          setValue(merged)
          // save merged กลับขึ้น Supabase เพื่อให้เครื่องอื่น poll ได้ครบ
          saveToSupabase(key, merged)
        }
        return
      }

      // non-array (object/primitive) → ใช้ remote ทับ local ตามเดิม
      setValue(remoteValue)
    }, 10000)

    return () => clearInterval(interval)
  }, [key, value, setValue, loaded])
}
