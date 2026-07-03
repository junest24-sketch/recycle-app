import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseReady } from './supabase'

const DEVICE_ID = Math.random().toString(36).slice(2)

const ARRAY_TABLES = {
  purchases: 'purchases',
  sales: 'sales',
  customers: 'customers',
  expenses: 'expenses',
  withdrawals: 'withdrawals',
  deposits: 'deposits',
  prepayments: 'prepayments',
  deliveries: 'deliveries',
  bankTransfers: 'bank_transfers',
  assets: 'assets',
  loans: 'loans',
  dividendPayments: 'dividend_payments',
  storeBankAccounts: 'store_bank_accounts',
  shareholders: 'shareholders',
}

// table ที่เปิด realtime (คนหลายคนใช้พร้อมกัน / แดชบอร์ดใช้)
const REALTIME_TABLES = new Set([
  'purchases', 'sales', 'expenses', 'withdrawals', 'store_bank_accounts', 'loans',
])

// table ที่ปิด realtime (ไม่ค่อยเปลี่ยน — ใช้ auto-refresh แทน)
const STATIC_TABLES = new Set([
  'customers', 'assets', 'shareholders', 'bank_transfers',
  'deposits', 'prepayments', 'deliveries', 'dividend_payments',
])
  'shopProfile', 'companySettings', 'unitOptions',
  'expenseCategories', 'productCategories',
]

// ---------- Global sync status ----------
let globalStatus = 'synced'
let pendingCount = 0
const statusListeners = new Set()

function setGlobalStatus(status) {
  globalStatus = status
  statusListeners.forEach(fn => fn(status))
}

function incrementPending() {
  pendingCount++
  setGlobalStatus('saving')
}

function decrementPending(success) {
  pendingCount = Math.max(0, pendingCount - 1)
  if (pendingCount === 0) {
    setGlobalStatus(success ? 'synced' : 'error')
  }
}

export function useSyncStatus() {
  const [status, setStatus] = useState(globalStatus)
  useEffect(() => {
    statusListeners.add(setStatus)
    return () => statusListeners.delete(setStatus)
  }, [])
  return status
}

// ---------- Array table helpers ----------
async function saveArrayTable(tableName, items) {
  if (!isSupabaseReady || !Array.isArray(items) || items.length === 0) return true
  const rows = items.map(item => ({
    id: item.id,
    data: { ...item, _updated_by: DEVICE_ID },
    updated_at: new Date().toISOString(),
  }))
  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' })
    if (error) return false
  }
  return true
}

async function deleteArrayRow(tableName, id) {
  if (!isSupabaseReady) return true
  const { error } = await supabase.from(tableName).delete().eq('id', id)
  return !error
}

async function loadArrayTable(tableName, since = null) {
  if (!isSupabaseReady) return []
  const PAGE = 1000
  let all = []
  let from = 0
  while (true) {
    let query = supabase
      .from(tableName)
      .select('data, id')
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (since) query = query.gt('updated_at', since)
    const { data, error } = await query
    if (error || !data) break
    all = all.concat(data.map(row => row.data))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// ---------- Settings helpers ----------
async function saveSettings(key, value) {
  if (!isSupabaseReady) return true
  const { error } = await supabase.from('app_settings').upsert(
    { key, data: { value, _updated_by: DEVICE_ID }, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  return !error
}

async function loadSettings(key) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('app_settings')
    .select('data')
    .eq('key', key)
    .single()
  if (error || !data) return null
  return data.data?.value ?? null
}

// ---------- loadAllFromSupabase ----------
export async function loadAllFromSupabase(since = null) {
  if (!isSupabaseReady) return null
  const result = {}
  await Promise.all(
    Object.entries(ARRAY_TABLES).map(async ([stateKey, tableName]) => {
      result[stateKey] = await loadArrayTable(tableName, since)
    })
  )
  // settings โหลดทั้งหมดเสมอ (ข้อมูลเล็กมาก)
  if (!since) {
    await Promise.all(
      SETTINGS_KEYS.map(async (key) => {
        const val = await loadSettings(key)
        if (val !== null) result[key] = val
      })
    )
  }
  return result
}

// ---------- saveToSupabase (เรียกตรงๆ สำหรับกรณีพิเศษ) ----------
export async function saveToSupabase(key, items) {
  const tableName = ARRAY_TABLES[key]
  // เคลียร์ cache เมื่อมีการบันทึก เพื่อให้โหลดใหม่จาก Supabase ครั้งถัดไป
  try { localStorage.removeItem('app_cache_v1') } catch (e) {}
  if (tableName) return await saveArrayTable(tableName, items)
  if (SETTINGS_KEYS.includes(key)) return await saveSettings(key, items)
}

// ---------- useSupabaseSync ----------
export function useSupabaseSync(key, value, setValue, loaded) {
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const prevValueRef = useRef(null)
  const saveTimer = useRef(null)
  const maxWaitTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const isRealtimeUpdate = useRef(false) // flag: value เปลี่ยนจาก realtime ไม่ต้อง save กลับ

  const tableName = ARRAY_TABLES[key]
  const isArrayTable = !!tableName
  const isSettingsKey = SETTINGS_KEYS.includes(key)

  // ---------- SAVE ----------
  useEffect(() => {
    if (!loaded || !isSupabaseReady) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevValueRef.current = value
      return
    }

    // ถ้า value เปลี่ยนจาก realtime update → ไม่ต้อง save กลับ
    if (isRealtimeUpdate.current) {
      isRealtimeUpdate.current = false
      prevValueRef.current = value
      return
    }

    const doSave = async () => {
      clearTimeout(saveTimer.current)
      clearTimeout(maxWaitTimer.current)
      saveTimer.current = null
      maxWaitTimer.current = null
      isSaving.current = true

      incrementPending()
      let success = false
      try {
        if (isArrayTable) {
          const current = valueRef.current
          const prev = prevValueRef.current || []
          const prevMap = new Map(prev.filter(x => x.id).map(x => [x.id, JSON.stringify(x)]))
          const changed = current.filter(item => {
            if (!item.id) return true
            return prevMap.get(item.id) !== JSON.stringify(item)
          })
          const currentIds = new Set(current.filter(x => x.id).map(x => x.id))
          const deleted = prev.filter(x => x.id && !currentIds.has(x.id))

          let ok = true
          if (changed.length > 0) ok = await saveArrayTable(tableName, changed)
          for (const item of deleted) {
            const r = await deleteArrayRow(tableName, item.id)
            if (!r) ok = false
          }
          success = ok
          prevValueRef.current = [...current]
          if (ok) try { localStorage.removeItem('app_cache_v1') } catch (e) {}
        } else if (isSettingsKey) {
          success = await saveSettings(key, valueRef.current)
          prevValueRef.current = valueRef.current
        }
      } catch (e) {
        success = false
      } finally {
        isSaving.current = false
        decrementPending(success)
      }
    }

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 2000)
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(doSave, 6000)
    }

    return () => {
      clearTimeout(saveTimer.current)
      clearTimeout(maxWaitTimer.current)
    }
  }, [key, value, loaded])

  // ---------- REALTIME (เฉพาะ table ที่กำหนด) ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return
    // ปิด realtime สำหรับ table ที่อยู่ใน STATIC_TABLES
    if (isArrayTable && !REALTIME_TABLES.has(tableName)) return

    if (isArrayTable) {
      const channel = supabase
        .channel(`rt-${tableName}-${DEVICE_ID}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, (payload) => {
          const item = payload.new?.data
          if (!item || item._updated_by === DEVICE_ID) return
          isRealtimeUpdate.current = true
          setValue(prev => {
            if (prev.some(x => x.id === item.id)) return prev
            return [...prev, item]
          })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, (payload) => {
          const item = payload.new?.data
          if (!item || item._updated_by === DEVICE_ID) return
          isRealtimeUpdate.current = true
          setValue(prev => prev.map(x => x.id === item.id ? item : x))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, (payload) => {
          const id = payload.old?.id
          if (!id) return
          isRealtimeUpdate.current = true
          setValue(prev => prev.filter(x => x.id !== id))
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }

    if (isSettingsKey) {
      const channel = supabase
        .channel(`rt-settings-${key}-${DEVICE_ID}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: `key=eq.${key}` }, (payload) => {
          const updatedBy = payload.new?.data?._updated_by
          if (updatedBy === DEVICE_ID) return
          const newValue = payload.new?.data?.value
          if (newValue !== undefined) {
            isRealtimeUpdate.current = true
            setValue(newValue)
          }
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [key, setValue, loaded, tableName, isArrayTable, isSettingsKey])
}
