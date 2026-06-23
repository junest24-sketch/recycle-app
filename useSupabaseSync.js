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

// Merge: เพิ่มเฉพาะ record ใหม่จาก remote ที่ local ไม่มี
// ไม่ทับ record ที่ local มีอยู่แล้วในทุกกรณี — local เป็น truth เสมอ
function mergeNewOnly(localArr, remoteArr) {
  if (!Array.isArray(localArr) || !Array.isArray(remoteArr)) return null
  const hasId = (x) => x && typeof x === 'object' && 'id' in x
  if (!localArr.every(hasId) || !remoteArr.every(hasId)) return null

  const localIds = new Set(localArr.map(x => x.id))
  const newItems = remoteArr.filter(x => !localIds.has(x.id))

  if (newItems.length === 0) return null // ไม่มีอะไรใหม่
  return [...localArr, ...newItems]
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
      // ใช้ valueRef.current เพื่อได้ค่าล่าสุดเสมอ ไม่ใช่ค่าเก่าจาก closure
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

  // ---------- POLL: ดึงข้อมูลจาก Supabase ทุก 20 วิ ----------
  // เพิ่มเฉพาะ record ใหม่จากเครื่องอื่น ไม่ทับข้อมูล local เด็ดขาด
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const poll = async () => {
      // ข้ามถ้ากำลัง save หรือเพิ่ง save ไปไม่ถึง 30 วิ
      if (isSaving.current || Date.now() - lastSaveTime.current < 30000) return

      const { data, error } = await supabase
        .from('app_data')
        .select('value, updated_at')
        .eq('key', key)
        .single()

      if (error || !data) return

      const remoteValue = data.value
      const localValue = valueRef.current

      if (Array.isArray(remoteValue) && Array.isArray(localValue)) {
        // เพิ่มเฉพาะ record ใหม่จาก remote ที่ local ไม่มี
        const merged = mergeNewOnly(localValue, remoteValue)
        if (merged) {
          setValue(merged)
          // save merged กลับขึ้น Supabase เพื่อให้เครื่องอื่นได้ด้วย
          saveToSupabase(key, merged)
        }
        return
      }

      // non-array: ไม่ทับ local เลย — local เป็น truth เสมอ
    }

    const interval = setInterval(poll, 20000)
    return () => clearInterval(interval)
  }, [key, setValue, loaded])
}
