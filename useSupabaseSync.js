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
function mergeArrays(localArr, remoteArr) {
  if (!Array.isArray(localArr) || !Array.isArray(remoteArr)) return remoteArr
  const hasId = (item) => item && typeof item === 'object' && 'id' in item
  if (!localArr.every(hasId) || !remoteArr.every(hasId)) return remoteArr
  const localById = new Map(localArr.map(item => [item.id, item]))
  const remoteById = new Map(remoteArr.map(item => [item.id, item]))
  const merged = [...localArr]
  for (const [id, remoteItem] of remoteById) {
    if (!localById.has(id)) merged.push(remoteItem)
  }
  return merged
}

export function useSupabaseSync(key, value, setValue, loaded) {
  const saveTimer = useRef(null)
  const maxWaitTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const lastSaveTime = useRef(0)

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

  useEffect(() => {
    if (!isSupabaseReady || !loaded) return
    const interval = setInterval(async () => {
      if (isSaving.current || Date.now() - lastSaveTime.current < 15000) return
      const { data, error } = await supabase.from('app_data')
        .select('value, updated_at')
        .eq('key', key)
        .single()
      if (error || !data) return
      const remoteValue = data.value
      if (Array.isArray(remoteValue) && Array.isArray(value)) {
        const merged = mergeArrays(value, remoteValue)
        if (merged.length > value.length) {
          setValue(merged)
          saveToSupabase(key, merged)
        }
        return
      }
      setValue(remoteValue)
    }, 10000)
    return () => clearInterval(interval)
  }, [key, value, setValue, loaded])
}
