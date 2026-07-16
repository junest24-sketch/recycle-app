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
  depositRefunds: 'deposit_refunds',
  prepayments: 'prepayments',
  deliveries: 'deliveries',
  bankTransfers: 'bank_transfers',
  assets: 'assets',
  loans: 'loans',
  dividendPayments: 'dividend_payments',
  storeBankAccounts: 'store_bank_accounts',
  shareholders: 'shareholders',
}

// เปิด realtime ทุก table เพื่อให้ทุกอุปกรณ์เห็นข้อมูลตรงกันทันที
const REALTIME_TABLES = new Set(Object.values(ARRAY_TABLES))

// ไม่มี static tables แล้ว ทุก table ใช้ realtime
const STATIC_TABLES = new Set([])

const SETTINGS_KEYS = [
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ---------- Array table helpers ----------

// เพิ่ม retry: ถ้า batch ไหน error จะลองใหม่สูงสุด 3 ครั้งก่อนยอมแพ้
// (เดิม: error ปุ๊บ return false ทันที ไม่มีการลองใหม่ -> batch ที่เหลือไม่เคยถูกบันทึก)
async function saveArrayTable(tableName, items) {
  if (!isSupabaseReady || !Array.isArray(items) || items.length === 0) return true
  const rows = items.map(item => ({
    id: item.id,
    data: { ...item, _updated_by: DEVICE_ID },
    updated_at: new Date().toISOString(),
  }))
  const BATCH = 50
  const MAX_ATTEMPTS = 3
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    let lastError = null
    let ok = false
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' })
      if (!error) { ok = true; break }
      lastError = error
      if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt) // backoff แบบง่าย
    }
    if (!ok) {
      console.error(`saveArrayTable: บันทึก ${tableName} ล้มเหลวหลัง retry ${MAX_ATTEMPTS} ครั้ง`, lastError)
      return false // หยุดที่ batch นี้ แต่ batch ก่อนหน้าที่สำเร็จแล้วจะไม่ถูกย้อนกลับ
    }
  }
  return true
}

async function deleteArrayRow(tableName, id) {
  if (!isSupabaseReady) return true
  const { error } = await supabase.from(tableName).delete().eq('id', id)
  return !error
}

// สำคัญ: เดิมฟังก์ชันนี้ถ้า error/timeout จะ `break` เงียบๆ แล้วคืนข้อมูล "บางส่วน"
// ที่โหลดมาได้ ทำให้ผู้เรียก (โดยเฉพาะปุ่ม "โหลดข้อมูลล่าสุด") เอาข้อมูลไม่ครบไป
// set state ทับของเดิม แล้วระบบ sync ก็เข้าใจผิดว่าแถวที่หายไปคือถูกลบ แล้วไปลบ
// จริงใน Supabase — นี่คือสาเหตุหลักที่ทำให้ข้อมูลหาย
//
// ตอนนี้แก้เป็น: ถ้าโหลดหน้าไหนล้มเหลว จะ throw error ออกไปทันที ไม่คืนข้อมูลบางส่วน
// ผู้เรียกต้อง catch แล้ว "ไม่" เอาผลลัพธ์ไปทับ state เดิม
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

    let data, error
    try {
      const result = await Promise.race([
        query,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
      ])
      data = result.data
      error = result.error
    } catch (e) {
      error = e
    }

    if (error || !data) {
      // เดิม: break (คืนข้อมูลบางส่วนเงียบๆ) — ตอนนี้: throw เพื่อบังคับให้ผู้เรียกจัดการ
      throw new Error(`โหลดตาราง ${tableName} ไม่สำเร็จ (from=${from}): ${error?.message || error}`)
    }

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
// เดิม: ถ้าโหลด table ไหนพัง จะ catch แล้วเซ็ตเป็น [] เงียบๆ (ก็อันตรายพอกัน
// เพราะถ้าใครเอาไปใช้แบบ replace ทั้งก้อน จะเท่ากับลบข้อมูลทั้งตาราง)
// ตอนนี้: ถ้า table ไหนโหลดพัง จะไม่ใส่ key นั้นใน result เลย (แทนที่จะเป็น [])
// เพื่อให้โค้ดฝั่งเรียกรู้ชัดเจนว่า "ไม่มีข้อมูลใหม่มา" ไม่ใช่ "ข้อมูลว่างเปล่าจริงๆ"
// และไม่ควรเอาไปทับ state เดิมที่มีอยู่แล้ว
export async function loadAllFromSupabase(since = null) {
  if (!isSupabaseReady) return null
  const result = {}
  const failedTables = []
  await Promise.all(
    Object.entries(ARRAY_TABLES).map(async ([stateKey, tableName]) => {
      try {
        result[stateKey] = await loadArrayTable(tableName, since)
      } catch (e) {
        console.error(`Failed to load table ${tableName}, will NOT overwrite local data:`, e)
        failedTables.push(stateKey)
        // ไม่ตั้ง result[stateKey] เลย — ปล่อยให้ผู้เรียกเห็นว่า key นี้ไม่มีข้อมูลใหม่
      }
    })
  )
  if (!since) {
    await Promise.all(
      SETTINGS_KEYS.map(async (key) => {
        try {
          const val = await loadSettings(key)
          if (val !== null) result[key] = val
        } catch (e) {
          console.warn(`Failed to load setting ${key}:`, e)
        }
      })
    )
  }
  if (failedTables.length > 0) {
    result._failedTables = failedTables // flag ให้ฝั่งเรียกรู้ว่ามีตารางที่โหลดไม่สำเร็จ
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

// ---------- patchCustomerField ----------
// ใช้สำหรับแก้ "แค่บางฟิลด์" ของลูกค้า 1 คน (เช่น depositOpening, prepaymentOpening)
// โดยไม่เอา customers array ทั้งก้อนจาก local state ไปเขียนทับ
//
// เหตุผล: ลูกค้าแต่ละคนถูกเก็บเป็น 1 แถว JSON เดียวในตาราง customers ถ้าเขียนทับ
// ทั้งแถวโดยอิงจากสำเนาในเครื่องที่อาจไม่ทันสมัย (เช่น อีกอุปกรณ์เพิ่งแก้ไปหมาดๆ)
// ฟิลด์ที่อีกฝั่งเพิ่งตั้งไว้จะหายไปทันที ฟังก์ชันนี้จึงดึงแถวล่าสุดจาก Supabase มา
// merge เฉพาะฟิลด์ที่ต้องการเปลี่ยน แล้วเขียนกลับเฉพาะแถวนั้นแถวเดียว
export async function patchCustomerField(customerId, fieldsToMerge) {
  if (!isSupabaseReady || !customerId) return { ok: false }
  const { data: row, error: fetchErr } = await supabase
    .from('customers')
    .select('data')
    .eq('id', customerId)
    .single()
  if (fetchErr || !row) {
    console.error('patchCustomerField: ดึงข้อมูลลูกค้าล่าสุดไม่สำเร็จ', fetchErr)
    return { ok: false }
  }
  const merged = { ...row.data, ...fieldsToMerge, _updated_by: DEVICE_ID }
  const { error } = await supabase
    .from('customers')
    .upsert({ id: customerId, data: merged, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) {
    console.error('patchCustomerField: เขียนกลับไม่สำเร็จ', error)
    return { ok: false }
  }
  return { ok: true, customer: merged }
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
  const isRealtimeUpdate = useRef(false) // flag: value เปลี่ยนจาก realtime/reload ไม่ต้อง save กลับ

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

    // ถ้า value เปลี่ยนจาก realtime update หรือ manual reload → ไม่ต้อง save กลับ
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
