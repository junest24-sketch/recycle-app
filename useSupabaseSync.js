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

  useEffect(() => {
    if (!loaded || !isSupabaseReady) return
    if (isFirstRender.current) { isFirstRender.current = false; return }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToSupabase(key, value)
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
        if (payload.new?.value !== undefined && loaded) {
          setValue(payload.new.value)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [key, setValue, loaded])
}
