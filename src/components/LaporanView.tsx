import React, { useState, useEffect } from "react";
import { googleSheetApi, getCurrentUser, formatDisplayDate } from "../services/googleSheetApi";
import { Pencatatan, User } from "../types";
import { FileSpreadsheet, Printer, Search, Calendar, Filter, Loader2, Info, AlertCircle, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import * as XLSX from "xlsx";

interface LaporanViewProps {
  isActive?: boolean;
}

export default function LaporanView({ isActive }: LaporanViewProps) {
  const [records, setRecords] = useState<Pencatatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter type: "Harian" | "Mingguan" | "Bulanan" | "Tahunan"
  const [filterType, setFilterType] = useState<"Harian" | "Mingguan" | "Bulanan" | "Tahunan">("Bulanan");
  
  // Dynamic filter values
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split("T")[0]);
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [weekEndDate, setWeekEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [classFilter, setClassFilter] = useState("Semua");

  const currentUser: User | null = getCurrentUser();
  const isWali = currentUser?.role === "Wali Kelas";

  useEffect(() => {
    if (isActive) {
      const isSilent = records.length > 0;
      fetchRecords(isSilent);
    }
  }, [isActive]);

  const fetchRecords = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await googleSheetApi.getRecords();
      setRecords(data);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "Gagal memuat rekapitulasi data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Filter application
  const filteredRecords = records.filter(rec => {
    // 1. Wali Kelas constraint
    if (isWali && currentUser?.kelas && rec.kelas !== currentUser.kelas) {
      return false;
    }
    
    // 2. Class filter dropdown (non-Wali)
    if (!isWali && classFilter !== "Semua" && rec.kelas !== classFilter) {
      return false;
    }

    // 3. Date / Period Filters
    const recDate = new Date(rec.tanggal);
    const recYear = recDate.getFullYear();
    const recMonth = recDate.getMonth();

    if (filterType === "Harian") {
      return rec.tanggal === singleDate;
    } else if (filterType === "Mingguan") {
      const start = new Date(weekStartDate);
      const end = new Date(weekEndDate);
      // Set hours to midnight to compare accurately
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      recDate.setHours(12, 0, 0, 0);
      return recDate >= start && recDate <= end;
    } else if (filterType === "Bulanan") {
      return recMonth === Number(selectedMonth) && recYear === Number(selectedYear);
    } else if (filterType === "Tahunan") {
      return recYear === Number(selectedYear);
    }

    return true;
  }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()); // Ascending for printable chronological reports

  // Detect if app is inside an iframe
  const [isIframe, setIsIframe] = useState(false);
  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  // Recalculate metrics for current filtered dataset
  const totalKasus = filteredRecords.length;
  const totalPoinBK = filteredRecords.reduce((acc, r) => acc + Number(r.poin || 0), 0);
  const uniqueStudents = new Set(filteredRecords.map(r => r.nis)).size;

  // EXPORT EXCEL (.xlsx Format)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("Tidak ada data untuk diekspor pada filter ini.");
      return;
    }

    try {
      const header = ["ID Kasus", "Tanggal Kejadian", "NIS", "Nama Siswa", "Kelas", "Uraian Pelanggaran", "Poin BK", "Petugas/Guru BK", "Keterangan Tambahan"];
      const rows = filteredRecords.map(r => [
        r.id,
        r.tanggal,
        r.nis,
        r.namaSiswa,
        r.kelas,
        r.pelanggaran,
        r.poin,
        r.petugas,
        r.keterangan || "-"
      ]);

      const worksheetData = [header, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-adjust column widths
      ws['!cols'] = [
        { wch: 12 }, // ID Kasus
        { wch: 15 }, // Tanggal Kejadian
        { wch: 12 }, // NIS
        { wch: 25 }, // Nama Siswa
        { wch: 12 }, // Kelas
        { wch: 45 }, // Uraian Pelanggaran
        { wch: 10 }, // Poin BK
        { wch: 30 }, // Petugas
        { wch: 30 }  // Keterangan
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Pelanggaran");
      
      const fileDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `LAPORAN_PELANGGARAN_${filterType.toUpperCase()}_${fileDate}.xlsx`);
    } catch (err) {
      console.error("Gagal mengekspor laporan ke Excel:", err);
      alert("Gagal mengekspor laporan ke Excel.");
    }
  };

  // PRINT / EXPORT PDF
  const handlePrint = () => {
    if (filteredRecords.length === 0) {
      alert("Tidak ada data untuk dicetak pada filter ini.");
      return;
    }

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        // Fallback to normal print if window.open is blocked
        window.print();
        return;
      }

      let stylesHtml = "";
      for (const node of document.querySelectorAll("style, link[rel='stylesheet']")) {
        stylesHtml += node.outerHTML;
      }

      // Format date/period title
      let periodText = `${filterType}`;
      if (filterType === "Harian") {
        periodText += ` (${formatDisplayDate(singleDate)})`;
      } else if (filterType === "Mingguan") {
        periodText += ` (${formatDisplayDate(weekStartDate)} s/d ${formatDisplayDate(weekEndDate)})`;
      } else if (filterType === "Bulanan") {
        periodText += ` (${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedMonth]} ${selectedYear})`;
      } else if (filterType === "Tahunan") {
        periodText += ` (Tahun ${selectedYear})`;
      }
      if (classFilter !== "Semua") {
        periodText += ` | Kelas: ${classFilter}`;
      }

      // Build Table Rows
      const rowsHtml = filteredRecords.map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 10px 12px; font-weight: 600; white-space: nowrap;">${formatDisplayDate(r.tanggal)}</td>
          <td style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #475569;">${r.nis}</td>
          <td style="padding: 10px 12px; font-weight: bold; color: #0f172a;">${r.namaSiswa}</td>
          <td style="padding: 10px 12px; font-weight: 500; color: #334155;">${r.kelas}</td>
          <td style="padding: 10px 12px; font-weight: 500; color: #1e293b; max-width: 250px; word-break: break-word;">${r.pelanggaran}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #dc2626;">${r.poin}</td>
          <td style="padding: 10px 12px; color: #64748b;">
            ${r.keterangan ? `<p style="margin: 0; font-style: italic; color: #64748b; font-size: 10px;">"${r.keterangan}"</p>` : ''}
            <span style="font-size: 9px; color: #94a3b8; display: block; margin-top: 2px;">Piket: ${r.petugas}</span>
          </td>
        </tr>
      `).join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak PDF Laporan Rekapitulasi - ${filterType}</title>
            ${stylesHtml}
            <style>
              body {
                background: white !important;
                color: black !important;
                padding: 40px !important;
                font-family: 'Inter', system-ui, sans-serif;
              }
              @media print {
                body {
                  padding: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            <!-- Header Title -->
            <div style="text-align: center; margin-bottom: 28px;">
              <h3 style="font-size: 14px; font-weight: 900; margin: 0; text-transform: uppercase; color: #1f2937; letter-spacing: 0.5px;">
                LAPORAN REKAPITULASI PELANGGARAN TATA TERTIB SISWA
              </h3>
              <p style="font-size: 11px; color: #4b5563; margin: 6px 0 0 0;">
                Periode Laporan: <strong>${periodText}</strong>
              </p>
            </div>

            <!-- Metrics Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; text-align: center;">
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Total Kasus</span>
                <span style="font-size: 18px; font-weight: 900; color: #1e293b; display: block; margin-top: 4px;">${totalKasus}</span>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Akumulasi Poin</span>
                <span style="font-size: 18px; font-weight: 900; color: #dc2626; display: block; margin-top: 4px;">${totalPoinBK}</span>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Siswa Unik</span>
                <span style="font-size: 18px; font-weight: 900; color: #2563eb; display: block; margin-top: 4px;">${uniqueStudents}</span>
              </div>
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 32px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; font-weight: bold; font-size: 11px; color: #1e293b;">
                  <th style="padding: 10px 12px; width: 80px;">TANGGAL</th>
                  <th style="padding: 10px 12px; width: 90px;">NIS</th>
                  <th style="padding: 10px 12px;">NAMA SISWA</th>
                  <th style="padding: 10px 12px; width: 80px;">KELAS</th>
                  <th style="padding: 10px 12px;">URAIAN PELANGGARAN</th>
                  <th style="padding: 10px 12px; text-align: center; width: 60px;">POIN</th>
                  <th style="padding: 10px 12px; width: 140px;">KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Signatures Section -->
            <div style="margin-top: 48px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; text-align: center; font-size: 11px; page-break-inside: avoid;">
              <div>
                <p style="margin: 0 0 4px 0;">Mengetahui,</p>
                <p style="font-weight: bold; margin: 0 0 64px 0;">Kepala Sekolah</p>
                <p style="font-weight: bold; text-decoration: underline; margin: 0;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
                <p style="color: #64748b; margin: 2px 0 0 0;">NIP. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
              </div>
              <div>
                <p style="margin: 0 0 4px 0;">Dibuat Oleh,</p>
                <p style="font-weight: bold; margin: 0 0 64px 0;">Koordinator BK</p>
                <p style="font-weight: bold; text-decoration: underline; margin: 0;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
                <p style="color: #64748b; margin: 2px 0 0 0;">NIP. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
              </div>
            </div>

            <script>
              window.addEventListener('load', () => {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => { window.close(); }, 500);
                }, 300);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Gagal melakukan pencetakan laporan:", err);
      // Fallback
      window.print();
    }
  };

  return (
    <div id="laporan-view" className="space-y-6">
      
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rekapitulasi & Laporan</h1>
          <p className="text-slate-500 text-sm mt-1">Saring kasus pelanggaran tata tertib, cetak PDF, atau unduh berkas spreadsheet.</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ekspor Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Cetak PDF / Laporan
          </button>
        </div>
      </div>

      {/* Helpful Hint banner when viewed inside the AI Studio iframe */}
      {isIframe && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs shadow-xs print:hidden">
          <HelpCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 animate-bounce" />
          <div>
            <span className="font-bold">Tips Cetak PDF yang Sempurna:</span> Karena Anda sedang berada di dalam bingkai simulasi (iframe), disarankan untuk mengeklik tombol <b className="text-slate-900">"Buka di Tab Baru"</b> di pojok kanan atas sebelum menekan tombol <b>Cetak PDF / Laporan</b> agar tata letak kertas tercetak dengan presisi penuh tanpa terpotong.
          </div>
        </div>
      )}

      {/* Filter Settings Dashboard Container (Hides when printing) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2 text-xs uppercase tracking-wider">
          <Filter className="h-4 w-4 text-blue-600" />
          <h2>Filter Parameter Laporan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1. Filter Period Type Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Rentang Laporan</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl">
              {(["Harian", "Mingguan", "Bulanan", "Tahunan"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`py-1 text-[10px] font-black rounded-lg transition ${
                    filterType === type 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Dynamic Input depending on selected period */}
          {filterType === "Harian" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pilih Tanggal</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono font-semibold"
              />
            </div>
          )}

          {filterType === "Mingguan" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Mulai</label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono text-[10px]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Selesai</label>
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono text-[10px]"
                />
              </div>
            </div>
          )}

          {filterType === "Bulanan" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tahun</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {filterType === "Tahunan" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tahun Ajaran</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Class Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Kelas</label>
            {isWali && currentUser?.kelas ? (
              <input
                type="text"
                disabled
                value={currentUser.kelas}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-800"
              />
            ) : (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              >
                <option value="Semua">Semua Kelas</option>
                {["X-IPA-1", "X-IPA-2", "X-IPS-1", "X-IPS-2", "XI-IPA-1", "XI-IPA-2", "XI-IPS-1", "XI-IPS-2", "XII-IPA-1", "XII-IPA-2", "XII-IPS-1", "XII-IPS-2"].map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            )}
          </div>

        </div>
      </div>

      {/* Printable Report Header Block (Only visible on window.print()) */}
      <div className="hidden print:block text-center border-b-2 border-double border-slate-800 pb-5 space-y-2 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">DINAS PENDIDIKAN DAN KEBUDAYAAN KABUPATEN</h1>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">SMK 02 KESEHATAN</h2>
        <p className="text-xs text-slate-500">Alamat: Jl. Ki Hajar Dewantara No. 45, Telp: (021) 555-0123, Email: info@smk02kesehatan.sch.id</p>
        <div className="pt-2">
          <h3 className="text-md font-extrabold uppercase text-slate-800">
            LAPORAN REKAPITULASI PELANGGARAN TATA TERTIB SISWA
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Periode Laporan: <b>{filterType}</b> {filterType === "Harian" && `(${singleDate})`}
            {filterType === "Mingguan" && `(${weekStartDate} s/d ${weekEndDate})`}
            {filterType === "Bulanan" && `(${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedMonth]} ${selectedYear})`}
            {filterType === "Tahunan" && `(Tahun ${selectedYear})`}
            {classFilter !== "Semua" && ` | Kelas: ${classFilter}`}
          </p>
        </div>
      </div>

      {/* Metrics Summary Indicators */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Kasus Kasus</span>
          <span className="text-2xl font-black text-slate-800 mt-1">{totalKasus}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Akumulasi Poin</span>
          <span className="text-2xl font-black text-red-600 mt-1">{totalPoinBK}</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Siswa Unik</span>
          <span className="text-2xl font-black text-blue-600 mt-1">{uniqueStudents}</span>
        </div>
      </div>

      {/* Main Reports List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-4 print:hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <Info className="h-12 w-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">Tidak ada pencatatan kasus pada periode dan filter yang dipilih.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-none">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800 print:bg-transparent">
                <th className="py-3 px-4 w-20">TANGGAL</th>
                <th className="py-3 px-4 w-28">NIS</th>
                <th className="py-3 px-4">NAMA SISWA</th>
                <th className="py-3 px-4 w-20">KELAS</th>
                <th className="py-3 px-4">URAIAN PELANGGARAN</th>
                <th className="py-3 px-4 text-center w-12">POIN</th>
                <th className="py-3 px-4 w-32">KETERANGAN / GURU BK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-slate-300">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/20 break-inside-avoid">
                  <td className="py-3 px-4 font-semibold text-slate-700 shrink-0 whitespace-nowrap">{formatDisplayDate(r.tanggal)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{r.nis}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{r.namaSiswa}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{r.kelas}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{r.pelanggaran}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-red-600">{r.poin}</td>
                  <td className="py-3 px-4">
                    {r.keterangan && (
                      <p className="text-slate-500 italic mb-1">"{r.keterangan}"</p>
                    )}
                    <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">Piket: {r.petugas}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Printable signature section at the bottom (Only on print) */}
          <div className="hidden print:block mt-12 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold pt-1">Kepala Sekolah SMK 02 Kesehatan</p>
              <p className="h-16" /> {/* Spacer for signature */}
              <p className="font-bold underline">H. Ahmad Dahlan, M.Pd</p>
              <p className="text-slate-500">NIP. 19740523 200212 1 002</p>
            </div>
            <div>
              <p>Dibuat Oleh,</p>
              <p className="font-bold pt-1">Koordinator BK</p>
              <p className="h-16" /> {/* Spacer for signature */}
              <p className="font-bold underline">{currentUser?.nama || "Petugas BK"}</p>
              <p className="text-slate-500">NIP. 19850612 201001 2 005</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
