import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Plus, Search, Trash2, Edit, Download, RefreshCw, Phone, X, Wifi, WifiOff, Home } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import "./style.css";

const sourceOptions = ["عميل", "Mc Lab", "اخرى"];
const fastingOptions = ["صيام", "لا صيام", "صيام مع تحليل بول", "لا صيام مع تحليل بول"];
const coordinators = ["SA", "وعد", "ملوك", "جود", "مؤيد", "محمد"];
const resultOptions = ["released", "Pending"];
const paymentMethods = ["شبكة", "كاش", "تحويل بنكي", "اخرى"];
const appointmentStatuses = ["تم عمل الموعد", "ملغي"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    id: "",
    source_type: "عميل",
    source_note: "",
    visit_date: today(),
    visit_time: "",
    neighborhood: "",
    patient_name: "",
    whatsapp_phone: "",
    call_phone: "",
    test_type: "صيام",
    coordinator: "SA",
    result_status: "Pending",
    payment_method: "شبكة",
    payment_note: "",
    price: "",
    appointment_status: "تم عمل الموعد",
    cancel_reason: "",
    notes: ""
  };
}

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/[^\d]/g, "");
  if (digits.startsWith("05")) digits = "966" + digits.slice(1);
  if (digits.startsWith("5")) digits = "966" + digits;
  return digits;
}

function normalizeTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function mapDbRow(row) {
  return {
    id: row.id,
    source_type: row.source_type || "عميل",
    source_note: row.source_note || "",
    visit_date: row.visit_date || "",
    visit_time: normalizeTime(row.visit_time),
    neighborhood: row.neighborhood || "",
    patient_name: row.patient_name || "",
    whatsapp_phone: row.whatsapp_phone || "",
    call_phone: row.call_phone || "",
    test_type: row.test_type || "صيام",
    coordinator: row.coordinator || "SA",
    result_status: row.result_status || "Pending",
    payment_method: row.payment_method || "شبكة",
    payment_note: row.payment_note || "",
    price: normalizePrice(row.price),
    appointment_status: row.appointment_status || "تم عمل الموعد",
    cancel_reason: row.cancel_reason || "",
    notes: row.notes || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || ""
  };
}

function formatGregorianDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return "";
  return `${numberValue.toFixed(2)} ريال`;
}

function App() {
  const [visits, setVisits] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    date: "",
    source_type: "",
    test_type: "",
    coordinator: "",
    result_status: "",
    payment_method: "",
    appointment_status: ""
  });
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState("connecting");

  useEffect(() => {
    loadVisits();

    const channel = supabase
      .channel("home-visits-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "home_visits" },
        () => loadVisits(false)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("error");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadVisits(showLoader = true) {
    if (showLoader) setLoading(true);

    const { data, error } = await supabase
      .from("home_visits")
      .select("*")
      .order("visit_date", { ascending: false })
      .order("visit_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setConnection("error");
      showToast("خطأ في تحميل البيانات: " + error.message);
    } else {
      setVisits((data || []).map(mapDbRow));
      setConnection("live");
    }

    if (showLoader) setLoading(false);
  }

  const filtered = useMemo(() => {
    return visits.filter((v) => {
      const text = `${v.source_type} ${v.source_note} ${v.neighborhood} ${v.patient_name} ${v.whatsapp_phone} ${v.call_phone} ${v.notes} ${v.payment_note} ${v.cancel_reason} ${v.price}`.toLowerCase();

      return (
        (!filters.q || text.includes(filters.q.toLowerCase())) &&
        (!filters.date || v.visit_date === filters.date) &&
        (!filters.source_type || v.source_type === filters.source_type) &&
        (!filters.test_type || v.test_type === filters.test_type) &&
        (!filters.coordinator || v.coordinator === filters.coordinator) &&
        (!filters.result_status || v.result_status === filters.result_status) &&
        (!filters.payment_method || v.payment_method === filters.payment_method) &&
        (!filters.appointment_status || v.appointment_status === filters.appointment_status)
      );
    });
  }, [visits, filters]);

  const stats = useMemo(() => {
    return {
      total: visits.length,
      todayCount: visits.filter((v) => v.visit_date === today()).length,
      done: visits.filter((v) => v.appointment_status === "تم عمل الموعد").length,
      canceled: visits.filter((v) => v.appointment_status === "ملغي").length,
      pending: visits.filter((v) => v.result_status === "Pending").length
    };
  }, [visits]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  function openAddModal() {
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  function openEditModal(item) {
    setForm(item);
    setIsModalOpen(true);
  }

  async function saveVisit(e) {
    e.preventDefault();

    if (!form.visit_date || !form.visit_time || !form.neighborhood || !form.patient_name || !form.whatsapp_phone) {
      showToast("أدخل تاريخ ووقت الزيارة، اسم الحي، اسم المريض، ورقم الجوال واتس");
      return;
    }

    if (form.source_type === "اخرى" && !form.source_note.trim()) {
      showToast("اكتب ملاحظة المصدر عند اختيار اخرى");
      return;
    }

    if (form.payment_method === "اخرى" && !form.payment_note.trim()) {
      showToast("اكتب ملاحظة طريقة الدفع عند اختيار اخرى");
      return;
    }

    if (form.appointment_status === "ملغي" && !form.cancel_reason.trim()) {
      showToast("اكتب سبب إلغاء الموعد");
      return;
    }

    const priceValue = form.price === "" ? null : Number(form.price);

    if (form.price !== "" && (Number.isNaN(priceValue) || priceValue < 0)) {
      showToast("أدخل السعر بشكل صحيح، مثال: 13.55");
      return;
    }

    const payload = {
      source_type: form.source_type || "عميل",
      source_note: form.source_type === "اخرى" ? form.source_note : "",
      visit_date: form.visit_date,
      visit_time: form.visit_time,
      neighborhood: form.neighborhood,
      patient_name: form.patient_name,
      whatsapp_phone: normalizePhone(form.whatsapp_phone),
      call_phone: normalizePhone(form.call_phone),
      test_type: form.test_type || "صيام",
      coordinator: form.coordinator || "SA",
      result_status: form.result_status || "Pending",
      payment_method: form.payment_method || "شبكة",
      payment_note: form.payment_method === "اخرى" ? form.payment_note : "",
      price: priceValue,
      appointment_status: form.appointment_status || "تم عمل الموعد",
      cancel_reason: form.appointment_status === "ملغي" ? form.cancel_reason : "",
      notes: form.notes || "",
      updated_at: new Date().toISOString()
    };

    let result;

    if (form.id) {
      result = await supabase.from("home_visits").update(payload).eq("id", form.id);
    } else {
      result = await supabase.from("home_visits").insert(payload);
    }

    if (result.error) {
      showToast("خطأ أثناء الحفظ: " + result.error.message);
      return;
    }

    showToast(form.id ? "تم تعديل موعد الزيارة" : "تم إضافة موعد الزيارة");
    setIsModalOpen(false);
    loadVisits(false);
  }

  async function deleteVisit(id) {
    if (!confirm("هل تريد حذف موعد الزيارة؟")) return;

    const { error } = await supabase.from("home_visits").delete().eq("id", id);

    if (error) {
      showToast("خطأ أثناء الحذف: " + error.message);
      return;
    }

    showToast("تم حذف موعد الزيارة");
    loadVisits(false);
  }

  function exportExcel() {
    const rows = visits.map((v) => ({
      "المصدر": v.source_type,
      "ملاحظة المصدر": v.source_note,
      "تاريخ موعد الزيارة المنزلية": v.visit_date,
      "وقت الزيارة المنزلية": v.visit_time,
      "اسم الحي": v.neighborhood,
      "اسم المريض": v.patient_name,
      "رقم الجوال واتس": v.whatsapp_phone,
      "رقم الجوال اتصال": v.call_phone,
      "نوع التحليل": v.test_type,
      "منسق المواعيد": v.coordinator,
      "النتائج": v.result_status,
      "طريقة الدفع": v.payment_method,
      "ملاحظة الدفع": v.payment_note,
      "السعر": v.price,
      "حالة الموعد": v.appointment_status,
      "سبب الإلغاء": v.cancel_reason,
      "الملاحظات": v.notes,
      "تاريخ الإضافة": v.created_at,
      "آخر تحديث": v.updated_at
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Home Visits");
    XLSX.writeFile(wb, "home-visit-appointments.xlsx");
  }

  async function importExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const imported = rows
        .map((r) => {
          const rawPrice = r["السعر"] || r.price || null;

          return {
            source_type: String(r["المصدر"] || r.source_type || "عميل"),
            source_note: String(r["ملاحظة المصدر"] || r.source_note || ""),
            visit_date: String(r["تاريخ موعد الزيارة المنزلية"] || r["التاريخ"] || r.visit_date || today()).slice(0, 10),
            visit_time: String(r["وقت الزيارة المنزلية"] || r["الوقت"] || r.visit_time || "").slice(0, 5),
            neighborhood: String(r["اسم الحي"] || r.neighborhood || ""),
            patient_name: String(r["اسم المريض"] || r.patient_name || ""),
            whatsapp_phone: normalizePhone(r["رقم الجوال واتس"] || r.whatsapp_phone || ""),
            call_phone: normalizePhone(r["رقم الجوال اتصال"] || r.call_phone || ""),
            test_type: String(r["نوع التحليل"] || r.test_type || "صيام"),
            coordinator: String(r["منسق المواعيد"] || r.coordinator || "SA"),
            result_status: String(r["النتائج"] || r.result_status || "Pending"),
            payment_method: String(r["طريقة الدفع"] || r.payment_method || "شبكة"),
            payment_note: String(r["ملاحظة الدفع"] || r.payment_note || ""),
            price: rawPrice === "" ? null : rawPrice,
            appointment_status: String(r["حالة الموعد"] || r.appointment_status || "تم عمل الموعد"),
            cancel_reason: String(r["سبب الإلغاء"] || r.cancel_reason || ""),
            notes: String(r["الملاحظات"] || r.notes || "")
          };
        })
        .filter((r) => r.patient_name || r.whatsapp_phone);

      if (!imported.length) {
        showToast("لم يتم العثور على بيانات قابلة للاستيراد");
        return;
      }

      const { error } = await supabase.from("home_visits").insert(imported);

      if (error) {
        showToast("خطأ أثناء الاستيراد: " + error.message);
        return;
      }

      showToast("تم استيراد البيانات");
      loadVisits(false);
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <main className="app">
      <section className="hero">
        <div className="heroText">
          <img src="/logo.png" alt="مختبرات الخلايا الطبية" className="logo" />
          <div>
            <h1>مواعيد الزيارة المنزلية</h1>
            <p>نظام لايف لتنظيم زيارات السحب المنزلي، متابعة التحاليل، الدفع، والنتائج.</p>
            <div className={`connection ${connection}`}>
              {connection === "live" ? <Wifi size={15} /> : <WifiOff size={15} />}
              {connection === "live" ? "متصل لايف" : connection === "connecting" ? "جاري الاتصال" : "مشكلة اتصال"}
            </div>
          </div>
        </div>

        <div className="heroActions">
          <button className="btn btnLight" onClick={openAddModal}><Plus size={18} /> إضافة زيارة</button>
          <button className="btn btnPrimary" onClick={exportExcel}><Download size={18} /> تصدير Excel</button>
          <label className="btn btnGhost fileBtn">
            استيراد Excel
            <input type="file" accept=".xlsx,.xls" onChange={importExcel} />
          </label>
        </div>
      </section>

      <section className="stats">
        <Stat label="إجمالي الزيارات" value={stats.total} />
        <Stat label="زيارات اليوم" value={stats.todayCount} />
        <Stat label="تم عمل الموعد" value={stats.done} />
        <Stat label="ملغي" value={stats.canceled} />
        <Stat label="Pending" value={stats.pending} />
      </section>

      <section className="panel filters">
        <div className="field searchField">
          <label>بحث</label>
          <div className="inputIcon">
            <Search size={18} />
            <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="المصدر، الحي، اسم المريض، الجوال، الملاحظات..." />
          </div>
        </div>

        <div className="field">
          <label>تاريخ الزيارة</label>
          <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        </div>

        <div className="field">
          <label>المصدر</label>
          <select value={filters.source_type} onChange={(e) => setFilters({ ...filters, source_type: e.target.value })}>
            <option value="">الكل</option>
            {sourceOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label>نوع التحليل</label>
          <select value={filters.test_type} onChange={(e) => setFilters({ ...filters, test_type: e.target.value })}>
            <option value="">الكل</option>
            {fastingOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label>حالة الموعد</label>
          <select value={filters.appointment_status} onChange={(e) => setFilters({ ...filters, appointment_status: e.target.value })}>
            <option value="">الكل</option>
            {appointmentStatuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <button className="btn btnGhost" onClick={() => loadVisits()}><RefreshCw size={16} /> تحديث</button>
      </section>

      <section className="panel">
        {loading ? (
          <div className="empty">جاري تحميل البيانات...</div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>المصدر</th>
                  <th>ملاحظة المصدر</th>
                  <th>تاريخ الزيارة</th>
                  <th>وقت الزيارة</th>
                  <th>اسم الحي</th>
                  <th>اسم المريض</th>
                  <th>جوال واتس</th>
                  <th>جوال اتصال</th>
                  <th>نوع التحليل</th>
                  <th>منسق المواعيد</th>
                  <th>النتائج</th>
                  <th>طريقة الدفع</th>
                  <th>ملاحظة الدفع</th>
                  <th>السعر</th>
                  <th>حالة الموعد</th>
                  <th>سبب الإلغاء</th>
                  <th>الملاحظات</th>
                  <th>تاريخ الإضافة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="19" className="empty">لا توجد بيانات مطابقة</td></tr>
                ) : filtered.map((item) => {
                  const whatsapp = normalizePhone(item.whatsapp_phone);
                  const callPhone = normalizePhone(item.call_phone);
                  return (
                    <tr key={item.id}>
                      <td><span className="sourceBadge">{item.source_type}</span></td>
                      <td className="notes">{item.source_note}</td>
                      <td>{item.visit_date}</td>
                      <td>{item.visit_time}</td>
                      <td><strong>{item.neighborhood}</strong></td>
                      <td>{item.patient_name}</td>
                      <td>
                        <div>{item.whatsapp_phone}</div>
                        {whatsapp.startsWith("966") && (
                          <a className="whatsapp" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><Phone size={14} /> واتساب</a>
                        )}
                      </td>
                      <td>
                        <div>{item.call_phone}</div>
                        {callPhone && <a className="call" href={`tel:${callPhone}`}><Phone size={14} /> اتصال</a>}
                      </td>
                      <td><span className={`badge ${item.test_type.includes("صيام") ? "fasting" : "notFasting"}`}>{item.test_type}</span></td>
                      <td><span className="coordinator">{item.coordinator}</span></td>
                      <td><span className={`badge ${item.result_status === "released" ? "released" : "pending"}`}>{item.result_status}</span></td>
                      <td>{item.payment_method}</td>
                      <td className="notes">{item.payment_note}</td>
                      <td>{formatPrice(item.price)}</td>
                      <td><span className={`badge ${item.appointment_status === "ملغي" ? "canceled" : "done"}`}>{item.appointment_status}</span></td>
                      <td className="notes">{item.cancel_reason}</td>
                      <td className="notes">{item.notes}</td>
                      <td>{formatGregorianDateTime(item.created_at)}</td>
                      <td>
                        <div className="rowActions">
                          <button className="miniBtn" onClick={() => openEditModal(item)}><Edit size={15} /></button>
                          <button className="miniBtn danger" onClick={() => deleteVisit(item.id)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="modalOverlay" onMouseDown={(e) => e.target.className === "modalOverlay" && setIsModalOpen(false)}>
          <div className="modal">
            <div className="modalHead">
              <h2>{form.id ? "تعديل زيارة" : "إضافة زيارة منزلية"}</h2>
              <button className="closeBtn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={saveVisit} className="form">
              <Field label="المصدر">
                <select
                  value={form.source_type}
                  onChange={(e) => setForm({ ...form, source_type: e.target.value, source_note: e.target.value === "اخرى" ? form.source_note : "" })}
                >
                  {sourceOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>

              {form.source_type === "اخرى" && (
                <Field label="ملاحظة المصدر *">
                  <input
                    value={form.source_note}
                    onChange={(e) => setForm({ ...form, source_note: e.target.value })}
                    placeholder="اكتب المصدر"
                  />
                </Field>
              )}

              <Field label="تاريخ موعد الزيارة المنزلية *"><input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></Field>
              <Field label="وقت الزيارة المنزلية *"><input type="time" value={form.visit_time} onChange={(e) => setForm({ ...form, visit_time: e.target.value })} /></Field>
              <Field label="اسم الحي *"><input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="مثال: الحمراء" /></Field>
              <Field label="اسم المريض *"><input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="اسم المريض" /></Field>
              <Field label="رقم الجوال واتس *"><input value={form.whatsapp_phone} onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })} placeholder="05xxxxxxxx" /></Field>
              <Field label="رقم الجوال اتصال"><input value={form.call_phone} onChange={(e) => setForm({ ...form, call_phone: e.target.value })} placeholder="05xxxxxxxx" /></Field>
              <Field label="نوع التحليل"><select value={form.test_type} onChange={(e) => setForm({ ...form, test_type: e.target.value })}>{fastingOptions.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="منسق المواعيد"><select value={form.coordinator} onChange={(e) => setForm({ ...form, coordinator: e.target.value })}>{coordinators.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="النتائج"><select value={form.result_status} onChange={(e) => setForm({ ...form, result_status: e.target.value })}>{resultOptions.map((s) => <option key={s}>{s}</option>)}</select></Field>

              <Field label="طريقة الدفع">
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value, payment_note: e.target.value === "اخرى" ? form.payment_note : "" })}
                >
                  {paymentMethods.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>

              {form.payment_method === "اخرى" && (
                <Field label="ملاحظة طريقة الدفع *">
                  <input
                    value={form.payment_note}
                    onChange={(e) => setForm({ ...form, payment_note: e.target.value })}
                    placeholder="اكتب طريقة الدفع"
                  />
                </Field>
              )}

              <Field label="السعر">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="مثال: 13.55"
                />
              </Field>

              <Field label="حالة الموعد">
                <select
                  value={form.appointment_status}
                  onChange={(e) => setForm({ ...form, appointment_status: e.target.value, cancel_reason: e.target.value === "ملغي" ? form.cancel_reason : "" })}
                >
                  {appointmentStatuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>

              {form.appointment_status === "ملغي" && (
                <Field label="سبب إلغاء الموعد *" wide>
                  <textarea
                    value={form.cancel_reason}
                    onChange={(e) => setForm({ ...form, cancel_reason: e.target.value })}
                    rows="3"
                    placeholder="اكتب سبب إلغاء الموعد"
                  />
                </Field>
              )}

              <Field label="الملاحظات" wide><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="4" placeholder="اكتب الملاحظات هنا" /></Field>
              <div className="modalFooter">
                <button className="btn btnPrimary" type="submit">حفظ</button>
                <button className="btn btnGhost" type="button" onClick={() => setForm(emptyForm())}>مسح</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Field({ label, children, wide }) {
  return <label className={wide ? "field wide" : "field"}><span>{label}</span>{children}</label>;
}

createRoot(document.getElementById("root")).render(<App />);
