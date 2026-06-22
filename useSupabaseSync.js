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

// Merge arrays by id — เพิ่มรายการจาก remote ที่ local ไม่มี ไม่ทับรายการที่ local มีอยู่แล้ว
function mergeById(localArr, remoteArr) {
  if (!Array.isArray(localArr) || !Array.isArray(remoteArr)) return null
  const hasId = (x) => x && typeof x === 'object' && 'id' in x
  if (!localArr.every(hasId) || !remoteArr.every(hasId)) return null

  const localIds = new Set(localArr.map(x => x.id))
  const newFromRemote = remoteArr.filter(x => !localIds.has(x.id))
  if (newFromRemote.length === 0) return null // ไม่มีอะไรใหม่ ไม่ต้อง update

  return [...localArr, ...newFromRemote]
}

export function useSupabaseSync(key, value, setValue, loaded) {
  // ใช้ ref เก็บค่าล่าสุดเสมอ — แก้ปัญหา stale closure ใน setTimeout/setInterval
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
      // ใช้ valueRef.current ไม่ใช่ value เพื่อได้ค่าล่าสุดเสมอ
      saveToSupabase(key, valueRef.current).finally(() => {
        isSaving.current = false
      })
    }

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 1500)

    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(doSave, 4000)
    }

    return () => {
      clearTimeout(saveTimer.current)
    }
  }, [key, value, loaded])

  // ---------- POLL: ดึงข้อมูลจาก Supabase ทุก 12 วิ ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const poll = async () => {
      // ข้ามถ้ากำลัง save หรือเพิ่ง save ไปไม่ถึง 20 วิ (ป้องกัน poll ทับ save)
      if (isSaving.current || Date.now() - lastSaveTime.current < 20000) return

      const { data, error } = await supabase
        .from('app_data')
        .select('value, updated_at')
        .eq('key', key)
        .single()

      if (error || !data) return

      const remoteValue = data.value
      const localValue = valueRef.current // ค่าล่าสุดของ local

      if (Array.isArray(remoteValue) && Array.isArray(localValue)) {
        // ลอง merge — ถ้า remote มีรายการใหม่ที่ local ยังไม่มี เพิ่มเข้ามา
        const merged = mergeById(localValue, remoteValue)
        if (merged) {
          setValue(merged)
          // save merged กลับขึ้น Supabase ทันที เพื่อให้เครื่องอื่นได้ครบด้วย
          saveToSupabase(key, merged)
        }
        // ถ้า merged เป็น null = ไม่มีอะไรใหม่จาก remote ไม่ต้องทำอะไร
        return
      }

      // non-array: ใช้ remote ทับ local ก็ต่อเมื่อ local ไม่มีข้อมูล
      if (!localValue || (typeof localValue === 'object' && Object.keys(localValue).length === 0)) {
        setValue(remoteValue)
      }
    }

    const interval = setInterval(poll, 12000)
    return () => clearInterval(interval)
  }, [key, setValue, loaded])
}
