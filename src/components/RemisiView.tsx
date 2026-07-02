import React, { useState, useEffect, useRef } from "react";
import { googleSheetApi, getCurrentUser, formatDisplayDate } from "../services/googleSheetApi";
import { Siswa, Pencatatan, Remisi, User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  HeartHandshake, Plus, Trash2, Printer, Search, Calendar, 
  HelpCircle, UserPlus, FileText, CheckCircle2, AlertCircle, 
  Loader2, Sparkles, ChevronRight, ArrowLeftRight, ShieldAlert
} from "lucide-react";

interface RemisiViewProps {
  isActive?: boolean;
}

export default function RemisiView({ isActive }: RemisiViewProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [students, setStudents] = useState<Siswa[]>([]);
  const [records, setRecords] = useState<Pencatatan[]>([]);
  const [remisiList, setRemisiList] = useState<Remisi[]>([]);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");

  // Form State
  const [selectedStudentNis, setSelectedStudentNis] = useState("");
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<Siswa[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [poinPengurangan, setPoinPengurangan] = useState<number | "">("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  const [petugas, setPetugas] = useState("");

  const [formSaving, setFormSaving] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Selected Student for official PDF certificate view
  const [certificateNis, setCertificateNis] = useState<string | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    studentName: string;
    points: number;
  } | null>(null);

  // Detection for Iframe
  const [isIframe, setIsIframe] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user && !petugas) {
      setPetugas(user.nama);
    }

    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }

    if (isActive) {
      fetchInitialData();
    }

    // Click outside listener for student search dropdown
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isActive]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studData, recData, remData] = await Promise.all([
        googleSheetApi.getStudents(),
        googleSheetApi.getRecords(),
        googleSheetApi.getRemisi()
      ]);
      setStudents(studData);
      setRecords(recData);
      setRemisiList(remData);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data remisi.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSearchChange = (val: string) => {
    setStudentSearchInput(val);
    setSelectedStudentNis("");
    if (!val.trim()) {
      setStudentSuggestions([]);
      setShowStudentDropdown(false);
      return;
    }

    const query = val.toLowerCase();
    const filtered = students.filter(s => {
      const nama = String(s.nama || "").toLowerCase();
      const nis = String(s.nis || "").toLowerCase();
      return nama.includes(query) || nis.includes(query);
    });
    setStudentSuggestions(filtered.slice(0, 5));
    setShowStudentDropdown(true);
  };

  const selectStudent = (student: Siswa) => {
    setSelectedStudentNis(student.nis);
    setStudentSearchInput(`${student.nama} (${student.nis}) - ${student.kelas}`);
    setStudentSuggestions([]);
    setShowStudentDropdown(false);
  };

  const handleSubmitRemisi = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedStudentNis) {
      setFormError("Harap pilih siswa terlebih dahulu dari pencarian.");
      return;
    }

    if (!poinPengurangan || Number(poinPengurangan) <= 0) {
      setFormError("Poin pengurangan harus lebih besar dari 0.");
      return;
    }

    if (!keterangan.trim()) {
      setFormError("Keterangan remisi harus diisi.");
      return;
    }

    setFormSaving(true);
    try {
      await googleSheetApi.addRemisi({
        nis: selectedStudentNis,
        poinPengurangan: Number(poinPengurangan),
        tanggal,
        keterangan,
        petugas
      });

      setFormSuccess("Remisi poin pelanggaran berhasil disimpan!");
      setStudentSearchInput("");
      setSelectedStudentNis("");
      setPoinPengurangan("");
      setKeterangan("");
      
      // Reload lists
      const freshRemisi = await googleSheetApi.getRemisi();
      setRemisiList(freshRemisi);
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan remisi.");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteRemisi = (id: string, name: string, points: number) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      studentName: name,
      points
    });
  };

  const executeDeleteRemisi = async () => {
    if (!deleteConfirm) return;
    try {
      await googleSheetApi.deleteRemisi(deleteConfirm.id);
      const freshRemisi = await googleSheetApi.getRemisi();
      setRemisiList(freshRemisi);
      setDeleteConfirm(null);
    } catch (err: any) {
      alert("Gagal menghapus remisi: " + err.message);
    }
  };

  const handlePrintCertificate = () => {
    const printContent = document.getElementById("printable-document-content");
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        window.print();
        return;
      }

      let stylesHtml = "";
      for (const node of document.querySelectorAll("style, link[rel='stylesheet']")) {
        stylesHtml += node.outerHTML;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Lembar Keterangan Remisi - ${activeCertData?.student.nama || ""}</title>
            ${stylesHtml}
            <style>
              body {
                background: white !important;
                color: black !important;
                padding: 40px !important;
              }
              @media print {
                body {
                  padding: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="printable-document-card">
              ${printContent.innerHTML}
            </div>
            <script>
              window.addEventListener('load', () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 400);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      window.print();
    }
  };

  // Extract unique classes
  const classesList = ["Semua Kelas", ...Array.from(new Set(students.map(s => s.kelas))).sort()];

  // Process data for net point calculation
  const studentsMetrics = students.map(student => {
    const studentRecords = records.filter(r => r.nis === student.nis);
    const studentRemisi = remisiList.filter(r => r.nis === student.nis);

    const totalViolationPoints = studentRecords.reduce((acc, r) => acc + Number(r.poin || 0), 0);
    const totalRemissionPoints = studentRemisi.reduce((acc, r) => acc + Number(r.poinPengurangan || 0), 0);
    const netPoints = Math.max(0, totalViolationPoints - totalRemissionPoints);

    return {
      student,
      totalViolationPoints,
      totalRemissionPoints,
      netPoints,
      recordsCount: studentRecords.length,
      remisiCount: studentRemisi.length
    };
  }).filter(m => m.totalViolationPoints > 0 || m.totalRemissionPoints > 0); // Show students with violation history or remission history

  // Filtered lists
  const filteredMetrics = studentsMetrics.filter(m => {
    const sName = String(m.student?.nama || "").toLowerCase();
    const sNis = String(m.student?.nis || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchQuery = sName.includes(q) || sNis.includes(q);
    const matchClass = selectedClass === "Semua Kelas" || m.student.kelas === selectedClass;
    return matchQuery && matchClass;
  });

  // Data for the active certificate
  const activeCertData = certificateNis 
    ? studentsMetrics.find(m => m.student.nis === certificateNis) 
    : null;

  const activeCertRecords = activeCertData 
    ? records.filter(r => r.nis === certificateNis).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    : [];

  const activeCertRemisi = activeCertData 
    ? remisiList.filter(r => r.nis === certificateNis).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    : [];

  const canWrite = currentUser?.role === "Admin" || currentUser?.role === "Koordinator BK";

  return (
    <div id="remisi-view" className="space-y-6">
      
      {/* 1. TOP HEADER SECTION (Hidden when printing) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Remisi Poin Pelanggaran</h1>
          <p className="text-slate-500 text-sm mt-1">
            Berikan pengurangan akumulasi poin pelanggaran bagi siswa yang berkelakuan baik atau menyelesaikan tindakan pembinaan.
          </p>
        </div>
      </div>

      {/* Helpful Hint banner when viewed inside the AI Studio iframe (Hidden when printing) */}
      {isIframe && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs shadow-xs print:hidden">
          <HelpCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 animate-bounce" />
          <div>
            <span className="font-bold">Tips Cetak Lembar Keterangan:</span> Jika Anda sedang membuka aplikasi di dalam panel simulasi, klik tombol <b className="text-slate-900">"Buka di Tab Baru"</b> di pojok kanan atas sebelum mencetak lembar keterangan agar ukuran dokumen A4 pas dan tidak terpotong.
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 print:hidden">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Memuat modul remisi...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3 print:hidden">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-extrabold text-sm">Gagal memuat data</h3>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 2. LEFT SIDEBAR: INPUT & RECENT HISTORY (Hidden when printing) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            
            {/* Input Form Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <HeartHandshake className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm">Input Remisi Poin</h2>
                  <p className="text-[10px] text-slate-400">Kurangi poin pelanggaran siswa</p>
                </div>
              </div>

              {canWrite ? (
                <form onSubmit={handleSubmitRemisi} className="p-5 space-y-4">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Student Auto-suggest Search */}
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pilih Siswa</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik NIS atau nama siswa..."
                        value={studentSearchInput}
                        onChange={(e) => handleStudentSearchChange(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                      />
                    </div>

                    {showStudentDropdown && studentSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-50">
                        {studentSuggestions.map(student => (
                          <button
                            key={student.nis}
                            type="button"
                            onClick={() => selectStudent(student)}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition flex justify-between items-center"
                          >
                            <div>
                              <div className="font-extrabold text-slate-800">{student.nama}</div>
                              <div className="text-[10px] text-slate-400 font-bold font-mono">NIS: {student.nis}</div>
                            </div>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600 font-bold">{student.kelas}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Points Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Jumlah Poin Pengurangan</label>
                    <input
                      type="number"
                      placeholder="Contoh: 15"
                      min="1"
                      value={poinPengurangan}
                      onChange={(e) => setPoinPengurangan(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-extrabold"
                    />
                  </div>

                  {/* Date Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tanggal Remisi</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Description Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Alasan / Keterangan Pembinaan</label>
                    <textarea
                      placeholder="Contoh: Berkelakuan sangat baik selama pembinaan, Juara 1 lomba kebersihan, dll."
                      rows={3}
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium leading-relaxed"
                    />
                  </div>

                  {/* Authorized Officer */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Petugas Pemberi Remisi</label>
                    <input
                      type="text"
                      disabled
                      value={petugas}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formSaving}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-sm mt-2"
                  >
                    {formSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <HeartHandshake className="h-4 w-4" />
                        Simpan Remisi
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 font-medium leading-relaxed">
                  Akun Anda masuk sebagai <b className="text-slate-600 font-black">{currentUser?.role}</b>. Hanya <b>Admin</b> dan <b>Koordinator BK</b> yang diizinkan menginput remisi poin pelanggaran.
                </div>
              )}
            </div>

            {/* List of Recent Remissions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Histori Remisi Terbaru</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Daftar remisi poin yang telah diberikan</p>
              </div>

              {remisiList.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">Belum ada data remisi poin tercatat.</div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {remisiList.slice().reverse().map(rem => (
                    <div key={rem.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative group text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-extrabold text-slate-800 leading-tight">{rem.namaSiswa}</div>
                        <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-black rounded-md text-[9px] border border-emerald-100">
                          -{rem.poinPengurangan} Poin
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>{rem.kelas}</span>
                        <span>•</span>
                        <span>{formatDisplayDate(rem.tanggal)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed bg-white p-1.5 rounded-lg border border-slate-100">
                        "{rem.keterangan}"
                      </p>
                      
                      {canWrite && (
                        <button
                          onClick={() => handleDeleteRemisi(rem.id, rem.namaSiswa, rem.poinPengurangan)}
                          className="absolute bottom-2.5 right-2.5 p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Hapus remisi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* 3. RIGHT CONTENT AREA (Tab 2 & Certificate Generator) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Main Net Points Calculation Dashboard Sheet */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:hidden">
              <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-slate-800 text-sm">Rekapitulasi Akumulasi Poin Setelah Remisi</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Hitung netto poin pelanggaran dikurangi total remisi</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  >
                    {classesList.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Search and Summary of counts */}
              <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-50 flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari NIS atau nama siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
                  Menampilkan {filteredMetrics.length} siswa dengan pelanggaran
                </div>
              </div>

              {/* Net Points Sheet Table */}
              {filteredMetrics.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Tidak ada data siswa pelanggar tata tertib yang memenuhi filter pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4 text-center">Kelas</th>
                        <th className="py-3 px-4 text-center">Total Pelanggaran</th>
                        <th className="py-3 px-4 text-center text-red-600 bg-red-50/40">Poin Kotor</th>
                        <th className="py-3 px-4 text-center text-emerald-700 bg-emerald-50/40">Total Remisi</th>
                        <th className="py-3 px-4 text-center text-blue-800 bg-blue-50/40 font-black">Netto Akhir</th>
                        <th className="py-3 px-4 text-right">Lembar Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredMetrics.map(item => (
                        <tr 
                          key={item.student.nis} 
                          className={`hover:bg-slate-50/50 transition-colors ${
                            certificateNis === item.student.nis ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-800">{item.student.nama}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">NIS: {item.student.nis}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-600">{item.student.kelas}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-500">{item.recordsCount} kasus</td>
                          
                          {/* Violations Gross Points */}
                          <td className="py-3.5 px-4 text-center font-extrabold text-red-600 bg-red-50/10">
                            {item.totalViolationPoints}
                          </td>
                          
                          {/* Remissions points */}
                          <td className="py-3.5 px-4 text-center font-extrabold text-emerald-600 bg-emerald-50/10">
                            {item.totalRemissionPoints > 0 ? `-${item.totalRemissionPoints}` : "0"}
                          </td>
                          
                          {/* Net Final Points */}
                          <td className="py-3.5 px-4 text-center font-black text-blue-700 bg-blue-50/10 text-sm">
                            {item.netPoints}
                          </td>

                          {/* Print Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setCertificateNis(item.student.nis)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-[10px] transition cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Buka Dokumen
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. THE DOCUMENT PREVIEW: LEMBAR KETERANGAN SURAT */}
            {certificateNis && activeCertData ? (
              <div className="space-y-4">
                
                {/* Screen Controls Bar (Hidden when printing) */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm print:hidden">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl text-blue-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300">Dokumen Aktif</h3>
                      <p className="font-black text-white text-sm">{activeCertData.student.nama}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCertificateNis(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Tutup
                    </button>
                    <button
                      onClick={handlePrintCertificate}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      Cetak Lembar Keterangan
                    </button>
                  </div>
                </div>

                {/* THE PRINTABLE SHEET (KOP SURAT & CERTIFICATE) */}
                {/* 
                  We structure this carefully. On screen it's a styled document block inside a shadow box.
                  In print mode, we hide everything else and style this exactly as an A4 document.
                */}
                <div id="printable-document-content" className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 md:p-12 max-w-full overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
                  
                  {/* Document Title Block */}
                  <div className="text-center mt-2 space-y-1">
                    <h3 className="font-black text-slate-900 text-base underline uppercase tracking-wide">LEMBAR KETERANGAN REMISI & RINCIAN POIN PELANGGARAN</h3>
                    <p className="text-[10px] font-bold text-mono text-slate-500 tracking-wider font-mono">
                      Nomor: {activeCertData.student.nis}/SMA-SIPPS/BK-REM/{new Date().getFullYear()}/{String(new Date().getMonth() + 1).padStart(2, '0')}
                    </p>
                  </div>

                  {/* Student Profile Block */}
                  <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6 text-xs print:bg-white print:border print:rounded-none">
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nama Lengkap</span>
                      <span className="font-bold text-slate-500">:</span>
                      <span className="font-black text-slate-900 uppercase text-xs">{activeCertData.student.nama}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nomor Induk (NIS)</span>
                      <span className="font-bold text-slate-500">:</span>
                      <span className="font-bold text-slate-800 font-mono text-xs">{activeCertData.student.nis}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kelas / Jenjang</span>
                      <span className="font-bold text-slate-500">:</span>
                      <span className="font-black text-slate-800 text-xs">{activeCertData.student.kelas}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Jenis Kelamin</span>
                      <span className="font-bold text-slate-500">:</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {activeCertData.student.jk === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </div>
                  </div>

                  {/* Section Paragraph Text */}
                  <p className="mt-6 text-xs text-slate-700 leading-relaxed text-justify">
                    Menerangkan dengan sesungguhnya bahwa siswa tersebut di atas memiliki riwayat akumulasi poin pelanggaran tata tertib sekolah, serta telah diberikan hak pengurangan poin (remisi) atas dasar keaktifan pembinaan atau tindakan positif, dengan rincian poin sebagai berikut:
                  </p>

                  {/* Columns for Violations & Remissions side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start print:grid-cols-2">
                    
                    {/* Violations Left Table */}
                    <div className="space-y-2.5">
                      <h4 className="font-extrabold text-red-600 text-[10px] uppercase tracking-wider border-b border-red-100 pb-1 flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        A. Daftar Pelanggaran Tercatat ({activeCertData.recordsCount} Kasus)
                      </h4>
                      {activeCertRecords.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">Tidak ada catatan pelanggaran.</p>
                      ) : (
                        <div className="border border-slate-100 rounded-xl overflow-hidden text-[10px] bg-white print:rounded-none">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-red-50/40 text-red-900 border-b border-slate-100 font-bold uppercase text-[9px]">
                                <th className="py-2 px-3">Tanggal</th>
                                <th className="py-2 px-3">Uraian</th>
                                <th className="py-2 px-3 text-right">Poin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                              {activeCertRecords.map(rec => (
                                <tr key={rec.id}>
                                  <td className="py-2 px-3 font-mono text-[9px] shrink-0">{rec.tanggal}</td>
                                  <td className="py-2 px-3 font-medium line-clamp-2 md:line-clamp-none">{rec.pelanggaran}</td>
                                  <td className="py-2 px-3 text-right font-bold text-red-600">{rec.poin}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-red-50/20 border-t border-slate-100 text-slate-800 font-extrabold">
                                <td colSpan={2} className="py-2 px-3 text-right">Total Poin Kotor:</td>
                                <td className="py-2 px-3 text-right text-red-600">{activeCertData.totalViolationPoints}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Remissions Right Table */}
                    <div className="space-y-2.5">
                      <h4 className="font-extrabold text-emerald-700 text-[10px] uppercase tracking-wider border-b border-emerald-100 pb-1 flex items-center gap-1.5">
                        <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
                        B. Daftar Pengurangan Poin (Remisi / Kelakuan Baik)
                      </h4>
                      {activeCertRemisi.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-2">Belum mendapatkan remisi pengurangan poin.</p>
                      ) : (
                        <div className="border border-slate-100 rounded-xl overflow-hidden text-[10px] bg-white print:rounded-none">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-emerald-50/40 text-emerald-900 border-b border-slate-100 font-bold uppercase text-[9px]">
                                <th className="py-2 px-3">Tanggal</th>
                                <th className="py-2 px-3">Uraian / Tindakan</th>
                                <th className="py-2 px-3 text-right">Remisi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                              {activeCertRemisi.map(rem => (
                                <tr key={rem.id}>
                                  <td className="py-2 px-3 font-mono text-[9px] whitespace-nowrap">{rem.tanggal}</td>
                                  <td className="py-2 px-3 font-medium">{rem.keterangan}</td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-600">-{rem.poinPengurangan}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-emerald-50/20 border-t border-slate-100 text-slate-800 font-extrabold">
                                <td colSpan={2} className="py-2 px-3 text-right">Total Remisi:</td>
                                <td className="py-2 px-3 text-right text-emerald-600">-{activeCertData.totalRemissionPoints}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Net Point Sheet Block */}
                  <div className="mt-8 bg-blue-50/40 border-2 border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 print:bg-slate-50 print:border print:rounded-none">
                    <div className="space-y-1 text-center md:text-left">
                      <h4 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider">Kalkulasi Netto Poin Akhir Siswa</h4>
                      <p className="text-xs text-slate-600">Total Poin Pelanggaran dikurangi total remisi/pengurangan poin</p>
                    </div>

                    <div className="flex items-center gap-4 text-slate-900 font-mono font-extrabold text-xs">
                      <div className="text-center p-3.5 bg-white border border-slate-100 rounded-xl w-24 shadow-xs print:border print:shadow-none">
                        <div className="text-[10px] text-slate-400 font-bold">KOTOR</div>
                        <div className="text-red-600 text-base font-black mt-1">{activeCertData.totalViolationPoints}</div>
                      </div>
                      <div className="text-slate-400 text-lg font-black">-</div>
                      <div className="text-center p-3.5 bg-white border border-slate-100 rounded-xl w-24 shadow-xs print:border print:shadow-none">
                        <div className="text-[10px] text-slate-400 font-bold font-sans">REMISI</div>
                        <div className="text-emerald-600 text-base font-black mt-1">{activeCertData.totalRemissionPoints}</div>
                      </div>
                      <div className="text-slate-400 text-lg font-black">=</div>
                      <div className="text-center p-3.5 bg-blue-600 text-white rounded-xl w-28 shadow-md shadow-blue-900/10 print:bg-slate-800 print:text-white print:border print:shadow-none">
                        <div className="text-[10px] text-blue-200 font-sans font-bold">NETTO AKHIR</div>
                        <div className="text-lg font-black mt-1">{activeCertData.netPoints} Poin</div>
                      </div>
                    </div>
                  </div>

                  {/* Final Guidance Action Statement */}
                  <p className="mt-6 text-xs text-slate-700 leading-relaxed text-justify">
                    Berdasarkan perhitungan netto poin akhir di atas, siswa bernama <b>{activeCertData.student.nama}</b> saat ini tercatat memiliki akumulasi poin akhir sebesar <b className="text-blue-700">{activeCertData.netPoints} poin</b>. Tindakan pembinaan disiplin sekolah yang berlaku disesuaikan dengan akumulasi sisa netto tersebut. Surat keterangan ini dikeluarkan sebagai berkas resmi untuk kebutuhan koordinasi antara Sekolah (BK & Wali Kelas) dan Orang Tua / Wali Siswa.
                  </p>

                  {/* Signature Section */}
                  <div className="mt-12 grid grid-cols-2 text-center text-xs text-slate-800 gap-6">
                    <div className="space-y-20">
                      <div>
                        <span className="block font-bold">Mengetahui,</span>
                        <span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px] mt-0.5">WALI KELAS</span>
                      </div>
                      <div>
                        <span className="block font-extrabold text-slate-950 underline decoration-slate-400 uppercase">...................................................</span>
                      </div>
                    </div>

                    <div className="space-y-20">
                      <div>
                        <span className="block font-bold">Tangerang Selatan, {formatDisplayDate(new Date().toISOString().split("T")[0])}</span>
                        <span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px] mt-0.5">KOORDINATOR GURU BK / STAF BK</span>
                      </div>
                      <div>
                        <span className="block font-extrabold text-slate-950 underline decoration-slate-400 uppercase">...................................................</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 print:hidden">
                <FileText className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
                <h3 className="font-extrabold text-slate-700 text-sm mt-3">Dokumen Keterangan Remisi</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                  Pilih salah satu siswa dari tabel rekapitulasi poin di atas untuk membuka dan mencetak lembar keterangan pengurangan poin (remisi) resmi.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* 5. CUSTOM DELETE REMISSION CONFIRMATION MODAL (Hidden when printing) */}
      <AnimatePresence>
        {deleteConfirm && deleteConfirm.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Hapus Remisi Poin</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin membatalkan dan menghapus remisi pengurangan sebesar <span className="font-extrabold text-red-600">{deleteConfirm.points} poin</span> untuk siswa <span className="font-extrabold text-slate-700">"{deleteConfirm.studentName}"</span>? 
                  Poin pelanggaran siswa akan bertambah kembali otomatis sesuai histori asalnya.
                </p>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={executeDeleteRemisi}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Ya, Batalkan Remisi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
