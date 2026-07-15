import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export const isSupabaseReady = !!supabase

// ---------- Storage: อัปโหลดรูปภาพ (เช่น บัตรประชาชนลูกค้า) ----------
// เก็บไฟล์จริงใน Supabase Storage แทนการฝัง base64 ในตาราง
// เพื่อไม่ให้แถวข้อมูลบวมจนโหลด/query ช้าหรือ timeout
const ID_CARD_BUCKET = 'id-cards'

export async function uploadIdCardImage(file, customerId) {
  if (!isSupabaseReady || !file) return null
  const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'jpg'
  const path = `${customerId || 'temp'}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(ID_CARD_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) {
    console.warn('อัปโหลดรูปบัตรประชาชนล้มเหลว:', error)
    return null
  }
  const { data } = supabase.storage.from(ID_CARD_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

// ลบไฟล์เก่าออกจาก storage (best-effort, ไม่ต้องรอผลลัพธ์)
export function deleteIdCardImageByUrl(url) {
  if (!isSupabaseReady || !url || !url.includes(`/${ID_CARD_BUCKET}/`)) return
  try {
    const path = url.split(`/${ID_CARD_BUCKET}/`)[1]
    if (path) supabase.storage.from(ID_CARD_BUCKET).remove([decodeURIComponent(path)])
  } catch (e) { /* ignore */ }
}
