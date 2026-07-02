import React, { useState, useEffect } from "react";
import { googleSheetApi, getCurrentUser } from "../services/googleSheetApi";
import { Siswa, User } from "../types";
import { Search, Plus, Edit2, Trash2, Eye, UserX, ArrowLeft, ArrowRight, Loader2, Check, AlertCircle, FileSpreadsheet, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";

interface SiswaViewProps {
  onViewDetail: (nis: string) => void;
  isActive?: boolean;
}

export default function SiswaView({ onViewDetail, isActive }: SiswaViewProps) {
  const [students, setStudents] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Template manual state
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedStudent, setSelectedStudent] = useState<Partial<Siswa> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  
  // Current user role verification
  const currentUser: User | null = getCurrentUser();
  const isAdmin = currentUser?.role === "Admin";
  const isBK = currentUser?.role === "Koordinator BK";
  const isWali = currentUser?.role === "Wali Kelas";
  const canEdit = isAdmin || isBK;
  const canDelete = isAdmin;

  const downloadCsvTemplate = (type: 'siswa' | 'pelanggaran' | 'pencatatan', delimiter: ',' | ';') => {
    let headers = '';
    let exampleRow = '';
    let fileName = '';

    if (type === 'siswa') {
      fileName = `template_siswa_${delimiter === ';' ? 'excel' : 'sheets'}.csv`;
      headers = ['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Nama Orang Tua', 'No HP'].join(delimiter);
      exampleRow = ['', '24001', 'Ahmad Rifai', 'XI-IPA-1', 'L', 'Budi Utomo', '081234567890'].join(delimiter);
    } else if (type === 'pelanggaran') {
      fileName = `template_pelanggaran_${delimiter === ';' ? 'excel' : 'sheets'}.csv`;
      headers = ['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin'].join(delimiter);
      exampleRow = ['', 'P01', 'Terlambat Masuk Sekolah (< 15 menit)', 'Ringan', '5'].join(delimiter);
    } else if (type === 'pencatatan') {
      fileName = `template_pencatatan_${delimiter === ';' ? 'excel' : 'sheets'}.csv`;
      headers = ['ID', 'Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Pelanggaran', 'Poin', 'Petugas', 'Keterangan'].join(delimiter);
      exampleRow = ['', '2026-06-30', '24001', 'Ahmad Rifai', 'XI-IPA-1', 'Terlambat Masuk Sekolah (< 15 menit)', '5', 'Iien Puspitasari, S.Pd (Koordinator BK)', 'Terlambat karena ban bocor'].join(delimiter);
    }

    const csvContent = "\uFEFF" + headers + "\n" + exampleRow + "\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCombinedExcelTemplate = () => {
    try {
      // Sheet 1: Data Siswa
      const siswaData = [
        ["ID", "NIS", "Nama", "Kelas", "JK", "Nama Orang Tua", "No HP"],
        ["", "24001", "Ahmad Rifai", "XI-IPA-1", "L", "Budi Utomo", "081234567890"],
        ["", "24002", "Siti Aminah", "XI-IPA-1", "P", "Hasan Basri", "081234567891"],
        ["", "24003", "Budi Santoso", "XI-IPA-2", "L", "Suryono", "081234567892"]
      ];
      
      // Sheet 2: Master Pelanggaran
      const pelanggaranData = [
        ["ID", "Kode", "Nama Pelanggaran", "Kategori", "Poin"],
        ["", "P01", "Terlambat Masuk Sekolah (< 15 menit)", "Ringan", "5"],
        ["", "P02", "Rambut Gondrong / Tidak Rapi (Siswa Laki-laki)", "Ringan", "10"],
        ["", "P03", "Atribut Seragam Tidak Lengkap", "Ringan", "5"],
        ["", "P04", "Membolos Sekolah / Meninggalkan Kelas Tanpa Izin", "Sedang", "15"],
        ["", "P05", "Merokok di Lingkungan Sekolah", "Berat", "25"],
        ["", "P06", "Melakukan Bullying (Perundungan) Fisik/Verbal", "Berat", "50"]
      ];
      
      // Sheet 3: Pencatatan
      const pencatatanData = [
        ["ID", "Tanggal", "NIS", "Nama Siswa", "Kelas", "Pelanggaran", "Poin", "Petugas", "Keterangan"],
        ["", "2026-06-30", "24001", "Ahmad Rifai", "XI-IPA-1", "Terlambat Masuk Sekolah (< 15 menit)", "5", "Iien Puspitasari, S.Pd (Koordinator BK)", "Terlambat karena ban bocor"],
        ["", "2026-06-30", "24005", "Rian Hidayat", "XI-IPS-1", "Merokok di Lingkungan Sekolah", "25", "Iien Puspitasari, S.Pd (Koordinator BK)", "Tertangkap merokok di kantin belakang"]
      ];

      const wb = XLSX.utils.book_new();
      
      const wsSiswa = XLSX.utils.aoa_to_sheet(siswaData);
      const wsPelanggaran = XLSX.utils.aoa_to_sheet(pelanggaranData);
      const wsPencatatan = XLSX.utils.aoa_to_sheet(pencatatanData);

      // Adjust column widths
      wsSiswa['!cols'] = [{wch: 8}, {wch: 12}, {wch: 25}, {wch: 12}, {wch: 8}, {wch: 25}, {wch: 15}];
      wsPelanggaran['!cols'] = [{wch: 8}, {wch: 10}, {wch: 45}, {wch: 12}, {wch: 8}];
      wsPencatatan['!cols'] = [{wch: 8}, {wch: 12}, {wch: 12}, {wch: 25}, {wch: 12}, {wch: 45}, {wch: 8}, {wch: 35}, {wch: 35}];

      XLSX.utils.book_append_sheet(wb, wsSiswa, "Template Siswa");
      XLSX.utils.book_append_sheet(wb, wsPelanggaran, "Template Pelanggaran");
      XLSX.utils.book_append_sheet(wb, wsPencatatan, "Template Pencatatan");

      XLSX.writeFile(wb, "template_aplikasi_BK_3_sheet.xlsx");
    } catch (err) {
      console.error("Gagal mengunduh Excel:", err);
      alert("Gagal mengunduh template Excel. Silakan coba lagi.");
    }
  };

  useEffect(() => {
    if (isActive) {
      const isSilent = students.length > 0;
      fetchStudents(isSilent);
    }
  }, [isActive]);

  const fetchStudents = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await googleSheetApi.getStudents();
      setStudents(data);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "Gagal memuat data siswa.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Search filter
  const filteredStudents = students.filter(student => {
    // Jika Wali Kelas, batasi hanya melihat kelas miliknya jika kelas dicantumkan
    if (isWali && currentUser?.kelas && student.kelas !== currentUser.kelas) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    const nama = String(student.nama || "").toLowerCase();
    const nis = String(student.nis || "").toLowerCase();
    const kelas = String(student.kelas || "").toLowerCase();
    return (
      nama.includes(q) ||
      nis.includes(q) ||
      kelas.includes(q)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Handle Page Change
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Open Modal Add / Edit
  const handleOpenModal = (mode: "add" | "edit", student?: Siswa) => {
    setFormError(null);
    setModalMode(mode);
    if (mode === "edit" && student) {
      setSelectedStudent({ ...student });
    } else {
      setSelectedStudent({
        nis: "",
        nama: "",
        kelas: isWali && currentUser?.kelas ? currentUser.kelas : "",
        jk: "L",
        namaOrangTua: "",
        noHp: ""
      });
    }
    setIsModalOpen(true);
  };

  // Submit Modal Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    // Validasi
    if (!selectedStudent.nis?.trim() || !selectedStudent.nama?.trim() || !selectedStudent.kelas?.trim()) {
      setFormError("NIS, Nama Siswa, dan Kelas wajib diisi.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      await googleSheetApi.addStudent(selectedStudent);
      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data siswa.");
    } finally {
      setFormSaving(false);
    }
  };

  // State for Custom Student Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    studentName: string;
  } | null>(null);

  // Delete Student Handler
  const handleDeleteStudent = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      studentName: name
    });
  };

  const executeDeleteStudent = async () => {
    if (!deleteConfirm) return;
    try {
      await googleSheetApi.deleteStudent(deleteConfirm.id);
      fetchStudents();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert("Gagal menghapus siswa: " + err.message);
    }
  };

  // Export Filtered Student Data to Excel
  const handleExportSiswaExcel = () => {
    if (filteredStudents.length === 0) {
      alert("Tidak ada data siswa untuk diekspor pada filter ini.");
      return;
    }
    try {
      const header = ["NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin", "Nama Orang Tua / Wali", "No HP Orang Tua"];
      const rows = filteredStudents.map(student => [
        student.nis,
        student.nama,
        student.kelas,
        student.jk === "L" ? "Laki-laki" : "Perempuan",
        student.namaOrangTua || "-",
        student.noHp || "-"
      ]);

      const worksheetData = [header, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-adjust column widths
      ws['!cols'] = [
        { wch: 12 }, // NIS
        { wch: 30 }, // Nama Lengkap
        { wch: 15 }, // Kelas
        { wch: 15 }, // Jenis Kelamin
        { wch: 30 }, // Orang Tua
        { wch: 20 }  // No HP
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
      XLSX.writeFile(wb, `DATA_SISWA_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Gagal mengekspor data siswa:", err);
      alert("Gagal mengekspor data siswa ke Excel.");
    }
  };

  return (
    <div id="siswa-view" className="space-y-6">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Data Siswa</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isWali && currentUser?.kelas 
              ? `Menampilkan siswa Kelas ${currentUser.kelas} yang Anda ampu.`
              : "Kelola data profil seluruh siswa di sekolah."
            }
          </p>
        </div>
        
        {/* Add Student Button and Template Download Toggle (Only for Admin/BK) */}
        {canEdit && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer border border-slate-200/60 shadow-xs"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
              Template Excel Manual
            </button>
            <button
              onClick={() => handleOpenModal("add")}
              className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-blue-100 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Tambah Siswa Baru
            </button>
          </div>
        )}
      </div>

      {/* Manual Input Excel Template Download Panel */}
      <AnimatePresence>
        {showTemplateMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-100/80 p-5 rounded-2xl shadow-sm mb-4"
          >
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                  Pilihan Unduhan Template Manual (Excel & Spreadsheet)
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
                  Gunakan template di bawah ini untuk mempersiapkan data Anda secara manual atau menyusun draf sebelum disalin/diimpor ke Google Sheets.
                  Kami sangat merekomendasikan mengunduh <b>Template 3-Sheet Utama</b> karena sudah menggabungkan data Siswa, Master Pelanggaran, dan Pencatatan ke dalam satu berkas terstruktur.
                </p>
              </div>

              {/* Main 3-sheet Excel Download Banner */}
              <div className="bg-white/80 border border-emerald-200/60 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-lg">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Template Utama BK Lengkap (.xlsx)</h4>
                    <p className="text-[10.5px] text-slate-500">
                      Satu berkas berisi 3 Sheet terpisah: <b>1. Template Siswa</b>, <b>2. Template Pelanggaran</b>, dan <b>3. Template Pencatatan</b>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadCombinedExcelTemplate}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-100 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Download className="h-4 w-4" />
                  Unduh Berkas 3-Sheet Excel
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Template Siswa */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">1. Template Data Siswa</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Daftar NIS, Nama, Kelas, JK, Wali & No HP.</p>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => downloadCsvTemplate('siswa', ';')}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-blue-600" /> Excel (;)
                    </button>
                    <button
                      onClick={() => downloadCsvTemplate('siswa', ',')}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-emerald-600" /> Sheets (,)
                    </button>
                  </div>
                </div>

                {/* Template Pelanggaran */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">2. Template Pelanggaran</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Daftar kode, nama pelanggaran, poin, & kategori.</p>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => downloadCsvTemplate('pelanggaran', ';')}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-blue-600" /> Excel (;)
                    </button>
                    <button
                      onClick={() => downloadCsvTemplate('pelanggaran', ',')}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-emerald-600" /> Sheets (,)
                    </button>
                  </div>
                </div>

                {/* Template Pencatatan */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between gap-3 shadow-2xs">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">3. Template Pencatatan</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Log tanggal, nama, pelanggaran, poin, & guru BK.</p>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => downloadCsvTemplate('pencatatan', ';')}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-blue-600" /> Excel (;)
                    </button>
                    <button
                      onClick={() => downloadCsvTemplate('pencatatan', ',')}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3 text-emerald-600" /> Sheets (,)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Statistics Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Cari berdasarkan NIS, Nama, atau Kelas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset page on search
            }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Info and Export button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="text-xs text-slate-400 font-semibold uppercase shrink-0">
            Menampilkan {filteredStudents.length} siswa
          </div>
          <button
            onClick={handleExportSiswaExcel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Ekspor Excel
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800">
          <p className="font-semibold">{error}</p>
          <button onClick={fetchStudents} className="mt-2 text-xs font-bold text-red-600 underline">
            Muat ulang data
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <UserX className="h-12 w-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium">Siswa tidak ditemukan atau data kosong.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">NIS</th>
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</th>
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Kelas</th>
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</th>
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Orang Tua / Wali</th>
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">No HP Orang Tua</th>
                  <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-700">{student.nis}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{student.nama}</td>
                    <td className="py-4 px-6 font-medium">{student.kelas}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        student.jk === "L" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"
                      }`}>
                        {student.jk === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{student.namaOrangTua || "-"}</td>
                    <td className="py-4 px-6 font-mono text-slate-500">{student.noHp || "-"}</td>
                    <td className="py-4 px-6 text-right space-x-1 shrink-0 whitespace-nowrap">
                      {/* View detail button */}
                      <button
                        onClick={() => onViewDetail(student.nis)}
                        title="Lihat Riwayat"
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Edit button (BK/Admin only) */}
                      {canEdit && (
                        <button
                          onClick={() => handleOpenModal("edit", student)}
                          title="Ubah Profil"
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors inline-flex items-center"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete button (Admin only) */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.nama)}
                          title="Hapus"
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors inline-flex items-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500">
              Halaman {currentPage} dari {totalPages} (Total {filteredStudents.length} data)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      <AnimatePresence>
        {isModalOpen && selectedStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base">
                  {modalMode === "add" ? "Tambah Data Siswa Baru" : "Edit Profil Siswa"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* NIS */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Nomor Induk Siswa (NIS) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 24001"
                      disabled={modalMode === "edit"}
                      value={selectedStudent.nis || ""}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, nis: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  {/* Kelas */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Kelas *</label>
                    {isWali && currentUser?.kelas ? (
                      <input
                        type="text"
                        disabled
                        value={currentUser.kelas}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-100"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Contoh: XI-IPA-1"
                        value={selectedStudent.kelas || ""}
                        onChange={(e) => setSelectedStudent({ ...selectedStudent, kelas: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>

                {/* Nama Lengkap */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Rifai"
                    value={selectedStudent.nama || ""}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, nama: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* JK */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Jenis Kelamin</label>
                  <div className="flex gap-4 p-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="jk"
                        checked={selectedStudent.jk === "L"}
                        onChange={() => setSelectedStudent({ ...selectedStudent, jk: "L" })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      Laki-laki (L)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="jk"
                        checked={selectedStudent.jk === "P"}
                        onChange={() => setSelectedStudent({ ...selectedStudent, jk: "P" })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      Perempuan (P)
                    </label>
                  </div>
                </div>

                {/* Nama Orang Tua */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    placeholder="Contoh: Hadi Wijaya"
                    value={selectedStudent.namaOrangTua || ""}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, namaOrangTua: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* No HP */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">No HP Orang Tua / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={selectedStudent.noHp || ""}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, noHp: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    {formSaving ? (
                      <>
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {modalMode === "add" ? "Tambahkan" : "Simpan Perubahan"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Student Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && deleteConfirm.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
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
                  <h3 className="font-extrabold text-slate-800 text-lg">Konfirmasi Hapus Siswa</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus siswa bernama <span className="font-extrabold text-slate-700">"{deleteConfirm.studentName}"</span>? 
                  Seluruh data pelanggaran yang berhubungan tidak akan terhapus namun kehilangan referensi profil siswa tersebut.
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
                    onClick={executeDeleteStudent}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Ya, Hapus Siswa
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
