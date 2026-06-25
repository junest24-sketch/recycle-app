import { useEffect, useRef } from 'react'
import { supabase, isSupabaseReady } from './supabase'

const DEVICE_ID = Math.random().toString(36).slice(2)

// ตาราง state ที่เป็น array of objects (มี id) -> เก็บแยก row
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

// state ที่เป็น object/array ธรรมดา -> เก็บใน app_settings
const SETTINGS_KEYS = [
  'shopProfile', 'companySettings', 'unitOptions',
  'expenseCategories', 'productCategories',
]

// ---------- ARRAY TABLE: upsert เฉพาะ record ที่เปลี่ยน ----------
async function saveArrayTable(tableName, items) {
  if (!isSupabaseReady || !Array.isArray(items)) return
  if (items.length === 0) return

  const rows = items.map(item => ({
    id: item.id,
    data: { ...item, _updated_by: DEVICE_ID },
    updated_at: new Date().toISOString(),
  }))

  await supabase.from(tableName).upsert(rows, { onConflict: 'id' })
}

async function deleteArrayRow(tableName, id) {
  if (!isSupabaseReady) return
  await supabase.from(tableName).delete().eq('id', id)
}

async function loadArrayTable(tableName) {
  if (!isSupabaseReady) return []
  const { data, error } = await supabase
    .from(tableName)
    .select('data')
    .order('updated_at', { ascending: true })
  if (error || !data) return []
  return data.map(row => row.data)
}

// ---------- SETTINGS: upsert ทั้งก้อน (ข้อมูลเล็ก) ----------
async function saveSettings(key, value) {
  if (!isSupabaseReady) return
  await supabase.from('app_settings').upsert(
    { key, data: { value, _updated_by: DEVICE_ID }, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
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

// ---------- loadAllFromSupabase (โหลดครั้งแรก) ----------
export async function loadAllFromSupabase() {
  if (!isSupabaseReady) return null
  const result = {}

  // โหลด array tables
  await Promise.all(
    Object.entries(ARRAY_TABLES).map(async ([stateKey, tableName]) => {
      result[stateKey] = await loadArrayTable(tableName)
    })
  )

  // โหลด settings
  await Promise.all(
    SETTINGS_KEYS.map(async (key) => {
      const val = await loadSettings(key)
      if (val !== null) result[key] = val
    })
  )

  return result
}

// ---------- saveToSupabase (ใช้กับปุ่มโหลดข้อมูลล่าสุด) ----------
export async function saveToSupabase(key, value) {
  const tableName = ARRAY_TABLES[key]
  if (tableName) {
    await saveArrayTable(tableName, value)
  } else if (SETTINGS_KEYS.includes(key)) {
    await saveSettings(key, value)
  }
}

// ---------- useSupabaseSync hook ----------
export function useSupabaseSync(key, value, setValue, loaded) {
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const prevValueRef = useRef(null)
  const saveTimer = useRef(null)
  const maxWaitTimer = useRef(null)
  const isFirstRender = useRef(true)
  const isSaving = useRef(false)
  const lastSaveTime = useRef(0)
  const isLoadingFromRemote = useRef(false)

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

    const doSave = async () => {
      clearTimeout(saveTimer.current)
      clearTimeout(maxWaitTimer.current)
      saveTimer.current = null
      maxWaitTimer.current = null
      isSaving.current = true
      lastSaveTime.current = Date.now()

      try {
        if (isArrayTable) {
          const current = valueRef.current
          const prev = prevValueRef.current || []

          // หา record ที่เพิ่มหรือเปลี่ยน
          const prevMap = new Map((prev).filter(x => x.id).map(x => [x.id, JSON.stringify(x)]))
          const changed = current.filter(item => {
            if (!item.id) return true
            return prevMap.get(item.id) !== JSON.stringify(item)
          })

          // หา record ที่ถูกลบ
          const currentIds = new Set(current.filter(x => x.id).map(x => x.id))
          const deleted = (prev).filter(x => x.id && !currentIds.has(x.id))

          if (changed.length > 0) {
            await saveArrayTable(tableName, changed)
          }
          for (const item of deleted) {
            await deleteArrayRow(tableName, item.id)
          }

          prevValueRef.current = [...current]
        } else if (isSettingsKey) {
          await saveSettings(key, valueRef.current)
          prevValueRef.current = valueRef.current
        }
      } finally {
        isSaving.current = false
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

  // ---------- REALTIME ----------
  useEffect(() => {
    if (!isSupabaseReady || !loaded) return

    if (isArrayTable) {
      const channel = supabase
        .channel(`rt-${tableName}-${DEVICE_ID}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, (payload) => {
          const item = payload.new?.data
          if (!item || item._updated_by === DEVICE_ID) return
          setValue(prev => {
            if (prev.some(x => x.id === item.id)) return prev
            return [...prev, item]
          })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, (payload) => {
          const item = payload.new?.data
          if (!item || item._updated_by === DEVICE_ID) return
          setValue(prev => prev.map(x => x.id === item.id ? item : x))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, (payload) => {
          const id = payload.old?.id
          if (!id) return
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
          if (newValue !== undefined) setValue(newValue)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [key, setValue, loaded, tableName, isArrayTable, isSettingsKey])
}
