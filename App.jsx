import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Package, Users, FileText, ShoppingCart, Boxes, Plus, Trash2, Edit2,
  Search, Download, X, ChevronRight, ChevronLeft, ChevronDown, Menu, ArrowDownToLine,
  ArrowUpFromLine, History, TrendingUp, Save, Printer, Landmark,
  CheckCircle2, XCircle, Clock, CreditCard, PackageMinus, ArrowRight, Wallet, Receipt,
  Image, FileSpreadsheet, FileDown, Truck
} from "lucide-react";
import { isSupabaseReady } from './supabase'
import { loadAllFromSupabase, useSupabaseSync } from './useSupabaseSync.js'

// ---------- Seed data ----------
const initialProducts = [
  { id: "P001", name: "เศษกระดาษ A4", type: "กระดาษ", unit: "กก." },
  { id: "P002", name: "เศษกระดาษลูกฟูก", type: "กระดาษ", unit: "กก." },
  { id: "P003", name: "พลาสติก PET ใส", type: "พลาสติก", unit: "กก." },
  { id: "P004", name: "เหล็กเส้น", type: "เหล็ก", unit: "กก." },
  { id: "P005", name: "อลูมิเนียมกระป๋อง", type: "อลูมิเนียม", unit: "กก." },
  { id: "P006", name: "ทองแดงสายไฟ", type: "ทองแดง", unit: "กก." },
];

// ลูกค้าแต่ละคนสามารถมีบัญชีธนาคารได้หลายบัญชี: bankAccounts = [{id, bankName, accountNo, accountName}]
const initialCustomers = [
  { id: "C001", name: "บริษัท กรีนรีไซเคิล จำกัด", taxId: "0105561000111", address: "123 ถ.สุขุมวิท กรุงเทพฯ", phone: "081-234-5678", line: "@greenrecycle", email: "contact@green.co.th", deliveries: 12,
    bankAccounts: [
      { id: "CB001", bankName: "กสิกรไทย", accountNo: "123-4-56789-0", accountName: "บริษัท กรีนรีไซเคิล จำกัด" },
    ] },
  { id: "C002", name: "สมชาย วงศ์สุข", taxId: "1100500123456", address: "45/2 ม.3 ต.บางพลี อ.บางพลี สมุทรปราการ", phone: "089-111-2222", line: "somchai_w", email: "somchai@email.com", deliveries: 5,
    bankAccounts: [
      { id: "CB002", bankName: "ไทยพาณิชย์", accountNo: "234-5-67890-1", accountName: "สมชาย วงศ์สุข" },
      { id: "CB003", bankName: "กรุงเทพ", accountNo: "987-6-54321-0", accountName: "สมชาย วงศ์สุข" },
    ] },
  { id: "C003", name: "ร้านรับซื้อของเก่าใจดี", taxId: "0205559999999", address: "78 ถ.พระราม 2 กรุงเทพฯ", phone: "02-555-1234", line: "jaidee_shop", email: "jaidee@shop.com", deliveries: 30,
    bankAccounts: [
      { id: "CB004", bankName: "กรุงไทย", accountNo: "345-6-78901-2", accountName: "ร้านรับซื้อของเก่าใจดี" },
    ] },
];

// บัญชีธนาคารของร้าน (store's own bank accounts)
const initialStoreBankAccounts = [
  { id: "SB001", bankName: "กสิกรไทย", accountNo: "111-2-22333-4", accountName: "บริษัท วงจรกรีน จำกัด", branch: "สาขาสุขุมวิท" },
  { id: "SB002", bankName: "ไทยพาณิชย์", accountNo: "222-3-44555-6", accountName: "บริษัท วงจรกรีน จำกัด", branch: "สาขาบางนา" },
];

// payments = [{id, date, amount, fromStoreBankId ("CASH" หรือ id บัญชีร้าน), method}]
// receivingCustomerBankId = บัญชีลูกค้าที่จะรับเงิน (เลือกครั้งเดียวต่อใบ)
const initialPurchases = [
  {
    id: "PO-20260601-001", date: "2026-06-01", customerId: "C001", status: "อนุมัติแล้ว", paymentMethod: "โอนเงิน", receivingCustomerBankId: "CB001",
    items: [
      { productId: "P001", qty: 100, deduct: 2, net: 98, price: 6 },
      { productId: "P003", qty: 50, deduct: 1, net: 49, price: 12 },
    ],
    payments: [
      { id: "PM001", date: "2026-06-01", amount: 1176, fromStoreBankId: "SB001", method: "โอนเงิน" },
    ],
  },
  {
    id: "PO-20260605-001", date: "2026-06-05", customerId: "C002", status: "อนุมัติแล้ว", paymentMethod: "โอนเงิน", receivingCustomerBankId: "CB002",
    items: [
      { productId: "P004", qty: 200, deduct: 5, net: 195, price: 11 },
    ],
    payments: [
      { id: "PM002", date: "2026-06-05", amount: 1500, fromStoreBankId: "SB001", method: "โอนเงิน" },
      { id: "PM003", date: "2026-06-10", amount: 645, fromStoreBankId: "SB002", method: "โอนเงิน" },
    ],
  },
  {
    id: "PO-20260612-001", date: "2026-06-12", customerId: "C003", status: "รออนุมัติ", paymentMethod: "โอนเงิน", receivingCustomerBankId: "CB004",
    items: [
      { productId: "P005", qty: 60, deduct: 0, net: 60, price: 35 },
    ],
    payments: [],
  },
];

const initialSales = [
  {
    id: "INV-2606-001", date: "2026-06-08", customerId: "C003",
    items: [
      { productId: "P001", qty: 80, deduct: 0, net: 80, price: 8.5 },
    ],
    discount: 50, vatRate: 7, paymentMethod: "โอนเงิน", paymentStatus: "ชำระแล้ว",
  },
];

// เบิกสินค้าเพื่อขาย: เบิกสินค้าต้นทางออกจากสต๊อก (ตัดสต๊อกทันทีตามต้นทุน FIFO)
// แล้วนำยอด (จำนวน + มูลค่า) ไปรวมเป็นต้นทุนของสินค้าเป้าหมายในใบขาย (sales invoice) ที่ระบุ
// value/avgCost คำนวณจากต้นทุน FIFO ของสต๊อกต้นทาง ณ ตอนที่บันทึกการเบิก
const initialWithdrawals = [];

// เงินมัดจำจ่ายให้ลูกค้าล่วงหน้า: {id, date, customerId, amount, note, fromStoreBankId}
// ยอดมัดจำคงเหลือของลูกค้า = ผลรวมเงินมัดจำที่จ่าย - ผลรวมเงินมัดจำที่ถูกหักในใบรับสินค้า (payments ที่ fromStoreBankId === "DEPOSIT")
const initialDeposits = [];

// ค่าใช้จ่าย: {id, date, category, description, amount, fromStoreBankId ("CASH" หรือ id บัญชีร้าน)}
const initialExpenses = [];

// เงินกู้ยืม / เช่าซื้อ: {id, name, type, principal, annualInterestRate, totalInstallments, startDate, lender}
// งวดผ่อนสร้างจาก amortization schedule (ผ่อนเท่ากันทุกเดือน ลดดอกเบี้ยจากเงินต้นคงเหลือ)
const initialLoans = [];
const LOAN_TYPES = ["เงินกู้ยืม", "เช่าซื้อ"];

// หมวดหมู่ใหญ่ (เพิ่มได้) และหมวดหมู่ย่อยเริ่มต้นของแต่ละหมวดหมู่ใหญ่ (เพิ่มได้)
const EXPENSE_MAIN_CATEGORIES = ["ค่าใช้จ่าย", "ภาษี", "สินทรัพย์", "สินเชื่อ"];
const EXPENSE_SUBCATEGORIES_DEFAULT = {
  "ค่าใช้จ่าย": ["ค่าน้ำมัน/ขนส่ง", "ค่าแรงงาน", "ค่าเช่า", "ค่าน้ำ/ค่าไฟ", "ค่าซ่อมบำรุง", "ค่าอุปกรณ์/วัสดุสิ้นเปลือง", "อื่นๆ"],
  "ภาษี": ["ภาษีมูลค่าเพิ่ม", "ภาษีเงินได้", "ภาษีหัก ณ ที่จ่าย", "ภาษีป้าย", "อื่นๆ"],
  "สินทรัพย์": ["ซื้อเครื่องจักร/อุปกรณ์", "ซื้อยานพาหนะ", "ซ่อมแซมปรับปรุง", "อื่นๆ"],
  "สินเชื่อ": ["ชำระเงินกู้ (เงินต้น)", "ชำระดอกเบี้ย", "ค่าธรรมเนียมสินเชื่อ", "อื่นๆ"],
};

const UNIT_OPTIONS = ["กก.", "ตัน", "ชิ้น", "ม้วน", "ใบ"];
const PRODUCT_TYPES = ["กระดาษ", "พลาสติก", "เหล็ก", "อลูมิเนียม", "ทองแดง", "อื่นๆ"];
const PAYMENT_METHODS = ["เงินสด", "โอนเงิน", "เช็ค", "พร้อมเพย์"];
// ช่องทางชำระเงินสำหรับใบรับสินค้า (ไม่มีเงินสด เพราะต้องระบุบัญชีลูกค้าที่รับเงิน)
const PURCHASE_PAYMENT_CHANNELS = ["เงินสด", "โอนเงิน", "เช็ค", "พร้อมเพย์"];
const PAYMENT_STATUSES = ["รอชำระ", "ชำระแล้ว", "ชำระบางส่วน"];
const PURCHASE_STATUSES = ["รออนุมัติ", "อนุมัติแล้ว", "ยกเลิก"];
const BANK_NAMES = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงไทย", "กรุงเทพ", "ทหารไทยธนชาต", "กรุงศรีอยุธยา", "ออมสิน", "ธ.ก.ส.", "ซีไอเอ็มบี", "ยูโอบี", "อื่นๆ"];

const fmt = (n) => Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

// ---------- Export Utilities ----------
// Download Excel (.xlsx) from a 2D array of rows
function exportExcel(rows, filename = "export.xlsx", sheetName = "Sheet1") {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// Download PNG from a DOM element (id) using Canvas API
function exportImage(elementId, filename = "export.png") {
  const el = document.getElementById(elementId);
  if (!el) return;
  import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js")
    .then(() => { /* no-op, not available */ })
    .catch(() => {});
  // Fallback: use browser print with page setup
  const printWindow = window.open("", "_blank");
  if (!printWindow) { alert("กรุณาอนุญาต popup เพื่อบันทึกรูปภาพ"); return; }
  printWindow.document.write(`
    <html><head><title>${filename}</title>
    <style>body{margin:0;padding:20px;font-family:'Noto Sans Thai',sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px;font-size:12px}tr:nth-child(even){background:#f9f9f9}</style>
    </head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

// Print current page as PDF (via browser print dialog)
function printAsPDF(elementId, title = "") {
  const el = document.getElementById(elementId);
  if (!el) { window.print(); return; }
  const printWindow = window.open("", "_blank");
  if (!printWindow) { alert("กรุณาอนุญาต popup เพื่อพิมพ์ PDF"); return; }
  printWindow.document.write(`
    <html><head><title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap');
      body{margin:0;padding:20px;font-family:'Noto Sans Thai',sans-serif;font-size:12px}
      table{border-collapse:collapse;width:100%}
      td,th{border:1px solid #ddd;padding:6px 10px}
      th{background:#f3f4f6;font-weight:700}
      tr:nth-child(even){background:#f9f9f9}
      tfoot td{font-weight:700;background:#f3f4f6;border-top:2px solid #5a1414}
      h1,h2,h3{margin:0 0 12px}
      @media print{body{padding:0}}
    </style>
    </head><body><h2 style="margin-bottom:8px">${title}</h2>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

// ExportToolbar component — renders 3 export buttons for a section
function ExportToolbar({ onPDF, onExcel, onImage, label = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {label && <span style={{ fontSize: 12, color: "#6b7280", marginRight: 4 }}>{label}</span>}
      <button
        onClick={onPDF}
        title="บันทึก PDF"
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, color: "#993c1d" }}
      >
        <FileDown size={13} /> PDF
      </button>
      <button
        onClick={onExcel}
        title="บันทึก Excel"
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, color: "#0f6e56" }}
      >
        <FileSpreadsheet size={13} /> Excel
      </button>
      <button
        onClick={onImage}
        title="บันทึกรูปภาพ"
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, color: "#185fa5" }}
      >
        <Image size={13} /> รูปภาพ
      </button>
    </div>
  );
}


// Builds inventory lots, consumes FIFO on sales/withdrawals, returns stock summary + movement history
function computeInventory(products, purchases, sales, withdrawals = []) {
  const lots = {};
  const movements = [];

  products.forEach((p) => (lots[p.id] = []));

  const events = [];

  // ===== ยอดยกมา: ใส่เป็น event แรกสุด ก่อนทุกรายการซื้อ/ขาย =====
  products.forEach((p) => {
    const qty  = Number(p.openingQty)  || 0;
    const cost = Number(p.openingCost) || 0;
    if (qty > 0) {
      events.push({ type: "in", date: "0000-01-01", ref: "ยอดยกมา", productId: p.id, qty, price: cost, isOpening: true });
    }
  });

  purchases.forEach((po) => {
    if (po.status !== "อนุมัติแล้ว") return;
    po.items.forEach((it) => {
      events.push({ type: "in", date: po.date, ref: po.id, productId: it.productId, qty: it.net, price: it.price });
    });
  });
  sales.forEach((inv) => {
    inv.items.forEach((it) => {
      if (it.fromWithdrawal) return; // สต๊อกถูกตัดไปแล้วตอนเบิก ไม่ต้องตัดซ้ำที่นี่
      events.push({ type: "out", date: inv.date, ref: inv.id, productId: it.productId, qty: it.net });
    });
  });
  withdrawals.forEach((lot) => {
    (lot.items || []).forEach((it) => {
      events.push({ type: "withdraw", date: lot.date, ref: lot.id, productId: it.sourceProductId, qty: it.qty });
    });
  });
  // เรียงตามวันที่ แล้วให้ "withdraw" มาก่อน "in"/"out" ในวันเดียวกัน เพื่อให้ลำดับสอดคล้องกับการตัดสต๊อกทันที
  const typeOrder = { in: 0, withdraw: 1, out: 2 };
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (typeOrder[a.type] ?? 1) - (typeOrder[b.type] ?? 1)));

  events.forEach((ev) => {
    if (!lots[ev.productId]) lots[ev.productId] = [];
    if (ev.type === "in") {
      lots[ev.productId].push({ date: ev.date, ref: ev.ref, qtyRemaining: ev.qty, qtyOriginal: ev.qty, unitCost: ev.price });
      movements.push({ ...ev, balanceQty: null });
    } else {
      let remainingToConsume = ev.qty;
      let costConsumed = 0;
      const queue = lots[ev.productId];
      for (let i = 0; i < queue.length && remainingToConsume > 0; i++) {
        const lot = queue[i];
        if (lot.qtyRemaining <= 0) continue;
        const take = Math.min(lot.qtyRemaining, remainingToConsume);
        lot.qtyRemaining -= take;
        costConsumed += take * lot.unitCost;
        remainingToConsume -= take;
      }
      const avgCostUsed = ev.qty > 0 ? costConsumed / ev.qty : 0;
      movements.push({ ...ev, costConsumed, avgCostUsed, shortfall: remainingToConsume });
    }
  });

  const summary = products.map((p) => {
    const remaining = (lots[p.id] || []).reduce((s, l) => s + Math.max(0, l.qtyRemaining), 0);
    const totalCost = (lots[p.id] || []).reduce((s, l) => s + Math.max(0, l.qtyRemaining) * l.unitCost, 0);
    const avgCost = remaining > 0 ? totalCost / remaining : 0;
    return { productId: p.id, name: p.name, unit: p.unit, qty: remaining, totalCost, avgCost };
  });

  // Build per-product movement history with running balance
  const history = {};
  products.forEach((p) => {
    let balance = 0;
    history[p.id] = events
      .filter((e) => e.productId === p.id)
      .map((e) => {
        if (e.type === "in") balance += e.qty;
        else balance -= e.qty;
        return { ...e, balance };
      });
  });

  return { summary, history, lots };
}

// คำนวณต้นทุน FIFO ของจำนวนที่จะเบิก โดยอิงจากสต๊อกคงเหลือปัจจุบัน (ไม่แก้ไข lots จริง)
function computeWithdrawalCost(inventory, sourceProductId, qty) {
  const lots = (inventory.lots[sourceProductId] || []).map((l) => ({ ...l }));
  let remaining = Number(qty) || 0;
  let cost = 0;
  let shortfall = 0;
  for (let i = 0; i < lots.length && remaining > 0; i++) {
    const lot = lots[i];
    if (lot.qtyRemaining <= 0) continue;
    const take = Math.min(lot.qtyRemaining, remaining);
    cost += take * lot.unitCost;
    lot.qtyRemaining -= take;
    remaining -= take;
  }
  if (remaining > 0) {
    // ไม่พอในสต๊อก ให้ใช้ต้นทุนเฉลี่ยปัจจุบันสำหรับส่วนที่เกิน
    const summary = inventory.summary.find((s) => s.productId === sourceProductId);
    const fallbackCost = summary?.avgCost || 0;
    cost += remaining * fallbackCost;
    shortfall = remaining;
  }
  return { value: cost, shortfall };
}

// ---------- Deposit balance helper ----------
// คำนวณยอดมัดจำคงเหลือของลูกค้าแต่ละราย
// = ผลรวมเงินมัดจำที่จ่ายให้ลูกค้า (deposits) - ผลรวมเงินมัดจำที่ถูกหักในใบรับสินค้า
//   (purchases[].payments[] ที่ fromStoreBankId === "DEPOSIT")
function computeDepositBalances(customers, deposits, purchases) {
  const given = {}; // customerId -> total given
  const used = {}; // customerId -> total used in purchases
  deposits.forEach((d) => {
    given[d.customerId] = (given[d.customerId] || 0) + (Number(d.amount) || 0);
  });
  purchases.forEach((po) => {
    (po.payments || []).forEach((p) => {
      if (p.fromStoreBankId === "DEPOSIT") {
        used[po.customerId] = (used[po.customerId] || 0) + (Number(p.amount) || 0);
      }
    });
  });
  return customers.map((c) => {
    const totalGiven = given[c.id] || 0;
    const totalUsed = used[c.id] || 0;
    return { customerId: c.id, name: c.name, totalGiven, totalUsed, remaining: totalGiven - totalUsed };
  });
}

// ---------- Loan amortization schedule ----------
// คำนวณตารางผ่อนชำระแบบผ่อนเท่ากันทุกเดือน (ลดดอกเบี้ยจากเงินต้นคงเหลือไปเรื่อยๆ)
// คืนค่า: array ของงวด {no, dueDate, payment, interest, principalPortion, remainingBalance}
// คำนวณวันครบกำหนดของงวดที่ i: เดือนของ (startDate + i) แต่ใช้วันที่ = dueDayOfMonth
// (ถ้า dueDayOfMonth เกินจำนวนวันในเดือนนั้น ให้ใช้วันสุดท้ายของเดือนแทน เช่น 31 ก.พ. -> 28/29 ก.พ.)
function computeDueDate(startDate, monthOffset, dueDayOfMonth) {
  const d = new Date(startDate);
  const targetMonth = d.getMonth() + monthOffset;
  const targetYear = d.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(Math.max(1, Number(dueDayOfMonth) || d.getDate()), lastDayOfMonth);
  const result = new Date(targetYear, normalizedMonth, day);
  return result.toISOString().slice(0, 10);
}

function computeAmortizationSchedule(loan) {
  const principal = Number(loan.principal) || 0;
  const n = Number(loan.totalInstallments) || 0;
  if (principal <= 0 || n <= 0) return [];

  const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
  const schedule = [];

  if (loan.interestMode === "amount") {
    // ดอกเบี้ยกรอกเป็นจำนวนเงินรวมตลอดสัญญา -> กระจายดอกเบี้ยเท่าๆกันทุกงวด (เหมือนเช่าซื้อทั่วไป)
    const totalInterest = Number(loan.totalInterestAmount) || 0;
    const interestPerInstallment = totalInterest / n;
    const principalPerInstallment = principal / n;
    const payment = principalPerInstallment + interestPerInstallment;
    let balance = principal;
    for (let i = 1; i <= n; i++) {
      let principalPortion = principalPerInstallment;
      let thisInterest = interestPerInstallment;
      let thisPayment = payment;
      if (i === n) {
        // งวดสุดท้าย: ปรับให้พอดีกับเงินต้นคงเหลือ (กันเศษทศนิยมสะสม)
        principalPortion = balance;
        thisPayment = principalPortion + thisInterest;
      }
      balance = Math.max(0, balance - principalPortion);
      const dueDate = computeDueDate(startDate, i, loan.dueDayOfMonth);
      schedule.push({ no: i, dueDate, payment: thisPayment, interest: thisInterest, principalPortion, remainingBalance: balance });
    }
    return schedule;
  }

  // ดอกเบี้ยกรอกเป็น % ต่อปี -> สูตรผ่อนเท่ากันทุกเดือน (annuity, ลดต้นลดดอก)
  const annualRate = Number(loan.annualInterestRate) || 0;
  const monthlyRate = annualRate / 100 / 12;
  let payment;
  if (monthlyRate === 0) {
    payment = principal / n;
  } else {
    payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  }

  let balance = principal;
  for (let i = 1; i <= n; i++) {
    const interest = balance * monthlyRate;
    let principalPortion = payment - interest;
    let thisPayment = payment;
    // งวดสุดท้าย: ปรับให้พอดีกับเงินต้นคงเหลือ (กันเศษทศนิยมสะสม)
    if (i === n) {
      principalPortion = balance;
      thisPayment = principalPortion + interest;
    }
    balance = Math.max(0, balance - principalPortion);

    const dueDate = computeDueDate(startDate, i, loan.dueDayOfMonth);

    schedule.push({
      no: i,
      dueDate,
      payment: thisPayment,
      interest,
      principalPortion,
      remainingBalance: balance,
    });
  }
  return schedule;
}

// ---------- Generic small UI bits ----------
function Modal({ title, onClose, children, wide, fullscreen }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: fullscreen ? 0 : "1rem" }}>
      <div style={{ background: "var(--color-background-primary, #fff)", borderRadius: fullscreen ? 0 : 12, width: fullscreen ? "100vw" : wide ? "min(900px, 95vw)" : "min(520px, 95vw)", height: fullscreen ? "100vh" : undefined, maxHeight: fullscreen ? "100vh" : "90vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6b7280" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "1.25rem" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Header({ title, subtitle, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{children}</div>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
      <input style={{ ...inputStyle, paddingLeft: 32 }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "auto", ...style }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db",
  fontSize: 14, boxSizing: "border-box", fontFamily: "inherit",
};

const btnPrimary = {
  background: "#0f6e56", color: "#fff", border: "none", padding: "8px 16px",
  borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
};
const btnSecondary = {
  background: "#fff", color: "#374151", border: "1px solid #d1d5db", padding: "8px 16px",
  borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
};
const btnDanger = {
  background: "#fff", color: "#a32d2d", border: "1px solid #f7c1c1", padding: "6px 10px",
  borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
};
const iconBtn = {
  background: "#fff", border: "1px solid #d1d5db", padding: "6px 10px", borderRadius: 8,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "#374151",
};

const thStyle = { textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px 12px", fontSize: 14, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" };

function genId(prefix, list) {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;
  // นับเฉพาะ doc ในวันนี้
  const todayPrefix = `${prefix}${datePart}`;
  const todayCount = list.filter((item) => {
    const id = typeof item === "string" ? item : (item.id || "");
    return id.startsWith(todayPrefix);
  }).length;
  return `${todayPrefix}${String(todayCount + 1).padStart(3, "0")}`;
}
function genSeqId(prefix, list) {
  const nums = list
    .map((item) => {
      const id = typeof item === "string" ? item : (item.id || "");
      const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
      return match ? parseInt(match[1]) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ---------- Searchable product select (type to filter) ----------
function ProductSelect({ products, value, onChange, disabled, minWidth = 170, labelWithId = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState(null);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const selected = products.find((p) => p.id === value);
  const display = (p) => (labelWithId ? `${p.id} · ${p.name}` : p.name);

  const filtered = query.trim()
    ? products.filter((p) => p.id.toLowerCase().includes(query.toLowerCase()) || p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  const updateRect = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }
  };

  React.useEffect(() => {
    if (!open) return;
    updateRect();
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && !(e.target.closest && e.target.closest('[data-product-select-dropdown]'))) {
        setOpen(false);
        setQuery("");
      }
    };
    const reposition = () => updateRect();
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const dropdown = open && rect && (
    <div
      data-product-select-dropdown
      style={{
        position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 1000,
        background: "#fff", border: "1px solid #d1d5db", borderRadius: 8,
        marginTop: 4, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {filtered.length === 0 && <div style={{ padding: "8px 10px", fontSize: 13, color: "#9ca3af" }}>ไม่พบสินค้า</div>}
      {filtered.map((p) => (
        <div
          key={p.id}
          onMouseDown={(e) => { e.preventDefault(); onChange(p.id); setOpen(false); setQuery(""); }}
          style={{
            padding: "8px 10px", fontSize: 13, cursor: "pointer",
            background: p.id === value ? "#eeedfe" : "#fff",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = p.id === value ? "#eeedfe" : "#fff"; }}
        >
          {display(p)}
        </div>
      ))}
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth }}>
      <input
        ref={inputRef}
        style={{ ...inputStyle, paddingRight: selected && !open ? 28 : undefined }}
        disabled={disabled}
        placeholder="ค้นหาสินค้า..."
        value={open ? query : (selected ? display(selected) : "")}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {selected && !open && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="ล้างค่าที่เลือก"
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
            display: "flex", alignItems: "center", padding: 2,
          }}
        >
          <X size={14} />
        </button>
      )}
      {dropdown}
    </div>
  );
}

// ---------- Searchable customer select (type to filter) ----------
function CustomerSelect({ customers, value, onChange, disabled, minWidth = 180, labelWithId = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState(null);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const selected = customers.find((c) => c.id === value);
  const display = (c) => (labelWithId ? `${c.id} · ${c.name}` : c.name);

  const filtered = query.trim()
    ? customers.filter((c) => c.id.toLowerCase().includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase()))
    : customers;

  const updateRect = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }
  };

  React.useEffect(() => {
    if (!open) return;
    updateRect();
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && !(e.target.closest && e.target.closest('[data-customer-select-dropdown]'))) {
        setOpen(false);
        setQuery("");
      }
    };
    const reposition = () => updateRect();
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const dropdown = open && rect && (
    <div
      data-customer-select-dropdown
      style={{
        position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 1000,
        background: "#fff", border: "1px solid #d1d5db", borderRadius: 8,
        marginTop: 4, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {filtered.length === 0 && <div style={{ padding: "8px 10px", fontSize: 13, color: "#9ca3af" }}>ไม่พบลูกค้า</div>}
      {filtered.map((c) => (
        <div
          key={c.id}
          onMouseDown={(e) => { e.preventDefault(); onChange(c.id); setOpen(false); setQuery(""); }}
          style={{
            padding: "8px 10px", fontSize: 13, cursor: "pointer",
            background: c.id === value ? "#eeedfe" : "#fff",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = c.id === value ? "#eeedfe" : "#fff"; }}
        >
          {display(c)}
        </div>
      ))}
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth }}>
      <input
        ref={inputRef}
        style={inputStyle}
        disabled={disabled}
        placeholder="ค้นหาลูกค้า..."
        value={open ? query : (selected ? display(selected) : "")}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {dropdown}
    </div>
  );
}


// ===================================================================
// MAIN APP
// ===================================================================
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState([
    { id: "U001", username: "admin", password: "1234", name: "ผู้ดูแลระบบ", role: "admin" },
  ]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);


  const handleLogin = () => {
    const user = users.find((u) => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginForm({ username: "", password: "" });
  };

  // หน้า Login


  const [products, setProducts] = useState(initialProducts);
  const [customers, setCustomers] = useState(initialCustomers);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [sales, setSales] = useState(initialSales);
  const [storeBankAccounts, setStoreBankAccounts] = useState(initialStoreBankAccounts);


  // ตั้งค่ากิจการ (Company Settings) — ใช้ใน header ของใบรับ/ขายสินค้า
  // shopProfile — ชื่อ/โลโก้ใน sidebar (แยกจากข้อมูลบิล)
  const [shopProfile, setShopProfile] = useState({
    name: "วงจรกรีน",
    nameEn: "ระบบซื้อขายของเก่ารีไซเคิล",
    logo: "",   // base64
  });

  const [companySettings, setCompanySettings] = useState({
    name: "วงจรกรีน รีไซเคิล",
    nameEn: "",
    taxId: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: "",           // base64 image สำหรับบิล
    // ตั้งค่าเอกสาร
    purchaseTitle: "ใบรับสินค้า (รับซื้อของเก่า)",
    salesTitle: "ใบกำกับภาษี / Invoice",
    expenseVoucherTitle: "ใบสำคัญจ่าย",
    expenseVoucherNote: "",
    primaryColor: "#0f6e56",
    accentColor: "#185fa5",
    footerNote: "",
    showQrCode: false,
    showSignature: true,
  });

  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [deposits, setDeposits] = useState(initialDeposits);
  const [deliveries, setDeliveries] = useState([]);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [loans, setLoans] = useState(initialLoans);

  const inventory = useMemo(() => computeInventory(products, purchases, sales, withdrawals), [products, purchases, sales, withdrawals]);

  // ===== Supabase Sync =====
  const [dbLoaded, setDbLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState('') // 'loading' | 'synced' | 'offline'

  // โหลดข้อมูลจาก Supabase ครั้งแรก
  useEffect(() => {
    if (!isSupabaseReady) { setDbLoaded(true); setSyncStatus('offline'); return }
    setSyncStatus('loading')
    loadAllFromSupabase().then(data => {
      if (data) {
        if (data.products)      setProducts(data.products)
        if (data.customers)     setCustomers(data.customers)
        if (data.purchases)     setPurchases(data.purchases)
        if (data.sales)         setSales(data.sales)
        if (data.withdrawals)   setWithdrawals(data.withdrawals)
        if (data.deposits)      setDeposits(data.deposits)
        if (data.expenses)      setExpenses(data.expenses)
        if (data.loans)         setLoans(data.loans)
        if (data.storeBankAccounts) setStoreBankAccounts(data.storeBankAccounts)
        if (data.shopProfile)   setShopProfile(data.shopProfile)
        if (data.companySettings) setCompanySettings(data.companySettings)
        if (data.users)         setUsers(data.users)
        setSyncStatus('synced')
      }
      setDbLoaded(true)
    })
  }, [])

  // Auto-sync แต่ละ state ไปยัง Supabase
  useSupabaseSync('products',          products,          setProducts,          dbLoaded)
  useSupabaseSync('customers',         customers,         setCustomers,         dbLoaded)
  useSupabaseSync('purchases',         purchases,         setPurchases,         dbLoaded)
  useSupabaseSync('sales',             sales,             setSales,             dbLoaded)
  useSupabaseSync('withdrawals',       withdrawals,       setWithdrawals,       dbLoaded)
  useSupabaseSync('deposits',          deposits,          setDeposits,          dbLoaded)
  useSupabaseSync('expenses',          expenses,          setExpenses,          dbLoaded)
  useSupabaseSync('loans',             loans,             setLoans,             dbLoaded)
  useSupabaseSync('storeBankAccounts', storeBankAccounts, setStoreBankAccounts, dbLoaded)
  useSupabaseSync('shopProfile',       shopProfile,       setShopProfile,       dbLoaded)
  useSupabaseSync('companySettings',   companySettings,   setCompanySettings,   dbLoaded)

  const navItems = [
    { key: "dashboard", label: "แดชบอร์ด", icon: TrendingUp },
    { key: "products", label: "ข้อมูลสินค้า", icon: Package },
    { key: "customers", label: "ข้อมูลลูกค้า", icon: Users },
    { key: "purchases", label: "ใบรับสินค้า", icon: ArrowDownToLine },
    { key: "withdrawals", label: "เบิกสินค้าเพื่อขาย", icon: PackageMinus },
    { key: "sales", label: "ขายสินค้า", icon: ShoppingCart },
    { key: "delivery", label: "ใบส่งสินค้า", icon: Truck },
    { key: "inventory", label: "สต๊อกสินค้า", icon: Boxes },
    { key: "deposits", label: "เงินมัดจำ", icon: Wallet },
    { key: "expenses", label: "ค่าใช้จ่าย", icon: Receipt },
    { key: "loans", label: "เงินกู้ยืม/เช่าซื้อ", icon: CreditCard },
    { key: "bankaccounts", label: "บัญชีธนาคารร้าน", icon: Landmark },
    { key: "banktransfer", label: "โยกเงินระหว่างธนาคาร", icon: ArrowRight },
    { key: "receivables", label: "ลูกหนี้/เจ้าหนี้", icon: FileText },
    { key: "assets", label: "ทะเบียนทรัพย์สิน", icon: Package },
    { key: "settings", label: "ตั้งค่ากิจการ", icon: Save },
    { key: "report", label: "รายงานกำไร", icon: TrendingUp },
    { key: "tax", label: "ภาษีซื้อ-ภาษีขาย", icon: Receipt },
  ];


  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0c443c 0%, #1d9e75 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans Thai', 'Inter', system-ui, sans-serif" }}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" />
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
          {/* Logo / ชื่อแอพ */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            {shopProfile.logo ? (
              <img src={shopProfile.logo} alt="logo"
                style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 16, background: "#f3f4f6", padding: 8, margin: "0 auto 16px", display: "block" }} />
            ) : (
              <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, #0c443c, #1d9e75)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Boxes size={32} color="#fff" />
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: 22, color: "#0c443c" }}>{shopProfile.name || "วงจรกรีน รีไซเคิล"}</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{shopProfile.nameEn || "ระบบซื้อขายของเก่ารีไซเคิล"}</div>
          </div>

          {/* Form */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>ชื่อผู้ใช้</label>
            <input
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>รหัสผ่าน</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                style={{ width: "100%", padding: "10px 40px 10px 14px", border: "1.5px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                placeholder="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}
              >
                {showPassword ? <X size={16} /> : <ArrowRight size={16} />}
              </button>
            </div>
          </div>

          {loginError && (
            <div style={{ background: "#fcebeb", border: "1px solid #f5c2c2", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#a32d2d", marginBottom: 14, textAlign: "center" }}>
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #0c443c, #1d9e75)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
          >
            เข้าสู่ระบบ
          </button>

          <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            ค่าเริ่มต้น: admin / 1234
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Noto Sans Thai', 'Inter', system-ui, sans-serif", background: "#f3f4f1", color: "#1f2937" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" />

      {/* Sidebar — fixed, independent scroll */}
      <div style={{ width: sidebarOpen ? 220 : 64, background: "#0c443c", color: "#e1f5ee", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s ease", height: "100vh", overflowY: "auto", overflowX: "auto", position: "fixed", top: 0, left: 0, zIndex: 10 }}>
        <div style={{ padding: sidebarOpen ? "16px 18px" : "16px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {sidebarOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              {/* โลโก้ หรือ icon สำรอง */}
              {shopProfile.logo ? (
                <img
                  src={shopProfile.logo}
                  alt="logo"
                  style={{ width: 38, height: 38, borderRadius: 8, objectFit: "contain", background: "#fff", padding: 3, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 8, background: "#1d9e75", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Boxes size={20} color="#04342c" />
                </div>
              )}
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {shopProfile.name || "วงจรกรีน"}
                </div>
                <div style={{ fontSize: 10, color: "#9fe1cb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {shopProfile.nameEn || "ระบบซื้อขายของเก่ารีไซเคิล"}
                </div>
              </div>
            </div>
          ) : (
            /* ย่อเมนู: แสดงแค่โลโก้หรือ icon */
            shopProfile.logo ? (
              <img
                src={shopProfile.logo}
                alt="logo"
                style={{ width: 38, height: 38, borderRadius: 8, objectFit: "contain", background: "#fff", padding: 3, margin: "0 auto", display: "block" }}
              />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 8, background: "#1d9e75", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                <Boxes size={20} color="#04342c" />
              </div>
            )
          )}
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              title="ย่อเมนู"
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#d1ede1", cursor: "pointer", flexShrink: 0 }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setSidebarOpen(true)}
              title="ขยายเมนู"
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#d1ede1", cursor: "pointer" }}
            >
              <Menu size={16} />
            </button>
          </div>
        )}
        <nav style={{ flex: 1, padding: sidebarOpen ? "12px 10px" : "12px 8px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                title={!sidebarOpen ? item.label : undefined}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "10px 12px" : "10px 0", marginBottom: 4, borderRadius: 8, border: "none",
                  background: active ? "#1d9e75" : "transparent",
                  color: active ? "#04342c" : "#d1ede1",
                  fontWeight: active ? 600 : 500, fontSize: 14, cursor: "pointer", textAlign: "left",
                  transition: "background 0.15s", overflow: "hidden", whiteSpace: "nowrap",
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && item.label}
              </button>
            );
          })}
        </nav>

        {/* ผู้ใช้งาน + ออกจากระบบ */}
        {isSupabaseReady && (
          <div style={{ padding: sidebarOpen ? "4px 16px 0" : "4px 8px 0", textAlign: sidebarOpen ? "left" : "center" }}>
            <span style={{ fontSize: 10, color: syncStatus === 'synced' ? "#9fe1cb" : syncStatus === 'loading' ? "#fbbf24" : "#9ca3af" }}>
              {syncStatus === 'synced' && "● ซิงค์แล้ว"}
              {syncStatus === 'loading' && "● กำลังโหลด..."}
              {syncStatus === 'offline' && "● Offline"}
            </span>
          </div>
        )}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: sidebarOpen ? "12px 16px" : "12px 8px" }}>
          {sidebarOpen ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1d9e75", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={15} color="#04342c" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e1f5ee" }}>{currentUser?.name}</div>
                  <div style={{ fontSize: 10, color: "#9fe1cb" }}>{currentUser?.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{ width: "100%", padding: "7px 10px", background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}
              >
                <X size={13} /> ออกจากระบบ
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              style={{ width: "100%", padding: "8px", background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, color: "#fca5a5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main content — independently scrollable */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", overflowX: "auto", minHeight: "100vh", marginLeft: sidebarOpen ? 220 : 64, transition: "margin-left 0.2s ease", boxSizing: "border-box", width: sidebarOpen ? "calc(100vw - 220px)" : "calc(100vw - 64px)" }}>        {tab === "dashboard" && <Dashboard products={products} customers={customers} purchases={purchases} sales={sales} inventory={inventory} expenses={expenses} loans={loans} storeBankAccounts={storeBankAccounts} deposits={deposits} />}
        {tab === "products" && <ProductsTab products={products} setProducts={setProducts} />}
        {tab === "customers" && <CustomersTab customers={customers} setCustomers={setCustomers} />}
        {tab === "purchases" && <PurchasesTab products={products} customers={customers} purchases={purchases} setPurchases={setPurchases} storeBankAccounts={storeBankAccounts} deposits={deposits} companySettings={companySettings} />}
        {tab === "withdrawals" && <WithdrawalsTab products={products} purchases={purchases} sales={sales} setSales={setSales} withdrawals={withdrawals} setWithdrawals={setWithdrawals} inventory={inventory} customers={customers} />}
        {tab === "sales" && <SalesTab products={products} customers={customers} sales={sales} setSales={setSales} inventory={inventory} withdrawals={withdrawals} storeBankAccounts={storeBankAccounts} companySettings={companySettings} />}
        {tab === "delivery" && <DeliveryTab deliveries={deliveries} setDeliveries={setDeliveries} products={products} customers={customers} companySettings={companySettings} />}
        {tab === "inventory" && <InventoryTab products={products} inventory={inventory} />}
        {tab === "deposits" && <DepositsTab customers={customers} deposits={deposits} setDeposits={setDeposits} purchases={purchases} storeBankAccounts={storeBankAccounts} />}
        {tab === "expenses" && <ExpensesTab expenses={expenses} setExpenses={setExpenses} storeBankAccounts={storeBankAccounts} loans={loans} setLoans={setLoans} />}
        {tab === "loans" && <LoansTab loans={loans} setLoans={setLoans} expenses={expenses} customers={customers} />}
        {tab === "bankaccounts" && <StoreBankAccountsTab accounts={storeBankAccounts} setAccounts={setStoreBankAccounts} purchases={purchases} sales={sales} expenses={expenses} deposits={deposits} />}
        {tab === "banktransfer" && <BankTransferTab storeBankAccounts={storeBankAccounts} />}
        {tab === "receivables" && <ReceivablesTab customers={customers} sales={sales} purchases={purchases} />}
        {tab === "assets" && <AssetsTab />}
        {tab === "settings" && <CompanySettingsTab settings={companySettings} setSettings={setCompanySettings} shopProfile={shopProfile} setShopProfile={setShopProfile} />}
        {tab === "report" && <MonthlyReportTab purchases={purchases} sales={sales} expenses={expenses} inventory={inventory} withdrawals={withdrawals} />}
        {tab === "tax" && <TaxSummaryTab purchases={purchases} sales={sales} expenses={expenses} />}
      </div>

    </div>
  );
}

// ===================================================================
// DASHBOARD
// ===================================================================
function Dashboard({ products, customers, purchases, sales, inventory, expenses, loans, storeBankAccounts, deposits }) {
  // ---------- หมวดหมู่แดชบอร์ด ----------
  const [dashSubTab, setDashSubTab] = useState("purchases"); // "purchases" | "sales" | "expenses" | "stock" | "loans"
  const [expandedStockTypes, setExpandedStockTypes] = useState({}); // { [type]: bool } ติ๊กเลือกเพื่อดูรายการสินค้าในประเภทนั้น

  // ---------- ตัวเลือกช่วงเวลา: รายวัน / ช่วงวันที่ (เลือกเอง) / ทั้งหมด ----------
  const today = new Date().toISOString().slice(0, 10);
  const [periodMode, setPeriodMode] = useState("all"); // "all" | "day" | "range"
  const [periodDate, setPeriodDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);

  // ช่วงวันที่ตามตัวเลือก: คืนค่า {start, end} (รวมทั้งสองค่า) หรือ null = ไม่จำกัด (ทั้งหมด)
  const dateRange = useMemo(() => {
    if (periodMode === "day") return { start: periodDate, end: periodDate };
    if (periodMode === "range") {
      const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
      const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
      return { start, end };
    }
    return null;
  }, [periodMode, periodDate, rangeStart, rangeEnd]);

  const inRange = (dateStr) => {
    if (!dateRange) return true;
    return dateStr >= dateRange.start && dateStr <= dateRange.end;
  };

  // ---------- กรองรายการซื้อ/ขายตามช่วงเวลา ----------
  const filteredPurchases = purchases.filter((po) => po.status === "อนุมัติแล้ว" && inRange(po.date));
  const filteredSales = sales.filter((inv) => inRange(inv.date));

  // มูลค่าซื้อ ก่อน VAT (ต้นทุนสินค้าที่ใช้คำนวณสต๊อก/กำไร)
  const totalPurchaseValue = filteredPurchases.reduce((sum, po) => sum + po.items.reduce((s, it) => s + (it.net || 0) * (it.price || 0), 0), 0);
  const totalSalesValue = filteredSales.reduce((sum, inv) => {
    const subtotal = inv.items.reduce((s, it) => s + it.net * it.price, 0);
    const afterDiscount = subtotal - (inv.discount || 0);
    const vat = afterDiscount * ((inv.vatRate || 0) / 100);
    return sum + afterDiscount + vat;
  }, 0);

  // รวมรายได้ = ยอดขาย + รายได้อื่นยกมา
  // รวมค่าใช้จ่าย = ค่าใช้จ่ายจริง + ค่าใช้จ่ายยกมา
  const totalExpenses = (expenses || []).filter((e) => inRange(e.billDate || e.date)).reduce((s, e) => {
    const items = (e.items && e.items.length > 0) ? e.items : [{ mainCategory: e.mainCategory || e.category, amount: e.amount }];
    return s + items.filter((it) => it.mainCategory === "ค่าใช้จ่าย").reduce((s2, it) => s2 + (Number(it.amount) || 0), 0);
  }, 0);

  // ---------- ค่าใช้จ่ายแบ่งตามหมวดหมู่ย่อย ----------
  const expensesBySubCategory = useMemo(() => {
    const groups = {};
    // จากค่าใช้จ่ายจริง
    (expenses || []).filter((e) => inRange(e.billDate || e.date)).forEach((e) => {
      const items = (e.items && e.items.length > 0) ? e.items : [{ mainCategory: e.mainCategory || e.category, subCategory: e.subCategory, amount: e.amount }];
      items.filter((it) => it.mainCategory === "ค่าใช้จ่าย").forEach((it) => {
        const sub = it.subCategory || "อื่นๆ";
        if (!groups[sub]) groups[sub] = { subCategory: sub, amount: 0, count: 0 };
        groups[sub].amount += Number(it.amount) || 0;
        groups[sub].count += 1;
      });
    });
    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [expenses, dateRange]);


  const totalStockValue = inventory.summary.reduce((s, x) => s + x.totalCost, 0);

  // ===== ยอดยกมา =====
  // สต๊อกสินค้ายกมา (จาก products.openingQty/openingCost) — ไม่นับซ้ำถ้า FIFO รวมแล้ว
  // inventory.summary ครอบคลุม openingQty แล้ว (computeInventory inject แล้ว)
  // แยกแสดงยอดยกมาดิบเพื่อ dashboard
  const totalOpeningStockQty   = products.reduce((s, p) => s + (Number(p.openingQty)  || 0), 0);
  const totalOpeningStockValue = products.reduce((s, p) => s + (Number(p.openingQty) || 0) * (Number(p.openingCost) || 0), 0);

  // ยอดยกมาธนาคาร (จาก storeBankAccounts.openingBalance)
  const totalOpeningBankBalance = storeBankAccounts.reduce((s, a) => s + (Number(a.openingBalance) || 0), 0);

  // มีข้อมูลยกมาไหม
  const hasOpeningData = totalOpeningStockValue > 0 || totalOpeningBankBalance > 0;

  // ---------- สต๊อกคงเหลือ แบ่งตามประเภทสินค้า (สำหรับตัวกรองดรอปดาวน์) ----------
  const stockByType = useMemo(() => {
    const groups = {}; // type -> { type, qty, value, items: [...] }
    inventory.summary.forEach((s) => {
      const p = products.find((pr) => pr.id === s.productId);
      const type = p?.type || "ไม่ระบุประเภท";
      if (!groups[type]) groups[type] = { type, qty: 0, value: 0, items: [] };
      groups[type].qty += s.qty;
      groups[type].value += s.totalCost;
      groups[type].items.push(s);
    });
    return Object.values(groups)
      .map((g) => ({ ...g, avgCost: g.qty > 0 ? g.value / g.qty : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [inventory.summary, products]);

  // ---------- คงเหลือสินเชื่อ/เงินกู้ — ยอดเงินต้นคงเหลือรวมทุกสัญญา ณ ปัจจุบัน ----------
  const totalLoanRemaining = (loans || []).reduce((sum, loan) => {
    const schedule = computeAmortizationSchedule(loan);
    const paidCount = (loan.paidInstallments || []).length;
    const nextInstallment = schedule.find((s) => s.no === paidCount + 1);
    return sum + (nextInstallment ? nextInstallment.remainingBalance + nextInstallment.principalPortion : 0);
  }, 0);

  // ---------- ยอดคงเหลือแบงค์ — สุทธิเงินที่จ่ายออกจากบัญชีร้านแต่ละบัญชี (สะสมทั้งหมด ไม่ขึ้นกับช่วงเวลา) ----------
  // หมายเหตุ: ระบบยังไม่ได้บันทึกเงินรับเข้าบัญชีจากการขาย จึงแสดงเป็น "เงินที่จ่ายออกสะสม" ต่อบัญชี
  const bankOutflows = useMemo(() => {
    const out = {}; // bankId -> total
    const add = (bankId, amount) => {
      if (!bankId || bankId === "CASH" || bankId === "DEPOSIT") return;
      out[bankId] = (out[bankId] || 0) + amount;
    };
    purchases.forEach((po) => (po.payments || []).forEach((p) => add(p.fromStoreBankId, Number(p.amount) || 0)));
    (deposits || []).forEach((d) => add(d.fromStoreBankId, Number(d.amount) || 0));
    (expenses || []).forEach((e) => (e.payments || []).forEach((p) => add(p.fromStoreBankId, Number(p.amount) || 0)));
    return out;
  }, [purchases, deposits, expenses]);

  // ---------- ซื้อ/ขาย แบ่งตามประเภทสินค้า และแบ่งตามรายการสินค้า ----------
  const prodInfo = (id) => products.find((p) => p.id === id);

  const purchaseByType = useMemo(() => {
    const groups = {};
    filteredPurchases.forEach((po) => {
      po.items.forEach((it) => {
        const p = prodInfo(it.productId);
        const type = p?.type || "ไม่ระบุประเภท";
        const value = (it.net || 0) * (it.price || 0);
        const qty = it.net || 0;
        if (!groups[type]) groups[type] = { type, qty: 0, value: 0 };
        groups[type].qty += qty;
        groups[type].value += value;
      });
    });
    return Object.values(groups).map((g) => ({ ...g, avgCost: g.qty > 0 ? g.value / g.qty : 0 })).sort((a, b) => b.value - a.value);
  }, [filteredPurchases, products]);

  const purchaseByProduct = useMemo(() => {
    const groups = {};
    filteredPurchases.forEach((po) => {
      po.items.forEach((it) => {
        const value = (it.net || 0) * (it.price || 0);
        const qty = it.net || 0;
        if (!groups[it.productId]) groups[it.productId] = { productId: it.productId, qty: 0, value: 0 };
        groups[it.productId].qty += qty;
        groups[it.productId].value += value;
      });
    });
    return Object.values(groups).map((g) => ({ ...g, avgCost: g.qty > 0 ? g.value / g.qty : 0 })).sort((a, b) => b.value - a.value);
  }, [filteredPurchases]);

  const salesByType = useMemo(() => {
    const groups = {};
    filteredSales.forEach((inv) => {
      inv.items.forEach((it) => {
        const p = prodInfo(it.productId);
        const type = p?.type || "ไม่ระบุประเภท";
        const value = (it.net || 0) * (it.price || 0);
        const qty = it.net || 0;
        if (!groups[type]) groups[type] = { type, qty: 0, value: 0 };
        groups[type].qty += qty;
        groups[type].value += value;
      });
    });
    return Object.values(groups).map((g) => ({ ...g, avgCost: g.qty > 0 ? g.value / g.qty : 0 })).sort((a, b) => b.value - a.value);
  }, [filteredSales, products]);

  const salesByProduct = useMemo(() => {
    const groups = {};
    filteredSales.forEach((inv) => {
      inv.items.forEach((it) => {
        const value = (it.net || 0) * (it.price || 0);
        const qty = it.net || 0;
        if (!groups[it.productId]) groups[it.productId] = { productId: it.productId, qty: 0, value: 0 };
        groups[it.productId].qty += qty;
        groups[it.productId].value += value;
      });
    });
    return Object.values(groups).map((g) => ({ ...g, avgCost: g.qty > 0 ? g.value / g.qty : 0 })).sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  const prodName = (id) => products.find((p) => p.id === id)?.name || id;
  const prodUnit = (id) => products.find((p) => p.id === id)?.unit || "";

  const purchaseCard = { label: "มูลค่าซื้อ ก่อน VAT (อนุมัติแล้ว)", value: fmt(totalPurchaseValue), suffix: "บาท", icon: ArrowDownToLine, color: "#d85a30", bg: "#faece7" };
  const salesCard = { label: "มูลค่าขายสะสม", value: fmt(totalSalesValue), suffix: "บาท", icon: ArrowUpFromLine, color: "#185fa5", bg: "#e6f1fb" };
  const expensesCard = { label: "ค่าใช้จ่ายรวม", value: fmt(totalExpenses), suffix: "บาท", icon: Receipt, color: "#993c1d", bg: "#faece7" };
  const stockCard = {
    label: totalOpeningStockValue > 0 ? `สต็อกรวม (รวมยกมา ฿${fmt(totalOpeningStockValue)})` : "ยอดคงเหลือสต็อก (ต้นทุนก่อน VAT)",
    value: fmt(totalStockValue), suffix: "บาท", icon: Boxes, color: "#1d9e75", bg: "#e1f5ee"
  };
  const loanCard = { label: "คงเหลือสินเชื่อ/เงินกู้", value: fmt(totalLoanRemaining), suffix: "บาท", icon: CreditCard, color: "#993c1d", bg: "#faece7" };

  const subTabs = [
    { key: "purchases", label: "ซื้อ", icon: ArrowDownToLine },
    { key: "sales", label: "ขาย", icon: ArrowUpFromLine },
    { key: "expenses", label: "ค่าใช้จ่าย", icon: Receipt },
    { key: "stock", label: "สต็อก", icon: Boxes },
    { key: "loans", label: "สินเชื่อ", icon: CreditCard },
    { key: "cashflow", label: "เงินหมุนร้าน", icon: Landmark },
  ];

  const renderCard = (c, snapshot) => {
    const Icon = c.icon;
    return (
      <div key={c.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Icon size={18} color={c.color} />
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{c.label} {snapshot && <span style={{ color: "#bcb6e0" }}>(ปัจจุบัน)</span>}</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value} <span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af" }}>{c.suffix}</span></div>
      </div>
    );
  };

  // ---------- Export handlers (per sub-tab) ----------
  const periodLabel = dateRange ? `${dateRange.start} ถึง ${dateRange.end}` : "ทั้งหมด";

  const exportHandlers = {
    purchases: {
      pdf: () => printAsPDF("dash-export-purchases", `ยอดซื้อ (${periodLabel})`),
      excel: () => {
        const rows = [
          [`ยอดซื้อ - ${periodLabel}`, "", ""],
          ["", "", ""],
          ["ประเภทสินค้า", "จำนวน", "มูลค่า (บาท)"],
          ...purchaseByType.map((g) => [g.type, g.qty, g.value]),
          ["", "", ""],
          ["สินค้า", "จำนวน", "มูลค่า (บาท)"],
          ...purchaseByProduct.map((g) => [prodName(g.productId), g.qty, g.value]),
        ];
        exportExcel(rows, `ยอดซื้อ_${periodLabel}.xlsx`, "ยอดซื้อ");
      },
      image: () => printAsPDF("dash-export-purchases", `ยอดซื้อ (${periodLabel})`),
    },
    sales: {
      pdf: () => printAsPDF("dash-export-sales", `ยอดขาย (${periodLabel})`),
      excel: () => {
        const rows = [
          [`ยอดขาย - ${periodLabel}`, "", ""],
          ["", "", ""],
          ["ประเภทสินค้า", "จำนวน", "มูลค่า (บาท)"],
          ...salesByType.map((g) => [g.type, g.qty, g.value]),
          ["", "", ""],
          ["สินค้า", "จำนวน", "มูลค่า (บาท)"],
          ...salesByProduct.map((g) => [prodName(g.productId), g.qty, g.value]),
        ];
        exportExcel(rows, `ยอดขาย_${periodLabel}.xlsx`, "ยอดขาย");
      },
      image: () => printAsPDF("dash-export-sales", `ยอดขาย (${periodLabel})`),
    },
    expenses: {
      pdf: () => printAsPDF("dash-export-expenses", `ค่าใช้จ่าย (${periodLabel})`),
      excel: () => {
        const rows = [
          [`ค่าใช้จ่ายรวม - ${periodLabel}`],
          ["ค่าใช้จ่ายรวม (หมวด ค่าใช้จ่าย, ก่อนภาษี)", totalExpenses],
        ];
        exportExcel(rows, `ค่าใช้จ่าย_${periodLabel}.xlsx`, "ค่าใช้จ่าย");
      },
      image: () => printAsPDF("dash-export-expenses", `ค่าใช้จ่าย (${periodLabel})`),
    },
    stock: {
      pdf: () => printAsPDF("dash-export-stock", "สต๊อกคงเหลือ"),
      excel: () => {
        const rows = [
          ["สต๊อกคงเหลือ", "", "", ""],
          ["ประเภทสินค้า", "สินค้า", "คงเหลือ", "มูลค่า (บาท)", "ราคาเฉลี่ย"],
        ];
        stockByType.forEach((g) => {
          const visibleItems = g.items.filter((s) => s.qty > 0);
          if (visibleItems.length === 0) return;
          rows.push([g.type, "", g.qty, g.value, g.avgCost]);
          visibleItems.forEach((s) => rows.push(["", s.name, s.qty, s.totalCost, s.avgCost]));
        });
        rows.push(["", "", "", ""]);
        rows.push(["ผลรวม", "", stockByType.reduce((s, g) => s + g.qty, 0), stockByType.reduce((s, g) => s + g.value, 0)]);
        exportExcel(rows, "สต๊อกคงเหลือ.xlsx", "สต๊อก");
      },
      image: () => printAsPDF("dash-export-stock", "สต๊อกคงเหลือ"),
    },
    loans: {
      pdf: () => printAsPDF("dash-export-loans", "สินเชื่อ/เงินกู้คงเหลือ"),
      excel: () => {
        const rows = [
          ["สินเชื่อ/เงินกู้คงเหลือ"],
          ["ชื่อสัญญา", "เลขที่บิล", "ประเภท", "เงินต้น", "งวดที่ชำระแล้ว", "งวดคงเหลือ"],
          ...(loans || []).map((l) => {
            const paidCount = (l.paidInstallments || []).length;
            return [l.name, l.billNo || "", l.type, l.principal, paidCount, l.totalInstallments - paidCount];
          }),
          ["", "", "", "", ""],
          ["คงเหลือทั้งหมด (บาท)", totalLoanRemaining],
        ];
        exportExcel(rows, "สินเชื่อคงเหลือ.xlsx", "สินเชื่อ");
      },
      image: () => printAsPDF("dash-export-loans", "สินเชื่อ/เงินกู้คงเหลือ"),
    },
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>แดชบอร์ดภาพรวม</h2>
      <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 14 }}>สรุปข้อมูลการซื้อขายของเก่ารีไซเคิล</p>

      {hasOpeningData && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {totalOpeningStockValue > 0 && (
            <div style={{ background: "#e1f5ee", border: "1px solid #a3d9c3", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "#0c443c", display: "flex", gap: 6, alignItems: "center" }}>
              <Boxes size={14} />
              <span>สต็อกยกมา <strong>{fmt(totalOpeningStockQty)} หน่วย</strong> มูลค่า <strong>฿{fmt(totalOpeningStockValue)}</strong> — รวมในสต็อกแล้ว</span>
            </div>
          )}
          {totalOpeningBankBalance > 0 && (
            <div style={{ background: "#e6f1fb", border: "1px solid #b3d0f0", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "#0c447c", display: "flex", gap: 6, alignItems: "center" }}>
              <Landmark size={14} />
              <span>ยอดธนาคารยกมารวม <strong>฿{fmt(totalOpeningBankBalance)}</strong> ({storeBankAccounts.filter(a => Number(a.openingBalance) > 0).length} บัญชี)</span>
            </div>
          )}
        </div>
      )}



      {/* ตัวเลือกช่วงเวลา */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #d1d5db" }}>
          {[
            { key: "all", label: "ทั้งหมด" },
            { key: "day", label: "รายวัน" },
            { key: "range", label: "เลือกช่วงวันที่" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriodMode(opt.key)}
              style={{
                padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: periodMode === opt.key ? "#1d9e75" : "#fff",
                color: periodMode === opt.key ? "#04342c" : "#6b7280",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {periodMode === "day" && (
          <input type="date" style={{ ...inputStyle, width: 170 }} value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
        )}

        {periodMode === "range" && (
          <>
            <span style={{ fontSize: 13, color: "#6b7280" }}>จาก</span>
            <input type="date" style={{ ...inputStyle, width: 170 }} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>ถึง</span>
            <input type="date" style={{ ...inputStyle, width: 170 }} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          </>
        )}

        {dateRange && (
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            ช่วงข้อมูล: {dateRange.start} ถึง {dateRange.end}
          </span>
        )}
      </div>

      {/* แท็บหมวดหมู่ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = dashSubTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setDashSubTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: active ? "1px solid #1d9e75" : "1px solid #d1d5db",
                background: active ? "#e1f5ee" : "#fff",
                color: active ? "#0f6e56" : "#6b7280",
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ===== ซื้อ ===== */}
      {dashSubTab === "purchases" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>ข้อมูลตามช่วงเวลา: {periodLabel}</span>
            <ExportToolbar onPDF={exportHandlers.purchases.pdf} onExcel={exportHandlers.purchases.excel} onImage={exportHandlers.purchases.image} />
          </div>
          <div id="dash-export-purchases">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {renderCard(purchaseCard)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "18px 20px", overflowX: "auto" }}>
  <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>ยอดซื้อ แบ่งตามประเภทสินค้า</h3>
  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ประเภท</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย/หน่วย</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>มูลค่ารวม</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseByType.map((g) => (
                    <tr key={g.type}>
                      <td style={tdStyle}><Badge text={g.type} /></td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.qty)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.avgCost)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(g.value)}</td>
                    </tr>
                  ))}
                  {purchaseByType.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูลในช่วงเวลานี้</td></tr>}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "18px 20px", overflowX: "auto" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>ยอดซื้อ แบ่งตามรายการสินค้า</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>สินค้า</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย/หน่วย</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>มูลค่ารวม</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseByProduct.map((g) => (
                    <tr key={g.productId}>
                      <td style={tdStyle}>{prodName(g.productId)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.qty)} {prodUnit(g.productId)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.avgCost)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(g.value)}</td>
                    </tr>
                  ))}
                  {purchaseByProduct.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูลในช่วงเวลานี้</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          </div>{/* end dash-export-purchases */}
        </>
      )}

      {/* ===== ขาย ===== */}
      {dashSubTab === "sales" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>ข้อมูลตามช่วงเวลา: {periodLabel}</span>
            <ExportToolbar onPDF={exportHandlers.sales.pdf} onExcel={exportHandlers.sales.excel} onImage={exportHandlers.sales.image} />
          </div>
          <div id="dash-export-sales">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {renderCard(salesCard)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "18px 20px", overflowX: "auto" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>ยอดขาย แบ่งตามประเภทสินค้า</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ประเภท</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย/หน่วย</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>มูลค่ารวม</th>
                  </tr>
                </thead>
                <tbody>
                  {salesByType.map((g) => (
                    <tr key={g.type}>
                      <td style={tdStyle}><Badge text={g.type} /></td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.qty)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.avgCost)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(g.value)}</td>
                    </tr>
                  ))}
                  {salesByType.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูลในช่วงเวลานี้</td></tr>}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "18px 20px", overflowX: "auto" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>ยอดขาย แบ่งตามรายการสินค้า</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500  }}>
                <thead>
                  <tr>
                    <th style={thStyle}>สินค้า</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย/หน่วย</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>มูลค่ารวม</th>
                  </tr>
                </thead>
                <tbody>
                  {salesByProduct.map((g) => (
                    <tr key={g.productId}>
                      <td style={tdStyle}>{prodName(g.productId)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.qty)} {prodUnit(g.productId)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.avgCost)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(g.value)}</td>
                    </tr>
                  ))}
                  {salesByProduct.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูลในช่วงเวลานี้</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          </div>{/* end dash-export-sales */}
        </>
      )}

      {/* ===== ค่าใช้จ่าย ===== */}
      {dashSubTab === "expenses" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>ข้อมูลตามช่วงเวลา: {periodLabel}</span>
            <ExportToolbar onPDF={exportHandlers.expenses.pdf} onExcel={exportHandlers.expenses.excel} onImage={exportHandlers.expenses.image} />
          </div>
          <div id="dash-export-expenses">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              {renderCard(expensesCard)}
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "18px 20px" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>ค่าใช้จ่าย แบ่งตามหมวดหมู่ย่อย</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>หมวดหมู่ย่อย</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>จำนวนรายการ</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ยอดรวม (บาท)</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>% ของทั้งหมด</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesBySubCategory.map((g) => (
                    <tr key={g.subCategory}>
                      <td style={tdStyle}>{g.subCategory}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{g.count} รายการ</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(g.amount)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#6b7280" }}>
                        {totalExpenses > 0 ? `${((g.amount / totalExpenses) * 100).toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                  {expensesBySubCategory.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูลในช่วงเวลานี้</td></tr>}
                </tbody>
                {expensesBySubCategory.length > 0 && (
                  <tfoot>
                    <tr>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>รวม</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{expensesBySubCategory.reduce((s, g) => s + g.count, 0)} รายการ</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#993c1d" }}>฿{fmt(totalExpenses)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== สต็อก ===== */}
      {dashSubTab === "stock" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>ยอดคงเหลือ ณ วันที่ {today}</span>
            <ExportToolbar onPDF={exportHandlers.stock.pdf} onExcel={exportHandlers.stock.excel} onImage={exportHandlers.stock.image} />
          </div>
          <div id="dash-export-stock">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {renderCard(stockCard, true)}
            {totalOpeningStockValue > 0 && (
              <div style={{ background: "#f0f9f5", borderRadius: 12, border: "1px solid #a3d9c3", padding: "14px 18px" }}>
                <div style={{ fontSize: 12, color: "#0c443c", marginBottom: 4, fontWeight: 600 }}>สต็อกยกมา (รวมในยอดแล้ว)</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#0f6e56" }}>฿{fmt(totalOpeningStockValue)}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{fmt(totalOpeningStockQty)} หน่วย / {products.filter(p => Number(p.openingQty) > 0).length} รายการ</div>
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ background: "#5a1414", color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>มูลค่าสต๊อกรวม</h3>
              <span style={{ fontSize: 12, color: "#e7c9c9" }}>วันที่ {today}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>ประเภทสินค้า / รายการสินค้า</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือ/{stockByType[0]?.items[0]?.unit || "หน่วย"}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>มูลค่าคงเหลือ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย</th>
                </tr>
              </thead>
              <tbody>
                {stockByType.map((g) => {
                  const visibleItems = g.items.filter((s) => s.qty > 0);
                  if (visibleItems.length === 0) return null;
                  const isExpanded = !!expandedStockTypes[g.type];
                  return (
                    <React.Fragment key={g.type}>
                      {isExpanded && (
                        <>
                          <tr
                            onClick={() => setExpandedStockTypes((prev) => ({ ...prev, [g.type]: !prev[g.type] }))}
                            style={{ cursor: "pointer" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                          >
                            <td style={{ ...tdStyle, fontWeight: 700, color: "#993c1d" }}>{g.type}</td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}></td>
                          </tr>
                          {visibleItems.map((s) => (
                            <tr key={s.productId}>
                              <td style={{ ...tdStyle, color: "#111827", paddingLeft: 24 }}>- {s.name}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(s.qty)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: "#993c1d" }}>{fmt(s.totalCost)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(s.avgCost)}</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f9fafb" }}>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{g.type} (ยอดรวม)</td>
                            <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(g.qty)}</td>
                            <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>{fmt(g.value)}</td>
                            <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(g.avgCost)}</td>
                          </tr>
                        </>
                      )}
                      {!isExpanded && (
                        <tr
                          onClick={() => setExpandedStockTypes((prev) => ({ ...prev, [g.type]: !prev[g.type] }))}
                          style={{ cursor: "pointer", background: "#f9fafb" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{g.type} (ยอดรวม)</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(g.qty)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>{fmt(g.value)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(g.avgCost)}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {stockByType.every((g) => g.items.every((s) => s.qty === 0)) && (
                  <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูลสต๊อก</td></tr>
                )}
              </tbody>
              {stockByType.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid #5a1414" }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>ผลรวม</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(stockByType.reduce((s, g) => s + g.qty, 0))}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#993c1d" }}>{fmt(stockByType.reduce((s, g) => s + g.value, 0))}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                      {(() => {
                        const totalQty = stockByType.reduce((s, g) => s + g.qty, 0);
                        const totalVal = stockByType.reduce((s, g) => s + g.value, 0);
                        return fmt(totalQty > 0 ? totalVal / totalQty : 0);
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          </div>{/* end dash-export-stock */}
        </>
      )}

      {/* ===== สินเชื่อ ===== */}
      {dashSubTab === "loans" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>ยอดคงเหลือ ณ วันที่ {today}</span>
            <ExportToolbar onPDF={exportHandlers.loans.pdf} onExcel={exportHandlers.loans.excel} onImage={exportHandlers.loans.image} />
          </div>
          <div id="dash-export-loans" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {renderCard(loanCard, true)}
            {totalOpeningBankBalance > 0 && (
              <div style={{ background: "#e6f1fb", borderRadius: 12, border: "1px solid #b3d0f0", padding: "14px 18px" }}>
                <div style={{ fontSize: 12, color: "#0c447c", marginBottom: 4, fontWeight: 600 }}>ยอดธนาคารยกมา</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#185fa5" }}>฿{fmt(totalOpeningBankBalance)}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {storeBankAccounts.filter(a => Number(a.openingBalance) > 0).map(a => (
                    <div key={a.id}>{a.bankName}: ฿{fmt(a.openingBalance)}</div>
                  ))}
                </div>
              </div>
            )}

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px", gridColumn: "span 2" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e6f1fb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Landmark size={18} color="#185fa5" />
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>เงินที่จ่ายออกสะสมต่อบัญชีธนาคารร้าน <span style={{ color: "#bcb6e0" }}>(ปัจจุบัน)</span></div>
            {(storeBankAccounts || []).length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>ยังไม่มีบัญชีธนาคารร้าน</p>
            ) : (
              (storeBankAccounts || []).map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                  <span>{b.bankName} {b.accountNo}</span>
                  <span style={{ fontWeight: 600, color: "#993c1d" }}>-฿{fmt(bankOutflows[b.id] || 0)}</span>
                </div>
              ))
            )}
          </div>
        </div>{/* end dash-export-loans */}
        </>
      )}

      {dashSubTab === "cashflow" && (() => {
        // ===== คำนวณยอดเงินหมุนร้าน =====
        // 1. เงินในธนาคาร = ยกมา + รับเข้าทั้งหมด - จ่ายออกทั้งหมด
        const bankInflows = {};
        sales.forEach((inv) => (inv.payments || []).forEach((p) => {
          if (p.toStoreBankId && p.toStoreBankId !== "CASH") {
            bankInflows[p.toStoreBankId] = (bankInflows[p.toStoreBankId] || 0) + (Number(p.amount) || 0);
          }
        }));

        const bankRows = storeBankAccounts.map((b) => {
          const ob     = Number(b.openingBalance) || 0;
          const inflow = bankInflows[b.id] || 0;
          const outflow = bankOutflows[b.id] || 0;
          const balance = ob + inflow - outflow;
          return { ...b, ob, inflow, outflow, balance };
        });
        const totalBankBalance = bankRows.reduce((s, b) => s + b.balance, 0);

        // 2. ลูกหนี้ค้างรับ
        const totalReceivable = sales.reduce((s, inv) => {
          const subtotal = inv.items.reduce((ss, it) => ss + (it.net || 0) * (it.price || 0), 0);
          const ad = subtotal - (inv.discount || 0);
          const total = ad + ad * ((inv.vatRate || 0) / 100);
          const paid = (inv.payments || []).reduce((ss, p) => ss + (Number(p.amount) || 0), 0);
          return s + Math.max(0, total - paid);
        }, 0);

        // 3. เจ้าหนี้ค้างจ่าย
        const totalPayable = purchases.filter(po => po.status === "อนุมัติแล้ว").reduce((s, po) => {
          const subtotal = po.items.reduce((ss, it) => ss + (it.net || 0) * (it.price || 0), 0);
          const vat = subtotal * ((Number(po.vatRate) || 0) / 100);
          const total = subtotal + vat;
          const paid = (po.payments || []).reduce((ss, p) => ss + (Number(p.amount) || 0), 0);
          return s + Math.max(0, total - paid);
        }, 0);

        // 4. เงินมัดจำคงเหลือ
        const totalDeposit = (deposits || []).reduce((s, d) => {
          const used = Number(d.usedAmount) || 0;
          return s + Math.max(0, (Number(d.amount) || 0) - used);
        }, 0);

        // 5. สต๊อกสินค้า (มูลค่าทุน)
        const stockVal = inventory.summary.reduce((s, x) => s + x.totalCost, 0);

        // สรุปเงินสดสุทธิ (Cash + ลูกหนี้ - เจ้าหนี้)
        const netCash = totalBankBalance + totalReceivable - totalPayable;

        const cfCard = (label, value, color, bg, sub) => (
          <div style={{ background: bg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${color}33` }}>
            <div style={{ fontSize: 12, color, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 20, color }}>฿{fmt(value)}</div>
            {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{sub}</div>}
          </div>
        );

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>ยอดเงินหมุนเวียน ณ วันที่ {today}</span>
              <ExportToolbar
                onPDF={() => printAsPDF("dash-cashflow", "สรุปเงินหมุนร้าน")}
                onExcel={() => {
                  const rows = [
                    ["สรุปเงินหมุนร้าน", ""],
                    ["รายการ", "ยอด (บาท)"],
                    ...bankRows.map(b => [`ธนาคาร ${b.bankName} ${b.accountNo}`, b.balance]),
                    ["รวมเงินในธนาคาร", totalBankBalance],
                    ["ลูกหนี้ค้างรับ (บวก)", totalReceivable],
                    ["เจ้าหนี้ค้างจ่าย (ลบ)", -totalPayable],
                    ["เงินมัดจำคงเหลือ", totalDeposit],
                    ["มูลค่าสต๊อก (ทุน)", stockVal],
                    ["เงินสดสุทธิ (ธนาคาร + ลูกหนี้ - เจ้าหนี้)", netCash],
                  ];
                  exportExcel(rows, "เงินหมุนร้าน.xlsx", "เงินหมุน");
                }}
                onImage={() => printAsPDF("dash-cashflow", "สรุปเงินหมุนร้าน")}
              />
            </div>

            <div id="dash-cashflow">
              {/* การ์ดสรุป */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                {cfCard("เงินในธนาคารรวม", totalBankBalance, "#185fa5", "#e6f1fb", `${bankRows.length} บัญชี`)}
                {cfCard("ลูกหนี้ค้างรับ", totalReceivable, "#0f6e56", "#e1f5ee", "รอรับชำระ")}
                {cfCard("เจ้าหนี้ค้างจ่าย", totalPayable, "#993c1d", "#faece7", "รอจ่ายชำระ")}
                {cfCard("เงินมัดจำคงเหลือ", totalDeposit, "#854f0b", "#faeeda", "มัดจำที่ยังไม่ใช้")}
                {cfCard("มูลค่าสต๊อก (ทุน)", stockVal, "#1d9e75", "#e1f5ee", "สินค้าคงเหลือ")}
                <div style={{ background: netCash >= 0 ? "#e1f5ee" : "#fcebeb", borderRadius: 12, padding: "14px 18px", border: `2px solid ${netCash >= 0 ? "#0f6e56" : "#a32d2d"}` }}>
                  <div style={{ fontSize: 12, color: netCash >= 0 ? "#0f6e56" : "#a32d2d", marginBottom: 4, fontWeight: 700 }}>เงินสดสุทธิ</div>
                  <div style={{ fontWeight: 700, fontSize: 22, color: netCash >= 0 ? "#0f6e56" : "#a32d2d" }}>฿{fmt(netCash)}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>ธนาคาร + ลูกหนี้ − เจ้าหนี้</div>
                </div>
              </div>

              {/* ตารางรายละเอียดธนาคาร */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 14 }}>
                <div style={{ background: "#185fa5", color: "#fff", padding: "12px 16px", fontWeight: 700, fontSize: 14 }}>
                  ยอดเงินในธนาคารแต่ละบัญชี
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={thStyle}>ธนาคาร</th>
                    <th style={thStyle}>เลขบัญชี</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ยอดยกมา</th>
                    <th style={{ ...thStyle, textAlign: "right", color: "#0f6e56" }}>รับเข้า</th>
                    <th style={{ ...thStyle, textAlign: "right", color: "#993c1d" }}>จ่ายออก</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือ</th>
                  </tr></thead>
                  <tbody>
                    {bankRows.map((b) => (
                      <tr key={b.id}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{b.bankName}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{b.accountNo}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#6b7280" }}>{b.ob > 0 ? `฿${fmt(b.ob)}` : "-"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#0f6e56", fontWeight: 600 }}>฿{fmt(b.inflow)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#993c1d", fontWeight: 600 }}>฿{fmt(b.outflow)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 14, color: b.balance >= 0 ? "#185fa5" : "#a32d2d" }}>฿{fmt(b.balance)}</td>
                      </tr>
                    ))}
                    {bankRows.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ยังไม่มีบัญชีธนาคาร</td></tr>}
                  </tbody>
                  {bankRows.length > 0 && (
                    <tfoot>
                      <tr style={{ background: "#e6f1fb" }}>
                        <td colSpan={5} style={{ ...tdStyle, fontWeight: 700 }}>รวมเงินในธนาคาร</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 15, color: "#185fa5" }}>฿{fmt(totalBankBalance)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* ตารางสรุปรวม */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ background: "#0c443c", color: "#fff", padding: "12px 16px", fontWeight: 700, fontSize: 14 }}>
                  สรุปเงินหมุนเวียนร้าน
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: "เงินในธนาคารรวม", value: totalBankBalance, color: "#185fa5", sign: "+" },
                      { label: "ลูกหนี้การค้า (ค้างรับ)", value: totalReceivable, color: "#0f6e56", sign: "+" },
                      { label: "เจ้าหนี้การค้า (ค้างจ่าย)", value: totalPayable, color: "#993c1d", sign: "−" },
                      { label: "เงินมัดจำคงเหลือ", value: totalDeposit, color: "#854f0b", sign: "+" },
                    ].map((r) => (
                      <tr key={r.label}>
                        <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: r.color + "22", color: r.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{r.sign}</span>
                          {r.label}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: r.color }}>฿{fmt(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: netCash >= 0 ? "#e1f5ee" : "#fcebeb", borderTop: "2px solid #0c443c" }}>
                      <td style={{ ...tdStyle, fontWeight: 700, fontSize: 15 }}>เงินสดสุทธิ</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 18, color: netCash >= 0 ? "#0f6e56" : "#a32d2d" }}>฿{fmt(netCash)}</td>
                    </tr>
                    <tr style={{ background: "#f9fafb" }}>
                      <td style={{ ...tdStyle, color: "#6b7280", fontSize: 12 }}>+ มูลค่าสต๊อกสินค้า (ทุน) — ไม่รวมในเงินสด</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#6b7280", fontSize: 12 }}>฿{fmt(stockVal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ===================================================================
// PRODUCTS TAB
// ===================================================================
function ProductsTab({ products, setProducts }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: "", name: "", type: PRODUCT_TYPES[0], unit: UNIT_OPTIONS[0], openingQty: 0, openingCost: 0 });

  const filtered = products.filter((p) => p.name.includes(search) || p.id.includes(search) || p.type.includes(search));

  const openAdd  = () => { setForm({ id: genSeqId("P", products), name: "", type: PRODUCT_TYPES[0], unit: UNIT_OPTIONS[0], openingQty: 0, openingCost: 0 }); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm({ openingQty: 0, openingCost: 0, ...item }); setModal({ mode: "edit", item }); };
  const remove   = (id) => setProducts(products.filter((p) => p.id !== id));

  const save = () => {
    if (!form.name.trim()) return;
    const cleaned = { ...form, openingQty: Number(form.openingQty) || 0, openingCost: Number(form.openingCost) || 0 };
    if (modal.mode === "add") setProducts([...products, cleaned]);
    else setProducts(products.map((p) => (p.id === modal.item.id ? cleaned : p)));
    setModal(null);
  };

  const totalOpeningValue = products.reduce((s, p) => s + (Number(p.openingQty) || 0) * (Number(p.openingCost) || 0), 0);

  return (
    <div>
      <Header title="ข้อมูลสินค้า (Product Master)" subtitle="ฐานข้อมูลสินค้า — ระบุยอดยกมาเพื่อให้สต๊อกเริ่มต้นถูกต้อง">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportToolbar
            onPDF={() => printAsPDF("products-print", "ข้อมูลสินค้า")}
            onExcel={() => {
              const rows = [
                ["รหัส", "ชื่อสินค้า", "ประเภท", "หน่วย", "ยอดยกมา (จำนวน)", "ต้นทุน/หน่วย", "มูลค่ายกมา (บาท)"],
                ...products.map((p) => [p.id, p.name, p.type, p.unit,
                  Number(p.openingQty) || 0, Number(p.openingCost) || 0,
                  (Number(p.openingQty) || 0) * (Number(p.openingCost) || 0)]),
                ["", "", "", "", "", "รวมมูลค่ายกมา", totalOpeningValue],
              ];
              exportExcel(rows, "ข้อมูลสินค้า_ยอดยกมา.xlsx", "สินค้า");
            }}
            onImage={() => printAsPDF("products-print", "ข้อมูลสินค้า")}
          />
          <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> เพิ่มสินค้า</button>
        </div>
      </Header>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาชื่อสินค้า, รหัส หรือประเภท..." />

      <div id="products-print" style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>รหัส</th>
              <th style={thStyle}>ชื่อสินค้า</th>
              <th style={thStyle}>ประเภท</th>
              <th style={thStyle}>หน่วย</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ยอดยกมา (จำนวน)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ต้นทุน/หน่วย</th>
              <th style={{ ...thStyle, textAlign: "right" }}>มูลค่ายกมา</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const val = (Number(p.openingQty) || 0) * (Number(p.openingCost) || 0);
              return (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{p.id}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                  <td style={tdStyle}><Badge text={p.type} /></td>
                  <td style={tdStyle}>{p.unit}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(p.openingQty || 0)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(p.openingCost || 0)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#185fa5" }}>{val > 0 ? `฿${fmt(val)}` : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button style={iconBtn} onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button style={btnDanger} onClick={() => remove(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่พบสินค้า</td></tr>}
          </tbody>
          {products.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} style={{ ...tdStyle, fontWeight: 700 }}>รวมมูลค่ายกมาทั้งหมด</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#185fa5" }}>฿{fmt(totalOpeningValue)}</td>
                <td style={tdStyle}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>


      {modal && (
        <Modal title={modal.mode === "add" ? "เพิ่มสินค้า" : "แก้ไขสินค้า"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="รหัสสินค้า"><input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={modal.mode === "edit"} /></Field>
            <Field label="ชื่อสินค้า"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="ประเภท">
  <input style={inputStyle} list="product-type-options" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="เลือกหรือพิมพ์ประเภทใหม่" />
  <datalist id="product-type-options">
    {PRODUCT_TYPES.map((t) => <option key={t} value={t} />)}
  </datalist>
</Field>
            <Field label="หน่วย">
              <select style={inputStyle} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ background: "#f0f9f5", borderRadius: 8, padding: "12px 16px", marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#0f6e56" }}>ยอดคงเหลือยกมา (ก่อนเริ่มใช้ระบบ)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label={`จำนวนยกมา (${form.unit || "หน่วย"})`}>
                <input type="number" min={0} style={inputStyle} value={form.openingQty} onChange={(e) => setForm({ ...form, openingQty: e.target.value })} placeholder="0" />
              </Field>
              <Field label="ต้นทุน/หน่วย (บาท)">
                <input type="number" min={0} style={inputStyle} value={form.openingCost} onChange={(e) => setForm({ ...form, openingCost: e.target.value })} placeholder="0" />
              </Field>
            </div>
            {(Number(form.openingQty) > 0 || Number(form.openingCost) > 0) && (
              <div style={{ fontSize: 13, color: "#0f6e56", fontWeight: 600, marginTop: 6 }}>
                มูลค่ายกมา: ฿{fmt((Number(form.openingQty) || 0) * (Number(form.openingCost) || 0))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CustomersTab({ customers, setCustomers }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [viewIdCard, setViewIdCard] = useState(null); // รูปบัตรประชาชนที่เปิดดูเต็ม
  const blank = { id: "", name: "", taxId: "", address: "", phone: "", line: "", email: "", deliveries: 0, bankAccounts: [], idCardImage: "" };
  const [form, setForm] = useState(blank);

  const filtered = customers.filter((c) => c.name.includes(search) || c.id.includes(search) || (c.phone || "").includes(search));

  const openAdd = () => { setForm({ ...blank, id: genSeqId("C", customers) }); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm(JSON.parse(JSON.stringify({ ...blank, ...item }))); setModal({ mode: "edit", item }); };

  const save = () => {
    if (!form.name.trim()) return;
    if (modal.mode === "add") setCustomers([...customers, { ...form, deliveries: Number(form.deliveries) || 0 }]);
    else setCustomers(customers.map((c) => (c.id === modal.item.id ? { ...form, deliveries: Number(form.deliveries) || 0 } : c)));
    setModal(null);
  };

  const remove = (id) => setCustomers(customers.filter((c) => c.id !== id));

  // รับรูปภาพบัตรประชาชนและแปลงเป็น base64
  const handleIdCardImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, idCardImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // --- จัดการบัญชีธนาคารของลูกค้า (หลายบัญชี) ---
  const addBankAccount = () => {
    const newAccount = { id: "CB" + Date.now().toString().slice(-6), bankName: BANK_NAMES[0], accountNo: "", accountName: form.name || "" };
    setForm({ ...form, bankAccounts: [...(form.bankAccounts || []), newAccount] });
  };
  const updateBankAccount = (idx, field, value) => {
    const accounts = [...(form.bankAccounts || [])];
    accounts[idx] = { ...accounts[idx], [field]: value };
    setForm({ ...form, bankAccounts: accounts });
  };
  const removeBankAccount = (idx) => {
    setForm({ ...form, bankAccounts: (form.bankAccounts || []).filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <Header title="ข้อมูลลูกค้า" subtitle="รายชื่อลูกค้าและผู้ส่งของรีไซเคิล">
        <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> เพิ่มลูกค้า</button>
      </Header>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหารหัส, ชื่อ หรือเบอร์โทร..." />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((c) => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            {/* ID Card thumbnail */}
            <div style={{ flexShrink: 0 }}>
              {c.idCardImage ? (
                <img
                  src={c.idCardImage}
                  alt="บัตรประชาชน"
                  onClick={() => setViewIdCard(c)}
                  style={{ width: 64, height: 42, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer" }}
                  title="คลิกเพื่อดูบัตรประชาชน"
                />
              ) : (
                <div style={{ width: 64, height: 42, borderRadius: 6, border: "1.5px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "#d1d5db" }}>
                  <Users size={16} />
                  <span style={{ fontSize: 8 }}>บัตร ปชช.</span>
                </div>
              )}
            </div>

            {/* Main info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#9ca3af" }}>{c.id}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                {c.phone && <span style={{ fontSize: 12, color: "#6b7280" }}>📞 {c.phone}</span>}
                {c.line && <span style={{ fontSize: 12, color: "#6b7280" }}>Line: {c.line}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#9ca3af" }}>
                {c.taxId && <span>เลขบัตร/ภาษี: {c.taxId}</span>}
                {c.address && <span>· {c.address}</span>}
                {(c.bankAccounts || []).length > 0 && <span>· {(c.bankAccounts || []).length} บัญชีธนาคาร</span>}
              </div>
            </div>

            {/* Stats + Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>ส่งของ</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#3c3489" }}>{c.deliveries} ครั้ง</div>
              </div>
              <button style={iconBtn} onClick={() => openEdit(c)} title="แก้ไข"><Edit2 size={15} /></button>
              <button style={btnDanger} onClick={() => remove(c.id)} title="ลบ"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: "#9ca3af" }}>ไม่พบข้อมูลลูกค้า</p>}
      </div>

      {/* รูปบัตรประชาชนเต็มจอ */}
      {viewIdCard && (
        <Modal title={`บัตรประชาชน · ${viewIdCard.name}`} onClose={() => setViewIdCard(null)}>
          <div style={{ textAlign: "center" }}>
            <img src={viewIdCard.idCardImage} alt="บัตรประชาชน" style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 10, border: "1px solid #e5e7eb" }} />
            <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>{viewIdCard.name} · {viewIdCard.taxId}</div>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.mode === "add" ? "เพิ่มลูกค้าใหม่" : "แก้ไขข้อมูลลูกค้า"} onClose={() => setModal(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="รหัสลูกค้า">
              <input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={modal.mode === "edit"} />
            </Field>
            <Field label="ชื่อลูกค้า / บริษัท">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="เลขบัตรประชาชน / เลขผู้เสียภาษี">
              <input style={inputStyle} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </Field>
            <Field label="เบอร์โทร">
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Line ID">
              <input style={inputStyle} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} />
            </Field>
            <Field label="Email">
              <input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="สถิติจำนวนการส่ง (ครั้ง)">
              <input type="number" style={inputStyle} value={form.deliveries} onChange={(e) => setForm({ ...form, deliveries: e.target.value })} />
            </Field>
          </div>
          <Field label="ที่อยู่">
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>

          {/* รูปภาพบัตรประชาชน */}
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>รูปภาพบัตรประชาชน</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div>
                {form.idCardImage ? (
                  <img src={form.idCardImage} alt="บัตรประชาชน" style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                ) : (
                  <div style={{ width: 160, height: 100, borderRadius: 8, border: "1.5px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#9ca3af", background: "#f9fafb" }}>
                    <FileText size={28} />
                    <span style={{ fontSize: 12 }}>ยังไม่มีรูปภาพ</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ ...btnSecondary, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <Download size={14} /> อัปโหลดรูปบัตรประชาชน
                  <input type="file" accept="image/*" onChange={handleIdCardImage} style={{ display: "none" }} />
                </label>
                {form.idCardImage && (
                  <button style={btnDanger} onClick={() => setForm((f) => ({ ...f, idCardImage: "" }))}>
                    <X size={14} /> ลบรูปภาพ
                  </button>
                )}
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>รองรับ JPG, PNG, WEBP (รูปจะเก็บในระบบ)</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600, fontSize: 14 }}>บัญชีธนาคารของลูกค้า (เพิ่มได้หลายบัญชี)</div>
          {(form.bankAccounts || []).length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 0 }}>ยังไม่มีบัญชีธนาคาร</p>}
          {(form.bankAccounts || []).map((b, idx) => (
            <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.4fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <select style={inputStyle} value={b.bankName} onChange={(e) => updateBankAccount(idx, "bankName", e.target.value)}>
                {BANK_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input style={inputStyle} placeholder="เลขที่บัญชี" value={b.accountNo} onChange={(e) => updateBankAccount(idx, "accountNo", e.target.value)} />
              <input style={inputStyle} placeholder="ชื่อบัญชี" value={b.accountName} onChange={(e) => updateBankAccount(idx, "accountName", e.target.value)} />
              <button style={btnDanger} onClick={() => removeBankAccount(idx)}><Trash2 size={14} /></button>
            </div>
          ))}
          <button style={btnSecondary} onClick={addBankAccount}><Plus size={14} /> เพิ่มบัญชีธนาคาร</button>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================================================================
// PURCHASES TAB (ใบรับสินค้า)
// ===================================================================
function PurchasesTab({ products, customers, purchases, setPurchases, storeBankAccounts, deposits, companySettings }) {
  const [modal, setModal] = useState(null); // {mode:'add'|'edit'|'view', item}
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const blankItem = () => ({ productId: products[0]?.id || "", qty: 0, deduct: 0, price: 0 });
  const blankPayment = () => ({
    id: "PM" + Date.now().toString().slice(-6),
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    fromStoreBankId: storeBankAccounts[0]?.id || "",
    method: PAYMENT_METHODS[0],
  });
  const blankForm = () => ({ id: "", date: new Date().toISOString().slice(0, 10), customerId: customers[0]?.id || "", status: "รออนุมัติ", paymentMethod: PURCHASE_PAYMENT_CHANNELS[0], receivingCustomerBankId: "", items: [blankItem()], payments: [], vatRate: 0, vehiclePlate: "" });
  const [form, setForm] = useState(blankForm());

  const custName = (id) => customers.find((c) => c.id === id)?.name || id;
  const prodName = (id) => products.find((p) => p.id === id)?.name || id;
  const prodUnit = (id) => products.find((p) => p.id === id)?.unit || "";
  const custBankAccounts = (customerId) => customers.find((c) => c.id === customerId)?.bankAccounts || [];

  const filtered = purchases.filter((po) => po.id.includes(search) || custName(po.customerId).includes(search)).sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));

  // ยอดมัดจำคงเหลือของลูกค้าที่เลือก (ไม่รวมยอดที่กำลังหักในใบนี้ จากใบอื่นๆทั้งหมด)
  const depositBalanceForCustomer = (customerId, excludePoId) => {
    const totalGiven = (deposits || []).filter((d) => d.customerId === customerId).reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalUsedOtherPOs = purchases
      .filter((po) => po.customerId === customerId && po.id !== excludePoId)
      .reduce((s, po) => s + (po.payments || []).filter((p) => p.fromStoreBankId === "DEPOSIT").reduce((s2, p) => s2 + (Number(p.amount) || 0), 0), 0);
    return totalGiven - totalUsedOtherPOs;
  };

  const openAdd = () => {
    setForm({ ...blankForm(), id: genId("PO", purchases) });
    setModal({ mode: "add" });
  };
  const openEdit = (item) => { setForm(JSON.parse(JSON.stringify({ payments: [], status: "รออนุมัติ", paymentMethod: PURCHASE_PAYMENT_CHANNELS[0], receivingCustomerBankId: "", vatRate: 0, ...item }))); setModal({ mode: "edit", item }); };
  const openView = (item) => setModal({ mode: "view", item });

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, blankItem()] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  // --- การจ่ายชำระแบบแบ่งจ่ายได้หลายครั้ง ---
  const addPayment = () => {
    setForm({ ...form, payments: [...(form.payments || []), blankPayment()] });
  };
  const updatePayment = (idx, field, value) => {
    const payments = [...(form.payments || [])];
    payments[idx] = { ...payments[idx], [field]: value };
    setForm({ ...form, payments });
  };
  const removePayment = (idx) => setForm({ ...form, payments: (form.payments || []).filter((_, i) => i !== idx) });

  const save = () => {
    if (!form.id.trim() || form.items.length === 0) return;
    const cleaned = {
      ...form,
      items: form.items.map((it) => ({ ...it, qty: Number(it.qty) || 0, deduct: Number(it.deduct) || 0, net: (Number(it.qty) || 0) - (Number(it.deduct) || 0), price: Number(it.price) || 0 })),
      payments: (form.payments || []).map((p) => ({ ...p, amount: Number(p.amount) || 0 })),
    };
    if (modal.mode === "add") setPurchases([...purchases, cleaned]);
    else setPurchases(purchases.map((p) => (p.id === modal.item.id ? cleaned : p)));
    setModal(null);
  };

  const remove = (id) => setPurchases(purchases.filter((p) => p.id !== id));

  const approve = (id) => setPurchases(purchases.map((p) => (p.id === id ? { ...p, status: "อนุมัติแล้ว" } : p)));
  const cancelPO = (id) => setPurchases(purchases.map((p) => (p.id === id ? { ...p, status: "ยกเลิก" } : p)));
  const revertToPending = (id) => setPurchases(purchases.map((p) => (p.id === id ? { ...p, status: "รออนุมัติ" } : p)));

  const lineTotal = (it) => ((Number(it.qty) || 0) - (Number(it.deduct) || 0)) * (Number(it.price) || 0);
  const subtotalBeforeVat = (po) => po.items.reduce((s, it) => s + ((it.net != null ? it.net : it.qty - it.deduct) * it.price), 0);
  const vatAmount = (po) => subtotalBeforeVat(po) * ((Number(po.vatRate) || 0) / 100);
  const grandTotal = (po) => subtotalBeforeVat(po) + vatAmount(po);
  const paidTotal = (po) => (po.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const statusBadge = (status) => {
    if (status === "อนุมัติแล้ว") return { bg: "#eaf3de", color: "#27500a", icon: CheckCircle2 };
    if (status === "ยกเลิก") return { bg: "#fcebeb", color: "#791f1f", icon: XCircle };
    return { bg: "#faeeda", color: "#854f0b", icon: Clock };
  };

  return (
    <div>
      <Header title="ใบรับสินค้า (รับซื้อของเก่า)" subtitle="บันทึกการรับซื้อสินค้าจากลูกค้า">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ExportToolbar
            onPDF={() => printAsPDF("tab-export-purchases", "ใบรับสินค้า")}
            onExcel={() => {
              const rows = [
                ["เลขที่ใบรับ", "วันที่", "ลูกค้า", "สถานะ", "รายการสินค้า", "จำนวน", "ราคา/หน่วย", "รวม"],
                ...filtered.flatMap((po) =>
                  po.items.map((it, i) => [
                    i === 0 ? po.id : "", i === 0 ? po.date : "", i === 0 ? custName(po.customerId) : "", i === 0 ? po.status : "",
                    prodName(it.productId), it.net, it.price, it.net * it.price,
                  ])
                ),
              ];
              exportExcel(rows, "ใบรับสินค้า.xlsx", "ใบรับสินค้า");
            }}
            onImage={() => printAsPDF("tab-export-purchases", "ใบรับสินค้า")}
          />
          <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> สร้างใบรับสินค้า</button>
        </div>
      </Header>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลขที่ใบรับ หรือชื่อลูกค้า..." />
      <div id="tab-export-purchases">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((po) => {
          const sb = statusBadge(po.status || "รออนุมัติ");
          const SIcon = sb.icon;
          const paid = paidTotal(po);
          const total = grandTotal(po);
          const remaining = total - paid;
          const payBadge = remaining <= 0 ? { bg: "#eaf3de", color: "#27500a", icon: CheckCircle2, label: "ชำระแล้ว" }
            : paid > 0 ? { bg: "#faeeda", color: "#854f0b", icon: Clock, label: "ชำระบางส่วน" }
            : { bg: "#fcebeb", color: "#791f1f", icon: Clock, label: "ค้างจ่าย" };
          const PIcon = payBadge.icon;
          const isExpanded = expanded === po.id;

          return (
            <div key={po.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, color: "#6b7280" }}>
                      <FileText size={14} /> {po.id}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{custName(po.customerId)}</span>
                    <span style={{ background: sb.bg, color: sb.color, padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <SIcon size={13} /> {po.status || "รออนุมัติ"}
                    </span>
                    <span style={{ background: payBadge.bg, color: payBadge.color, padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <PIcon size={13} /> {payBadge.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, fontSize: 13, color: "#6b7280", flexWrap: "wrap" }}>
                    <span>วันที่: {po.date}</span>
                    <span>{po.items.length} รายการสินค้า</span>
                    <span>{po.paymentMethod || "เงินสด"}</span>
                    {po.vehiclePlate && <span style={{ background: "#f3f4f6", padding: "1px 8px", borderRadius: 4, fontSize: 12 }}>🚛 {po.vehiclePlate}</span>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    {(po.vatRate > 0) && <div style={{ fontSize: 11, color: "#9ca3af" }}>ก่อน VAT: ฿{fmt(subtotalBeforeVat(po))}</div>}
                    {(po.vatRate > 0) && <div style={{ fontSize: 11, color: "#9ca3af" }}>VAT {po.vatRate}%: +฿{fmt(vatAmount(po))}</div>}
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>ยอดรวม</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#993c1d" }}>฿{fmt(total)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(po.status || "รออนุมัติ") === "อนุมัติแล้ว" ? (
                      <button
                        style={{ ...iconBtn, background: "#639922", borderColor: "#639922", color: "#fff" }}
                        onClick={() => revertToPending(po.id)}
                        aria-label="อนุมัติแล้ว (กดเพื่อยกเลิกอนุมัติ)"
                        title="อนุมัติแล้ว — กดเพื่อยกเลิกอนุมัติ"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    ) : (
                      <button
                        style={{ ...iconBtn, background: "#e24b4a", borderColor: "#e24b4a", color: "#fff" }}
                        onClick={() => approve(po.id)}
                        aria-label="ยังไม่อนุมัติ (กดเพื่ออนุมัติ)"
                        title="ยังไม่อนุมัติ — กดเพื่ออนุมัติ"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    <button style={iconBtn} onClick={() => setExpanded(isExpanded ? null : po.id)} aria-label="รายละเอียด" title="ดูรายละเอียด">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <button style={iconBtn} onClick={() => openView(po)} aria-label="พิมพ์ PDF"><Printer size={16} /></button>
                    <button style={iconBtn} onClick={() => openEdit(po)} aria-label="แก้ไข"><Edit2 size={16} /></button>
                    <button style={btnDanger} onClick={() => remove(po.id)} aria-label="ลบ"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>สินค้า</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>หัก</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>สุทธิ</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>ราคา/หน่วย</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map((it, idx) => (
                        <tr key={idx}>
                          <td style={tdStyle}>{prodName(it.productId)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.qty)} {prodUnit(it.productId)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.deduct)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.net != null ? it.net : it.qty - it.deduct)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.price)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt((it.net != null ? it.net : it.qty - it.deduct) * it.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 13, maxWidth: 360 }}>
                    <Row label="ยอดก่อน VAT" value={`฿${fmt(subtotalBeforeVat(po))}`} />
                    {(po.vatRate > 0) && <Row label={`VAT ${po.vatRate}%`} value={`+฿${fmt(vatAmount(po))}`} color="#993c1d" />}
                    <Row label="ยอดรวมที่ต้องชำระ" value={`฿${fmt(total)}`} bold />
                    <Row label="ชำระแล้ว" value={`฿${fmt(paid)}`} />
                    <Row label="คงค้าง" value={`฿${fmt(remaining)}`} bold color={remaining > 0 ? "#a32d2d" : "#27500a"} />
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(po.status || "รออนุมัติ") === "รออนุมัติ" && (
                      <button style={{ ...iconBtn, color: "#0f6e56", borderColor: "#9fe1cb" }} onClick={() => approve(po.id)}><CheckCircle2 size={14} /> อนุมัติ</button>
                    )}
                    {(po.status || "รออนุมัติ") === "อนุมัติแล้ว" && (
                      <button style={iconBtn} onClick={() => revertToPending(po.id)}><Clock size={14} /> ยกเลิกอนุมัติ</button>
                    )}
                    {(po.status || "รออนุมัติ") !== "ยกเลิก" && (
                      <button style={btnDanger} onClick={() => cancelPO(po.id)}><XCircle size={14} /> ยกเลิกใบรับ</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "24px", textAlign: "center", color: "#9ca3af" }}>
            ไม่พบใบรับสินค้า
          </div>
        )}
      </div>

      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <Modal title={`${modal.mode === "add" ? "สร้างใบรับสินค้า" : "แก้ไขใบรับสินค้า"}${modal.mode === "edit" ? " · " + form.id : ""}`} onClose={() => setModal(null)} wide fullscreen>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: "0 16px" }}>
            <Field label="เลขที่ใบรับสินค้า">
              <input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            </Field>
            <Field label="วันที่ซื้อ">
              <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="ลูกค้า (ผู้ขาย)">
              <CustomerSelect customers={customers} value={form.customerId} onChange={(cid) => setForm({ ...form, customerId: cid })} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "0 16px" }}>
            <Field label="ช่องทางชำระเงิน">
              <select style={inputStyle} value={form.paymentMethod || PURCHASE_PAYMENT_CHANNELS[0]} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {PURCHASE_PAYMENT_CHANNELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="บัญชีลูกค้าที่จะรับเงิน">
              <select style={inputStyle} value={form.receivingCustomerBankId || ""} onChange={(e) => setForm({ ...form, receivingCustomerBankId: e.target.value })}>
                <option value="">-- เลือกบัญชีลูกค้า --</option>
                {custBankAccounts(form.customerId).map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNo} ({b.accountName})</option>)}
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500, color: "#374151" }}>สถานะใบรับสินค้า</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <button
              onClick={() => setForm({ ...form, status: "รออนุมัติ" })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 14, cursor: "pointer",
                border: (form.status || "รออนุมัติ") === "รออนุมัติ" ? "1px solid #f0997b" : "1px solid #d1d5db",
                background: (form.status || "รออนุมัติ") === "รออนุมัติ" ? "#faece7" : "#fff",
                color: (form.status || "รออนุมัติ") === "รออนุมัติ" ? "#993c1d" : "#374151",
                fontWeight: (form.status || "รออนุมัติ") === "รออนุมัติ" ? 600 : 400,
              }}
            >
              <Clock size={15} /> รออนุมัติ
            </button>
            <button
              onClick={() => setForm({ ...form, status: "อนุมัติแล้ว" })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 14, cursor: "pointer",
                border: form.status === "อนุมัติแล้ว" ? "1px solid #5dcaa5" : "1px solid #d1d5db",
                background: form.status === "อนุมัติแล้ว" ? "#e1f5ee" : "#fff",
                color: form.status === "อนุมัติแล้ว" ? "#085041" : "#374151",
                fontWeight: form.status === "อนุมัติแล้ว" ? 600 : 400,
              }}
            >
              <CheckCircle2 size={15} /> อนุมัติแล้ว
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 0, marginBottom: 16 }}>
            ใบที่ "รออนุมัติ" จะยังไม่นำเข้าสต๊อกและไม่ตัดบัญชี จนกว่าจะอนุมัติ
          </p>

          <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600, fontSize: 14 }}>สินค้า</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
              <thead>
                <tr>
                  <th style={thStyle}>สินค้า</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                  <th style={thStyle}>หน่วย</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>หัก</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>สุทธิ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ราคา/หน่วย</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงิน</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}>
                      <ProductSelect products={products} value={it.productId} onChange={(pid) => updateItem(idx, "productId", pid)} />
                    </td>
                    <td style={tdStyle}><input type="number" style={{ ...inputStyle, width: 90, textAlign: "right" }} value={it.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} /></td>
                    <td style={{ ...tdStyle, color: "#9ca3af" }}>{prodUnit(it.productId)}</td>
                    <td style={tdStyle}><input type="number" style={{ ...inputStyle, width: 80, textAlign: "right" }} value={it.deduct} onChange={(e) => updateItem(idx, "deduct", e.target.value)} /></td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500, color: "#9ca3af" }}>{fmt((Number(it.qty) || 0) - (Number(it.deduct) || 0))}</td>
                    <td style={tdStyle}><input type="number" style={{ ...inputStyle, width: 90, textAlign: "right" }} value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} /></td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>{fmt(lineTotal(it))}</td>
                    <td style={tdStyle}><button style={btnDanger} onClick={() => removeItem(idx)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 10 }}>
            <button style={btnSecondary} onClick={addItem}><Plus size={14} /> เพิ่มรายการสินค้า</button>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <label style={{ color: "#6b7280" }}>VAT (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  style={{ ...inputStyle, width: 80 }}
                  value={form.vatRate}
                  onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                ก่อน VAT: ฿{fmt(form.items.reduce((s, it) => s + lineTotal(it), 0))}
                {Number(form.vatRate) > 0 && (
                  <span style={{ color: "#993c1d", marginLeft: 10 }}>
                    VAT {form.vatRate}%: +฿{fmt(form.items.reduce((s, it) => s + lineTotal(it), 0) * ((Number(form.vatRate) || 0) / 100))}
                    &nbsp;|&nbsp; รวม: ฿{fmt(form.items.reduce((s, it) => s + lineTotal(it), 0) * (1 + (Number(form.vatRate) || 0) / 100))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginTop: 12 }}>
            <Field label="ทะเบียนรถ (ถ้ามี)">
              <input style={inputStyle} value={form.vehiclePlate || ""} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} placeholder="เช่น กข 1234" />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              การชำระเงิน (แบ่งชำระได้หลายครั้ง)
            </div>
            <button style={btnSecondary} onClick={addPayment}><Plus size={14} /> เพิ่มการจ่ายเงิน</button>
          </div>

          {(form.payments || []).length === 0 ? (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              ยังไม่มีการชำระเงิน — กด "เพิ่มการจ่ายเงิน" เพื่อบันทึกแต่ละครั้งที่จ่าย/รับเงิน
            </div>
          ) : (
            (form.payments || []).map((p, idx) => {
              const availableDeposit = depositBalanceForCustomer(form.customerId, modal?.item?.id);
              const usedInThisFormSoFar = (form.payments || [])
                .slice(0, idx)
                .filter((pp) => pp.fromStoreBankId === "DEPOSIT")
                .reduce((s, pp) => s + (Number(pp.amount) || 0), 0);
              const remainingDepositForThisRow = availableDeposit - usedInThisFormSoFar;
              return (
                <div key={p.id}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr 1fr auto", gap: 8, marginBottom: 4, alignItems: "center" }}>
                    <input type="date" style={inputStyle} value={p.date} onChange={(e) => updatePayment(idx, "date", e.target.value)} />
                    <input type="number" style={{ ...inputStyle, textAlign: "right" }} placeholder="จำนวนเงิน" value={p.amount} onChange={(e) => updatePayment(idx, "amount", e.target.value)} />
                    <select style={inputStyle} value={p.fromStoreBankId} onChange={(e) => updatePayment(idx, "fromStoreBankId", e.target.value)}>
                      <option value="">-- เลือกบัญชี/วิธีจ่าย --</option>
                      <option value="CASH">เงินสดหน้าร้าน</option>
                      <option value="DEPOSIT">หักเงินมัดจำ</option>
                      {storeBankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNo}</option>)}
                    </select>
                    <select style={inputStyle} value={p.method} onChange={(e) => updatePayment(idx, "method", e.target.value)}>
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button style={btnDanger} onClick={() => removePayment(idx)}><Trash2 size={14} /></button>
                  </div>
                  {p.fromStoreBankId === "DEPOSIT" && (
                    <p style={{ fontSize: 12, color: (Number(p.amount) || 0) > remainingDepositForThisRow ? "#a32d2d" : "#6b9c8d", marginTop: -2, marginBottom: 8 }}>
                      ลูกค้ามีเงินมัดจำคงเหลือ ฿{fmt(remainingDepositForThisRow)} ก่อนหักรายการนี้
                      {(Number(p.amount) || 0) > remainingDepositForThisRow && " — เกินยอดมัดจำคงเหลือ"}
                    </p>
                  )}
                </div>
              );
            })
          )}

          {(() => {
            const subtotalBeforeVat = form.items.reduce((s, it) => s + lineTotal(it), 0);
            const vat = subtotalBeforeVat * ((Number(form.vatRate) || 0) / 100);
            const total = subtotalBeforeVat + vat;
            const paid = (form.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const remaining = total - paid;
            return (
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginTop: 12, fontSize: 14 }}>
                <Row label="ยอดก่อน VAT" value={`฿${fmt(subtotalBeforeVat)}`} />
                {vat > 0 && <Row label={`VAT ${form.vatRate}%`} value={`+฿${fmt(vat)}`} color="#993c1d" />}
                <Row label="ยอดรวมที่ต้องชำระ" value={`฿${fmt(total)}`} bold />
                <Row label="ชำระแล้ว" value={`฿${fmt(paid)}`} />
                <Row label="คงค้าง" value={`฿${fmt(remaining)}`} bold color={remaining > 0 ? "#a32d2d" : remaining < 0 ? "#a32d2d" : "#27500a"} />
              </div>
            );
          })()}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}

      {modal && modal.mode === "view" && (
        <PurchasePdfModal po={modal.item} customer={customers.find((c) => c.id === modal.item.customerId)} products={products} storeBankAccounts={storeBankAccounts} companySettings={companySettings} onClose={() => setModal(null)} />
      )}
      </div>{/* end tab-export-purchases */}
    </div>
  );
}

function PurchasePdfModal({ po, customer, products, storeBankAccounts, companySettings, onClose }) {
  const cs = companySettings || {};
  const prodInfo = (id) => products.find((p) => p.id === id) || { name: id, unit: "" };
  const subtotal = po.items.reduce((s, it) => s + (it.net != null ? it.net : it.qty - it.deduct) * it.price, 0);
  const vat = subtotal * ((Number(po.vatRate) || 0) / 100);
  const total = subtotal + vat;
  const primaryColor = cs.primaryColor || "#0f6e56";

  return (
    <Modal title={`${cs.purchaseTitle || "ใบรับสินค้า"} ${po.id}`} onClose={onClose} wide>
      <div id="purchase-pdf-content" style={{ background: "#fff", padding: "24px", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "'Noto Sans Thai', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${primaryColor}`, paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {cs.logo && (
              <img src={cs.logo} alt="logo" style={{ height: 60, maxWidth: 120, objectFit: "contain" }} />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: primaryColor }}>{cs.name || "วงจรกรีน รีไซเคิล"}</div>
              {cs.nameEn && <div style={{ fontSize: 12, color: "#6b7280" }}>{cs.nameEn}</div>}
              {cs.taxId && <div style={{ fontSize: 12, color: "#6b7280" }}>เลขผู้เสียภาษี: {cs.taxId}</div>}
              {cs.address && <div style={{ fontSize: 12, color: "#6b7280" }}>{cs.address}</div>}
              {cs.phone && <div style={{ fontSize: 12, color: "#6b7280" }}>โทร: {cs.phone}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: primaryColor }}>{cs.purchaseTitle || "ใบรับสินค้า"}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>เลขที่: {po.id}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>วันที่: {po.date}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              สถานะ: <span style={{ fontWeight: 600, color: po.status === "อนุมัติแล้ว" ? "#0f6e56" : po.status === "ยกเลิก" ? "#a32d2d" : "#854f0b" }}>{po.status || "รออนุมัติ"}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>ข้อมูลผู้ขาย/ผู้ส่งสินค้า</div>
          <div>{customer?.name}</div>
          <div style={{ color: "#6b7280" }}>{customer?.address}</div>
          <div style={{ color: "#6b7280" }}>โทร: {customer?.phone} | เลขผู้เสียภาษี: {customer?.taxId}</div>
          {po.vehiclePlate && (
            <div style={{ marginTop: 4, color: "#374151" }}>
              🚛 ทะเบียนรถ: <strong>{po.vehiclePlate}</strong>
            </div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: primaryColor + "22" }}>
              <th style={{ ...thStyle, color: primaryColor }}>สินค้า</th>
              <th style={{ ...thStyle, color: primaryColor, textAlign: "right" }}>จำนวน</th>
              <th style={{ ...thStyle, color: primaryColor, textAlign: "right" }}>หัก</th>
              <th style={{ ...thStyle, color: primaryColor, textAlign: "right" }}>สุทธิ</th>
              <th style={{ ...thStyle, color: primaryColor, textAlign: "right" }}>ราคา/หน่วย</th>
              <th style={{ ...thStyle, color: primaryColor, textAlign: "right" }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it, idx) => {
              const p = prodInfo(it.productId);
              const net = it.net != null ? it.net : it.qty - it.deduct;
              return (
                <tr key={idx}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.qty)} {p.unit}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.deduct)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(net)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.price)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(net * it.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <div style={{ width: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
              <span>ยอดก่อน VAT</span><span>{fmt(subtotal)} บาท</span>
            </div>
            {(po.vatRate > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#993c1d" }}>
                <span>VAT {po.vatRate}%</span><span>+{fmt(vat)} บาท</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "2px solid #0f6e56", fontWeight: 700, fontSize: 15 }}>
              <span>จำนวนเงินสุทธิ</span>
              <span>{fmt(total)} บาท</span>
            </div>
          </div>
        </div>

        {cs.footerNote && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#f9fafb", borderRadius: 6, fontSize: 12, color: "#6b7280" }}>
            {cs.footerNote}
          </div>
        )}

        {cs.showSignature !== false && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, fontSize: 12 }}>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้รับสินค้า</div>
            </div>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้ส่งสินค้า / ลูกค้า</div>
            </div>
          </div>
        )}

        {(po.payments || []).length > 0 && (
          <div style={{ marginTop: 24, borderTop: "1px dashed #d1d5db", paddingTop: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>รายละเอียดช่องทางการชำระเงิน</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
              ช่องทางชำระเงิน: {po.paymentMethod || "-"}
              {(() => {
                const b = (customer?.bankAccounts || []).find((x) => x.id === po.receivingCustomerBankId);
                return b ? ` — บัญชีรับเงิน: ${b.bankName} ${b.accountNo} (${b.accountName})` : "";
              })()}
            </div>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>
              ชำระแล้วทั้งหมด: {fmt((po.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0))} บาท
              {" / "}คงเหลือ: {fmt(total - (po.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0))} บาท
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button style={btnSecondary} onClick={onClose}>ปิด</button>
        <button style={btnPrimary} onClick={() => window.print()}><Download size={16} /> พิมพ์ / บันทึก PDF</button>
      </div>
    </Modal>
  );
}

// ===================================================================
// SALES TAB
// ===================================================================
// WITHDRAWALS TAB (เบิกสินค้าเพื่อขาย)
// ===================================================================
// ซิงค์ยอดเบิกที่ผูกกับใบขายแต่ละใบ: รวมจำนวน+มูลค่าของทุก LOT ตาม (targetSaleId, targetProductId)
// แล้วเขียนกลับเป็นรายการสินค้า (item) ในใบขายนั้น (สร้าง/อัปเดต/ลบ ตามความเหมาะสม)
// ราคาขาย (price) ที่ผู้ใช้กำหนดไว้เองจะยังคงอยู่ ไม่ถูกเขียนทับ
function syncWithdrawalsToSales(sales, withdrawalLots) {
  // group ทุกรายการเบิกในทุก LOT ตาม targetSaleId -> targetProductId
  const bySale = {};
  withdrawalLots.forEach((lot) => {
    if (!lot.targetSaleId) return;
    (lot.items || []).forEach((it) => {
      if (!it.targetProductId) return;
      if (!bySale[lot.targetSaleId]) bySale[lot.targetSaleId] = {};
      if (!bySale[lot.targetSaleId][it.targetProductId]) bySale[lot.targetSaleId][it.targetProductId] = { qty: 0, value: 0 };
      bySale[lot.targetSaleId][it.targetProductId].qty += Number(it.qty) || 0;
      bySale[lot.targetSaleId][it.targetProductId].value += Number(it.value) || 0;
    });
  });

  return sales.map((inv) => {
    const groups = bySale[inv.id];
    // เก็บรายการที่ไม่ใช่มาจากการเบิก ไว้เหมือนเดิม
    const nonWithdrawalItems = inv.items.filter((it) => !it.fromWithdrawal);
    if (!groups) {
      // ไม่มีรายการเบิกผูกกับใบนี้ -> เอารายการ fromWithdrawal เดิมออกถ้ามี (ไม่มีข้อมูลเบิกแล้ว)
      return inv.items.some((it) => it.fromWithdrawal) ? { ...inv, items: nonWithdrawalItems } : inv;
    }
    const withdrawalItems = Object.entries(groups).map(([targetProductId, g]) => {
      const existing = inv.items.find((it) => it.fromWithdrawal && it.productId === targetProductId);
      const avgCost = g.qty > 0 ? g.value / g.qty : 0;
      // คงค่า "จำนวนหัก" ที่ผู้ใช้แก้ไขเองไว้ (ถ้ามี) แล้วคำนวณจำนวนสุทธิใหม่จาก qty - deduct
      const deduct = existing ? (Number(existing.deduct) || 0) : 0;
      const net = g.qty - deduct;
      return {
        productId: targetProductId,
        qty: g.qty,
        deduct,
        net,
        price: existing ? existing.price : Math.round(avgCost * 100) / 100,
        fromWithdrawal: true,
        withdrawalCost: avgCost,
        withdrawalValue: g.value,
      };
    });
    return { ...inv, items: [...nonWithdrawalItems, ...withdrawalItems] };
  });
}

function WithdrawalsTab({ products, purchases, sales, setSales, withdrawals, setWithdrawals, inventory, customers }) {
  const [modal, setModal] = useState(null); // {mode:'add'|'edit'}
  const [search, setSearch] = useState("");
  const [aggregateSearch, setAggregateSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const prodName = (id) => products.find((p) => p.id === id)?.name || id;
  const prodUnit = (id) => products.find((p) => p.id === id)?.unit || "";
  const custName = (id) => customers.find((c) => c.id === id)?.name || "";

  const blankLineItem = () => ({ sourceProductId: products[0]?.id || "", qty: 0, targetProductId: products[0]?.id || "" });

  const blankForm = () => ({
    id: genId("WD", withdrawals),
    date: new Date().toISOString().slice(0, 10),
    targetSaleMode: "existing", // existing | new
    targetSaleId: sales[0]?.id || "",
    newSaleId: "",
    items: [blankLineItem()],
  });
  const [form, setForm] = useState(blankForm());

  // auto-fill newSaleId when switching to "สร้างใบขายใหม่"
  const setTargetSaleMode = (mode) => {
    if (mode === "new") {
      setForm((f) => ({ ...f, targetSaleMode: mode, newSaleId: genId("INV", sales) }));
    } else {
      setForm((f) => ({ ...f, targetSaleMode: mode, newSaleId: "" }));
    }
  };

  const openAdd = () => { setForm(blankForm()); setModal({ mode: "add" }); };
  const openEdit = (lot) => {
    setForm({
      ...JSON.parse(JSON.stringify(lot)),
      targetSaleMode: "existing",
      newSaleId: "",
      items: lot.items.map((it) => ({ sourceProductId: it.sourceProductId, qty: it.qty, targetProductId: it.targetProductId })),
    });
    setModal({ mode: "edit", item: lot });
  };

  // สต๊อกฐานสำหรับคำนวณ preview: กรณีแก้ไข ให้ตัด LOT เดิมออกก่อน เพื่อความถูกต้อง
  const baseInventory = useMemo(() => {
    if (modal && modal.mode === "edit") {
      const withoutThis = withdrawals.filter((w) => w.id !== modal.item.id);
      return computeInventory(products, purchases, sales, withoutThis);
    }
    return inventory;
  }, [inventory, modal, withdrawals, products, purchases, sales]);

  // preview ของแต่ละรายการในฟอร์ม: ต้องคำนวณทีละรายการตามลำดับ เพราะรายการเดียวกัน (สินค้าต้นทาง)
  // ที่ปรากฏหลายแถวใน LOT เดียวกัน ต้องตัดสต๊อกต่อเนื่องกัน ไม่ใช่คำนวณจากสต๊อกตั้งต้นซ้ำ
  const previews = useMemo(() => {
    // clone lots จาก baseInventory เพื่อจำลองการตัดสต๊อกต่อเนื่องในฟอร์มนี้
    const lotsClone = {};
    Object.keys(baseInventory.lots).forEach((pid) => {
      lotsClone[pid] = baseInventory.lots[pid].map((l) => ({ ...l }));
    });
    const fakeInventory = { ...baseInventory, lots: lotsClone };
    return form.items.map((it) => {
      const result = computeWithdrawalCost(fakeInventory, it.sourceProductId, Number(it.qty) || 0);
      // หักสต๊อกจำลองออกจริง เพื่อให้แถวถัดไปคำนวณต่อเนื่อง
      let remaining = Number(it.qty) || 0;
      const lots = fakeInventory.lots[it.sourceProductId] || [];
      for (let i = 0; i < lots.length && remaining > 0; i++) {
        const lot = lots[i];
        if (lot.qtyRemaining <= 0) continue;
        const take = Math.min(lot.qtyRemaining, remaining);
        lot.qtyRemaining -= take;
        remaining -= take;
      }
      return result;
    });
  }, [baseInventory, form.items]);

  const stockRemaining = useMemo(() => {
    // คงเหลือสต๊อกของสินค้าต้นทาง โดยพิจารณายอดที่ถูกใช้ไปแล้วจากแถวก่อนหน้าในฟอร์มเดียวกัน
    const result = {};
    const used = {};
    form.items.forEach((it, idx) => {
      const base = baseInventory.summary.find((s) => s.productId === it.sourceProductId)?.qty || 0;
      const usedSoFar = used[it.sourceProductId] || 0;
      result[idx] = base - usedSoFar;
      used[it.sourceProductId] = usedSoFar + (Number(it.qty) || 0);
    });
    return result;
  }, [baseInventory, form.items]);

  const updateLineItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };
  const addLineItem = () => setForm({ ...form, items: [...form.items, blankLineItem()] });
  const removeLineItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const lotTotalValue = previews.reduce((s, p) => s + p.value, 0);

  const save = () => {
    let targetSaleId = form.targetSaleMode === "new" ? form.newSaleId.trim() : form.targetSaleId;
    if (!targetSaleId) return;
    if (form.items.length === 0) return;

    const lineItems = form.items.map((it, idx) => {
      const qty = Number(it.qty) || 0;
      const { value, shortfall } = previews[idx];
      return {
        sourceProductId: it.sourceProductId,
        qty,
        value,
        avgCost: qty > 0 ? value / qty : 0,
        shortfall,
        targetProductId: it.targetProductId,
      };
    }).filter((it) => it.qty > 0 && it.sourceProductId && it.targetProductId);

    if (lineItems.length === 0) return;

    const newLot = {
      id: form.id.trim() || blankForm().id,
      date: form.date,
      targetSaleId,
      items: lineItems,
    };

    let updatedSales = sales;
    // สร้างใบขายใหม่ถ้าจำเป็น
    if (!sales.find((s) => s.id === targetSaleId)) {
      updatedSales = [...sales, {
        id: targetSaleId, date: form.date, customerId: customers[0]?.id || "",
        items: [], discount: 0, vatRate: 7, paymentMethod: PAYMENT_METHODS[0], paymentStatus: PAYMENT_STATUSES[0],
      }];
    }

    const updatedWithdrawals = modal.mode === "edit"
      ? withdrawals.map((w) => (w.id === modal.item.id ? newLot : w))
      : [...withdrawals, newLot];

    setSales(syncWithdrawalsToSales(updatedSales, updatedWithdrawals));
    setWithdrawals(updatedWithdrawals);
    setModal(null);
  };

  const remove = (id) => {
    const updatedWithdrawals = withdrawals.filter((w) => w.id !== id);
    setSales(syncWithdrawalsToSales(sales, updatedWithdrawals));
    setWithdrawals(updatedWithdrawals);
  };

  const filtered = withdrawals.filter((w) =>
    w.id.includes(search) || (w.targetSaleId || "").includes(search) ||
    (w.items || []).some((it) => prodName(it.sourceProductId).includes(search) || prodName(it.targetProductId).includes(search))
  ).sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));

  const lotTotal = (lot) => (lot.items || []).reduce((s, it) => s + (Number(it.value) || 0), 0);
  const lotQtyTotal = (lot) => (lot.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);

  // สรุปยอดรวมของแต่ละใบขาย+สินค้าเป้าหมาย เพื่อแสดงตัวอย่างผลลัพธ์
  const aggregates = useMemo(() => {
    const groups = {};
    withdrawals.forEach((lot) => {
      if (!lot.targetSaleId) return;
      (lot.items || []).forEach((it) => {
        if (!it.targetProductId) return;
        const key = `${lot.targetSaleId}__${it.targetProductId}`;
        if (!groups[key]) groups[key] = { saleId: lot.targetSaleId, productId: it.targetProductId, qty: 0, value: 0 };
        groups[key].qty += Number(it.qty) || 0;
        groups[key].value += Number(it.value) || 0;
      });
    });
    return Object.values(groups).map((g) => ({ ...g, avgCost: g.qty > 0 ? g.value / g.qty : 0 }));
  }, [withdrawals]);

  const filteredAggregates = aggregates.filter((g) =>
    g.saleId.toLowerCase().includes(aggregateSearch.toLowerCase()) ||
    prodName(g.productId).toLowerCase().includes(aggregateSearch.toLowerCase())
  );

  return (
    <div>
      <Header title="เบิกสินค้าเพื่อขาย" subtitle="เบิกสินค้าเป็น LOT (ตัดสต๊อกทันทีตามต้นทุน FIFO) เพื่อนำไปเปิดบิลขาย — 1 LOT เบิกได้หลายรายการ">
        <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> สร้างใบเบิกสินค้า (LOT)</button>
      </Header>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลขที่ LOT, สินค้า หรือเลข Invoice..." />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((lot) => {
          const isExpanded = expanded === lot.id;
          return (
            <div key={lot.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, color: "#534ab7" }}>
                      <PackageMinus size={14} /> {lot.id}
                    </span>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      → Invoice <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{lot.targetSaleId}</span>
                      {sales.find((s) => s.id === lot.targetSaleId) && <> ({custName(sales.find((s) => s.id === lot.targetSaleId)?.customerId)})</>}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, fontSize: 13, color: "#6b7280", flexWrap: "wrap" }}>
                    <span>วันที่: {lot.date}</span>
                    <span>{(lot.items || []).length} รายการเบิก</span>
                    <span>รวม {fmt(lotQtyTotal(lot))} หน่วย</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>มูลค่ารวม</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#534ab7" }}>฿{fmt(lotTotal(lot))}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={iconBtn} onClick={() => setExpanded(isExpanded ? null : lot.id)} aria-label="รายละเอียด" title="ดูรายละเอียด">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <button style={iconBtn} onClick={() => openEdit(lot)} aria-label="แก้ไข"><Edit2 size={16} /></button>
                    <button style={btnDanger} onClick={() => remove(lot.id)} aria-label="ลบ"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>สินค้าที่เบิก (ต้นทาง)</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>จำนวนที่เบิก</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>มูลค่าที่เบิก</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย/หน่วย</th>
                        <th style={thStyle}></th>
                        <th style={thStyle}>นำไปขายเป็นสินค้า (เป้าหมาย)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lot.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td style={tdStyle}>{prodName(it.sourceProductId)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.qty)} {prodUnit(it.sourceProductId)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(it.value)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            ฿{fmt(it.avgCost)}
                            {it.shortfall > 0 && <span style={{ color: "#a32d2d", fontSize: 11, marginLeft: 4 }}>(สต๊อกขาด {fmt(it.shortfall)})</span>}
                          </td>
                          <td style={{ ...tdStyle, color: "#9ca3af" }}><ArrowRight size={14} /></td>
                          <td style={tdStyle}>{prodName(it.targetProductId)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "24px", textAlign: "center", color: "#9ca3af" }}>
            ยังไม่มีรายการเบิกสินค้า
          </div>
        )}
      </div>

      {aggregates.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>สรุปยอดต้นทุนรวมที่ไปลงในใบขาย</h3>
          <SearchBar value={aggregateSearch} onChange={setAggregateSearch} placeholder="ค้นหาเลข Invoice หรือสินค้า..." />
          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>เลข Invoice</th>
                  <th style={thStyle}>สินค้าในใบขาย</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนรวม</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>มูลค่ารวม</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ยใหม่</th>
                </tr>
              </thead>
              <tbody>
                {filteredAggregates.map((g) => (
                  <tr key={`${g.saleId}__${g.productId}`}>
                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}>{g.saleId}</td>
                    <td style={tdStyle}>{prodName(g.productId)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(g.qty)} {prodUnit(g.productId)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(g.value)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#534ab7" }}>฿{fmt(g.avgCost)}</td>
                  </tr>
                ))}
                {filteredAggregates.length === 0 && (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่พบรายการที่ค้นหา</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "add" ? "สร้างใบเบิกสินค้า (LOT)" : `แก้ไขใบเบิกสินค้า · ${form.id}`} onClose={() => setModal(null)} wide fullscreen>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr", gap: "0 16px" }}>
            <Field label="เลขที่ใบเบิก (LOT)">
              <input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            </Field>
            <Field label="วันที่เบิก">
              <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="นำไปเปิดบิลขาย (Invoice)">
              <div style={{ display: "flex", gap: 8 }}>
                <select style={inputStyle} value={form.targetSaleMode} onChange={(e) => setTargetSaleMode(e.target.value)}>
                  <option value="existing">เลือกใบขายเดิม</option>
                  <option value="new">สร้างใบขายใหม่</option>
                </select>
                {form.targetSaleMode === "existing" ? (
                  <select style={inputStyle} value={form.targetSaleId} onChange={(e) => setForm({ ...form, targetSaleId: e.target.value })}>
                    <option value="">-- เลือก Invoice --</option>
                    {sales.map((s) => <option key={s.id} value={s.id}>{s.id} · {custName(s.customerId)}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} placeholder="เช่น INV-2606-005" value={form.newSaleId} onChange={(e) => setForm({ ...form, newSaleId: e.target.value })} />
                )}
              </div>
            </Field>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: -8 }}>
            * ทุกรายการในใบเบิกนี้จะถูกนำไปรวมกับยอดเดิมในใบขายเดียวกัน หากสินค้าเป้าหมายซ้ำกับใบเบิกอื่น ระบบจะรวมจำนวน/มูลค่า และคำนวณราคาเฉลี่ยใหม่ให้อัตโนมัติ
          </p>

          <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600, fontSize: 14 }}>รายการเบิกสินค้า</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={thStyle}>สินค้าที่เบิก (ต้นทาง)</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนที่เบิก</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือสต๊อก</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>มูลค่าที่เบิก</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ราคาเฉลี่ย/หน่วย</th>
                  <th style={thStyle}></th>
                  <th style={thStyle}>นำไปขายเป็นสินค้า (เป้าหมาย)</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => {
                  const p = previews[idx] || { value: 0, shortfall: 0 };
                  const qty = Number(it.qty) || 0;
                  const avgCost = qty > 0 ? p.value / qty : 0;
                  const remain = stockRemaining[idx] ?? 0;
                  return (
                    <tr key={idx}>
                      <td style={tdStyle}>
                        <ProductSelect products={products} value={it.sourceProductId} onChange={(pid) => updateLineItem(idx, "sourceProductId", pid)} />
                      </td>
                      <td style={tdStyle}><input type="number" style={{ ...inputStyle, width: 90, textAlign: "right" }} value={it.qty} onChange={(e) => updateLineItem(idx, "qty", e.target.value)} /></td>
                      <td style={{ ...tdStyle, textAlign: "right", color: remain < 0 ? "#a32d2d" : "#6b7280" }}>{fmt(remain)} {prodUnit(it.sourceProductId)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#3c3489" }}>฿{fmt(p.value)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        ฿{fmt(avgCost)}
                        {p.shortfall > 0 && <div style={{ color: "#a32d2d", fontSize: 11 }}>(ขาด {fmt(p.shortfall)})</div>}
                      </td>
                      <td style={{ ...tdStyle, color: "#9ca3af" }}><ArrowRight size={14} /></td>
                      <td style={tdStyle}>
                        <ProductSelect products={products} value={it.targetProductId} onChange={(pid) => updateLineItem(idx, "targetProductId", pid)} />
                      </td>
                      <td style={tdStyle}><button style={btnDanger} onClick={() => removeLineItem(idx)}><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 10 }}>
            <button style={btnSecondary} onClick={addLineItem}><Plus size={14} /> เพิ่มรายการเบิก</button>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              มูลค่าที่เบิกรวม: <span style={{ color: "#3c3489" }}>฿{fmt(lotTotalValue)}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SalesTab({ products, customers, sales, setSales, inventory, withdrawals, storeBankAccounts, companySettings }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");

  const blankItem = () => ({ productId: products[0]?.id || "", qty: 0, deduct: 0, price: 0 });
  const blankPayment = () => ({ id: "SP" + Date.now().toString().slice(-6), date: new Date().toISOString().slice(0, 10), amount: 0, method: PAYMENT_METHODS[0], toStoreBankId: "", note: "" });
  const blankForm = () => ({
    id: "", date: new Date().toISOString().slice(0, 10), customerId: customers[0]?.id || "",
    items: [blankItem()], discount: 0, vatRate: 7, paymentStatus: PAYMENT_STATUSES[0],
    payments: [], vehiclePlate: "",
  });
  const [form, setForm] = useState(blankForm());

  const custName = (id) => customers.find((c) => c.id === id)?.name || id;
  const prodUnit = (id) => products.find((p) => p.id === id)?.unit || "";

  const filtered = sales.filter((inv) => inv.id.includes(search) || custName(inv.customerId).includes(search)).sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));

  const openAdd = () => { setForm({ ...blankForm(), id: genId("INV", sales) }); setModal({ mode: "add" }); };
  const openEdit = (item) => {
    let payments = item.payments && item.payments.length > 0 ? [...item.payments] : [];
    setForm(JSON.parse(JSON.stringify({ ...item, payments })));
    setModal({ mode: "edit", item });
  };
  const openView = (item) => setModal({ mode: "view", item });

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, blankItem()] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const addPayment = () => setForm({ ...form, payments: [...(form.payments || []), blankPayment()] });
  const updatePayment = (idx, field, value) => {
    const payments = [...(form.payments || [])];
    payments[idx] = { ...payments[idx], [field]: value };
    setForm({ ...form, payments });
  };
  const removePayment = (idx) => setForm({ ...form, payments: (form.payments || []).filter((_, i) => i !== idx) });

  const lineNet = (it) => (Number(it.qty) || 0) - (Number(it.deduct) || 0);
  const lineTotal = (it) => lineNet(it) * (Number(it.price) || 0);
  const subtotal = form.items.reduce((s, it) => s + lineTotal(it), 0);
  const afterDiscount = subtotal - (Number(form.discount) || 0);
  const vatAmount = afterDiscount * ((Number(form.vatRate) || 0) / 100);
  const grandTotal = afterDiscount + vatAmount;
  const cogs = form.items.reduce((s, it) => s + (it.fromWithdrawal ? (it.withdrawalValue || 0) : 0), 0);
  const profit = afterDiscount - cogs;
  const totalPaid = (form.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = grandTotal - totalPaid;

  const calcInvoiceTotals = (inv) => {
    const sub = inv.items.reduce((s, it) => s + (it.net != null ? it.net : it.qty - it.deduct) * it.price, 0);
    const ad = sub - (inv.discount || 0);
    const vat = ad * ((inv.vatRate || 0) / 100);
    const total = ad + vat;
    const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { sub, ad, vat, total, paid, remaining: total - paid };
  };

  const save = () => {
    if (!form.id.trim() || form.items.length === 0) return;
    const cleaned = {
      ...form,
      discount: Number(form.discount) || 0,
      vatRate: Number(form.vatRate) || 0,
      items: form.items.map((it) => ({ ...it, qty: Number(it.qty) || 0, deduct: Number(it.deduct) || 0, net: (Number(it.qty) || 0) - (Number(it.deduct) || 0), price: Number(it.price) || 0 })),
    };
    if (modal.mode === "add") setSales([...sales, cleaned]);
    else setSales(sales.map((s) => (s.id === modal.item.id ? cleaned : s)));
    setModal(null);
  };

  const remove = (id) => setSales(sales.filter((s) => s.id !== id));

  const statusColor = (st) => {
    if (st === "ชำระแล้ว") return { bg: "#eaf3de", color: "#27500a" };
    if (st === "ชำระบางส่วน") return { bg: "#faeeda", color: "#854f0b" };
    return { bg: "#fcebeb", color: "#791f1f" };
  };

  return (
    <div>
      <Header title="ระบบขายสินค้า (Sales)" subtitle="ออกใบ Invoice และบันทึกการขายสินค้ารีไซเคิล">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ExportToolbar
            onPDF={() => printAsPDF("tab-export-sales", "ขายสินค้า")}
            onExcel={() => {
              const rows = [
                ["เลข Invoice", "วันที่", "ลูกค้า", "สถานะ", "สินค้า", "จำนวนสุทธิ", "ราคา/หน่วย", "รวม"],
                ...filtered.flatMap((inv) =>
                  inv.items.map((it, i) => [
                    i === 0 ? inv.id : "", i === 0 ? inv.date : "", i === 0 ? custName(inv.customerId) : "", i === 0 ? inv.paymentStatus : "",
                    prodName(it.productId), it.net, it.price, it.net * it.price,
                  ])
                ),
              ];
              exportExcel(rows, "ขายสินค้า.xlsx", "ขายสินค้า");
            }}
            onImage={() => printAsPDF("tab-export-sales", "ขายสินค้า")}
          />
          <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> สร้าง Invoice</button>
        </div>
      </Header>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลข Invoice หรือชื่อลูกค้า..." />
      <div id="tab-export-sales">
<Card style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              <th style={thStyle}>เลข Invoice</th>
              <th style={thStyle}>วันที่</th>
              <th style={thStyle}>ลูกค้า</th>
              <th style={thStyle}>ทะเบียนรถ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ยอดสุทธิ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ยอดรับชำระ</th>
              <th style={thStyle}>สถานะ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const t = calcInvoiceTotals(inv);
              const sc = statusColor(inv.paymentStatus);
              return (
                <tr key={inv.id}>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{inv.id}</td>
                  <td style={tdStyle}>{inv.date}</td>
                  <td style={tdStyle}>{custName(inv.customerId)}</td>
                  <td style={tdStyle}>
                    {inv.vehiclePlate ? <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>🚛 {inv.vehiclePlate}</span> : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(t.total)} บาท</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#0f6e56" }}>รับแล้ว ฿{fmt(t.paid)}</div>
                    {t.remaining > 0 && <div style={{ fontSize: 12, color: "#993c1d" }}>ค้าง ฿{fmt(t.remaining)}</div>}
                  </td>
                  <td style={tdStyle}><span style={{ background: sc.bg, color: sc.color, padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{inv.paymentStatus}</span></td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button style={iconBtn} onClick={() => openView(inv)}><Printer size={14} /> ดู Invoice</button>
                      <button style={iconBtn} onClick={() => openEdit(inv)}><Edit2 size={14} /> แก้ไข</button>
                      <button style={btnDanger} onClick={() => remove(inv.id)}><Trash2 size={14} /> ลบ</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่พบใบขายสินค้า</td></tr>}
          </tbody>
        </table>
      </Card>
</div>
      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <Modal title={modal.mode === "add" ? "สร้าง Invoice" : "แก้ไข Invoice"} onClose={() => setModal(null)} wide fullscreen>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
            <Field label="เลข Invoice (กำหนดเอง)">
              <input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="เช่น INV-2606-002" />
            </Field>
            <Field label="วันที่">
              <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="ลูกค้า">
              <CustomerSelect customers={customers} value={form.customerId} onChange={(cid) => setForm({ ...form, customerId: cid })} labelWithId={false} />
            </Field>
          </div>

          <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600, fontSize: 14 }}>รายการสินค้า</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={thStyle}>สินค้า</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนสุทธิ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนหัก</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ราคาขาย/หน่วย</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ต้นทุนเฉลี่ย</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือสต๊อก</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>รวม</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => {
                  const stock = inventory.summary.find((s) => s.productId === it.productId);
                  const net = lineNet(it);
                  const fromW = !!it.fromWithdrawal;
                  const insufficient = !fromW && stock && net > stock.qty;
                  return (
                    <tr key={idx} style={fromW ? { background: "#eeedfe" } : undefined}>
                      <td style={tdStyle}>
                        <ProductSelect products={products} value={it.productId} onChange={(pid) => updateItem(idx, "productId", pid)} disabled={fromW} labelWithId={false} />
                        {fromW && (
                          <div style={{ fontSize: 11, color: "#534ab7", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                            <PackageMinus size={12} /> มาจากการเบิกสินค้า (ตัดสต๊อกที่ใบเบิกแล้ว)
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {fromW ? (
                          <div style={{ textAlign: "right", color: "#534ab7", fontWeight: 500 }}>{fmt(it.qty)}</div>
                        ) : (
                          <input type="number" style={{ ...inputStyle, width: 90, textAlign: "right" }} value={it.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          style={{ ...inputStyle, width: 90, textAlign: "right" }}
                          value={it.net != null ? it.net : net}
                          onChange={(e) => {
                            const newNet = e.target.value;
                            const newDeduct = (Number(it.qty) || 0) - (Number(newNet) || 0);
                            const items = [...form.items];
                            items[idx] = { ...items[idx], net: newNet, deduct: newDeduct };
                            setForm({ ...form, items });
                          }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          style={{ ...inputStyle, width: 90, textAlign: "right" }}
                          value={it.deduct}
                          onChange={(e) => {
                            const newDeduct = e.target.value;
                            const newNet = (Number(it.qty) || 0) - (Number(newDeduct) || 0);
                            const items = [...form.items];
                            items[idx] = { ...items[idx], deduct: newDeduct, net: newNet };
                            setForm({ ...form, items });
                          }}
                        />
                      </td>
                      <td style={tdStyle}><input type="number" style={{ ...inputStyle, width: 90, textAlign: "right" }} value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} /></td>
                      <td style={{ ...tdStyle, textAlign: "right", color: fromW ? "#534ab7" : "#9ca3af", fontWeight: fromW ? 600 : 400 }}>
                        {fromW ? fmt(it.withdrawalCost || 0) : "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: insufficient ? "#a32d2d" : "#6b7280" }}>
                        {fromW ? <span style={{ color: "#9ca3af" }}>—</span> : <>{stock ? fmt(stock.qty) : "-"} {prodUnit(it.productId)}</>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(lineTotal(it))}</td>
                      <td style={tdStyle}><button style={btnDanger} onClick={() => removeItem(idx)}><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button style={{ ...btnSecondary, marginTop: 8 }} onClick={addItem}><Plus size={14} /> เพิ่มรายการสินค้า</button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px", marginTop: 16 }}>
            <Field label="ส่วนลด (บาท)">
              <input type="number" style={inputStyle} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            </Field>
            <Field label="VAT (%)">
              <input type="number" style={inputStyle} value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} />
            </Field>
            <Field label="สถานะชำระเงิน">
              <select style={inputStyle} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                {PAYMENT_STATUSES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginTop: 8, fontSize: 14 }}>
            <Row label="ราคารวม (ก่อนหักส่วนลด)" value={`${fmt(subtotal)} บาท`} />
            <Row label="หลังหักส่วนลด" value={`${fmt(afterDiscount)} บาท`} />
            <Row label={`VAT (${form.vatRate}%)`} value={`${fmt(vatAmount)} บาท`} />
            <Row label="ยอดสุทธิ" value={`${fmt(grandTotal)} บาท`} bold />
            <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }} />
            <Row label="ต้นทุนสินค้า (FIFO เฉลี่ย)" value={`${fmt(cogs)} บาท`} />
            <Row label="กำไรขั้นต้นโดยประมาณ" value={`${fmt(profit)} บาท`} bold color={profit >= 0 ? "#27500a" : "#791f1f"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginTop: 12 }}>
            <Field label="ทะเบียนรถ (ถ้ามี)">
              <input style={inputStyle} value={form.vehiclePlate || ""} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} placeholder="เช่น กข 1234" />
            </Field>
          </div>

          {/* การรับชำระเงิน (หลายครั้ง) */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>การรับชำระเงิน</div>
              <button style={btnSecondary} onClick={addPayment}><Plus size={14} /> เพิ่มรายการรับชำระ</button>
            </div>
            {(form.payments || []).length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>ยังไม่มีรายการรับชำระ</p>}
            {(form.payments || []).map((p, idx) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input type="date" style={inputStyle} value={p.date} onChange={(e) => updatePayment(idx, "date", e.target.value)} />
                <select style={inputStyle} value={p.method} onChange={(e) => updatePayment(idx, "method", e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select style={inputStyle} value={p.toStoreBankId || ""} onChange={(e) => updatePayment(idx, "toStoreBankId", e.target.value)}>
                  <option value="">เงินสด / ไม่ระบุบัญชี</option>
                  {(storeBankAccounts || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.bankName} · {b.accountNo}</option>
                  ))}
                </select>
                <input type="number" style={{ ...inputStyle, textAlign: "right" }} placeholder="จำนวนเงิน" value={p.amount} onChange={(e) => updatePayment(idx, "amount", e.target.value)} />
                <button style={btnDanger} onClick={() => removePayment(idx)}><Trash2 size={14} /></button>
              </div>
            ))}
            {(form.payments || []).length > 0 && (
              <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginTop: 6 }}>
                <Row label="รับชำระแล้ว" value={`฿${fmt(totalPaid)}`} />
                <Row label="ยอดค้างชำระ" value={`฿${fmt(remaining)}`} bold color={remaining > 0 ? "#993c1d" : "#0f6e56"} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}

      {modal && modal.mode === "view" && (
        <SalesInvoiceModal inv={modal.item} customer={customers.find((c) => c.id === modal.item.customerId)} products={products} storeBankAccounts={storeBankAccounts} companySettings={companySettings} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: bold ? 700 : 400, fontSize: bold ? 15 : 13, color: color || "inherit" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SalesInvoiceModal({ inv, customer, products, storeBankAccounts, companySettings, onClose }) {
  const cs = companySettings || {};
  const prodInfo = (id) => products.find((p) => p.id === id) || { name: id, unit: "" };
  const subtotal = inv.items.reduce((s, it) => s + (it.net != null ? it.net : it.qty - it.deduct) * it.price, 0);
  const afterDiscount = subtotal - (inv.discount || 0);
  const vat = afterDiscount * ((inv.vatRate || 0) / 100);
  const total = afterDiscount + vat;
  const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = total - paid;
  const accentColor = cs.accentColor || "#185fa5";

  return (
    <Modal title={`${cs.salesTitle || "Invoice"} ${inv.id}`} onClose={onClose} wide>
      <div style={{ background: "#fff", padding: "24px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${accentColor}`, paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {cs.logo && (
              <img src={cs.logo} alt="logo" style={{ height: 60, maxWidth: 120, objectFit: "contain" }} />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>{cs.name || "วงจรกรีน รีไซเคิล"}</div>
              {cs.nameEn && <div style={{ fontSize: 12, color: "#6b7280" }}>{cs.nameEn}</div>}
              {cs.taxId && <div style={{ fontSize: 12, color: "#6b7280" }}>เลขผู้เสียภาษี: {cs.taxId}</div>}
              {cs.address && <div style={{ fontSize: 12, color: "#6b7280" }}>{cs.address}</div>}
              {cs.phone && <div style={{ fontSize: 12, color: "#6b7280" }}>โทร: {cs.phone}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: accentColor }}>{cs.salesTitle || "ใบแจ้งหนี้ / Invoice"}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>เลขที่: {inv.id}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>วันที่: {inv.date}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>ลูกค้า</div>
          <div>{customer?.name}</div>
          <div style={{ color: "#6b7280" }}>{customer?.address}</div>
          <div style={{ color: "#6b7280" }}>โทร: {customer?.phone} | เลขผู้เสียภาษี: {customer?.taxId}</div>
          {inv.vehiclePlate && (
            <div style={{ marginTop: 4, color: "#374151" }}>
              🚛 ทะเบียนรถ: <strong>{inv.vehiclePlate}</strong>
            </div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: accentColor + "22" }}>
              <th style={{ ...thStyle, color: accentColor }}>สินค้า</th>
              <th style={{ ...thStyle, color: accentColor, textAlign: "right" }}>น้ำหนักสุทธิ</th>
              <th style={{ ...thStyle, color: accentColor, textAlign: "right" }}>ราคา/หน่วย</th>
              <th style={{ ...thStyle, color: accentColor, textAlign: "right" }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, idx) => {
              const p = prodInfo(it.productId);
              const net = it.net != null ? it.net : it.qty - it.deduct;
              return (
                <tr key={idx}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(net)} {p.unit}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(it.price)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(net * it.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <div style={{ width: 260 }}>
            <Row label="รวมเป็นเงิน" value={`${fmt(subtotal)} บาท`} />
            <Row label="ส่วนลด" value={`${fmt(inv.discount || 0)} บาท`} />
            <Row label="หลังหักส่วนลด" value={`${fmt(afterDiscount)} บาท`} />
            <Row label={`VAT ${inv.vatRate || 0}%`} value={`${fmt(vat)} บาท`} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "2px solid #185fa5", fontWeight: 700, fontSize: 15 }}>
              <span>ยอดสุทธิ</span>
              <span>{fmt(total)} บาท</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 13 }}>
          สถานะ: <strong>{inv.paymentStatus}</strong>
        </div>

        {/* ลายเซ็น */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, fontSize: 12 }}>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้ขาย / ผู้ส่งสินค้า</div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้รับสินค้า</div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้อนุมัติ</div>
          </div>
        </div>

        {/* รายละเอียดช่องทางการชำระเงิน */}
        {(inv.payments && inv.payments.length > 0) ? (
          <div style={{ marginTop: 24, borderTop: "1px dashed #d1d5db", paddingTop: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>รายละเอียดช่องทางการชำระเงิน</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={thStyle}>วันที่รับ</th>
                  <th style={thStyle}>ช่องทาง</th>
                  <th style={thStyle}>บัญชีรับเงิน</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p, i) => {
                  const b = (storeBankAccounts || []).find((b) => b.id === p.toStoreBankId);
                  return (
                    <tr key={p.id || i}>
                      <td style={tdStyle}>{p.date}</td>
                      <td style={tdStyle}>{p.method}</td>
                      <td style={tdStyle}>{b ? `${b.bankName} ${b.accountNo}` : "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0f6e56" }}>฿{fmt(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 700 }}>รับชำระแล้ว</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#0f6e56" }}>฿{fmt(paid)}</td>
                </tr>
                {remaining > 0 && (
                  <tr>
                    <td colSpan={3} style={{ ...tdStyle, fontWeight: 700 }}>ยอดค้างชำระ</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#993c1d" }}>฿{fmt(remaining)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ marginTop: 24, borderTop: "1px dashed #d1d5db", paddingTop: 10, fontSize: 13, color: "#9ca3af" }}>
            ยังไม่มีรายการรับชำระเงิน
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button style={btnSecondary} onClick={onClose}>ปิด</button>
        <button style={btnPrimary} onClick={() => window.print()}><Download size={16} /> พิมพ์ / บันทึก PDF</button>
      </div>
    </Modal>
  );
}

// ===================================================================
// INVENTORY TAB
// ===================================================================
function InventoryTab({ products, inventory }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <Header title="ระบบสต๊อกสินค้า (Inventory)" subtitle="ติดตามยอดรับเข้า-เบิกออก คำนวณต้นทุนแบบ FIFO">
        <ExportToolbar
          onPDF={() => printAsPDF("tab-export-inventory", "สต๊อกสินค้า")}
          onExcel={() => {
            const rows = [
              ["สินค้า", "คงเหลือ", "หน่วย", "ต้นทุนเฉลี่ย/หน่วย", "มูลค่าคงเหลือ"],
              ...inventory.summary.map((s) => [s.name, s.qty, s.unit, s.avgCost, s.totalCost]),
            ];
            exportExcel(rows, "สต๊อกสินค้า.xlsx", "สต๊อก");
          }}
          onImage={() => printAsPDF("tab-export-inventory", "สต๊อกสินค้า")}
        />
      </Header>
      <div id="tab-export-inventory">
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}></th>
              <th style={thStyle}>สินค้า</th>
              <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ต้นทุนเฉลี่ย/หน่วย</th>
              <th style={{ ...thStyle, textAlign: "right" }}>มูลค่าคงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {inventory.summary.map((s) => (
              <React.Fragment key={s.productId}>
                <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === s.productId ? null : s.productId)}>
                  <td style={tdStyle}>{expanded === s.productId ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtInt(s.qty)} {s.unit}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(s.avgCost)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(s.totalCost)}</td>
                </tr>
                {expanded === s.productId && (
                  <tr>
                    <td colSpan={5} style={{ padding: "0 12px 16px 36px", background: "#f9fafb" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, margin: "12px 0 8px", color: "#374151" }}>
                        <History size={14} /> ประวัติการเคลื่อนไหวสินค้า
                      </div>
                      {(inventory.history[s.productId] || []).length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: 13 }}>ยังไม่มีการเคลื่อนไหว</p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>วันที่</th>
                              <th style={thStyle}>เลขที่อ้างอิง</th>
                              <th style={thStyle}>ประเภท</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>จำนวน</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือสะสม</th>
                              <th style={{ ...thStyle, textAlign: "right" }}>ราคา/ต้นทุน</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventory.history[s.productId].map((ev, idx) => (
                              <tr key={idx}>
                                <td style={tdStyle}>{ev.date}</td>
                                <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}>{ev.ref}</td>
                                <td style={tdStyle}>
                                  {ev.type === "in" ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0f6e56" }}><ArrowDownToLine size={14} /> รับเข้า</span>
                                  ) : ev.type === "withdraw" ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#534ab7" }}><PackageMinus size={14} /> เบิกเพื่อขาย</span>
                                  ) : (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#993c1d" }}><ArrowUpFromLine size={14} /> เบิกออก</span>
                                  )}
                                </td>
                                <td style={{ ...tdStyle, textAlign: "right", color: ev.type === "in" ? "#0f6e56" : ev.type === "withdraw" ? "#534ab7" : "#993c1d" }}>
                                  {ev.type === "in" ? "+" : "-"}{fmt(ev.qty)} {s.unit}
                                </td>
                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>{fmt(ev.balance)} {s.unit}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>
                                  {ev.type === "in" ? fmt(ev.price) : fmt(ev.avgCostUsed)}
                                  {ev.type !== "in" && ev.shortfall > 0 && (
                                    <span style={{ color: "#a32d2d", marginLeft: 6, fontSize: 11 }}>(ขาด {fmt(ev.shortfall)})</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
      </div>{/* end tab-export-inventory */}
    </div>
  );
}
// DEPOSITS TAB (เงินมัดจำจ่ายล่วงหน้าให้ลูกค้า)
// ===================================================================
function DepositsTab({ customers, deposits, setDeposits, purchases, storeBankAccounts }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");

  const custName = (id) => customers.find((c) => c.id === id)?.name || id;

  const blankForm = () => ({
    id: genId("AE", deposits),
    date: new Date().toISOString().slice(0, 10),
    customerId: customers[0]?.id || "",
    amount: 0,
    fromStoreBankId: storeBankAccounts[0]?.id || "CASH",
    note: "",
  });
  const [form, setForm] = useState(blankForm());

  const openAdd = () => { setForm(blankForm()); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm({ ...item }); setModal({ mode: "edit", item }); };

  const save = () => {
    if (!form.customerId || !(Number(form.amount) > 0)) return;
    const cleaned = { ...form, amount: Number(form.amount) || 0 };
    if (modal.mode === "add") setDeposits([...deposits, cleaned]);
    else setDeposits(deposits.map((d) => (d.id === modal.item.id ? cleaned : d)));
    setModal(null);
  };

  const remove = (id) => setDeposits(deposits.filter((d) => d.id !== id));

  const balances = useMemo(() => computeDepositBalances(customers, deposits, purchases), [customers, deposits, purchases]);

  // รายการหักมัดจำที่เกิดขึ้นในใบรับสินค้าทั้งหมด (สำหรับแสดงประวัติการใช้)
  const depositUsages = useMemo(() => {
    const list = [];
    purchases.forEach((po) => {
      (po.payments || []).forEach((p) => {
        if (p.fromStoreBankId === "DEPOSIT") {
          list.push({ id: `${po.id}-${p.id}`, date: p.date, customerId: po.customerId, poId: po.id, amount: Number(p.amount) || 0 });
        }
      });
    });
    return list;
  }, [purchases]);

  const filtered = deposits.filter((d) => custName(d.customerId).includes(search) || d.id.includes(search)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const fromLabel = (id) => {
    if (id === "CASH") return "เงินสดหน้าร้าน";
    const b = storeBankAccounts.find((b) => b.id === id);
    return b ? `${b.bankName} ${b.accountNo}` : "-";
  };

  return (
    <div>
      <Header title="เงินมัดจำ (จ่ายล่วงหน้าให้ลูกค้า)" subtitle="บันทึกเงินมัดจำที่จ่ายให้ลูกค้าล่วงหน้า และดูยอดมัดจำคงเหลือของลูกค้าแต่ละราย">
        <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> บันทึกจ่ายมัดจำ</button>
      </Header>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>สรุปยอดมัดจำคงเหลือต่อลูกค้า</h3>
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>ลูกค้า</th>
                <th style={{ ...thStyle, textAlign: "right" }}>มัดจำที่จ่ายรวม</th>
                <th style={{ ...thStyle, textAlign: "right" }}>หักไปแล้ว (ในใบรับสินค้า)</th>
                <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือ</th>
              </tr>
            </thead>
            <tbody>
              {balances.filter((b) => b.totalGiven > 0).map((b) => (
                <tr key={b.customerId}>
                  <td style={tdStyle}>{b.name}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(b.totalGiven)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#854f0b" }}>฿{fmt(b.totalUsed)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: b.remaining > 0 ? "#0f6e56" : "#6b7280" }}>฿{fmt(b.remaining)}</td>
                </tr>
              ))}
              {balances.every((b) => b.totalGiven === 0) && (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ยังไม่มีการจ่ายมัดจำ</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาลูกค้า หรือเลขที่รายการมัดจำ..." />

      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>ประวัติการจ่ายมัดจำ</h3>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>วันที่</th>
              <th style={thStyle}>ลูกค้า</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงิน</th>
              <th style={thStyle}>จ่ายจาก</th>
              <th style={thStyle}>หมายเหตุ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td style={tdStyle}>{d.date}</td>
                <td style={tdStyle}>{custName(d.customerId)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0f6e56" }}>+฿{fmt(d.amount)}</td>
                <td style={tdStyle}>{fromLabel(d.fromStoreBankId)}</td>
                <td style={{ ...tdStyle, color: "#6b7280" }}>{d.note || "-"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button style={iconBtn} onClick={() => openEdit(d)}><Edit2 size={14} /> แก้ไข</button>
                    <button style={btnDanger} onClick={() => remove(d.id)}><Trash2 size={14} /> ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ยังไม่มีรายการมัดจำ</td></tr>}
          </tbody>
        </table>
      </Card>

      {depositUsages.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>ประวัติการหักมัดจำ (จากใบรับสินค้า)</h3>
          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>วันที่</th>
                  <th style={thStyle}>ลูกค้า</th>
                  <th style={thStyle}>เลขที่ใบรับสินค้า</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงินที่หัก</th>
                </tr>
              </thead>
              <tbody>
                {depositUsages.map((u) => (
                  <tr key={u.id}>
                    <td style={tdStyle}>{u.date}</td>
                    <td style={tdStyle}>{custName(u.customerId)}</td>
                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}>{u.poId}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>-฿{fmt(u.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "add" ? "บันทึกจ่ายมัดจำให้ลูกค้า" : "แก้ไขรายการมัดจำ"} onClose={() => setModal(null)}>
          <Field label="วันที่จ่าย">
            <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="ลูกค้า">
            <CustomerSelect customers={customers} value={form.customerId} onChange={(cid) => setForm({ ...form, customerId: cid })} />
          </Field>
          <Field label="จำนวนเงินมัดจำ">
            <input type="number" style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="จ่ายจาก">
            <select style={inputStyle} value={form.fromStoreBankId} onChange={(e) => setForm({ ...form, fromStoreBankId: e.target.value })}>
              <option value="CASH">เงินสดหน้าร้าน</option>
              {storeBankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNo}</option>)}
            </select>
          </Field>
          <Field label="หมายเหตุ">
            <input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="เช่น มัดจำสำหรับงานเดือน มิ.ย." />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================================================================
// LOANS TAB (เงินกู้ยืม / เช่าซื้อ)
// ===================================================================
function LoansTab({ loans, setLoans, expenses, customers }) {
  const [modal, setModal] = useState(null); // {mode:'add'|'edit'|'schedule', item}

  const blankForm = () => ({
    id: genId("CT", loans),
    billNo: "",
    name: "",
    type: LOAN_TYPES[0],
    lenderCustomerId: "", // อ้างอิงลูกค้าจากฐานข้อมูล (ถ้ามี)
    lender: "", // ชื่อผู้ให้กู้/ไฟแนนซ์ (พิมพ์เองได้ ถ้าไม่มีในฐานข้อมูลลูกค้า)
    principal: 0,
    interestMode: "rate", // "rate" = % ต่อปี, "amount" = จำนวนเงินดอกเบี้ยรวมตลอดสัญญา
    annualInterestRate: 0,
    totalInterestAmount: 0,
    totalInstallments: 12,
    startDate: new Date().toISOString().slice(0, 10),
    dueDayOfMonth: new Date().getDate(), // ครบกำหนดชำระทุกวันที่เท่าไรของเดือน (1-31)
    paidInstallments: [], // [{no, expenseId, paidDate}]
  });
  const [form, setForm] = useState(blankForm());

  const openAdd = () => { setForm(blankForm()); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm(JSON.parse(JSON.stringify({ paidInstallments: [], interestMode: "rate", totalInterestAmount: 0, lenderCustomerId: "", billNo: "", dueDayOfMonth: new Date(item.startDate || Date.now()).getDate(), ...item }))); setModal({ mode: "edit", item }); };
  const openSchedule = (item) => setModal({ mode: "schedule", item });

  const save = () => {
    if (!form.name.trim() || !(Number(form.principal) > 0) || !(Number(form.totalInstallments) > 0)) return;
    const cleaned = {
      ...form,
      principal: Number(form.principal) || 0,
      annualInterestRate: Number(form.annualInterestRate) || 0,
      totalInterestAmount: Number(form.totalInterestAmount) || 0,
      totalInstallments: Number(form.totalInstallments) || 0,
    };
    if (modal.mode === "add") setLoans([...loans, cleaned]);
    else setLoans(loans.map((l) => (l.id === modal.item.id ? cleaned : l)));
    setModal(null);
  };

  const remove = (id) => setLoans(loans.filter((l) => l.id !== id));

  // เมื่อเลือกผู้ให้กู้จากฐานข้อมูลลูกค้า ให้เติมชื่อลงในช่อง lender ด้วย (ใช้แสดงผล/ค้นหาในตาราง)
  const handleLenderChange = (customerId) => {
    const c = customers.find((c) => c.id === customerId);
    setForm({ ...form, lenderCustomerId: customerId, lender: c ? c.name : form.lender });
  };

  const preview = useMemo(() => computeAmortizationSchedule(form), [form.principal, form.annualInterestRate, form.totalInterestAmount, form.interestMode, form.totalInstallments, form.startDate, form.dueDayOfMonth]);

  return (
    <div>
      <Header title="เงินกู้ยืม / เช่าซื้อ" subtitle="บันทึกสัญญาเงินกู้/เช่าซื้อ และตารางผ่อนชำระ สามารถดึงงวดมาตัดจ่ายในหน้าค่าใช้จ่ายได้">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportToolbar
            onPDF={() => printAsPDF("tab-export-loans", "เงินกู้ยืม/เช่าซื้อ")}
            onExcel={() => {
              const rows = [
                ["ชื่อสัญญา", "เลขที่บิล/สัญญา", "ประเภท", "เงินต้น", "ดอกเบี้ย", "จำนวนงวด", "ผ่อนแล้ว", "คงเหลือ (งวด)"],
                ...loans.map((l) => {
                  const paidCount = (l.paidInstallments || []).length;
                  return [l.name, l.billNo || "", l.type, l.principal, l.interestMode === "amount" ? l.totalInterestAmount : `${l.annualInterestRate}%/ปี`, l.totalInstallments, paidCount, l.totalInstallments - paidCount];
                }),
              ];
              exportExcel(rows, "เงินกู้เช่าซื้อ.xlsx", "สินเชื่อ");
            }}
            onImage={() => printAsPDF("tab-export-loans", "เงินกู้ยืม/เช่าซื้อ")}
          />
          <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> เพิ่มสัญญาเงินกู้/เช่าซื้อ</button>
        </div>
      </Header>
      <div id="tab-export-loans">

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>ชื่อสัญญา</th>
              <th style={thStyle}>เลขที่บิล/สัญญา</th>
              <th style={thStyle}>ประเภท</th>
              <th style={thStyle}>ผู้ให้กู้/ไฟแนนซ์</th>
              <th style={{ ...thStyle, textAlign: "right" }}>เงินต้น</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ดอกเบี้ย</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จำนวนงวด</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ผ่อนแล้ว</th>
              <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือ</th>
              <th style={thStyle}>วันครบกำหนดชำระ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => {
              const schedule = computeAmortizationSchedule(l);
              const paidCount = (l.paidInstallments || []).length;
              const remainingCount = l.totalInstallments - paidCount;
              // วันครบกำหนดของงวดถัดไป = งวดที่ (จำนวนงวดที่ชำระแล้ว + 1) ตามลำดับ ต่อจากงวดที่ชำระแล้ว
              const nextInstallment = schedule.find((s) => s.no === paidCount + 1);
              const nextDueDate = nextInstallment?.dueDate;
              return (
                <tr key={l.id}>
                  <td style={tdStyle}>{l.name}</td>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", color: "#534ab7" }}>{l.billNo || "-"}</td>
                  <td style={tdStyle}><Badge text={l.type} /></td>
                  <td style={tdStyle}>{l.lender || "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(l.principal)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {l.interestMode === "amount" ? `฿${fmt(l.totalInterestAmount)} (รวม)` : `${fmt(l.annualInterestRate)}% /ปี`}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{l.totalInstallments} งวด</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: paidCount >= l.totalInstallments ? "#0f6e56" : "#854f0b" }}>
                    {paidCount} / {l.totalInstallments}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: remainingCount > 0 ? "#993c1d" : "#0f6e56" }}>
                    {remainingCount} งวด
                  </td>
                  <td style={tdStyle}>
                    <div>ทุกวันที่ {l.dueDayOfMonth || "-"} ของเดือน</div>
                    {nextDueDate && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>งวดถัดไป: {nextDueDate}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button style={iconBtn} onClick={() => openSchedule(l)}><History size={14} /> ตารางผ่อน</button>
                      <button style={iconBtn} onClick={() => openEdit(l)}><Edit2 size={14} /> แก้ไข</button>
                      <button style={btnDanger} onClick={() => remove(l.id)}><Trash2 size={14} /> ลบ</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loans.length === 0 && <tr><td colSpan={11} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ยังไม่มีสัญญาเงินกู้/เช่าซื้อ</td></tr>}
          </tbody>
        </table>
      </Card>

      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <Modal title={modal.mode === "add" ? "เพิ่มสัญญาเงินกู้/เช่าซื้อ" : `แก้ไขสัญญา · ${form.name}`} onClose={() => setModal(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
            <Field label="ชื่อสัญญา">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น สินเชื่อรถบรรทุก 6 ล้อ" />
            </Field>
            <Field label="เลขที่บิล/สัญญา">
              <input style={inputStyle} value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} placeholder="เช่น CT-2026-0001" />
            </Field>
            <Field label="ประเภท">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="ผู้ให้กู้ / ไฟแนนซ์ (ค้นหาจากฐานข้อมูลลูกค้า)">
            <CustomerSelect customers={customers} value={form.lenderCustomerId} onChange={handleLenderChange} labelWithId={false} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 16px" }}>
            <Field label="เงินต้น (บาท)">
              <input type="number" style={inputStyle} value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} />
            </Field>
            <Field label="รูปแบบดอกเบี้ย">
              <select style={inputStyle} value={form.interestMode} onChange={(e) => setForm({ ...form, interestMode: e.target.value })}>
                <option value="rate">% ต่อปี (ลดต้นลดดอก)</option>
                <option value="amount">กรอกจำนวนเงินดอกเบี้ยรวม</option>
              </select>
            </Field>
            {form.interestMode === "amount" ? (
              <Field label="ดอกเบี้ยรวมตลอดสัญญา (บาท)">
                <input type="number" style={inputStyle} value={form.totalInterestAmount} onChange={(e) => setForm({ ...form, totalInterestAmount: e.target.value })} />
              </Field>
            ) : (
              <Field label="ดอกเบี้ย (% ต่อปี)">
                <input type="number" style={inputStyle} value={form.annualInterestRate} onChange={(e) => setForm({ ...form, annualInterestRate: e.target.value })} />
              </Field>
            )}
            <Field label="จำนวนงวด (เดือน)">
              <input type="number" style={inputStyle} value={form.totalInstallments} onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="วันที่เริ่มสัญญา">
              <input type="date" style={inputStyle} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="ครบกำหนดชำระทุกวันที่ (1-31) ของเดือน">
              <input
                type="number"
                min={1}
                max={31}
                style={inputStyle}
                value={form.dueDayOfMonth}
                onChange={(e) => setForm({ ...form, dueDayOfMonth: e.target.value })}
              />
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, marginBottom: 0 }}>
                * ถ้าวันที่เกินจำนวนวันในเดือนนั้น (เช่น 31 ในเดือน ก.พ.) ระบบจะใช้วันสุดท้ายของเดือนแทน
              </p>
            </Field>
          </div>

          {preview.length > 0 && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
              <Row label="ค่างวดผ่อนต่อเดือน (งวดแรก)" value={`฿${fmt(preview[0].payment)}`} bold />
              <Row label="ดอกเบี้ยรวมตลอดสัญญา" value={`฿${fmt(preview.reduce((s, p) => s + p.interest, 0))}`} />
              <Row label="ยอดชำระรวมตลอดสัญญา" value={`฿${fmt(preview.reduce((s, p) => s + p.payment, 0))}`} />
            </div>
          )}

          {preview.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>สรุปยอดจ่ายต่องวด</div>
              <div style={{ overflowX: "auto", maxHeight: 240, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>งวดที่</th>
                      <th style={thStyle}>วันครบกำหนด</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ยอดผ่อน</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ดอกเบี้ย</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ตัดเงินต้น</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>เงินต้นคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p) => (
                      <tr key={p.no}>
                        <td style={tdStyle}>{p.no}</td>
                        <td style={tdStyle}>{p.dueDate}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(p.payment)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#854f0b" }}>฿{fmt(p.interest)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(p.principalPortion)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(p.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}

      {modal && modal.mode === "schedule" && (
        <LoanScheduleModal loan={modal.item} expenses={expenses} onClose={() => setModal(null)} />
      )}
      </div>{/* end tab-export-loans */}
    </div>
  );
}

// ตารางผ่อนชำระแบบละเอียด พร้อมสถานะการจ่าย
function LoanScheduleModal({ loan, expenses, onClose }) {
  const schedule = computeAmortizationSchedule(loan);
  const paidMap = {};
  (loan.paidInstallments || []).forEach((p) => { paidMap[p.no] = p; });

  return (
    <Modal title={`ตารางผ่อนชำระ · ${loan.name}${loan.billNo ? " · " + loan.billNo : ""}`} onClose={onClose} wide>
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 13 }}>
        <Row label="เงินต้น" value={`฿${fmt(loan.principal)}`} />
        <Row label="ดอกเบี้ย" value={loan.interestMode === "amount" ? `฿${fmt(loan.totalInterestAmount)} (รวม)` : `${fmt(loan.annualInterestRate)}% ต่อปี`} />
        <Row label="ค่างวดต่อเดือน" value={schedule.length > 0 ? `฿${fmt(schedule[0].payment)}` : "-"} bold />
      </div>
      <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>งวดที่</th>
              <th style={thStyle}>วันครบกำหนด</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ยอดผ่อน</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ดอกเบี้ย</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ตัดเงินต้น</th>
              <th style={{ ...thStyle, textAlign: "right" }}>เงินต้นคงเหลือ</th>
              <th style={thStyle}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((s) => {
              const paid = paidMap[s.no];
              return (
                <tr key={s.no} style={paid ? { background: "#e1f5ee" } : undefined}>
                  <td style={tdStyle}>{s.no}</td>
                  <td style={tdStyle}>{s.dueDate}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(s.payment)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#854f0b" }}>฿{fmt(s.interest)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(s.principalPortion)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(s.remainingBalance)}</td>
                  <td style={tdStyle}>
                    {paid ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0f6e56", fontWeight: 600 }}><CheckCircle2 size={14} /> จ่ายแล้ว ({paid.paidDate})</span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#9ca3af" }}><Clock size={14} /> ยังไม่จ่าย</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button style={btnSecondary} onClick={onClose}>ปิด</button>
      </div>
    </Modal>
  );
}

// ===================================================================
// EXPENSES TAB (บันทึกค่าใช้จ่าย / ใบสำคัญจ่าย)
// ===================================================================
function ExpensesTab({ expenses, setExpenses, storeBankAccounts, loans, setLoans }) {
  const [modal, setModal] = useState(null); // {mode:'add'|'edit'|'view', item}
  const [search, setSearch] = useState("");
  const [installmentPicker, setInstallmentPicker] = useState(false); // เปิด picker ดึงงวดผ่อน
  const [pendingInstallment, setPendingInstallment] = useState(null); // {loanId, no} ของงวดที่เลือกไว้ รอบันทึก
  const [pickerLoanId, setPickerLoanId] = useState(""); // สัญญาที่เลือกใน dropdown ของ picker

  // หมวดหมู่ใหญ่/ย่อย ที่ผู้ใช้เพิ่มเองระหว่างใช้งาน (เก็บแยกจาก default เพื่อให้เพิ่มได้เรื่อยๆ)
  const [extraMainCategories, setExtraMainCategories] = useState([]);
  const [extraSubCategories, setExtraSubCategories] = useState({}); // { mainCategory: [sub, ...] }

  const blankPayment = () => ({
    id: "EXP" + Date.now().toString().slice(-6),
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    fromStoreBankId: "CASH",
    method: PAYMENT_METHODS[0],
  });

  const blankItem = () => ({
    id: "EXI" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000),
    description: "",
    mainCategory: EXPENSE_MAIN_CATEGORIES[0],
    subCategory: (EXPENSE_SUBCATEGORIES_DEFAULT[EXPENSE_MAIN_CATEGORIES[0]] || [])[0] || "",
    amount: 0,
  });

  const blankForm = () => ({
    id: "EX" + Date.now().toString().slice(-6),
    refNo: genId("EX", expenses),
    recordDate: new Date().toISOString().slice(0, 10),
    taxInvoiceNo: "",
    billDate: new Date().toISOString().slice(0, 10),
    items: [blankItem()], // รายการค่าใช้จ่าย (เพิ่มได้หลายรายการในใบเดียว)
    vatEnabled: false,
    whtRate: 0,
    payments: [],
  });
  const [form, setForm] = useState(blankForm());

  const openAdd = () => { setForm(blankForm()); setPendingInstallment(null); setModal({ mode: "add" }); };
  const openEdit = (item) => {
    // รองรับข้อมูลเดิมที่ยังเป็นรายการเดียว (description/mainCategory/subCategory/amount ที่ระดับบนสุด)
    const items = item.items && item.items.length > 0
      ? item.items
      : [{
          id: "EXI" + Date.now().toString().slice(-6),
          description: item.description || "",
          mainCategory: item.mainCategory || item.category || EXPENSE_MAIN_CATEGORIES[0],
          subCategory: item.subCategory || (item.mainCategory ? "" : item.category) || "",
          amount: Number(item.amount) || 0,
        }];
    setForm(JSON.parse(JSON.stringify({
      payments: [], whtRate: 0, vatEnabled: false, taxInvoiceNo: "",
      recordDate: item.recordDate || item.billDate || item.date, refNo: item.refNo || item.id,
      ...item,
      items,
    })));
    setPendingInstallment(item.loanInstallment || null);
    setModal({ mode: "edit", item });
  };
  const openView = (item) => setModal({ mode: "view", item });

  // รวมงวดผ่อนที่ยังไม่จ่ายจากทุกสัญญา (สำหรับ picker "ดึงจากงวดผ่อน")
  const unpaidInstallments = useMemo(() => {
    const list = [];
    (loans || []).forEach((loan) => {
      const schedule = computeAmortizationSchedule(loan);
      const paidNos = new Set((loan.paidInstallments || []).map((p) => p.no));
      schedule.forEach((s) => {
        if (!paidNos.has(s.no)) list.push({ loan, installment: s });
      });
    });
    // จัดกลุ่มตามสัญญา (loan.id) ก่อน แล้วเรียงงวดตามวันครบกำหนดภายในสัญญาเดียวกัน
    return list.sort((a, b) => {
      if (a.loan.id !== b.loan.id) return a.loan.id < b.loan.id ? -1 : 1;
      return a.installment.dueDate < b.installment.dueDate ? -1 : 1;
    });
  }, [loans]);

  // รายชื่อสัญญาที่มีงวดค้างชำระ พร้อมวันครบกำหนดชำระงวดถัดไป (สำหรับรายการให้คลิกเลือกใน picker)
  // วันครบกำหนดของงวดถัดไป = งวดที่ (จำนวนงวดที่ชำระแล้ว + 1) ตามลำดับ ต่อจากงวดที่ชำระแล้ว
  const loansWithUnpaid = useMemo(() => {
    const seen = new Set();
    const result = [];
    unpaidInstallments.forEach(({ loan }) => {
      if (!seen.has(loan.id)) {
        seen.add(loan.id);
        const schedule = computeAmortizationSchedule(loan);
        const paidCount = (loan.paidInstallments || []).length;
        const nextInstallment = schedule.find((s) => s.no === paidCount + 1);
        result.push({ ...loan, nextDueDate: nextInstallment?.dueDate });
      }
    });
    return result;
  }, [unpaidInstallments]);

  // งวดค้างชำระของสัญญาที่เลือก
  const pickerInstallments = useMemo(
    () => unpaidInstallments.filter(({ loan }) => loan.id === pickerLoanId),
    [unpaidInstallments, pickerLoanId]
  );

  // เลือกงวดผ่อนจาก picker -> เติมข้อมูลในฟอร์มค่าใช้จ่ายให้อัตโนมัติ
  const applyInstallment = (loan, installment) => {
    const installmentItem = {
      id: "EXI" + Date.now().toString().slice(-6),
      description: `ผ่อนชำระ ${loan.type} "${loan.name}" งวดที่ ${installment.no}/${loan.totalInstallments} (ดอกเบี้ย ฿${fmt(installment.interest)}, เงินต้น ฿${fmt(installment.principalPortion)})`,
      mainCategory: "สินเชื่อ",
      subCategory: loan.type === "เช่าซื้อ" ? "ชำระค่าเช่าซื้อ" : "ชำระเงินกู้ (เงินต้น)",
      amount: Math.round(installment.payment * 100) / 100,
    };
    setForm({
      ...form,
      items: [installmentItem],
      billDate: installment.dueDate,
      vatEnabled: false,
      whtRate: 0,
    });
    setPendingInstallment({ loanId: loan.id, no: installment.no });
    setInstallmentPicker(false);
  };

  // หมวดหมู่ใหญ่ทั้งหมด: ค่าตั้งต้น + ที่เพิ่มเอง + ที่เคยใช้ในข้อมูลเดิม (รวมจากทุกรายการในทุกใบ)
  const allMainCategories = [...new Set([
    ...EXPENSE_MAIN_CATEGORIES,
    ...extraMainCategories,
    ...expenses.flatMap((e) => (e.items && e.items.length > 0 ? e.items.map((it) => it.mainCategory) : [e.mainCategory])).filter(Boolean),
  ])];

  // หมวดหมู่ย่อยของหมวดหมู่ใหญ่ที่ระบุ: ค่าตั้งต้น + ที่เพิ่มเอง + ที่เคยใช้ในข้อมูลเดิม (เฉพาะของ mainCategory นี้)
  const subCategoriesFor = (main) => [...new Set([
    ...(EXPENSE_SUBCATEGORIES_DEFAULT[main] || []),
    ...(extraSubCategories[main] || []),
    ...expenses.flatMap((e) => (e.items && e.items.length > 0 ? e.items : [e]))
      .filter((it) => (it.mainCategory || it.category) === main)
      .map((it) => it.subCategory)
      .filter(Boolean),
  ])];

  // เมื่อพิมพ์หมวดหมู่ใหญ่ใหม่ที่ยังไม่มี ให้เพิ่มเข้า extraMainCategories (สำหรับรายการที่ idx)
  const handleItemMainCategoryChange = (idx, value) => {
    if (value && !allMainCategories.includes(value)) {
      setExtraMainCategories((prev) => [...prev, value]);
    }
    updateItem(idx, "mainCategory", value);
  };

  // เมื่อพิมพ์หมวดหมู่ย่อยใหม่ที่ยังไม่มีในหมวดหมู่ใหญ่นี้ ให้เพิ่มเข้า extraSubCategories (สำหรับรายการที่ idx)
  const handleItemSubCategoryChange = (idx, mainCategory, value) => {
    if (value && mainCategory && !subCategoriesFor(mainCategory).includes(value)) {
      setExtraSubCategories((prev) => ({ ...prev, [mainCategory]: [...(prev[mainCategory] || []), value] }));
    }
    updateItem(idx, "subCategory", value);
  };

  // --- คำนวณ VAT / หัก ณ ที่จ่าย / จำนวนเงินสุทธิ ---
  const calcTotals = (e) => {
    const amount = (e.items && e.items.length > 0)
      ? e.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      : (Number(e.amount) || 0);
    const vat = e.vatEnabled ? amount * 0.07 : 0;
    const wht = amount * ((Number(e.whtRate) || 0) / 100);
    const net = amount + vat - wht;
    return { amount, vat, wht, net };
  };

  const { amount: formAmount, vat: formVat, wht: formWht, net: formNet } = calcTotals(form);
  const formPaid = (form.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const formRemaining = formNet - formPaid;

  const addPayment = () => setForm({ ...form, payments: [...(form.payments || []), blankPayment()] });
  const updatePayment = (idx, field, value) => {
    const payments = [...(form.payments || [])];
    payments[idx] = { ...payments[idx], [field]: value };
    setForm({ ...form, payments });
  };
  const removePayment = (idx) => setForm({ ...form, payments: (form.payments || []).filter((_, i) => i !== idx) });

  const addItem = () => setForm({ ...form, items: [...(form.items || []), blankItem()] });
  const updateItem = (idx, field, value) => {
    const items = [...(form.items || [])];
    let updated = { ...items[idx], [field]: value };
    // ถ้าเปลี่ยนหมวดหมู่ใหญ่ ให้รีเซ็ตหมวดหมู่ย่อยเป็นตัวเลือกแรกของหมวดใหม่
    if (field === "mainCategory") {
      updated.subCategory = "";
    }
    items[idx] = updated;
    setForm({ ...form, items });
  };
  const removeItem = (idx) => setForm({ ...form, items: (form.items || []).filter((_, i) => i !== idx) });

  const save = () => {
    const items = (form.items || []).map((it) => ({ ...it, amount: Number(it.amount) || 0 }));
    const totalAmount = items.reduce((s, it) => s + it.amount, 0);
    if (!(totalAmount > 0)) return;
    const cleaned = {
      ...form,
      items,
      amount: totalAmount, // เก็บยอดรวมไว้ที่ระดับบนสุดด้วย เพื่อความเข้ากันได้กับการคำนวณเดิม (dashboard ฯลฯ)
      whtRate: Number(form.whtRate) || 0,
      payments: (form.payments || []).map((p) => ({ ...p, amount: Number(p.amount) || 0 })),
      loanInstallment: pendingInstallment || form.loanInstallment || null,
    };
    if (modal.mode === "add") setExpenses([...expenses, cleaned]);
    else setExpenses(expenses.map((e) => (e.id === modal.item.id ? cleaned : e)));

    // ถ้าผูกกับงวดผ่อน ให้บันทึกสถานะ "จ่ายแล้ว" ในสัญญาเงินกู้ด้วย
    if (cleaned.loanInstallment && setLoans) {
      setLoans((loans || []).map((loan) => {
        if (loan.id !== cleaned.loanInstallment.loanId) return loan;
        const already = (loan.paidInstallments || []).some((p) => p.no === cleaned.loanInstallment.no);
        if (already) return loan;
        return {
          ...loan,
          paidInstallments: [...(loan.paidInstallments || []), { no: cleaned.loanInstallment.no, expenseId: cleaned.id, paidDate: cleaned.billDate || cleaned.recordDate }],
        };
      }));
    }

    setPendingInstallment(null);
    setModal(null);
  };

  const remove = (id) => setExpenses(expenses.filter((e) => e.id !== id));

  const fromLabel = (id) => {
    if (id === "CASH") return "เงินสดหน้าร้าน";
    const b = storeBankAccounts.find((b) => b.id === id);
    return b ? `${b.bankName} ${b.accountNo}` : "-";
  };

  const filtered = expenses
    .filter((e) => {
      const items = (e.items && e.items.length > 0) ? e.items : [{ description: e.description, mainCategory: e.mainCategory || e.category, subCategory: e.subCategory }];
      const itemMatch = items.some((it) => (it.mainCategory || "").includes(search) || (it.subCategory || "").includes(search) || (it.description || "").includes(search));
      return itemMatch || e.id.includes(search) || (e.refNo || "").includes(search) || (e.taxInvoiceNo || "").includes(search);
    })
    .sort((a, b) => ((a.billDate || a.date) < (b.billDate || b.date) ? 1 : (a.billDate || a.date) > (b.billDate || b.date) ? -1 : 0));

  const totalAll = expenses.reduce((s, e) => s + calcTotals(e).net, 0);

  // เดือนปัจจุบัน (ตามรูปแบบ YYYY-MM ของวันที่ตามบิล)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalThisMonth = expenses.filter((e) => ((e.billDate || e.date) || "").startsWith(currentMonth)).reduce((s, e) => s + calcTotals(e).net, 0);

  // สรุปตามหมวดหมู่ใหญ่ พร้อม breakdown หมวดหมู่ย่อย
  const byCategory = useMemo(() => {
    const groups = {}; // mainCategory -> { total, subs: { subCategory: total } }
    expenses.forEach((e) => {
      const t = calcTotals(e);
      const items = (e.items && e.items.length > 0) ? e.items : [{ description: e.description, mainCategory: e.mainCategory || e.category, subCategory: e.subCategory, amount: e.amount }];
      items.forEach((it) => {
        const main = it.mainCategory || "ไม่ระบุ";
        const sub = it.subCategory || "ไม่ระบุ";
        // กระจายยอดสุทธิ (รวม VAT/หัก ณ ที่จ่าย) ของใบนี้ตามสัดส่วนจำนวนเงินของแต่ละรายการ
        const itemAmount = Number(it.amount) || 0;
        const share = t.amount > 0 ? itemAmount / t.amount : 0;
        const net = t.net * share;
        if (!groups[main]) groups[main] = { total: 0, subs: {} };
        groups[main].total += net;
        groups[main].subs[sub] = (groups[main].subs[sub] || 0) + net;
      });
    });
    return Object.entries(groups)
      .map(([mainCategory, g]) => ({
        mainCategory,
        total: g.total,
        subs: Object.entries(g.subs).map(([subCategory, amount]) => ({ subCategory, amount })).sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  return (
    <div>
      <Header title="บันทึกค่าใช้จ่าย" subtitle="บันทึกค่าใช้จ่ายในการดำเนินงานของร้าน พร้อมพิมพ์ใบสำคัญจ่าย">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportToolbar
            onPDF={() => printAsPDF("tab-export-expenses", "ค่าใช้จ่าย")}
            onExcel={() => {
              const rows = [
                ["เลขที่อ้างอิง", "วันที่ตามบิล", "เลขที่ใบกำกับ", "หมวดหมู่ใหญ่", "หมวดหมู่ย่อย", "รายละเอียด", "จำนวนเงิน", "VAT", "หัก ณ ที่จ่าย", "สุทธิ"],
                ...filtered.map((e) => {
                  const items = (e.items && e.items.length > 0) ? e.items : [{ mainCategory: e.mainCategory || e.category, subCategory: e.subCategory, description: e.description, amount: e.amount }];
                  const amount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
                  const vat = e.vatEnabled ? amount * 0.07 : 0;
                  const wht = amount * ((Number(e.whtRate) || 0) / 100);
                  return [e.refNo || e.id, e.billDate || e.date, e.taxInvoiceNo || "", items.map(it=>it.mainCategory).join(", "), items.map(it=>it.subCategory).join(", "), items.map(it=>it.description).join(", "), amount, vat, wht, amount + vat - wht];
                }),
              ];
              exportExcel(rows, "ค่าใช้จ่าย.xlsx", "ค่าใช้จ่าย");
            }}
            onImage={() => printAsPDF("tab-export-expenses", "ค่าใช้จ่าย")}
          />
          <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> บันทึกค่าใช้จ่าย</button>
        </div>
      </Header>
      <div id="tab-export-expenses">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#faece7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Receipt size={18} color="#d85a30" />
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ค่าใช้จ่ายเดือนนี้ (สุทธิ)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>฿{fmt(totalThisMonth)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f1efe8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Receipt size={18} color="#444441" />
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ค่าใช้จ่ายรวมทั้งหมด (สุทธิ)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>฿{fmt(totalAll)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
        <div>
          <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลขที่ใบกำกับภาษี, หมวดหมู่ หรือรายละเอียด..." />
          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>เลขที่อ้างอิง</th>
                  <th style={thStyle}>วันที่ตามบิล</th>
                  <th style={thStyle}>เลขที่ใบกำกับภาษี</th>
                  <th style={thStyle}>หมวดหมู่</th>
                  <th style={thStyle}>รายละเอียด</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงินสุทธิ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const t = calcTotals(e);
                  const items = (e.items && e.items.length > 0) ? e.items : [{ description: e.description, mainCategory: e.mainCategory || e.category, subCategory: e.subCategory, amount: e.amount }];
                  return (
                    <tr key={e.id}>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", color: "#534ab7" }}>{e.refNo || e.id}</td>
                      <td style={tdStyle}>{e.billDate || e.date}</td>
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}>{e.taxInvoiceNo || "-"}</td>
                      <td style={tdStyle}>
                        {items.map((it, i) => (
                          <div key={i} style={{ marginBottom: i < items.length - 1 ? 6 : 0 }}>
                            <Badge text={it.mainCategory || "-"} />
                            {it.subCategory && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{it.subCategory}</div>}
                          </div>
                        ))}
                      </td>
                      <td style={{ ...tdStyle, color: "#6b7280" }}>
                        {items.map((it, i) => (
                          <div key={i} style={{ marginBottom: i < items.length - 1 ? 6 : 0 }}>
                            {it.description || "-"}{items.length > 1 && <span style={{ color: "#9ca3af" }}> (฿{fmt(it.amount)})</span>}
                          </div>
                        ))}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>-฿{fmt(t.net)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button style={iconBtn} onClick={() => openView(e)}><Printer size={14} /> ใบสำคัญจ่าย</button>
                          <button style={iconBtn} onClick={() => openEdit(e)}><Edit2 size={14} /> แก้ไข</button>
                          <button style={btnDanger} onClick={() => remove(e.id)}><Trash2 size={14} /> ลบ</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ยังไม่มีรายการค่าใช้จ่าย</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>สรุปตามหมวดหมู่ (สุทธิ)</h3>
          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>หมวดหมู่</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c) => (
                  <React.Fragment key={c.mainCategory}>
                    <tr>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{c.mainCategory}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>฿{fmt(c.total)}</td>
                    </tr>
                    {c.subs.map((s) => (
                      <tr key={c.mainCategory + "__" + s.subCategory}>
                        <td style={{ ...tdStyle, paddingLeft: 28, color: "#6b7280", fontSize: 13 }}>{s.subCategory}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#6b7280", fontSize: 13 }}>฿{fmt(s.amount)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {byCategory.length === 0 && <tr><td colSpan={2} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <Modal title={modal.mode === "add" ? "บันทึกค่าใช้จ่าย" : `แก้ไขค่าใช้จ่าย · ${form.refNo || form.id}`} onClose={() => setModal(null)} wide fullscreen>
          {unpaidInstallments.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button style={btnSecondary} onClick={() => { setPickerLoanId(""); setInstallmentPicker(true); }}><CreditCard size={14} /> ดึงจากงวดผ่อน</button>
            </div>
          )}
          {pendingInstallment && (
            <div style={{ background: "#eeedfe", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#3c3489", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>เชื่อมกับงวดผ่อนสัญญา: {(loans || []).find((l) => l.id === pendingInstallment.loanId)?.name || pendingInstallment.loanId} · งวดที่ {pendingInstallment.no}</span>
              <button style={{ ...btnSecondary, padding: "4px 8px" }} onClick={() => setPendingInstallment(null)}>ยกเลิกการเชื่อม</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
            <Field label="เลขที่อ้างอิง">
              <input style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280" }} value={form.refNo} readOnly />
            </Field>
            <Field label="วันที่บันทึก">
              <input type="date" style={inputStyle} value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} />
            </Field>
            <Field label="วันที่ตามบิล">
              <input type="date" style={inputStyle} value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
            </Field>
          </div>

          <Field label="เลขที่ใบกำกับภาษี">
            <input style={inputStyle} value={form.taxInvoiceNo} onChange={(e) => setForm({ ...form, taxInvoiceNo: e.target.value })} placeholder="เช่น INV-1234" />
          </Field>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>รายการค่าใช้จ่าย (เพิ่มได้หลายรายการในใบเดียว)</div>
            <button style={btnSecondary} onClick={addItem}><Plus size={14} /> เพิ่มรายการ</button>
          </div>
          {(form.items || []).map((it, idx) => (
            <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 10, background: "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#6b7280" }}>รายการที่ {idx + 1}</div>
                {(form.items || []).length > 1 && (
                  <button style={btnDanger} onClick={() => removeItem(idx)}><Trash2 size={14} /> ลบรายการ</button>
                )}
              </div>
              <Field label="รายละเอียด">
                <input style={inputStyle} value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="เช่น ค่าน้ำมันรถบรรทุกขนของ" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                <Field label="หมวดหมู่ใหญ่">
                  <input style={inputStyle} list={`expense-main-category-options-${idx}`} value={it.mainCategory} onChange={(e) => handleItemMainCategoryChange(idx, e.target.value)} placeholder="เลือกหรือพิมพ์เพิ่มใหม่" />
                  <datalist id={`expense-main-category-options-${idx}`}>
                    {allMainCategories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </Field>
                <Field label="หมวดหมู่ย่อย">
                  <input style={inputStyle} list={`expense-sub-category-options-${idx}`} value={it.subCategory} onChange={(e) => handleItemSubCategoryChange(idx, it.mainCategory, e.target.value)} placeholder="เลือกหรือพิมพ์เพิ่มใหม่" />
                  <datalist id={`expense-sub-category-options-${idx}`}>
                    {subCategoriesFor(it.mainCategory).map((c) => <option key={c} value={c} />)}
                  </datalist>
                </Field>
                <Field label="จำนวนเงิน (ก่อนภาษี)">
                  <input type="number" style={inputStyle} value={it.amount} onChange={(e) => updateItem(idx, "amount", e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: -2, marginBottom: 16 }}>* พิมพ์ชื่อหมวดหมู่ใหญ่/ย่อยใหม่ได้เลย ระบบจะเพิ่มเป็นตัวเลือกให้อัตโนมัติ</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="ภาษีมูลค่าเพิ่ม">
              <label style={{ display: "flex", alignItems: "center", gap: 8, height: 38, fontSize: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.vatEnabled} onChange={(e) => setForm({ ...form, vatEnabled: e.target.checked })} style={{ width: 16, height: 16 }} />
                มี VAT 7%
              </label>
            </Field>
            <Field label="หัก ณ ที่จ่าย (%)">
              <input type="number" style={inputStyle} value={form.whtRate} onChange={(e) => setForm({ ...form, whtRate: e.target.value })} placeholder="0" />
            </Field>
          </div>

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
            <Row label="จำนวนเงินรวมทุกรายการ" value={`฿${fmt(formAmount)}`} />
            <Row label={form.vatEnabled ? "ภาษีมูลค่าเพิ่ม (7%)" : "ภาษีมูลค่าเพิ่ม"} value={`+฿${fmt(formVat)}`} />
            <Row label={`หัก ณ ที่จ่าย (${Number(form.whtRate) || 0}%)`} value={`-฿${fmt(formWht)}`} />
            <Row label="จำนวนเงินสุทธิ" value={`฿${fmt(formNet)}`} bold />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>การชำระเงิน (แบ่งชำระได้หลายครั้ง)</div>
            <button style={btnSecondary} onClick={addPayment}><Plus size={14} /> เพิ่มการจ่ายเงิน</button>
          </div>

          {(form.payments || []).length === 0 ? (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              ยังไม่มีการชำระเงิน — กด "เพิ่มการจ่ายเงิน" เพื่อบันทึกแต่ละครั้งที่จ่าย
            </div>
          ) : (
            (form.payments || []).map((p, idx) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input type="date" style={inputStyle} value={p.date} onChange={(e) => updatePayment(idx, "date", e.target.value)} />
                <input type="number" style={{ ...inputStyle, textAlign: "right" }} placeholder="จำนวนเงิน" value={p.amount} onChange={(e) => updatePayment(idx, "amount", e.target.value)} />
                <select style={inputStyle} value={p.fromStoreBankId} onChange={(e) => updatePayment(idx, "fromStoreBankId", e.target.value)}>
                  <option value="CASH">เงินสดหน้าร้าน</option>
                  {storeBankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNo}</option>)}
                </select>
                <select style={inputStyle} value={p.method} onChange={(e) => updatePayment(idx, "method", e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button style={btnDanger} onClick={() => removePayment(idx)}><Trash2 size={14} /></button>
              </div>
            ))
          )}

          <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 16px", marginTop: 12, fontSize: 13 }}>
            <Row label="ยอดที่ต้องชำระ" value={`฿${fmt(formNet)}`} />
            <Row label="ชำระแล้ว" value={`฿${fmt(formPaid)}`} />
            <Row label="คงค้าง" value={`฿${fmt(formRemaining)}`} bold color={formRemaining > 0 ? "#a32d2d" : "#27500a"} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}

      {modal && modal.mode === "view" && (
        <ExpenseVoucherModal expense={modal.item} storeBankAccounts={storeBankAccounts} onClose={() => setModal(null)} />
      )}

      {installmentPicker && (
        <Modal title="ดึงจากงวดผ่อน — เลือกงวดที่ยังไม่ชำระ" onClose={() => setInstallmentPicker(false)} wide>
          {unpaidInstallments.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>ไม่มีงวดผ่อนที่ยังไม่ชำระ</p>
          ) : !pickerLoanId ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>เลขที่สัญญา</th>
                    <th style={thStyle}>ชื่อสัญญา</th>
                    <th style={thStyle}>ประเภท</th>
                    <th style={thStyle}>วันครบกำหนดชำระ</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {loansWithUnpaid.map((loan) => (
                    <tr
                      key={loan.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setPickerLoanId(loan.id)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", color: "#534ab7" }}>{loan.billNo || loan.id}</td>
                      <td style={tdStyle}>{loan.name}</td>
                      <td style={tdStyle}><Badge text={loan.type} /></td>
                      <td style={tdStyle}>{loan.nextDueDate}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#534ab7" }}><ChevronRight size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {(() => {
                const currentLoan = loansWithUnpaid.find((l) => l.id === pickerLoanId);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <button style={btnSecondary} onClick={() => setPickerLoanId("")}>‹ กลับไปเลือกสัญญา</button>
                    <div style={{ fontWeight: 600 }}>
                      {currentLoan?.name}{currentLoan?.billNo ? ` · ${currentLoan.billNo}` : ""} <Badge text={currentLoan?.type || ""} />
                    </div>
                  </div>
                );
              })()}
              <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>งวดที่</th>
                      <th style={thStyle}>วันครบกำหนด</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ยอดผ่อน</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ดอกเบี้ย</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ตัดเงินต้น</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerInstallments.map(({ loan, installment }) => (
                      <tr key={loan.id + "-" + installment.no}>
                        <td style={tdStyle}>{installment.no} / {loan.totalInstallments}</td>
                        <td style={tdStyle}>{installment.dueDate}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>฿{fmt(installment.payment)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#854f0b" }}>฿{fmt(installment.interest)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(installment.principalPortion)}</td>
                        <td style={tdStyle}>
                          <button style={btnPrimary} onClick={() => applyInstallment(loan, installment)}>เลือก</button>
                        </td>
                      </tr>
                    ))}
                    {pickerInstallments.length === 0 && (
                      <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีงวดค้างชำระสำหรับสัญญานี้</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setInstallmentPicker(false)}>ปิด</button>
          </div>
        </Modal>
      )}
      </div>{/* end tab-export-expenses */}
    </div>
  );
}
// ใบสำคัญจ่าย (Payment Voucher) PDF view
function ExpenseVoucherModal({ expense, storeBankAccounts, onClose }) {
  const items = (expense.items && expense.items.length > 0)
    ? expense.items
    : [{ description: expense.description, mainCategory: expense.mainCategory || expense.category, subCategory: expense.subCategory, amount: expense.amount }];
  const amount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const vat = expense.vatEnabled ? amount * 0.07 : 0;
  const wht = amount * ((Number(expense.whtRate) || 0) / 100);
  const net = amount + vat - wht;
  const payments = expense.payments || [];
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const fromLabel = (id) => {
    if (id === "CASH") return "เงินสดหน้าร้าน";
    const b = (storeBankAccounts || []).find((b) => b.id === id);
    return b ? `${b.bankName} ${b.accountNo}` : "-";
  };

  return (
    <Modal title={`ใบสำคัญจ่าย · ${expense.refNo || expense.id}`} onClose={onClose} wide>
      <div style={{ background: "#fff", padding: "24px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #993c1d", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#993c1d" }}>วงจรกรีน รีไซเคิล</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>ระบบจัดการของเก่ารีไซเคิล</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>ใบสำคัญจ่าย</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>เลขที่อ้างอิง: {expense.refNo || expense.id}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>วันที่บันทึก: {expense.recordDate || expense.billDate || expense.date}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>วันที่ตามบิล: {expense.billDate || expense.date}</div>
            {expense.taxInvoiceNo && <div style={{ fontSize: 12, color: "#6b7280" }}>เลขที่ใบกำกับภาษี: {expense.taxInvoiceNo}</div>}
          </div>
        </div>

        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>รายละเอียดค่าใช้จ่าย</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={thStyle}>รายละเอียด</th>
                <th style={thStyle}>หมวดหมู่</th>
                <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{it.description || "-"}</td>
                  <td style={tdStyle}>
                    <Badge text={it.mainCategory || "-"} />
                    {it.subCategory && <span style={{ marginLeft: 6, color: "#6b7280" }}>› {it.subCategory}</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 280 }}>
            <Row label="จำนวนเงิน" value={`฿${fmt(amount)}`} />
            <Row label={expense.vatEnabled ? "ภาษีมูลค่าเพิ่ม (7%)" : "ภาษีมูลค่าเพิ่ม"} value={`+฿${fmt(vat)}`} />
            <Row label={`หัก ณ ที่จ่าย (${Number(expense.whtRate) || 0}%)`} value={`-฿${fmt(wht)}`} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "2px solid #993c1d", fontWeight: 700, fontSize: 15 }}>
              <span>จำนวนเงินสุทธิ</span>
              <span>฿{fmt(net)}</span>
            </div>
          </div>
        </div>

        {payments.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>รายการจ่ายชำระเงิน</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={thStyle}>วันที่จ่าย</th>
                  <th style={thStyle}>จ่ายจาก</th>
                  <th style={thStyle}>วิธีชำระ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.date}</td>
                    <td style={tdStyle}>{fromLabel(p.fromStoreBankId)}</td>
                    <td style={tdStyle}>{p.method}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>฿{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "right", fontSize: 12, marginTop: 6, fontWeight: 600 }}>
              ชำระแล้วทั้งหมด: ฿{fmt(totalPaid)} / คงเหลือ: ฿{fmt(net - totalPaid)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, fontSize: 12 }}>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้จัดทำ</div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้อนุมัติ</div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>ผู้รับเงิน</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button style={btnSecondary} onClick={onClose}>ปิด</button>
        <button style={btnPrimary} onClick={() => window.print()}><Download size={16} /> พิมพ์ / บันทึก PDF</button>
      </div>
    </Modal>
  );
}

// ===================================================================
// STORE BANK ACCOUNTS TAB (บัญชีธนาคารของร้าน)
// ===================================================================
function StoreBankAccountsTab({ accounts, setAccounts, purchases, sales, expenses, deposits }) {
  const [modal, setModal] = useState(null);
  const [statementModal, setStatementModal] = useState(null); // {account}
  const [stmtYear, setStmtYear] = useState(new Date().getFullYear());
  const [stmtMonth, setStmtMonth] = useState(new Date().getMonth() + 1);
  const blank = { id: "", bankName: BANK_NAMES[0], accountNo: "", accountName: "", branch: "", openingBalance: 0 };
  const [form, setForm] = useState(blank);

  const openAdd = () => { setForm({ ...blank, id: "SB" + Date.now().toString().slice(-6) }); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm({ openingBalance: 0, ...item }); setModal({ mode: "edit", item }); };

  const save = () => {
    if (!form.bankName || !form.accountNo.trim()) return;
    const cleaned = { ...form, openingBalance: Number(form.openingBalance) || 0 };
    if (modal.mode === "add") setAccounts([...accounts, cleaned]);
    else setAccounts(accounts.map((a) => (a.id === modal.item.id ? cleaned : a)));
    setModal(null);
  };

  const remove = (id) => setAccounts(accounts.filter((a) => a.id !== id));

  // สร้าง Statement รายการเดินบัญชี
  const buildStatement = (acc) => {
    const startDate = `${stmtYear}-${String(stmtMonth).padStart(2,"0")}-01`;
    const endDate   = `${stmtYear}-${String(stmtMonth).padStart(2,"0")}-${String(new Date(stmtYear, stmtMonth, 0).getDate()).padStart(2,"0")}`;
    const inRange   = (d) => d >= startDate && d <= endDate;
    const rows = [];

    // รายรับ: ใบขายที่ชำระเข้าบัญชีนี้
    (sales || []).forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        if (p.toStoreBankId === acc.id && inRange(p.date)) {
          rows.push({ date: p.date, type: "รับชำระ", ref: inv.id, description: `รับชำระ Invoice ${inv.id}`, credit: Number(p.amount) || 0, debit: 0 });
        }
      });
    });

    // รายจ่าย: ค่าใช้จ่ายที่จ่ายจากบัญชีนี้
    (expenses || []).forEach((e) => {
      (e.payments || []).forEach((p) => {
        if (p.toStoreBankId === acc.id && inRange(p.date || e.billDate || e.date)) {
          rows.push({ date: p.date || e.billDate || e.date, type: "จ่ายค่าใช้จ่าย", ref: e.refNo || e.id, description: `ค่าใช้จ่าย ${e.refNo || e.id}`, debit: Number(p.amount) || 0, credit: 0 });
        }
      });
      // กรณีบันทึกบัญชีตรง (ไม่ผ่าน payments)
      if (!(e.payments && e.payments.length > 0) && e.toStoreBankId === acc.id && inRange(e.billDate || e.date)) {
        const items = (e.items && e.items.length > 0) ? e.items : [{ amount: e.amount }];
        const amt = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
        rows.push({ date: e.billDate || e.date, type: "จ่ายค่าใช้จ่าย", ref: e.refNo || e.id, description: `ค่าใช้จ่าย ${e.refNo || e.id}`, debit: amt, credit: 0 });
      }
    });

    // รายรับ: ใบรับสินค้า (จ่ายเงินให้ลูกค้า)
    (purchases || []).forEach((po) => {
      (po.payments || []).forEach((p) => {
        if (p.toStoreBankId === acc.id && inRange(p.date)) {
          rows.push({ date: p.date, type: "จ่ายรับสินค้า", ref: po.id, description: `จ่ายรับสินค้า ${po.id}`, debit: Number(p.amount) || 0, credit: 0 });
        }
      });
    });

    rows.sort((a, b) => a.date.localeCompare(b.date));

    // คำนวณยอดคงเหลือ
    let balance = Number(acc.openingBalance) || 0;
    const withBalance = rows.map((r) => {
      balance += r.credit - r.debit;
      return { ...r, balance };
    });
    return { rows: withBalance, startBalance: Number(acc.openingBalance) || 0, endBalance: balance };
  };

  const MONTH_NAMES = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const yearOptions = [];
  for (let y = 2024; y <= new Date().getFullYear() + 2; y++) yearOptions.push(y);

  return (
    <div>
      <Header title="บัญชีธนาคารของร้าน" subtitle="จัดการบัญชีธนาคาร — ดูรายการเดินบัญชี (Statement) ได้">
        <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> เพิ่มบัญชีธนาคาร</button>
      </Header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {accounts.map((a) => (
          <div key={a.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e6f1fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Landmark size={18} color="#185fa5" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.bankName}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#6b7280" }}>{a.accountNo}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={iconBtn} onClick={() => openEdit(a)}><Edit2 size={14} /></button>
                <button style={btnDanger} onClick={() => remove(a.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              <div>ชื่อบัญชี: {a.accountName || "-"}</div>
              <div>สาขา: {a.branch || "-"}</div>
            </div>
            {(Number(a.openingBalance) > 0) && (
              <div style={{ marginTop: 6, padding: "5px 10px", background: "#e6f1fb", borderRadius: 6, fontSize: 12, color: "#185fa5", fontWeight: 600 }}>
                ยอดยกมา: ฿{fmt(a.openingBalance)}
              </div>
            )}
            <button
              style={{ ...btnSecondary, marginTop: 10, width: "100%", fontSize: 12 }}
              onClick={() => setStatementModal(a)}
            >
              <History size={13} /> ดูรายการเดินบัญชี (Statement)
            </button>
          </div>
        ))}
        {accounts.length === 0 && <p style={{ color: "#9ca3af" }}>ยังไม่มีบัญชีธนาคารของร้าน</p>}
      </div>

      {/* Statement Modal */}
      {statementModal && (() => {
        const stmt = buildStatement(statementModal);
        const totalCredit = stmt.rows.reduce((s, r) => s + r.credit, 0);
        const totalDebit  = stmt.rows.reduce((s, r) => s + r.debit, 0);
        return (
          <Modal title={`Statement — ${statementModal.bankName} ${statementModal.accountNo}`} onClose={() => setStatementModal(null)} wide>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <select style={{ ...inputStyle, width: 140 }} value={stmtMonth} onChange={(e) => setStmtMonth(Number(e.target.value))}>
                {MONTH_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
              </select>
              <select style={{ ...inputStyle, width: 100 }} value={stmtYear} onChange={(e) => setStmtYear(Number(e.target.value))}>
                {yearOptions.map((y) => <option key={y} value={y}>ปี {y}</option>)}
              </select>
              <button style={btnSecondary} onClick={() => printAsPDF("stmt-print", `Statement ${statementModal.accountNo}`)}>
                <Download size={14} /> พิมพ์
              </button>
              <button style={btnSecondary} onClick={() => {
                const rows = [
                  [`Statement — ${statementModal.bankName} ${statementModal.accountNo}`, "", "", "", "", ""],
                  [`${MONTH_NAMES[stmtMonth]} ${stmtYear}`, "", "", "", "", ""],
                  ["วันที่", "ประเภท", "อ้างอิง", "รายการ", "ฝาก (เข้า)", "ถอน (ออก)", "คงเหลือ"],
                  ["ยอดยกมา", "", "", "", "", "", stmt.startBalance],
                  ...stmt.rows.map(r => [r.date, r.type, r.ref, r.description, r.credit || "", r.debit || "", r.balance]),
                  ["", "", "", "รวม", totalCredit, totalDebit, stmt.endBalance],
                ];
                exportExcel(rows, `Statement_${statementModal.accountNo}_${stmtYear}${String(stmtMonth).padStart(2,"0")}.xlsx`, "Statement");
              }}>
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>

            <div id="stmt-print">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  <div style={{ color: "#6b7280", marginBottom: 2 }}>ยอดยกมา</div>
                  <div style={{ fontWeight: 700, color: "#185fa5" }}>฿{fmt(stmt.startBalance)}</div>
                </div>
                <div style={{ background: "#e1f5ee", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  <div style={{ color: "#6b7280", marginBottom: 2 }}>รับเข้ารวม</div>
                  <div style={{ fontWeight: 700, color: "#0f6e56" }}>฿{fmt(totalCredit)}</div>
                </div>
                <div style={{ background: "#faece7", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                  <div style={{ color: "#6b7280", marginBottom: 2 }}>จ่ายออกรวม</div>
                  <div style={{ fontWeight: 700, color: "#993c1d" }}>฿{fmt(totalDebit)}</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>วันที่</th>
                    <th style={thStyle}>ประเภท</th>
                    <th style={thStyle}>เลขอ้างอิง</th>
                    <th style={thStyle}>รายการ</th>
                    <th style={{ ...thStyle, textAlign: "right", color: "#0f6e56" }}>ฝาก (เข้า)</th>
                    <th style={{ ...thStyle, textAlign: "right", color: "#993c1d" }}>ถอน (ออก)</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#f9fafb" }}>
                    <td style={tdStyle} colSpan={6}><strong>ยอดยกมา</strong></td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#185fa5" }}>฿{fmt(stmt.startBalance)}</td>
                  </tr>
                  {stmt.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{r.date}</td>
                      <td style={tdStyle}><span style={{ background: r.credit > 0 ? "#e1f5ee" : "#faece7", color: r.credit > 0 ? "#0f6e56" : "#993c1d", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{r.type}</span></td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{r.ref}</td>
                      <td style={tdStyle}>{r.description}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#0f6e56", fontWeight: r.credit > 0 ? 600 : 400 }}>{r.credit > 0 ? `฿${fmt(r.credit)}` : "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#993c1d", fontWeight: r.debit > 0 ? 600 : 400 }}>{r.debit > 0 ? `฿${fmt(r.debit)}` : "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: r.balance >= 0 ? "#1f2937" : "#a32d2d" }}>฿{fmt(r.balance)}</td>
                    </tr>
                  ))}
                  {stmt.rows.length === 0 && (
                    <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีรายการในเดือนนี้</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f3f4f6" }}>
                    <td colSpan={4} style={{ ...tdStyle, fontWeight: 700 }}>รวม / ยอดคงเหลือสิ้นเดือน</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#0f6e56" }}>฿{fmt(totalCredit)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#993c1d" }}>฿{fmt(totalDebit)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 15, color: stmt.endBalance >= 0 ? "#185fa5" : "#a32d2d" }}>฿{fmt(stmt.endBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Modal>
        );
      })()}

      {modal && (
        <Modal title={modal.mode === "add" ? "เพิ่มบัญชีธนาคารของร้าน" : "แก้ไขบัญชีธนาคารของร้าน"} onClose={() => setModal(null)}>
          <Field label="ธนาคาร">
  <input style={inputStyle} list="bank-name-options" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="เลือกหรือพิมพ์ชื่อธนาคาร" />
  <datalist id="bank-name-options">
    {BANK_NAMES.map((n) => <option key={n} value={n} />)}
  </datalist>
</Field>
          <Field label="เลขที่บัญชี"><input style={inputStyle} value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} /></Field>
          <Field label="ชื่อบัญชี"><input style={inputStyle} value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></Field>
          <Field label="สาขา"><input style={inputStyle} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></Field>
          <div style={{ background: "#e6f1fb", borderRadius: 8, padding: "12px 16px", marginTop: 8 }}>
            <Field label="ยอดคงเหลือยกมา (บาท)">
              <input type="number" min={0} style={inputStyle} value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BankTransferTab({ storeBankAccounts }) {
  const [transfers, setTransfers] = useState([]);
  const [modal, setModal] = useState(null);
  const blankForm = () => ({
    id: "TF" + Date.now().toString().slice(-6),
    date: new Date().toISOString().slice(0, 10),
    fromBankId: storeBankAccounts[0]?.id || "",
    toBankId: storeBankAccounts[1]?.id || storeBankAccounts[0]?.id || "",
    amount: 0,
    note: "",
  });
  const [form, setForm] = useState(blankForm());

  const bankName = (id) => {
    const b = storeBankAccounts.find((b) => b.id === id);
    return b ? `${b.bankName} ${b.accountNo}` : "-";
  };

  const save = () => {
    if (!form.fromBankId || !form.toBankId || !(Number(form.amount) > 0)) return;
    if (form.fromBankId === form.toBankId) { alert("บัญชีต้นทางและปลายทางต้องต่างกัน"); return; }
    const t = { ...form, amount: Number(form.amount) };
    if (modal.mode === "add") setTransfers([t, ...transfers]);
    else setTransfers(transfers.map((x) => x.id === modal.item.id ? t : x));
    setModal(null);
  };

  const totalOut = (bankId) => transfers.filter((t) => t.fromBankId === bankId).reduce((s, t) => s + t.amount, 0);
  const totalIn = (bankId) => transfers.filter((t) => t.toBankId === bankId).reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <Header title="โยกเงินระหว่างธนาคาร" subtitle="บันทึกการโอนเงินระหว่างบัญชีธนาคารของร้าน">
        <button style={btnPrimary} onClick={() => { setForm(blankForm()); setModal({ mode: "add" }); }}><Plus size={16} /> บันทึกโยกเงิน</button>
      </Header>

      {storeBankAccounts.length < 2 && (
        <div style={{ background: "#faeeda", border: "1px solid #f0c070", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#854f0b" }}>
          ⚠️ ต้องมีบัญชีธนาคารร้านอย่างน้อย 2 บัญชีเพื่อโยกเงิน — ไปที่ "บัญชีธนาคารร้าน" เพื่อเพิ่ม
        </div>
      )}

      {/* สรุปยอดโยกเงินต่อบัญชี */}
      {storeBankAccounts.length > 0 && transfers.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
          {storeBankAccounts.map((b) => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "14px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{b.bankName} {b.accountNo}</div>
              <div style={{ fontSize: 12, color: "#0f6e56" }}>รับโอนเข้า: ฿{fmt(totalIn(b.id))}</div>
              <div style={{ fontSize: 12, color: "#993c1d" }}>โอนออก: ฿{fmt(totalOut(b.id))}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {transfers.map((t) => (
          <div key={t.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>{t.id}</span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>{t.date}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 600, color: "#993c1d" }}>{bankName(t.fromBankId)}</span>
                <ArrowRight size={14} color="#9ca3af" />
                <span style={{ fontWeight: 600, color: "#0f6e56" }}>{bankName(t.toBankId)}</span>
              </div>
              {t.note && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{t.note}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>ยอดโอน</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#185fa5" }}>฿{fmt(t.amount)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={iconBtn} onClick={() => { setForm({ ...t }); setModal({ mode: "edit", item: t }); }}><Edit2 size={14} /></button>
              <button style={btnDanger} onClick={() => setTransfers(transfers.filter((x) => x.id !== t.id))}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {transfers.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>ยังไม่มีรายการโยกเงิน</div>}
      </div>

      {modal && (
        <Modal title={modal.mode === "add" ? "บันทึกโยกเงิน" : "แก้ไขโยกเงิน"} onClose={() => setModal(null)}>
          <Field label="วันที่โอน"><input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="โอนจากบัญชี">
            <select style={inputStyle} value={form.fromBankId} onChange={(e) => setForm({ ...form, fromBankId: e.target.value })}>
              {storeBankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNo}</option>)}
            </select>
          </Field>
          <Field label="โอนไปบัญชี">
            <select style={inputStyle} value={form.toBankId} onChange={(e) => setForm({ ...form, toBankId: e.target.value })}>
              {storeBankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} {b.accountNo}</option>)}
            </select>
          </Field>
          <Field label="จำนวนเงิน (บาท)"><input type="number" min={0} style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="หมายเหตุ"><input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===================================================================
// RECEIVABLES TAB (ลูกหนี้/เจ้าหนี้ — ค้างรับ/ค้างจ่าย)
// ===================================================================
function ReceivablesTab({ customers, sales, purchases }) {
  const [activeView, setActiveView] = useState("receivable"); // "receivable" | "payable"
  const custName = (id) => customers.find((c) => c.id === id)?.name || id;

  // ลูกหนี้ (Accounts Receivable) = ใบขายที่ยังค้างรับ
  const receivables = useMemo(() => {
    const map = {};
    sales.forEach((inv) => {
      const subtotal = inv.items.reduce((s, it) => s + (it.net || 0) * (it.price || 0), 0);
      const ad = subtotal - (inv.discount || 0);
      const total = ad + ad * ((inv.vatRate || 0) / 100);
      const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const remaining = total - paid;
      if (remaining > 0.01) {
        if (!map[inv.customerId]) map[inv.customerId] = { customerId: inv.customerId, invoices: [], totalRemaining: 0, totalAmount: 0 };
        map[inv.customerId].invoices.push({ id: inv.id, date: inv.date, total, paid, remaining });
        map[inv.customerId].totalRemaining += remaining;
        map[inv.customerId].totalAmount += total;
      }
    });
    return Object.values(map).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [sales, customers]);

  // เจ้าหนี้ (Accounts Payable) = ใบรับสินค้าที่ยังค้างจ่าย
  const payables = useMemo(() => {
    const map = {};
    purchases.forEach((po) => {
      if ((po.status || "") !== "อนุมัติแล้ว") return;
      const subtotal = po.items.reduce((s, it) => s + (it.net != null ? it.net : it.qty - it.deduct) * it.price, 0);
      const vat = subtotal * ((Number(po.vatRate) || 0) / 100);
      const total = subtotal + vat;
      const paid = (po.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const remaining = total - paid;
      if (remaining > 0.01) {
        if (!map[po.customerId]) map[po.customerId] = { customerId: po.customerId, orders: [], totalRemaining: 0 };
        map[po.customerId].orders.push({ id: po.id, date: po.date, total, paid, remaining });
        map[po.customerId].totalRemaining += remaining;
      }
    });
    return Object.values(map).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [purchases, customers]);

  const totalReceivable = receivables.reduce((s, r) => s + r.totalRemaining, 0);
  const totalPayable = payables.reduce((s, p) => s + p.totalRemaining, 0);

  return (
    <div>
      <Header title="ลูกหนี้ / เจ้าหนี้" subtitle="ยอดค้างรับจากลูกค้า และยอดค้างจ่ายให้ลูกค้า (ผู้ขายของเก่า)" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ยอดลูกหนี้ค้างรับรวม</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#185fa5" }}>฿{fmt(totalReceivable)}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{receivables.length} ราย</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ยอดเจ้าหนี้ค้างจ่ายรวม</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#993c1d" }}>฿{fmt(totalPayable)}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{payables.length} ราย</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ key: "receivable", label: `ลูกหนี้ค้างรับ (${receivables.length} ราย)` }, { key: "payable", label: `เจ้าหนี้ค้างจ่าย (${payables.length} ราย)` }].map((opt) => (
          <button key={opt.key} onClick={() => setActiveView(opt.key)}
            style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: "1px solid",
              borderColor: activeView === opt.key ? "#185fa5" : "#d1d5db",
              background: activeView === opt.key ? "#e6f1fb" : "#fff",
              color: activeView === opt.key ? "#185fa5" : "#6b7280" }}>
            {opt.label}
          </button>
        ))}
      </div>

      {activeView === "receivable" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {receivables.map((r) => (
            <div key={r.customerId} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ background: "#e6f1fb", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#185fa5" }}>{custName(r.customerId)}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#185fa5" }}>ค้างรับ ฿{fmt(r.totalRemaining)}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>เลข Invoice</th>
                  <th style={thStyle}>วันที่</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ยอดรวม</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>รับแล้ว</th>
                  <th style={{ ...thStyle, textAlign: "right", color: "#185fa5" }}>ค้างรับ</th>
                </tr></thead>
                <tbody>
                  {r.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>{inv.id}</td>
                      <td style={tdStyle}>{inv.date}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(inv.total)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#0f6e56" }}>{fmt(inv.paid)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#185fa5" }}>{fmt(inv.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {receivables.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>ไม่มียอดค้างรับ — ลูกค้าทุกรายชำระครบแล้ว ✓</div>}
        </div>
      )}

      {activeView === "payable" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {payables.map((p) => (
            <div key={p.customerId} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ background: "#faece7", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#993c1d" }}>{custName(p.customerId)}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#993c1d" }}>ค้างจ่าย ฿{fmt(p.totalRemaining)}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>เลข PO</th>
                  <th style={thStyle}>วันที่</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ยอดรวม</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จ่ายแล้ว</th>
                  <th style={{ ...thStyle, textAlign: "right", color: "#993c1d" }}>ค้างจ่าย</th>
                </tr></thead>
                <tbody>
                  {p.orders.map((po) => (
                    <tr key={po.id}>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>{po.id}</td>
                      <td style={tdStyle}>{po.date}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(po.total)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#0f6e56" }}>{fmt(po.paid)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>{fmt(po.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {payables.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>ไม่มียอดค้างจ่าย — ชำระครบทุกใบแล้ว ✓</div>}
        </div>
      )}
    </div>
  );
}

// ===================================================================
// ASSETS TAB (ทะเบียนทรัพย์สิน)
// ===================================================================
function AssetsTab() {
  const [assets, setAssets] = useState([
    { id: "AS001", name: "รถกระบะบรรทุก", category: "ยานพาหนะ", purchaseDate: "2024-01-15", cost: 650000, lifeYears: 5, depreciationMethod: "เส้นตรง", note: "" },
    { id: "AS002", name: "เครื่องชั่งน้ำหนัก", category: "เครื่องจักร/อุปกรณ์", purchaseDate: "2024-03-01", cost: 45000, lifeYears: 10, depreciationMethod: "เส้นตรง", note: "" },
  ]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");

  const ASSET_CATEGORIES = ["ยานพาหนะ", "เครื่องจักร/อุปกรณ์", "อาคาร/สิ่งปลูกสร้าง", "คอมพิวเตอร์/IT", "เฟอร์นิเจอร์/ของตกแต่ง", "อื่นๆ"];

  const blankForm = () => ({
    id: genId("AS", assets),
    name: "", category: ASSET_CATEGORIES[0], purchaseDate: new Date().toISOString().slice(0, 10),
    cost: 0, lifeYears: 5, depreciationMethod: "เส้นตรง", note: "",
  });
  const [form, setForm] = useState(blankForm());

  const annualDepreciation = (a) => a.depreciationMethod === "เส้นตรง" ? Number(a.cost) / Number(a.lifeYears) : 0;
  const monthlyDepreciation = (a) => annualDepreciation(a) / 12;
  const yearsUsed = (a) => {
    const ms = new Date() - new Date(a.purchaseDate);
    return ms / (1000 * 60 * 60 * 24 * 365.25);
  };
  const accumulatedDepreciation = (a) => Math.min(Number(a.cost), annualDepreciation(a) * yearsUsed(a));
  const bookValue = (a) => Math.max(0, Number(a.cost) - accumulatedDepreciation(a));

  const filtered = assets.filter((a) => a.name.includes(search) || a.category.includes(search) || a.id.includes(search));

  const save = () => {
    if (!form.name.trim()) return;
    const cleaned = { ...form, cost: Number(form.cost) || 0, lifeYears: Number(form.lifeYears) || 1 };
    if (modal.mode === "add") setAssets([...assets, cleaned]);
    else setAssets(assets.map((a) => a.id === modal.item.id ? cleaned : a));
    setModal(null);
  };

  const totalCost = assets.reduce((s, a) => s + Number(a.cost), 0);
  const totalBookValue = assets.reduce((s, a) => s + bookValue(a), 0);
  const totalAccDep = assets.reduce((s, a) => s + accumulatedDepreciation(a), 0);

  return (
    <div>
      <Header title="ทะเบียนทรัพย์สิน" subtitle="บันทึกและคำนวณค่าเสื่อมราคาทรัพย์สินของร้าน">
        <button style={btnPrimary} onClick={() => { setForm(blankForm()); setModal({ mode: "add" }); }}><Plus size={16} /> เพิ่มทรัพย์สิน</button>
      </Header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "ราคาทุนรวมทั้งหมด", value: fmt(totalCost), color: "#185fa5", bg: "#e6f1fb" },
          { label: "ค่าเสื่อมราคาสะสม", value: fmt(totalAccDep), color: "#854f0b", bg: "#faeeda" },
          { label: "มูลค่าตามบัญชีรวม", value: fmt(totalBookValue), color: "#0f6e56", bg: "#e1f5ee" },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: c.color }}>฿{c.value}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาชื่อทรัพย์สิน, หมวดหมู่..." />

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>รหัส</th>
              <th style={thStyle}>ชื่อทรัพย์สิน</th>
              <th style={thStyle}>หมวดหมู่</th>
              <th style={thStyle}>วันที่ซื้อ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ราคาทุน</th>
              <th style={{ ...thStyle, textAlign: "right" }}>อายุ (ปี)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>เสื่อม/ปี</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ค่าเสื่อมสะสม</th>
              <th style={{ ...thStyle, textAlign: "right" }}>มูลค่าตามบัญชี</th>
              <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{a.id}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{a.name}</td>
                <td style={tdStyle}><Badge text={a.category} /></td>
                <td style={tdStyle}>{a.purchaseDate}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(a.cost)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{a.lifeYears}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(annualDepreciation(a))}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#854f0b" }}>{fmt(accumulatedDepreciation(a))}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0f6e56" }}>{fmt(bookValue(a))}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button style={iconBtn} onClick={() => { setForm({ ...a }); setModal({ mode: "edit", item: a }); }}><Edit2 size={14} /></button>
                    <button style={btnDanger} onClick={() => setAssets(assets.filter((x) => x.id !== a.id))}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่พบทรัพย์สิน</td></tr>}
          </tbody>
          {assets.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: 700 }}>รวม</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(totalCost)}</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#854f0b" }}>{fmt(totalAccDep)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#0f6e56" }}>{fmt(totalBookValue)}</td>
                <td style={tdStyle}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === "add" ? "เพิ่มทรัพย์สิน" : "แก้ไขทรัพย์สิน"} onClose={() => setModal(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="รหัสทรัพย์สิน"><input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={modal.mode === "edit"} /></Field>
            <Field label="ชื่อทรัพย์สิน"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="หมวดหมู่">
              <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="วันที่ซื้อ"><input type="date" style={inputStyle} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
            <Field label="ราคาทุน (บาท)"><input type="number" min={0} style={inputStyle} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
            <Field label="อายุการใช้งาน (ปี)"><input type="number" min={1} max={50} style={inputStyle} value={form.lifeYears} onChange={(e) => setForm({ ...form, lifeYears: e.target.value })} /></Field>
            <Field label="วิธีเสื่อมราคา">
              <select style={inputStyle} value={form.depreciationMethod} onChange={(e) => setForm({ ...form, depreciationMethod: e.target.value })}>
                <option value="เส้นตรง">เส้นตรง (Straight-Line)</option>
                <option value="ยอดคงเหลือลดลง">ยอดคงเหลือลดลง</option>
              </select>
            </Field>
          </div>
          <Field label="หมายเหตุ"><input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          {Number(form.cost) > 0 && Number(form.lifeYears) > 0 && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginTop: 8, fontSize: 13 }}>
              <Row label="ค่าเสื่อมราคาต่อปี" value={`฿${fmt(Number(form.cost) / Number(form.lifeYears))}`} />
              <Row label="ค่าเสื่อมราคาต่อเดือน" value={`฿${fmt(Number(form.cost) / Number(form.lifeYears) / 12)}`} />
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ===================================================================
// COMPANY SETTINGS TAB (ตั้งค่าร้าน / โลโก้)
// ===================================================================
function CompanySettingsTab({ settings, setSettings, shopProfile, setShopProfile }) {
  const cs = settings || {};
  const sp = shopProfile || {};
  const set = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));
  const setSP = (field, value) => setShopProfile((prev) => ({ ...prev, [field]: value }));
  const [saved, setSaved] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("รูปภาพต้องไม่เกิน 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => set("logo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSidebarLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("รูปภาพต้องไม่เกิน 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setSP("logo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sCard = { background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "20px 24px", marginBottom: 16 };

  return (
    <div>
      <Header title="ตั้งค่ากิจการ" subtitle="แยกเป็น 2 ส่วน — โปรไฟล์หน้าแอป (sidebar) และข้อมูลเอกสาร/บิล">
        <button style={btnPrimary} onClick={handleSave}>
          {saved ? <><CheckCircle2 size={16} /> บันทึกแล้ว!</> : <><Save size={16} /> บันทึก</>}
        </button>
      </Header>

      {/* ===== ส่วนที่ 1: โปรไฟล์ Sidebar ===== */}
      <div style={{ ...sCard, border: "2px solid #1d9e75" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0c443c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Boxes size={14} color="#9fe1cb" />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0c443c" }}>โปรไฟล์แอป (แสดงในแถบเมนูซ้าย)</h3>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>แยกอิสระจากข้อมูลบิล</span>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* sidebar logo preview */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ background: "#0c443c", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, width: 200 }}>
              {sp.logo ? (
                <img src={sp.logo} alt="logo" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "contain", background: "#fff", padding: 3 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 8, background: "#1d9e75", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Boxes size={18} color="#04342c" />
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#e1f5ee", lineHeight: 1.2 }}>{sp.name || "ชื่อร้าน"}</div>
                <div style={{ fontSize: 10, color: "#9fe1cb" }}>{sp.nameEn || "คำบรรยาย"}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 6 }}>ตัวอย่าง sidebar</div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="ชื่อร้าน (บรรทัดบนใน sidebar)">
              <input style={inputStyle} value={sp.name || ""} onChange={(e) => setSP("name", e.target.value)} placeholder="เช่น วงจรกรีน" />
            </Field>
            <Field label="คำบรรยาย (บรรทัดล่างใน sidebar)">
              <input style={inputStyle} value={sp.nameEn || ""} onChange={(e) => setSP("nameEn", e.target.value)} placeholder="เช่น ระบบซื้อขายของเก่ารีไซเคิล" />
            </Field>
            <Field label="โลโก้ sidebar">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ ...btnSecondary, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <Image size={14} /> อัปโหลดโลโก้ sidebar
                  <input type="file" accept="image/*" onChange={handleSidebarLogoUpload} style={{ display: "none" }} />
                </label>
                {sp.logo && (
                  <button style={btnDanger} onClick={() => setSP("logo", "")}>
                    <X size={14} /> ลบ
                  </button>
                )}
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* ===== ส่วนที่ 2: โลโก้บิล/เอกสาร ===== */}
      <div style={sCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#185fa5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={14} color="#fff" />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#185fa5" }}>ข้อมูลเอกสาร / บิล</h3>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>แสดงในใบรับสินค้า ใบขาย และเอกสารทุกใบ</span>
        </div>

        <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>โลโก้บนบิล</h4>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flexShrink: 0 }}>
            {cs.logo ? (
              <div style={{ position: "relative" }}>
                <img src={cs.logo} alt="โลโก้บิล" style={{ width: 140, height: 88, objectFit: "contain", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", padding: 8 }} />
                <button onClick={() => set("logo", "")} style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div style={{ width: 140, height: 88, borderRadius: 10, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#9ca3af", background: "#f9fafb" }}>
                <FileText size={24} />
                <span style={{ fontSize: 11 }}>ยังไม่มีโลโก้บิล</span>
              </div>
            )}
          </div>
          <div>
            <label style={{ ...btnSecondary, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
              <Image size={14} /> อัปโหลดโลโก้บิล
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            </label>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>JPG, PNG, SVG — ไม่เกิน 2MB</p>
          </div>
        </div>

        <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>ข้อมูลร้านบนบิล</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="ชื่อร้าน / บริษัท (ภาษาไทย)">
            <input style={inputStyle} value={cs.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="เช่น วงจรกรีน รีไซเคิล" />
          </Field>
          <Field label="ชื่อร้าน / บริษัท (English)">
            <input style={inputStyle} value={cs.nameEn || ""} onChange={(e) => set("nameEn", e.target.value)} />
          </Field>
          <Field label="เลขประจำตัวผู้เสียภาษี">
            <input style={inputStyle} value={cs.taxId || ""} onChange={(e) => set("taxId", e.target.value)} placeholder="0-0000-00000-00-0" />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <input style={inputStyle} value={cs.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="อีเมล">
            <input style={inputStyle} value={cs.email || ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="เว็บไซต์ / Line ID">
            <input style={inputStyle} value={cs.website || ""} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </div>
        <Field label="ที่อยู่">
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={cs.address || ""} onChange={(e) => set("address", e.target.value)} />
        </Field>

        <h4 style={{ margin: "16px 0 12px", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>ตั้งค่าเอกสาร</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="ชื่อเอกสาร ใบรับสินค้า">
            <input style={inputStyle} value={cs.purchaseTitle || ""} onChange={(e) => set("purchaseTitle", e.target.value)} placeholder="ใบรับสินค้า (รับซื้อของเก่า)" />
          </Field>
          <Field label="ชื่อเอกสาร ใบขาย">
            <input style={inputStyle} value={cs.salesTitle || ""} onChange={(e) => set("salesTitle", e.target.value)} placeholder="ใบกำกับภาษี / Invoice" />
          </Field>
          <Field label="ชื่อเอกสาร ใบสำคัญจ่าย">
            <input style={inputStyle} value={cs.expenseVoucherTitle || ""} onChange={(e) => set("expenseVoucherTitle", e.target.value)} placeholder="ใบสำคัญจ่าย" />
          </Field>
          <div></div>
          <Field label="สีหลักเอกสาร">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={cs.primaryColor || "#0f6e56"} onChange={(e) => set("primaryColor", e.target.value)} style={{ width: 40, height: 36, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }} />
              <input style={{ ...inputStyle, flex: 1 }} value={cs.primaryColor || "#0f6e56"} onChange={(e) => set("primaryColor", e.target.value)} />
            </div>
          </Field>
          <Field label="สีรองเอกสาร">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={cs.accentColor || "#185fa5"} onChange={(e) => set("accentColor", e.target.value)} style={{ width: 40, height: 36, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }} />
              <input style={{ ...inputStyle, flex: 1 }} value={cs.accentColor || "#185fa5"} onChange={(e) => set("accentColor", e.target.value)} />
            </div>
          </Field>
        </div>
        <Field label="หมายเหตุท้ายใบสำคัญจ่าย">
          <input style={inputStyle} value={cs.expenseVoucherNote || ""} onChange={(e) => set("expenseVoucherNote", e.target.value)} placeholder="เช่น ผู้จ่ายเงิน _________________________ ผู้อนุมัติ _________________________" />
        </Field>
        <Field label="หมายเหตุท้ายเอกสาร">
          <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={cs.footerNote || ""} onChange={(e) => set("footerNote", e.target.value)} placeholder="เช่น ขอบคุณที่ใช้บริการ" />
        </Field>
      </div>

      {/* ===== Preview บิล ===== */}
      <div style={{ ...sCard, background: "#f9fafb" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>👁 ตัวอย่างหัวบิล</h3>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${cs.primaryColor || "#0f6e56"}`, paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {cs.logo ? (
                <img src={cs.logo} alt="logo" style={{ height: 48, maxWidth: 90, objectFit: "contain" }} />
              ) : (
                <div style={{ width: 48, height: 48, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={22} color="#9ca3af" />
                </div>
              )}
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: cs.primaryColor || "#0f6e56" }}>{cs.name || "ชื่อร้านบนบิล"}</div>
                {cs.taxId && <div style={{ fontSize: 11, color: "#6b7280" }}>เลขผู้เสียภาษี: {cs.taxId}</div>}
                {cs.phone && <div style={{ fontSize: 11, color: "#6b7280" }}>โทร: {cs.phone}</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: cs.primaryColor || "#0f6e56" }}>{cs.purchaseTitle || "ใบรับสินค้า"}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>เลขที่: PO260617001</div>
            </div>
          </div>
          {cs.footerNote && <div style={{ fontSize: 11, color: "#6b7280" }}>{cs.footerNote}</div>}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// TAX SUMMARY TAB (สรุปภาษีซื้อ-ภาษีขาย)
// ===================================================================
function TaxSummaryTab({ purchases, sales, expenses }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState("month"); // "month" | "range"
  const [rangeStart, setRangeStart] = useState(now.toISOString().slice(0, 8) + "01");
  const [rangeEnd, setRangeEnd] = useState(now.toISOString().slice(0, 10));

  const MONTH_NAMES = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const yearOptions = [];
  for (let y = 2024; y <= now.getFullYear() + 2; y++) yearOptions.push(y);

  const startDate = mode === "month" ? `${year}-${String(month).padStart(2,"0")}-01` : rangeStart;
  const endDate   = mode === "month" ? `${year}-${String(month).padStart(2,"0")}-${String(new Date(year, month, 0).getDate()).padStart(2,"0")}` : rangeEnd;
  const inRange = (d) => d >= startDate && d <= endDate;
  const periodLabel = mode === "month" ? `${MONTH_NAMES[month]} ${year}` : `${startDate} ถึง ${endDate}`;

  // ===== ภาษีซื้อ (Input VAT) = VAT จากการซื้อสินค้า + ค่าใช้จ่าย =====
  const purchaseVatRows = purchases.filter((po) => po.status === "อนุมัติแล้ว" && inRange(po.date) && Number(po.vatRate) > 0).map((po) => {
    const subtotal = po.items.reduce((s, it) => s + (it.net || 0) * (it.price || 0), 0);
    const vat = subtotal * ((Number(po.vatRate) || 0) / 100);
    return { id: po.id, date: po.date, description: `ใบรับสินค้า ${po.id}`, base: subtotal, vatRate: po.vatRate, vat };
  });

  const expenseVatRows = expenses.filter((e) => inRange(e.billDate || e.date) && e.vatEnabled).map((e) => {
    const items = (e.items && e.items.length > 0) ? e.items : [{ amount: e.amount }];
    const base = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const vat = base * 0.07;
    return { id: e.refNo || e.id, date: e.billDate || e.date, description: `ค่าใช้จ่าย ${e.refNo || e.id}`, base, vatRate: 7, vat };
  });

  const inputVatRows = [...purchaseVatRows, ...expenseVatRows].sort((a, b) => a.date.localeCompare(b.date));
  const totalInputBase = inputVatRows.reduce((s, r) => s + r.base, 0);
  const totalInputVat  = inputVatRows.reduce((s, r) => s + r.vat, 0);

  // ===== ภาษีขาย (Output VAT) = VAT จากการขายสินค้า =====
  const outputVatRows = sales.filter((inv) => inRange(inv.date) && Number(inv.vatRate) > 0).map((inv) => {
    const subtotal = inv.items.reduce((s, it) => s + (it.net || 0) * (it.price || 0), 0);
    const ad = subtotal - (inv.discount || 0);
    const vat = ad * ((Number(inv.vatRate) || 0) / 100);
    return { id: inv.id, date: inv.date, description: `ใบขาย ${inv.id}`, base: ad, vatRate: inv.vatRate, vat };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const totalOutputBase = outputVatRows.reduce((s, r) => s + r.base, 0);
  const totalOutputVat  = outputVatRows.reduce((s, r) => s + r.vat, 0);
  const vatDiff = totalOutputVat - totalInputVat;
  const vatTh = { ...thStyle, textAlign: "right" };

  // ===== หัก ณ ที่จ่าย (Withholding Tax) =====
  const whtRows = expenses.filter((e) => inRange(e.billDate || e.date) && Number(e.whtRate) > 0).map((e) => {
    const items = (e.items && e.items.length > 0) ? e.items : [{ amount: e.amount }];
    const base = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const wht = base * ((Number(e.whtRate) || 0) / 100);
    const vendor = e.vendorName || e.description || e.refNo || e.id;
    return { id: e.refNo || e.id, date: e.billDate || e.date, description: vendor, base, whtRate: e.whtRate, wht };
  }).sort((a, b) => a.date.localeCompare(b.date));
  const totalWhtBase = whtRows.reduce((s, r) => s + r.base, 0);
  const totalWht     = whtRows.reduce((s, r) => s + r.wht, 0);

  return (
    <div>
      <Header title="สรุปภาษีซื้อ - ภาษีขาย" subtitle="สรุป VAT จากใบรับสินค้า ค่าใช้จ่าย และใบขาย เพื่อยื่น ภ.พ.30">
        <ExportToolbar
          onPDF={() => printAsPDF("tax-content", `ภาษี ${periodLabel}`)}
          onExcel={() => {
            const rows = [
              [`สรุปภาษีซื้อ-ภาษีขาย ${periodLabel}`],[""],
              ["ภาษีซื้อ (Input VAT)","","",""],
              ["เลขที่","วันที่","ฐานภาษี","VAT"],
              ...inputVatRows.map(r => [r.id, r.date, r.base, r.vat]),
              ["รวมภาษีซื้อ","",totalInputBase,totalInputVat],[""],
              ["ภาษีขาย (Output VAT)","","",""],
              ["เลขที่","วันที่","ฐานภาษี","VAT"],
              ...outputVatRows.map(r => [r.id, r.date, r.base, r.vat]),
              ["รวมภาษีขาย","",totalOutputBase,totalOutputVat],[""],
              ["หัก ณ ที่จ่าย (WHT)","","",""],
              ["เลขที่","วันที่","ฐานภาษี","WHT"],
              ...whtRows.map(r => [r.id, r.date, r.base, r.wht]),
              ["รวม WHT","",totalWhtBase,totalWht],[""],
              ["ภาษีสุทธิ (ขาย-ซื้อ)","","",vatDiff],
            ];
            exportExcel(rows, `ภาษี_${periodLabel.replace(/\s/g,"_")}.xlsx`, "ภาษี");
          }}
          onImage={() => printAsPDF("tax-content", `ภาษี ${periodLabel}`)}
        />
      </Header>

      {/* Period Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #d1d5db" }}>
          {[{key:"month",label:"รายเดือน"},{key:"range",label:"เลือกช่วง"}].map((opt) => (
            <button key={opt.key} onClick={() => setMode(opt.key)}
              style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
                background: mode===opt.key ? "#0c443c" : "#fff", color: mode===opt.key ? "#fff" : "#6b7280" }}>
              {opt.label}
            </button>
          ))}
        </div>
        {mode === "month" && (
          <>
            <select style={{ ...inputStyle, width: 140 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
            </select>
            <select style={{ ...inputStyle, width: 100 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((y) => <option key={y} value={y}>ปี {y}</option>)}
            </select>
          </>
        )}
        {mode === "range" && (
          <>
            <input type="date" style={{ ...inputStyle, width: 160 }} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>ถึง</span>
            <input type="date" style={{ ...inputStyle, width: 160 }} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#faece7", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: "#993c1d", marginBottom: 4 }}>ภาษีซื้อ (Input VAT)</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#993c1d" }}>฿{fmt(totalInputVat)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>ฐานภาษี ฿{fmt(totalInputBase)}</div>
        </div>
        <div style={{ background: "#e1f5ee", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: "#0f6e56", marginBottom: 4 }}>ภาษีขาย (Output VAT)</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#0f6e56" }}>฿{fmt(totalOutputVat)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>ฐานภาษี ฿{fmt(totalOutputBase)}</div>
        </div>
        <div style={{ background: vatDiff >= 0 ? "#e6f1fb" : "#faeeda", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: vatDiff >= 0 ? "#185fa5" : "#854f0b", marginBottom: 4 }}>
            {vatDiff >= 0 ? "VAT ต้องชำระ" : "VAT ขอคืน"}
          </div>
          <div style={{ fontWeight: 700, fontSize: 20, color: vatDiff >= 0 ? "#185fa5" : "#854f0b" }}>฿{fmt(Math.abs(vatDiff))}</div>
        </div>
        <div style={{ background: "#eeedfe", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: "#3c3489", marginBottom: 4 }}>หัก ณ ที่จ่าย (WHT)</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#3c3489" }}>฿{fmt(totalWht)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>ฐานภาษี ฿{fmt(totalWhtBase)}</div>
        </div>
      </div>

      <div id="tax-content">
        {/* ภาษีซื้อ */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ background: "#faece7", padding: "10px 16px", fontWeight: 700, fontSize: 14, color: "#993c1d" }}>
            ภาษีซื้อ (Input VAT) — {periodLabel}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thStyle}>เลขที่เอกสาร</th><th style={thStyle}>วันที่</th>
              <th style={thStyle}>รายการ</th><th style={vatTh}>อัตรา VAT</th>
              <th style={vatTh}>ฐานภาษี (บาท)</th><th style={vatTh}>VAT (บาท)</th>
            </tr></thead>
            <tbody>
              {inputVatRows.map((r,i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.id}</td>
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>{r.description}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.vatRate}%</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(r.base)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#993c1d" }}>{fmt(r.vat)}</td>
                </tr>
              ))}
              {inputVatRows.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีรายการภาษีซื้อในช่วงนี้</td></tr>}
            </tbody>
            {inputVatRows.length > 0 && <tfoot>
              <tr>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: 700 }}>รวมภาษีซื้อ</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(totalInputBase)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#993c1d" }}>{fmt(totalInputVat)}</td>
              </tr>
            </tfoot>}
          </table>
        </div>

        {/* ภาษีขาย */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ background: "#e1f5ee", padding: "10px 16px", fontWeight: 700, fontSize: 14, color: "#0f6e56" }}>
            ภาษีขาย (Output VAT) — {periodLabel}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thStyle}>เลขที่เอกสาร</th><th style={thStyle}>วันที่</th>
              <th style={thStyle}>รายการ</th><th style={vatTh}>อัตรา VAT</th>
              <th style={vatTh}>ฐานภาษี (บาท)</th><th style={vatTh}>VAT (บาท)</th>
            </tr></thead>
            <tbody>
              {outputVatRows.map((r,i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.id}</td>
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>{r.description}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.vatRate}%</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(r.base)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0f6e56" }}>{fmt(r.vat)}</td>
                </tr>
              ))}
              {outputVatRows.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีรายการภาษีขายในช่วงนี้</td></tr>}
            </tbody>
            {outputVatRows.length > 0 && <tfoot>
              <tr>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: 700 }}>รวมภาษีขาย</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(totalOutputBase)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#0f6e56" }}>{fmt(totalOutputVat)}</td>
              </tr>
            </tfoot>}
          </table>
        </div>

        {/* สรุป */}
        <div style={{ background: "#fff", borderRadius: 12, border: "2px solid #0c443c", padding: "18px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#0c443c" }}>สรุปภาษีสุทธิ — {periodLabel}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 14 }}>
            <div><span style={{ color: "#6b7280" }}>ภาษีขาย</span><div style={{ fontWeight: 700, fontSize: 18, color: "#0f6e56" }}>฿{fmt(totalOutputVat)}</div></div>
            <div><span style={{ color: "#6b7280" }}>หัก ภาษีซื้อ</span><div style={{ fontWeight: 700, fontSize: 18, color: "#993c1d" }}>฿{fmt(totalInputVat)}</div></div>
            <div>
              <span style={{ color: "#6b7280" }}>{vatDiff >= 0 ? "ภาษีต้องชำระ" : "ภาษีขอคืน"}</span>
              <div style={{ fontWeight: 700, fontSize: 20, color: vatDiff >= 0 ? "#185fa5" : "#854f0b" }}>฿{fmt(Math.abs(vatDiff))}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{vatDiff >= 0 ? "นำส่งกรมสรรพากร" : "ยื่นขอคืนภาษี"}</div>
            </div>
          </div>
        </div>

        {/* หัก ณ ที่จ่าย */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", marginTop: 16 }}>
          <div style={{ background: "#eeedfe", padding: "10px 16px", fontWeight: 700, fontSize: 14, color: "#3c3489" }}>
            หัก ณ ที่จ่าย (Withholding Tax) — {periodLabel}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thStyle}>เลขที่เอกสาร</th>
              <th style={thStyle}>วันที่</th>
              <th style={thStyle}>ผู้รับเงิน / รายการ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>อัตรา WHT</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ฐานภาษี (บาท)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ภาษีหัก ณ ที่จ่าย (บาท)</th>
            </tr></thead>
            <tbody>
              {whtRows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.id}</td>
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>{r.description}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.whtRate}%</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(r.base)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#3c3489" }}>{fmt(r.wht)}</td>
                </tr>
              ))}
              {whtRows.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}>ไม่มีรายการหัก ณ ที่จ่ายในช่วงนี้</td></tr>}
            </tbody>
            {whtRows.length > 0 && <tfoot><tr>
              <td colSpan={4} style={{ ...tdStyle, fontWeight: 700 }}>รวมภาษีหัก ณ ที่จ่าย</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(totalWhtBase)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#3c3489" }}>{fmt(totalWht)}</td>
            </tr></tfoot>}
          </table>
        </div>
      </div>
    </div>
  );
}


// ===================================================================
// DELIVERY TAB (ใบส่งสินค้า)
// ===================================================================
function DeliveryTab({ deliveries, setDeliveries, products, customers, companySettings }) {
  const cs = companySettings || {};
  const [modal, setModal] = useState(null);
  const [pdfModal, setPdfModal] = useState(null);
  const [search, setSearch] = useState("");

  const CONTAINER_TYPES = ["กระสอบ", "ถัง", "ลัง", "มัด", "ก้อน", "แผ่น", "ชิ้น", "อื่นๆ"];

  const blankItem = () => ({
    id: "DI" + Date.now().toString().slice(-6),
    productId: products[0]?.id || "",
    containerType: CONTAINER_TYPES[0],
    containerCount: 0,   // จำนวนภาชนะ
    grossWeight: 0,      // น้ำหนักรวมก่อนหัก
    deductWeight: 0,     // หัก (น้ำหนักภาชนะ/ฝุ่น)
  });

  const blankForm = () => ({
    id: genId("DO", deliveries),
    date: new Date().toISOString().slice(0, 10),
    customerId: customers[0]?.id || "",
    driverName: "",
    vehiclePlate: "",
    note: "",
    items: [blankItem()],
  });

  const [form, setForm] = useState(blankForm());

  const openAdd = () => { setForm(blankForm()); setModal({ mode: "add" }); };
  const openEdit = (d) => { setForm({ ...d }); setModal({ mode: "edit", item: d }); };

  const save = () => {
    if (modal.mode === "add") setDeliveries([{ ...form }, ...deliveries]);
    else setDeliveries(deliveries.map((d) => d.id === modal.item.id ? { ...form } : d));
    setModal(null);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, blankItem()] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const calcItem = (it) => {
    const gross = Number(it.grossWeight) || 0;
    const deduct = Number(it.deductWeight) || 0;
    return { gross, deduct, net: gross - deduct };
  };

  const totals = (items) => items.reduce((s, it) => {
    const c = calcItem(it);
    return { gross: s.gross + c.gross, deduct: s.deduct + c.deduct, net: s.net + c.net, containers: s.containers + (Number(it.containerCount) || 0) };
  }, { gross: 0, deduct: 0, net: 0, containers: 0 });

  const prodName = (id) => products.find((p) => p.id === id)?.name || id;
  const prodUnit = (id) => products.find((p) => p.id === id)?.unit || "กก.";
  const custName = (id) => customers.find((c) => c.id === id)?.name || id;

  const filtered = deliveries.filter((d) =>
    d.id.includes(search) || custName(d.customerId).includes(search) || d.date.includes(search)
  ).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  // ===== PDF Modal =====
  const DeliveryPDF = ({ d, onClose }) => {
    const t = totals(d.items);
    const primaryColor = cs.primaryColor || "#0c443c";
    return (
      <Modal title={`ใบส่งสินค้า ${d.id}`} onClose={onClose} wide>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <button style={btnSecondary} onClick={() => printAsPDF(`do-pdf-${d.id}`, `ใบส่งสินค้า_${d.id}`)}>
            <Printer size={14} /> พิมพ์ PDF
          </button>
          <button style={btnSecondary} onClick={() => {
            const rows = [
              [`ใบส่งสินค้า ${d.id}`, "", "", "", "", "", ""],
              [`วันที่: ${d.date}`, "", "", "", "", "", ""],
              [`ลูกค้า: ${custName(d.customerId)}`, "", "", "", "", "", ""],
              [""],
              ["สินค้า", "ภาชนะ", "จำนวนภาชนะ", "น้ำหนักรวม", "หัก", "น้ำหนักสุทธิ", "หน่วย"],
              ...d.items.map((it) => {
                const c = calcItem(it);
                return [prodName(it.productId), it.containerType, it.containerCount, c.gross, c.deduct, c.net, prodUnit(it.productId)];
              }),
              ["รวม", "", t.containers, t.gross, t.deduct, t.net, ""],
            ];
            exportExcel(rows, `ใบส่งสินค้า_${d.id}.xlsx`, "ใบส่งสินค้า");
          }}>
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>

        <div id={`do-pdf-${d.id}`} style={{ fontFamily: "'Noto Sans Thai', sans-serif", padding: 8 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${primaryColor}`, paddingBottom: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {cs.logo && <img src={cs.logo} alt="logo" style={{ height: 52, maxWidth: 80, objectFit: "contain" }} />}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: primaryColor }}>{cs.name || "วงจรกรีน รีไซเคิล"}</div>
                {cs.address && <div style={{ fontSize: 11, color: "#6b7280" }}>{cs.address}</div>}
                {cs.phone && <div style={{ fontSize: 11, color: "#6b7280" }}>โทร: {cs.phone}</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: primaryColor }}>ใบส่งสินค้า</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>เลขที่: {d.id}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>วันที่: {d.date}</div>
            </div>
          </div>

          {/* ข้อมูลส่ง */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14, fontSize: 13 }}>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: primaryColor }}>ผู้รับ/ลูกค้า</div>
              <div style={{ fontWeight: 600 }}>{custName(d.customerId)}</div>
            </div>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: primaryColor }}>ข้อมูลยานพาหนะ</div>
              {d.driverName && <div>คนขับ: {d.driverName}</div>}
              {d.vehiclePlate && <div>ทะเบียน: {d.vehiclePlate}</div>}
            </div>
          </div>

          {/* ตารางสินค้า */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
            <thead>
              <tr style={{ background: primaryColor, color: "#fff" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", border: `1px solid ${primaryColor}` }}>สินค้า</th>
                <th style={{ padding: "8px 10px", textAlign: "center", border: `1px solid ${primaryColor}` }}>ภาชนะ</th>
                <th style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${primaryColor}` }}>จำนวนภาชนะ</th>
                <th style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${primaryColor}` }}>น้ำหนักรวม</th>
                <th style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${primaryColor}` }}>หัก</th>
                <th style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${primaryColor}`, fontWeight: 700 }}>น้ำหนักสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((it, i) => {
                const c = calcItem(it);
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", fontWeight: 500 }}>{prodName(it.productId)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", textAlign: "center" }}>{it.containerType}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", textAlign: "right" }}>{fmt(it.containerCount)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", textAlign: "right" }}>{fmt(c.gross)} {prodUnit(it.productId)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", textAlign: "right", color: "#993c1d" }}>{fmt(c.deduct)} {prodUnit(it.productId)}</td>
                    <td style={{ padding: "8px 10px", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: 700, color: primaryColor }}>{fmt(c.net)} {prodUnit(it.productId)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: primaryColor + "22", fontWeight: 700 }}>
                <td style={{ padding: "8px 10px", border: "1px solid #d1d5db" }}>รวมทั้งหมด</td>
                <td style={{ padding: "8px 10px", border: "1px solid #d1d5db", textAlign: "center" }}>—</td>
                <td style={{ padding: "8px 10px", border: "1px solid #d1d5db", textAlign: "right" }}>{fmt(t.containers)}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #d1d5db", textAlign: "right" }}>{fmt(t.gross)}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #d1d5db", textAlign: "right", color: "#993c1d" }}>{fmt(t.deduct)}</td>
                <td style={{ padding: "8px 10px", border: "1px solid #d1d5db", textAlign: "right", color: primaryColor, fontSize: 15 }}>{fmt(t.net)}</td>
              </tr>
            </tfoot>
          </table>

          {d.note && <div style={{ fontSize: 12, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>หมายเหตุ: {d.note}</div>}

          {/* ลายเซ็น */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 28, fontSize: 12, textAlign: "center" }}>
            {["ผู้ส่ง", "ผู้รับ", "พนักงานขับรถ"].map((role) => (
              <div key={role}>
                <div style={{ borderTop: "1px solid #374151", paddingTop: 6, color: "#6b7280" }}>
                  ({role.padStart(role.length + 5, "\xa0").padEnd(role.length + 10, "\xa0")})<br />{role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div>
      <Header title="ใบส่งสินค้า (Delivery Order)" subtitle="บันทึกการส่งสินค้า — น้ำหนักรวม หัก น้ำหนักสุทธิ ตามประเภทภาชนะ">
        <button style={btnPrimary} onClick={openAdd}><Plus size={16} /> สร้างใบส่งสินค้า</button>
      </Header>

      <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลขที่, ลูกค้า, วันที่..." />

      {/* รายการใบส่งสินค้า */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((d) => {
          const t = totals(d.items);
          return (
            <div key={d.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#0c443c" }}>{d.id}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{d.date}</span>
                    {d.vehiclePlate && <span style={{ fontSize: 12, background: "#f3f4f6", padding: "1px 8px", borderRadius: 4 }}>🚛 {d.vehiclePlate}</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{custName(d.customerId)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {d.items.length} รายการ · {fmt(t.containers)} ภาชนะ
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>น้ำหนักสุทธิรวม</div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: "#0c443c" }}>{fmt(t.net)}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>({fmt(t.gross)} − {fmt(t.deduct)})</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={iconBtn} onClick={() => setPdfModal(d)} title="ดูใบส่งสินค้า"><FileText size={15} /></button>
                  <button style={iconBtn} onClick={() => openEdit(d)}><Edit2 size={14} /></button>
                  <button style={btnDanger} onClick={() => setDeliveries(deliveries.filter((x) => x.id !== d.id))}><Trash2 size={14} /></button>
                </div>
              </div>

              {/* สรุปรายการ */}
              <div style={{ borderTop: "1px solid #f3f4f6", padding: "8px 18px", background: "#f9fafb" }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {d.items.map((it, i) => {
                    const c = calcItem(it);
                    return (
                      <div key={i} style={{ fontSize: 12, color: "#6b7280" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>{prodName(it.productId)}</span>
                        {" — "}{it.containerType} {fmt(it.containerCount)} ใบ
                        {" · "}สุทธิ <span style={{ fontWeight: 600, color: "#0c443c" }}>{fmt(c.net)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>ยังไม่มีใบส่งสินค้า — กด "สร้างใบส่งสินค้า" เพื่อเริ่ม</div>}
      </div>

      {/* PDF Modal */}
      {pdfModal && <DeliveryPDF d={pdfModal} onClose={() => setPdfModal(null)} />}

      {/* Form Modal */}
      {modal && (
        <Modal title={modal.mode === "add" ? "สร้างใบส่งสินค้า" : `แก้ไขใบส่งสินค้า · ${form.id}`} onClose={() => setModal(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="เลขที่ใบส่งสินค้า"><input style={inputStyle} value={form.id} disabled /></Field>
            <Field label="วันที่"><input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="ลูกค้า / ผู้รับสินค้า">
              <select style={inputStyle} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="ทะเบียนรถ"><input style={inputStyle} value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} placeholder="เช่น กข 1234" /></Field>
            <Field label="ชื่อพนักงานขับรถ"><input style={inputStyle} value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="ชื่อคนขับ" /></Field>
          </div>

          {/* รายการสินค้า */}
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0c443c", marginBottom: 10 }}>รายการสินค้า</div>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: "#0c443c", color: "#fff", fontSize: 12 }}>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>สินค้า</th>
                    <th style={{ padding: "7px 10px", textAlign: "center" }}>ภาชนะ</th>
                    <th style={{ padding: "7px 10px", textAlign: "right" }}>จำนวนภาชนะ</th>
                    <th style={{ padding: "7px 10px", textAlign: "right" }}>น้ำหนักรวม</th>
                    <th style={{ padding: "7px 10px", textAlign: "right" }}>หัก</th>
                    <th style={{ padding: "7px 10px", textAlign: "right", color: "#9fe1cb" }}>น้ำหนักสุทธิ</th>
                    <th style={{ padding: "7px 10px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, idx) => {
                    const c = calcItem(it);
                    return (
                      <tr key={it.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f3f4f6" }}>
                        <td style={{ padding: "6px 8px" }}>
                          <select style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} value={it.productId} onChange={(e) => updateItem(idx, "productId", e.target.value)}>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <select style={{ ...inputStyle, fontSize: 12, padding: "4px 8px", width: 90 }} value={it.containerType} onChange={(e) => updateItem(idx, "containerType", e.target.value)}>
                            {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input type="number" min={0} style={{ ...inputStyle, fontSize: 12, padding: "4px 8px", width: 70, textAlign: "right" }} value={it.containerCount} onChange={(e) => updateItem(idx, "containerCount", e.target.value)} />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input type="number" min={0} step={0.01} style={{ ...inputStyle, fontSize: 12, padding: "4px 8px", width: 90, textAlign: "right" }} value={it.grossWeight} onChange={(e) => updateItem(idx, "grossWeight", e.target.value)} placeholder="0.00" />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input type="number" min={0} step={0.01} style={{ ...inputStyle, fontSize: 12, padding: "4px 8px", width: 80, textAlign: "right" }} value={it.deductWeight} onChange={(e) => updateItem(idx, "deductWeight", e.target.value)} placeholder="0.00" />
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#0c443c", fontSize: 13 }}>
                          {fmt(c.net)}
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <button style={btnDanger} onClick={() => removeItem(idx)} disabled={form.items.length === 1}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => { const t = totals(form.items); return (
                    <tr style={{ background: "#e1f5ee", fontWeight: 700 }}>
                      <td style={{ padding: "7px 10px", fontSize: 13 }}>รวม</td>
                      <td></td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 13 }}>{fmt(t.containers)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 13 }}>{fmt(t.gross)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 13, color: "#993c1d" }}>{fmt(t.deduct)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 14, color: "#0c443c" }}>{fmt(t.net)}</td>
                      <td></td>
                    </tr>
                  ); })()}
                </tfoot>
              </table>
            </div>
            <button style={{ ...btnSecondary, marginTop: 8 }} onClick={addItem}><Plus size={14} /> เพิ่มรายการสินค้า</button>
          </div>

          <Field label="หมายเหตุ">
            <textarea style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="บันทึกเพิ่มเติม..." />
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>ยกเลิก</button>
            <button style={btnPrimary} onClick={save}><Save size={16} /> บันทึก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


function Badge({ text }) {
  const colors = {
    "กระดาษ": { bg: "#eaf3de", color: "#27500a" },
    "พลาสติก": { bg: "#e6f1fb", color: "#0c447c" },
    "เหล็ก": { bg: "#f1efe8", color: "#444441" },
    "อลูมิเนียม": { bg: "#eeedfe", color: "#3c3489" },
    "ทองแดง": { bg: "#faeeda", color: "#854f0b" },
  };
  const c = colors[text] || { bg: "#f1efe8", color: "#444441" };
  return <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{text}</span>;
}

// ===================================================================
// MONTHLY PROFIT REPORT TAB (รายงานกำไร/ขาดทุนประจำเดือน)
// ===================================================================
function MonthlyReportTab({ purchases, sales, expenses, inventory, withdrawals }) {
  const now = new Date();
  const [reportMode, setReportMode] = useState("month");
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [rangeStart, setRangeStart] = useState(now.toISOString().slice(0, 8) + "01");
  const [rangeEnd, setRangeEnd] = useState(now.toISOString().slice(0, 10));
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState("detail");
  const [retainedEarningsBF, setRetainedEarningsBF] = useState(0); // กำไรสะสมยกมา

  // ===== เงินปันผล state =====
  const [dividends, setDividends] = useState([]);
  const [divModal, setDivModal] = useState(null);
  const blankDiv = () => ({
    id: "DIV" + Date.now().toString().slice(-6),
    date: now.toISOString().slice(0, 10),
    amount: 0,
    note: "",
  });
  const [divForm, setDivForm] = useState(blankDiv());

  const MONTH_NAMES = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  const yearOptions = [];
  for (let y = 2024; y <= now.getFullYear() + 10; y++) yearOptions.push(y);

  // ===== helper: คำนวณกำไรสุทธิสำหรับช่วงวันที่ =====
  const calcNetProfit = (startDate, endDate) => {
    const isIn = (d) => d >= startDate && d <= endDate;

    // ---- รายได้จากการขาย ----
    const totalSales = sales.filter((inv) => isIn(inv.date)).reduce((s, inv) => {
      const subtotal = inv.items.reduce((ss, it) => ss + (it.net || 0) * (it.price || 0), 0);
      const ad = subtotal - (inv.discount || 0);
      return s + ad + ad * ((inv.vatRate || 0) / 100);
    }, 0);

    // ---- ยอดซื้อในช่วง (ก่อน VAT) ----
    const totalBuy = purchases.filter((po) => po.status === "อนุมัติแล้ว" && isIn(po.date))
      .reduce((s, po) => s + po.items.reduce((ss, it) => ss + (it.net || 0) * (it.price || 0), 0), 0);

    // ---- ต้นทุนขาย = รวม value จากใบเบิกสินค้าที่อยู่ในช่วงเวลา ----
    // ใช้ date ของ LOT เบิก (ไม่ใช่ date ใบขาย) เพราะต้นทุนเกิดขึ้น ณ วันที่เบิก
    const cogsFromWithdrawals = (withdrawals || [])
      .filter((lot) => isIn(lot.date))
      .reduce((s, lot) =>
        s + (lot.items || []).reduce((ss, it) => ss + (Number(it.value) || 0), 0), 0);

    // ---- สต๊อก (สำหรับแสดงในตาราง) ----
    const stockEnd = inventory.summary.reduce((s, x) => s + x.totalCost, 0);
    const stockStart = stockEnd + cogsFromWithdrawals - totalBuy;
    const goodsAvailable = stockStart + totalBuy;

    // ---- กำไร ----
    const cogs = cogsFromWithdrawals;
    const gross = totalSales - cogs;

    // ---- ค่าใช้จ่าย ----
    const totalExp = expenses.filter((e) => isIn(e.billDate || e.date)).reduce((s, e) => {
      const items = (e.items && e.items.length > 0) ? e.items : [{ mainCategory: e.mainCategory || e.category, amount: e.amount }];
      return s + items.filter((it) => it.mainCategory === "ค่าใช้จ่าย").reduce((ss, it) => ss + (Number(it.amount) || 0), 0);
    }, 0);

    return { totalSales, totalBuy, cogs, stockStart, stockEnd, goodsAvailable, gross, totalExp, netProfit: gross - totalExp };
  };

  // ===== ช่วงเวลารายงานรายละเอียด =====
  const startDate = reportMode === "month"
    ? `${reportYear}-${String(reportMonth).padStart(2, "0")}-01`
    : rangeStart;
  const endDate = reportMode === "month"
    ? `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(new Date(reportYear, reportMonth, 0).getDate()).padStart(2, "0")}`
    : rangeEnd;
  const periodLabel = reportMode === "month" ? `${MONTH_NAMES[reportMonth]} ${reportYear}` : `${startDate} ถึง ${endDate}`;

  const detail = calcNetProfit(startDate, endDate);
  const { totalSales, totalBuy, cogs, stockStart, stockEnd, goodsAvailable, gross, totalExp, netProfit } = detail;

  // เงินปันผลในช่วง
  const dividendsInRange = dividends.filter((d) => d.date >= startDate && d.date <= endDate);
  const totalDividend = dividendsInRange.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const retainedEarnings = netProfit - totalDividend;
  // กำไรสะสมสุทธิ = ยกมา + กำไรงวดนี้ - ปันผล
  const totalRetainedEarnings = (Number(retainedEarningsBF) || 0) + retainedEarnings;

  // ===== สรุปรายเดือนทั้งปี =====
  const monthlyRows = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const s = `${summaryYear}-${String(m).padStart(2, "0")}-01`;
      const e = `${summaryYear}-${String(m).padStart(2, "0")}-${String(new Date(summaryYear, m, 0).getDate()).padStart(2, "0")}`;
      const { netProfit } = calcNetProfit(s, e);
      const divTotal = dividends.filter((d) => d.date >= s && d.date <= e).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      return { month: m, monthName: MONTH_NAMES[m], startDate: s, endDate: e, netProfit, divTotal, retained: netProfit - divTotal };
    });
  }, [summaryYear, purchases, sales, expenses, inventory, dividends, withdrawals]);

  const totalYearProfit = monthlyRows.reduce((s, r) => s + r.netProfit, 0);
  const totalYearDiv = monthlyRows.reduce((s, r) => s + r.divTotal, 0);
  const totalYearRetained = totalYearProfit - totalYearDiv;

  // styles
  const cellStyle = { padding: "8px 14px", border: "1px solid #d1d5db", fontSize: 13 };
  const numCell = { ...cellStyle, textAlign: "right" };
  const labelCell = { ...cellStyle, fontWeight: 500 };
  const headerCell = { ...cellStyle, background: "#5a1414", color: "#fff", fontWeight: 700, textAlign: "center" };
  const sectionHeader = { ...cellStyle, background: "#f3f4f6", fontWeight: 700, textAlign: "center", fontSize: 13 };
  const totalRow = { ...cellStyle, fontWeight: 700 };
  const totalNumCell = { ...numCell, fontWeight: 700, color: "#993c1d" };
  const netNum = { ...numCell, fontWeight: 700, fontSize: 14, color: netProfit >= 0 ? "#0f6e56" : "#a32d2d" };
  const retainedNum = { ...numCell, fontWeight: 700, fontSize: 14, color: retainedEarnings >= 0 ? "#185fa5" : "#a32d2d" };

  return (
    <div>
      <Header title="รายงานกำไร/ขาดทุน" subtitle="สรุปผลประกอบการ — ยอดซื้อ/สต๊อกคำนวณจากต้นทุนก่อน VAT" />

      {/* แท็บหลัก */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: "detail", label: "รายงานรายละเอียด" },
          { key: "summary", label: "สรุปกำไรรายเดือน" },
          { key: "dividends", label: "บันทึกเงินปันผล" },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
              border: "1px solid", borderColor: activeTab === t.key ? "#5a1414" : "#d1d5db",
              background: activeTab === t.key ? "#5a1414" : "#fff",
              color: activeTab === t.key ? "#fff" : "#6b7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== แท็บ: รายงานรายละเอียด ===== */}
      {activeTab === "detail" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #d1d5db" }}>
              {[{ key: "month", label: "รายเดือน" }, { key: "range", label: "เลือกช่วงวันที่" }].map((opt) => (
                <button key={opt.key} onClick={() => setReportMode(opt.key)}
                  style={{ padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: reportMode === opt.key ? "#5a1414" : "#fff",
                    color: reportMode === opt.key ? "#fff" : "#6b7280" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {reportMode === "month" && (
              <>
                <select style={{ ...inputStyle, width: 140 }} value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))}>
                  {MONTH_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
                </select>
                <select style={{ ...inputStyle, width: 100 }} value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
                  {yearOptions.map((y) => <option key={y} value={y}>ปี {y}</option>)}
                </select>
              </>
            )}
            {reportMode === "range" && (
              <>
                <input type="date" style={{ ...inputStyle, width: 160 }} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                <span style={{ fontSize: 13, color: "#6b7280" }}>ถึง</span>
                <input type="date" style={{ ...inputStyle, width: 160 }} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
              </>
            )}
            <ExportToolbar
              onPDF={() => printAsPDF("monthly-report-content", `ผลประกอบการ ${periodLabel}`)}
              onExcel={() => {
                const rows = [
                  [`ผลประกอบการ ${periodLabel}`, "", ""],
                  ["รายการ", "", "จำนวนเงิน (บาท)"],
                  ["ขาย", "", totalSales], ["รวมรายได้", "", totalSales], ["", "", ""],
                  ["สต๊อกต้นงวด", stockStart, ""], ["บวก ซื้อ", totalBuy, ""],
                  ["สินค้าที่มีไว้เพื่อขาย", goodsAvailable, ""], ["หัก สต๊อกปลายงวด", stockEnd, ""],
                  ["ต้นทุน", "", cogs], ["กำไรก่อนหักค่าใช้จ่าย", "", gross],
                  ["หัก ค่าใช้จ่าย", "", totalExp], ["กำไร/ขาดทุนสุทธิ", "", netProfit],
                  ...(totalDividend > 0 ? [["หัก เงินปันผลจ่าย", "", totalDividend], ["กำไรสะสม", "", retainedEarnings]] : []),
                ];
                exportExcel(rows, `กำไร_${periodLabel.replace(/\s/g,"_")}.xlsx`, "รายงาน");
              }}
              onImage={() => printAsPDF("monthly-report-content", `ผลประกอบการ ${periodLabel}`)}
            />
          </div>

          <div id="monthly-report-content" style={{ maxWidth: 700 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...headerCell, width: "45%" }}>ผลประกอบการ</th>
                  <th style={{ ...headerCell, width: "27%", background: "#7a2a2a" }}>{startDate}</th>
                  <th style={{ ...headerCell, width: "28%" }}>ถึง {endDate}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={3} style={sectionHeader}>ผลประกอบการ {periodLabel}</td></tr>
                <tr><td style={labelCell}>ขาย</td><td style={cellStyle}></td><td style={numCell}>{fmt(totalSales)}</td></tr>
                <tr><td style={labelCell}>รายได้อื่น</td><td style={cellStyle}></td><td style={cellStyle}></td></tr>
                <tr><td style={{ ...totalRow, background: "#fff9f9" }}>รวมรายได้</td><td style={{ ...cellStyle, background: "#fff9f9" }}></td><td style={totalNumCell}>{fmt(totalSales)}</td></tr>

                <tr><td style={{ ...labelCell, color: "#9ca3af", fontSize: 12 }} colSpan={3}>— ข้อมูลสต๊อก (อ้างอิง) —</td></tr>
                <tr><td style={{ ...labelCell, paddingLeft: 16, color: "#6b7280" }}>สต๊อกต้นงวด (ประมาณ)</td><td style={{ ...numCell, color: "#6b7280" }}>{fmt(Math.max(0, stockStart))}</td><td style={cellStyle}></td></tr>
                <tr><td style={{ ...labelCell, paddingLeft: 16, color: "#6b7280" }}>บวก ซื้อ (ก่อน VAT)</td><td style={{ ...numCell, color: "#6b7280" }}>{fmt(totalBuy)}</td><td style={cellStyle}></td></tr>
                <tr><td style={{ ...labelCell, paddingLeft: 24, color: "#9ca3af" }}>สินค้าที่มีไว้เพื่อขาย</td><td style={{ ...numCell, color: "#9ca3af" }}>{fmt(goodsAvailable)}</td><td style={cellStyle}></td></tr>
                <tr><td style={{ ...labelCell, paddingLeft: 16, color: "#6b7280" }}>หัก สต๊อกปลายงวด (ปัจจุบัน)</td><td style={{ ...numCell, color: "#6b7280" }}>{fmt(stockEnd)}</td><td style={cellStyle}></td></tr>
                <tr>
                  <td style={{ ...totalRow, background: "#fff9f9" }}>
                    ต้นทุนขาย (จากใบเบิกสินค้า)
                    <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>รวมมูลค่าจากใบเบิกทุกใบในช่วงนี้</span>
                  </td>
                  <td style={{ ...cellStyle, background: "#fff9f9" }}></td>
                  <td style={{ ...numCell, fontWeight: 700, color: "#993c1d" }}>{fmt(cogs)}</td>
                </tr>

                <tr>
                  <td style={{ ...totalRow, background: "#f0f9f5" }}>กำไรขั้นต้น</td>
                  <td style={{ ...cellStyle, background: "#f0f9f5" }}></td>
                  <td style={{ ...numCell, fontWeight: 700, color: "#0f6e56" }}>{fmt(gross)}</td>
                </tr>
                <tr><td style={labelCell}>หัก ค่าใช้จ่ายดำเนินงาน</td><td style={numCell}>{fmt(totalExp)}</td><td style={cellStyle}></td></tr>

                <tr style={{ background: netProfit >= 0 ? "#e1f5ee" : "#fcebeb" }}>
                  <td style={{ ...totalRow, fontSize: 14, background: "transparent" }}>กำไร/ขาดทุนสุทธิ</td>
                  <td style={{ ...cellStyle, background: "transparent" }}></td>
                  <td style={netNum}>{fmt(netProfit)}</td>
                </tr>

                {totalDividend > 0 && <>
                  <tr><td style={labelCell}>หัก เงินปันผลจ่าย ({dividendsInRange.length} รายการ)</td><td style={numCell}>{fmt(totalDividend)}</td><td style={cellStyle}></td></tr>
                  <tr style={{ background: retainedEarnings >= 0 ? "#e6f1fb" : "#fcebeb" }}>
                    <td style={{ ...totalRow, fontSize: 14, background: "transparent" }}>กำไรสะสม (งวดนี้)</td>
                    <td style={{ ...cellStyle, background: "transparent" }}></td>
                    <td style={retainedNum}>{fmt(retainedEarnings)}</td>
                  </tr>
                </>}

                {(Number(retainedEarningsBF) !== 0) && (
                  <>
                    <tr><td style={labelCell}>กำไรสะสมยกมา (ก่อนงวด)</td><td style={numCell}>{fmt(Number(retainedEarningsBF))}</td><td style={cellStyle}></td></tr>
                    <tr style={{ background: totalRetainedEarnings >= 0 ? "#e6f1fb" : "#fcebeb" }}>
                      <td style={{ ...totalRow, fontSize: 14, background: "transparent", color: "#185fa5" }}>กำไรสะสมสุทธิ (รวมยกมา)</td>
                      <td style={{ ...cellStyle, background: "transparent" }}></td>
                      <td style={{ ...retainedNum, color: totalRetainedEarnings >= 0 ? "#185fa5" : "#a32d2d" }}>{fmt(totalRetainedEarnings)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
              * ต้นทุนขายคำนวณจากยอดรวมมูลค่าสินค้าใน**ใบเบิกสินค้าเพื่อขาย**ทุกใบที่วันที่เบิกอยู่ในช่วงนี้ (ราคาต้นทุน FIFO ณ วันที่เบิก)
            </div>
          </div>

          {/* กำไรสะสมยกมา input */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "14px 18px", marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#185fa5", whiteSpace: "nowrap" }}>กำไรสะสมยกมา (บาท):</label>
              <input type="number" style={{ ...inputStyle, width: 180 }}
                value={retainedEarningsBF}
                onChange={(e) => setRetainedEarningsBF(e.target.value)}
                placeholder="0 (ใส่ติดลบได้ถ้าขาดทุนสะสม)" />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>กำไรสะสมสุทธิ = {fmt(totalRetainedEarnings)} บาท</span>
            </div>
          </div>
        </>
      )}

      {/* ===== แท็บ: สรุปกำไรรายเดือน ===== */}
      {activeTab === "summary" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>ปี:</span>
            <select style={{ ...inputStyle, width: 110 }} value={summaryYear} onChange={(e) => setSummaryYear(Number(e.target.value))}>
              {yearOptions.map((y) => <option key={y} value={y}>ปี {y}</option>)}
            </select>
            <ExportToolbar
              onPDF={() => printAsPDF("monthly-summary-content", `สรุปกำไรรายเดือน ปี ${summaryYear}`)}
              onExcel={() => {
                const rows = [
                  [`สรุปกำไรสุทธิรายเดือน ปี ${summaryYear}`, "", "", ""],
                  ["เดือน", "กำไรสุทธิ (บาท)", "เงินปันผล (บาท)", "กำไรสะสม (บาท)"],
                  ...monthlyRows.map((r) => [r.monthName, r.netProfit, r.divTotal, r.retained]),
                  ["รวมทั้งปี", totalYearProfit, totalYearDiv, totalYearRetained],
                ];
                exportExcel(rows, `สรุปกำไร_ปี${summaryYear}.xlsx`, "สรุปรายเดือน");
              }}
              onImage={() => printAsPDF("monthly-summary-content", `สรุปกำไรรายเดือน ปี ${summaryYear}`)}
            />
          </div>

          <div id="monthly-summary-content">
            <div style={{ background: "#5a1414", color: "#fff", borderRadius: "12px 12px 0 0", padding: "14px 20px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>สรุปกำไรสุทธิรายเดือน</span>
              <span>ปี {summaryYear}</span>
            </div>
            <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>เดือน</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>รายได้</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ค่าใช้จ่าย+ต้นทุน</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>กำไรสุทธิ</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>เงินปันผล</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>กำไรสะสม</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((r) => {
                    const hasData = r.netProfit !== 0 || r.divTotal !== 0;
                    return (
                      <tr key={r.month}
                        style={{ background: hasData ? (r.netProfit >= 0 ? "#f9fafb" : "#fff5f5") : "#fff" }}
                        onClick={() => { setActiveTab("detail"); setReportMode("month"); setReportMonth(r.month); setReportYear(summaryYear); }}>
                        <td style={{ ...tdStyle, cursor: "pointer", color: "#185fa5", fontWeight: 500 }}>
                          {r.monthName}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {hasData ? fmt(calcNetProfit(r.startDate, r.endDate).totalSales) : "-"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {hasData ? fmt(calcNetProfit(r.startDate, r.endDate).cogs + calcNetProfit(r.startDate, r.endDate).totalExp) : "-"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: r.netProfit >= 0 ? "#0f6e56" : "#a32d2d" }}>
                          {hasData ? fmt(r.netProfit) : "-"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#854f0b" }}>
                          {r.divTotal > 0 ? fmt(r.divTotal) : "-"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: r.retained >= 0 ? "#185fa5" : "#a32d2d" }}>
                          {hasData ? fmt(r.retained) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f3f4f6", borderTop: "2px solid #5a1414" }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>รวมทั้งปี {summaryYear}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                      {fmt(monthlyRows.reduce((s, r) => s + calcNetProfit(r.startDate, r.endDate).totalSales, 0))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                      {fmt(monthlyRows.reduce((s, r) => { const d = calcNetProfit(r.startDate, r.endDate); return s + d.cogs + d.totalExp; }, 0))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: totalYearProfit >= 0 ? "#0f6e56" : "#a32d2d" }}>
                      {fmt(totalYearProfit)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#854f0b" }}>
                      {totalYearDiv > 0 ? fmt(totalYearDiv) : "-"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: totalYearRetained >= 0 ? "#185fa5" : "#a32d2d" }}>
                      {fmt(totalYearRetained)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
              คลิกที่ชื่อเดือนเพื่อดูรายงานละเอียดของเดือนนั้น
            </div>
          </div>
        </>
      )}

      {/* ===== แท็บ: บันทึกเงินปันผล ===== */}
      {activeTab === "dividends" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>เงินปันผลจ่ายรวมทั้งหมด</div>
              <div style={{ fontWeight: 700, fontSize: 22, color: "#854f0b" }}>
                ฿{fmt(dividends.reduce((s, d) => s + (Number(d.amount) || 0), 0))}
              </div>
            </div>
            <button style={btnPrimary} onClick={() => { setDivForm(blankDiv()); setDivModal({ mode: "add" }); }}>
              <Plus size={16} /> เพิ่มรายการเงินปันผล
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...dividends].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
              <div key={d.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>{d.id}</span>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>{d.date}</span>
                  </div>
                  {d.note && <div style={{ fontSize: 13, color: "#374151" }}>{d.note}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>เงินปันผล</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#854f0b" }}>฿{fmt(d.amount)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={iconBtn} onClick={() => { setDivForm({ ...d }); setDivModal({ mode: "edit", item: d }); }}><Edit2 size={14} /></button>
                  <button style={btnDanger} onClick={() => setDividends(dividends.filter((x) => x.id !== d.id))}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {dividends.length === 0 && (
              <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>
                ยังไม่มีรายการเงินปันผล — กด "เพิ่มรายการเงินปันผล" เพื่อบันทึก
              </div>
            )}
          </div>

          {divModal && (
            <Modal title={divModal.mode === "add" ? "เพิ่มรายการเงินปันผล" : "แก้ไขเงินปันผล"} onClose={() => setDivModal(null)}>
              <Field label="วันที่จ่ายปันผล">
                <input type="date" style={inputStyle} value={divForm.date} onChange={(e) => setDivForm({ ...divForm, date: e.target.value })} />
              </Field>
              <Field label="จำนวนเงินปันผล (บาท)">
                <input type="number" min={0} style={inputStyle} value={divForm.amount} onChange={(e) => setDivForm({ ...divForm, amount: e.target.value })} placeholder="0" />
              </Field>
              <Field label="หมายเหตุ / รายละเอียด">
                <input style={inputStyle} value={divForm.note} onChange={(e) => setDivForm({ ...divForm, note: e.target.value })} placeholder="เช่น ปันผลไตรมาส 1/2566" />
              </Field>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button style={btnSecondary} onClick={() => setDivModal(null)}>ยกเลิก</button>
                <button style={btnPrimary} onClick={() => {
                  const cleaned = { ...divForm, amount: Number(divForm.amount) || 0 };
                  if (divModal.mode === "add") setDividends([...dividends, cleaned]);
                  else setDividends(dividends.map((x) => x.id === divModal.item.id ? cleaned : x));
                  setDivModal(null);
                }}><Save size={16} /> บันทึก</button>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

