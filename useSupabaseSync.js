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

// Merge สองฝั่งโดยใช้ updated_at ต่อ item:
// - ถ้า local มี item นั้น และ remote ใหม่กว่า (updated_at มากกว่า) → ใช้ remote
// - ถ้า local ใหม่กว่าหรือเท่ากัน → ใช้ local (ไม่ทับ)
// - ถ้า remote มี item ที่ local ไม่มีเลย → เพิ่มเข้ามา
function mergeByIdAndTime(localArr, remoteArr) {
  if (!Array.isArray(localArr) || !Array.isArray(remoteArr)) return null
  const hasId = (x) => x && typeof x === 'object' && 'id' in x
  if (!localArr.every(hasId) || !remoteArr.every(hasId)) return null

  const localById = new Map(localArr.map(x => [x.id, x]))
  const remoteById = new Map(remoteArr.map(x => [x.id, x]))

  let changed = false
  const result = localArr.map(localItem => {
    const remoteItem = remoteById.get(localItem.id)
    if (!remoteItem) return localItem // local เท่านั้น → ใช้ local

    // เปรียบ updated_at — remote ใหม่กว่า → ใช้ remote
    const localTime = localItem.updated_at || localItem.date || ''
    const remoteTime = remoteItem.updated_at || remoteItem.date || ''
    if (remoteTime > localTime) {
      changed = true
      return remoteItem
    }
    return localItem // local ใหม่กว่าหรือเท่ากัน → ใช้ local
  })

  // เพิ่มรายการที่ remote มีแต่ local ไม่มี
  for (const [id, remoteItem] of remoteById) {
    if (!localById.has(id)) {
      result.push(remoteItem)
      changed = true
    }
  }

  return changed ? result : null
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

  // ---------- POLL: ดึงข้อมูลจาก Supabase ทุก 15 วิ ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    const poll = async () => {
      if (isSaving.current || Date.now() - lastSaveTime.current < 20000) return

      const { data, error } = await supabase
        .from('app_data')
        .select('value, updated_at')
        .eq('key', key)
        .single()

      if (error || !data) return

      const remoteValue = data.value
      const localValue = valueRef.current

      if (Array.isArray(remoteValue) && Array.isArray(localValue)) {
        const merged = mergeByIdAndTime(localValue, remoteValue)
        if (merged) {
          setValue(merged)
          saveToSupabase(key, merged)
        }
        return
      }

      // non-array: ไม่ทับ local เด็ดขาด (settings ฯลฯ local เป็น truth)
    }

    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [key, setValue, loaded])
}
