// scripts/migrate-id-cards.mjs
//
// สคริปต์นี้รันครั้งเดียว (one-off) เพื่อย้ายรูปบัตรประชาชนที่เก็บเป็น base64
// อยู่ในตาราง customers เดิม ไปเก็บเป็นไฟล์จริงใน Supabase Storage แล้วอัปเดต
// ให้ฟิลด์ idCardImage เก็บแค่ URL แทน
//
// วิธีใช้:
//   1. npm install @supabase/supabase-js   (ถ้ายังไม่มี)
//   2. ตั้งค่า env: SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
//      (ใช้ service_role key จาก Supabase Dashboard > Settings > API
//       เพื่อบายพาส RLS ตอน migrate — ห้ามใส่ค่านี้ในโค้ดฝั่งแอปที่ deploy จริง)
//   3. รัน: node scripts/migrate-id-cards.mjs
//
// สคริปต์นี้ทำงานแบบ idempotent — รันซ้ำได้ จะข้ามลูกค้าที่ idCardImage
// เป็น URL (http/https) อยู่แล้ว และย้ายเฉพาะที่ยังเป็น base64 (data:image/...)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'id-cards'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนรันสคริปต์นี้')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function base64ToBuffer(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  const contentType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  const ext = contentType.split('/')[1]?.split('+')[0] || 'jpg'
  return { buffer, contentType, ext }
}

async function main() {
  console.log('กำลังดึงรายชื่อลูกค้าทั้งหมด...')
  let allRows = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, data')
      .range(from, from + PAGE - 1)
    if (error) { console.error('โหลดข้อมูลล้มเหลว:', error); process.exit(1) }
    allRows = allRows.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }

  const toMigrate = allRows.filter(row => {
    const img = row.data?.idCardImage
    return typeof img === 'string' && img.startsWith('data:image')
  })

  console.log(`พบลูกค้าทั้งหมด ${allRows.length} ราย, มีรูปแบบ base64 ที่ต้องย้าย ${toMigrate.length} ราย`)

  let success = 0
  let failed = 0

  for (const row of toMigrate) {
    const parsed = base64ToBuffer(row.data.idCardImage)
    if (!parsed) { failed++; console.warn(`ข้าม ${row.id}: แปลง base64 ไม่ได้`); continue }

    const path = `${row.id}/${Date.now()}.${parsed.ext}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, parsed.buffer, { contentType: parsed.contentType, upsert: false })

    if (uploadError) {
      failed++
      console.warn(`อัปโหลดล้มเหลวสำหรับ ${row.id}:`, uploadError.message)
      continue
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const newData = { ...row.data, idCardImage: pub.publicUrl }

    const { error: updateError } = await supabase
      .from('customers')
      .update({ data: newData, updated_at: new Date().toISOString() })
      .eq('id', row.id)

    if (updateError) {
      failed++
      console.warn(`อัปเดตแถวล้มเหลวสำหรับ ${row.id}:`, updateError.message)
      continue
    }

    success++
    console.log(`ย้ายสำเร็จ: ${row.id}`)
  }

  console.log(`เสร็จสิ้น — สำเร็จ ${success} ราย, ล้มเหลว ${failed} ราย`)
}

main()
