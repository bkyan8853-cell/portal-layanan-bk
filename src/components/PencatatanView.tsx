import React, { useState, useEffect, useRef } from "react";
import { googleSheetApi, getCurrentUser, formatDisplayDate } from "../services/googleSheetApi";
import { Siswa, Pelanggaran, Pencatatan, User, Pembinaan } from "../types";
import { Plus, Search, Calendar, UserCheck, AlertTriangle, Loader2, Check, AlertCircle, FileSpreadsheet, Printer, Trash2, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PencatatanViewProps {
  isActive?: boolean;
}

export default function PencatatanView({ isActive }: PencatatanViewProps) {
  const [records, setRecords] = useState<Pencatatan[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [violations, setViolations] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedStudentNis, setSelectedStudentNis] = useState("");
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<Siswa[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  
  const [selectedViolationId, setSelectedViolationId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [petugas, setPetugas] = useState("");
  const [keterangan, setKeterangan] = useState("");
  
  const [formSaving, setFormSaving] = useState(false);
  const [formSuccess, setFormSuccess] = useState<{ msg: string; guidance?: Pembinaan } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Table Filters State
  const [tableSearch, setTableSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  
  // Auth state
  const currentUser: User | null = getCurrentUser();
  const isAdmin = currentUser?.role === "Admin";
  const isBK = currentUser?.role === "Koordinator BK";
  const isWali = currentUser?.role === "Wali Kelas";
  const canWrite = isAdmin || isBK;
  const canDelete = isAdmin;

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      const isSilent = records.length > 0 && students.length > 0 && violations.length > 0;
      fetchInitialData(isSilent);
    }
    if (currentUser && !petugas) {
      setPetugas(currentUser.nama);
    }

    // Click outside listener for student dropdown
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isActive]);

  const fetchInitialData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [recData, studData, violData] = await Promise.all([
        googleSheetApi.getRecords(),
        googleSheetApi.getStudents(),
        googleSheetApi.getViolations()
      ]);
      setRecords(recData);
      setStudents(studData);
      setViolations(violData);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "Gagal memuat data pencatatan.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Student Search handler in Form
  const handleStudentSearchChange = (val: string) => {
    setStudentSearchInput(val);
    setSelectedStudentNis(""); // Reset selection
    if (!val.trim()) {
      setStudentSuggestions([]);
      setShowStudentDropdown(false);
      return;
    }
    
    const query = val.toLowerCase();
    const filtered = students.filter(s => {
      // Jika wali kelas, batasi hanya murid kelasnya
      if (isWali && currentUser?.kelas && s.kelas !== currentUser.kelas) {
        return false;
      }
      const nama = String(s.nama || "").toLowerCase();
      const nis = String(s.nis || "").toLowerCase();
      return nama.includes(query) || nis.includes(query);
    });
    setStudentSuggestions(filtered.slice(0, 5)); // Limit to 5
    setShowStudentDropdown(true);
  };

  const selectStudent = (student: Siswa) => {
    setSelectedStudentNis(student.nis);
    setStudentSearchInput(`${student.nama} (${student.nis}) - ${student.kelas}`);
    setStudentSuggestions([]);
    setShowStudentDropdown(false);
  };

  // Submit Record
  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setFormError(null);
    setFormSuccess(null);

    if (!selectedStudentNis) {
      setFormError("Harap pilih siswa terlebih dahulu dari daftar pencarian.");
      return;
    }
    if (!selectedViolationId) {
      setFormError("Harap pilih jenis pelanggaran.");
      return;
    }

    const selectedViolation = violations.find(v => (v.id === selectedViolationId || v.kode === selectedViolationId) && selectedViolationId);
    if (!selectedViolation) {
      setFormError("Jenis pelanggaran tidak valid.");
      return;
    }

    setFormSaving(true);

    try {
      const res = await googleSheetApi.addRecord({
        nis: selectedStudentNis,
        pelanggaran: selectedViolation.namaPelanggaran,
        tanggal,
        petugas,
        keterangan
      });

      setFormSuccess({
        msg: `Pelanggaran "${selectedViolation.namaPelanggaran}" (${selectedViolation.poin} Poin) berhasil dicatatkan untuk siswa tersebut.`,
        guidance: res.guidance
      });

      // Reset form fields
      setSelectedStudentNis("");
      setStudentSearchInput("");
      setSelectedViolationId("");
      setKeterangan("");
      
      // Reload table records
      const freshRecords = await googleSheetApi.getRecords();
      setRecords(freshRecords);
    } catch (err: any) {
      setFormError(err.message || "Gagal mencatatkan pelanggaran.");
    } finally {
      setFormSaving(false);
    }
  };

  // State for Custom Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    studentName: string;
    violationName: string;
  } | null>(null);

  // Delete Record
  const handleDeleteRecord = (id: string, name: string, violation: string) => {
    if (!canDelete) return;
    setDeleteConfirm({
      isOpen: true,
      id,
      studentName: name,
      violationName: violation
    });
  };

  const executeDeleteRecord = async () => {
    if (!deleteConfirm) return;
    try {
      await googleSheetApi.deleteRecord(deleteConfirm.id);
      const freshRecords = await googleSheetApi.getRecords();
      setRecords(freshRecords);
      setDeleteConfirm(null);
    } catch (err: any) {
      alert("Gagal menghapus catatan: " + err.message);
    }
  };

  // Filter Records Table
  const filteredRecords = records.filter(rec => {
    // Jika Wali Kelas, batasi hanya melihat kelasnya
    if (isWali && currentUser?.kelas && rec.kelas !== currentUser.kelas) {
      return false;
    }
    
    const q = tableSearch.toLowerCase();
    const namaSiswa = String(rec.namaSiswa || "").toLowerCase();
    const nis = String(rec.nis || "").toLowerCase();
    const pelanggaran = String(rec.pelanggaran || "").toLowerCase();
    const petugas = String(rec.petugas || "").toLowerCase();
    
    const matchesSearch = 
      namaSiswa.includes(q) ||
      nis.includes(q) ||
      pelanggaran.includes(q) ||
      petugas.includes(q);
      
    const matchesClass = !classFilter || String(rec.kelas || "").toLowerCase().includes(classFilter.toLowerCase());
    
    return matchesSearch && matchesClass;
  }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()); // Latest first

  return (
    <div id="pencatatan-view" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Panel: Input Form (Only BK & Admin) */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800 text-base">Input Pelanggaran Baru</h2>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Lembar Kasus Siswa</p>
            </div>
          </div>

          {!canWrite ? (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-xs leading-relaxed flex items-start gap-2 border border-amber-200">
              <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Akun Wali Kelas hanya berhak meninjau riwayat pelanggaran. Form input pelanggaran dinonaktifkan.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmitRecord} className="space-y-4">
              
              {/* Form Status Messages */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium rounded-xl space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{formSuccess.msg}</span>
                  </div>
                  
                  {formSuccess.guidance && (
                    <div className="p-3 bg-white rounded-lg border border-emerald-200/50 space-y-1.5">
                      <div className="font-bold text-[11px] text-emerald-900 uppercase tracking-wide">
                        Status Akumulasi Poin BK:
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Poin Siswa:</span>
                        <span className="font-extrabold text-red-600">{formSuccess.guidance.totalPoin} Poin</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Rekomendasi Pembinaan:</span>
                        <span className="font-black px-2 py-0.5 bg-red-50 text-red-700 rounded-md text-[10px] uppercase border border-red-100">
                          {formSuccess.guidance.tindakan}
                        </span>
                      </div>
                    </div>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setFormSuccess(null)}
                    className="text-emerald-700 underline text-[10px] font-bold block ml-auto hover:text-emerald-900"
                  >
                    Tutup Notifikasi
                  </button>
                </motion.div>
              )}

              {/* Search Siswa (Searchable input suggestions) */}
              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-slate-600">Pilih Siswa *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ketik Nama Siswa atau NIS..."
                    value={studentSearchInput}
                    onChange={(e) => handleStudentSearchChange(e.target.value)}
                    className="w-full text-xs pl-8 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                  {selectedStudentNis && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentNis("");
                        setStudentSearchInput("");
                        setStudentSuggestions([]);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown suggestions list */}
                {showStudentDropdown && studentSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-lg divide-y divide-slate-100 overflow-hidden">
                    {studentSuggestions.map(student => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => selectStudent(student)}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{student.nama}</div>
                          <div className="text-slate-400 font-mono">NIS: {student.nis}</div>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          {student.kelas}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pilih Pelanggaran */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Jenis Pelanggaran *</label>
                <select
                  required
                  value={selectedViolationId}
                  onChange={(e) => setSelectedViolationId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {violations.map((v) => {
                    const optionVal = v.id || v.kode;
                    return (
                      <option key={optionVal} value={optionVal}>
                        [{v.kode}] {v.namaPelanggaran} ({v.poin} Poin)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tanggal & Petugas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Tanggal Kejadian</label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Koordinator BK / Petugas</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Petugas"
                    value={petugas}
                    onChange={(e) => setPetugas(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Keterangan Tambahan / Kronologi</label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan detail kronologi pelanggaran..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={formSaving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {formSaving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    Menyimpan Catatan...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Catatkan Pelanggaran
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Panel: Riwayat Table */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-3">
            <div>
              <h2 className="font-extrabold text-slate-800 text-base">Riwayat Pencatatan Pelanggaran</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daftar kasus pelanggaran yang tercatat di sekolah.</p>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Cari nama, nis, pelanggaran, petugas..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            
            {/* Class filter input */}
            {!isWali && (
              <input
                type="text"
                placeholder="Cari kelas (contoh: XI-IPA-1)"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full md:w-44"
              />
            )}
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              Belum ada data kasus pelanggaran tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-20">Tanggal</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siswa</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pelanggaran</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-12">Poin</th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Keterangan / Petugas</th>
                    {canDelete && (
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right w-10">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-700 shrink-0 whitespace-nowrap">{formatDisplayDate(rec.tanggal)}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rec.namaSiswa}</div>
                        <div className="text-slate-400 text-[10px] font-mono">NIS: {rec.nis} | {rec.kelas}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block line-clamp-2 max-w-[180px]">{rec.pelanggaran}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-red-600">{rec.poin}</td>
                      <td className="py-3.5 px-4">
                        <p className="text-slate-500 font-medium line-clamp-1 max-w-[140px] italic">
                          "{rec.keterangan || "Tidak ada detail"}"
                        </p>
                        <span className="text-[10px] text-slate-400 block pt-0.5">Petugas: {rec.petugas}</span>
                      </td>
                      {canDelete && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRecord(rec.id, rec.namaSiswa, rec.pelanggaran)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                            title="Hapus pencatatan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
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
                  <h3 className="font-extrabold text-slate-800 text-lg">Konfirmasi Hapus</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus catatan pelanggaran <span className="font-bold text-slate-700">"{deleteConfirm.violationName}"</span> untuk siswa <span className="font-bold text-slate-700">{deleteConfirm.studentName}</span>? 
                  Akumulasi poin & status tindakan pembinaan siswa akan dikalkulasikan ulang otomatis.
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
                    onClick={executeDeleteRecord}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Ya, Hapus Catatan
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
