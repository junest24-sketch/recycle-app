// useSupabaseSync.js
// Hook สำหรับ sync ข้อมูลกับ Supabase แบบ Real-time
// ใช้ key-value store ใน table app_data

import { useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseReady } from './supabase'

/**
 * บันทึกข้อมูลไปยัง Supabase
 */
export async function saveToSupabase(key, value) {
  if (!isSupabaseReady) return
  await supabase
    .from('app_data')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

/**
 * โหลดข้อมูลจาก Supabase ทั้งหมด
 */
export async function loadAllFromSupabase() {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase.from('app_data').select('key, value')
  if (error || !data) return null
  const result = {}
  data.forEach(row => { result[row.key] = row.value })
  return result
}

/**
 * Hook: sync state กับ Supabase + real-time listener
 * @param {string} key - ชื่อ key ใน app_data
 * @param {any} value - ค่าปัจจุบัน (state)
 * @param {function} setValue - setter ของ state
 * @param {boolean} loaded - โหลดข้อมูลแรกแล้วหรือยัง
 */
export function useSupabaseSync(key, value, setValue, loaded) {
  const saveTimer = useRef(null)
  const isFirstRender = useRef(true)

  // Auto-save เมื่อ value เปลี่ยน (debounce 1.5 วินาที)
  useEffect(() => {
    if (!loaded || !isSupabaseReady) return
    if (isFirstRender.current) { isFirstRender.current = false; return }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToSupabase(key, value)
    }, 1500)
    return () => clearTimeout(saveTimer.current)
  }, [key, value, loaded])

  // Real-time listener: รับการเปลี่ยนแปลงจากอุปกรณ์อื่น
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
