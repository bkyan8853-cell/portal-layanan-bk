import React, { useState, useEffect } from "react";
import { googleSheetApi, getCurrentUser } from "../services/googleSheetApi";
import { Pelanggaran, User } from "../types";
import { Search, Plus, Edit2, Trash2, ShieldCheck, Tag, Loader2, Check, AlertCircle, AlertOctagon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PelanggaranViewProps {
  isActive?: boolean;
}

export default function PelanggaranView({ isActive }: PelanggaranViewProps) {
  const [violations, setViolations] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Semua");

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedViolation, setSelectedViolation] = useState<Partial<Pelanggaran> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Authentication access
  const currentUser: User | null = getCurrentUser();
  const isAdmin = currentUser?.role === "Admin";

  useEffect(() => {
    if (isActive) {
      const isSilent = violations.length > 0;
      fetchViolations(isSilent);
    }
  }, [isActive]);

  const fetchViolations = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await googleSheetApi.getViolations();
      setViolations(data);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "Gagal memuat daftar pelanggaran.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Filter infractions
  const filteredViolations = violations.filter(v => {
    const q = searchQuery.toLowerCase();
    const kode = String(v.kode || "").toLowerCase();
    const namaPelanggaran = String(v.namaPelanggaran || "").toLowerCase();
    const matchesSearch = kode.includes(q) || namaPelanggaran.includes(q);
    const matchesCat = categoryFilter === "Semua" || v.kategori === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Open Modal Add / Edit
  const handleOpenModal = (mode: "add" | "edit", violation?: Pelanggaran) => {
    if (!isAdmin) return;
    setFormError(null);
    setModalMode(mode);
    if (mode === "edit" && violation) {
      setSelectedViolation({ ...violation });
    } else {
      setSelectedViolation({
        kode: "",
        namaPelanggaran: "",
        kategori: "Ringan",
        poin: 5
      });
    }
    setIsModalOpen(true);
  };

  // Submit Modal
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedViolation) return;

    if (!selectedViolation.kode?.trim() || !selectedViolation.namaPelanggaran?.trim() || selectedViolation.poin === undefined) {
      setFormError("Kode, Deskripsi Pelanggaran, dan Poin harus diisi.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      await googleSheetApi.addViolation(selectedViolation);
      setIsModalOpen(false);
      fetchViolations();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan jenis pelanggaran.");
    } finally {
      setFormSaving(false);
    }
  };

  // Custom Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    code: string;
    name: string;
  } | null>(null);

  // Delete Violation
  const handleDeleteViolation = (id: string, code: string, name: string) => {
    if (!isAdmin) return;
    setDeleteConfirm({
      isOpen: true,
      id,
      code,
      name
    });
  };

  const executeDeleteViolation = async () => {
    if (!deleteConfirm) return;
    try {
      await googleSheetApi.deleteViolation(deleteConfirm.id);
      fetchViolations();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert("Gagal menghapus jenis pelanggaran: " + err.message);
    }
  };

  return (
    <div id="pelanggaran-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Katalog Master Pelanggaran</h1>
          <p className="text-slate-500 text-sm mt-1">Daftar jenis pelanggaran tata tertib sekolah, klasifikasi kategori, beserta poinnya.</p>
        </div>
        
        {/* Add Violation button (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => handleOpenModal("add")}
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" />
            Tambah Pelanggaran Baru
          </button>
        )}
      </div>

      {/* Info warning for non-Admins */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-xl flex items-center gap-2.5">
          <ShieldCheck className="h-4.5 w-4.5 text-amber-600" />
          <span>Sebagai {currentUser?.role}, Anda hanya dapat melihat katalog master pelanggaran ini. Hak akses edit/tambah dibatasi untuk Admin Utama.</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Cari berdasarkan Kode atau Nama Pelanggaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Category Filters Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          {["Semua", "Ringan", "Sedang", "Berat"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                categoryFilter === cat
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Violations List Container */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800">
          <p className="font-semibold">{error}</p>
          <button onClick={fetchViolations} className="mt-2 text-xs font-bold text-red-600 underline">
            Muat ulang
          </button>
        </div>
      ) : filteredViolations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <Tag className="h-12 w-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium">Jenis pelanggaran tidak ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredViolations.map((v) => {
            let catColor = "bg-blue-50 text-blue-700 border-blue-100";
            if (v.kategori === "Sedang") catColor = "bg-amber-50 text-amber-700 border-amber-100";
            else if (v.kategori === "Berat") catColor = "bg-red-50 text-red-700 border-red-100";

            return (
              <div 
                key={v.id} 
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100">
                      KODE: {v.kode}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${catColor}`}>
                      {v.kategori}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-sm leading-relaxed min-h-[44px] line-clamp-2">
                    {v.namaPelanggaran}
                  </h3>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-red-600">{v.poin}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Poin BK</span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal("edit", v)}
                        className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                        title="Edit Pelanggaran"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteViolation(v.id, v.kode, v.namaPelanggaran)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && selectedViolation && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base">
                  {modalMode === "add" ? "Tambah Pelanggaran Baru" : "Edit Katalog Pelanggaran"}
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
                  {/* Kode */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Kode Pelanggaran *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: A05"
                      value={selectedViolation.kode || ""}
                      onChange={(e) => setSelectedViolation({ ...selectedViolation, kode: e.target.value.toUpperCase() })}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                    />
                  </div>

                  {/* Kategori */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Kategori *</label>
                    <select
                      value={selectedViolation.kategori || "Ringan"}
                      onChange={(e) => setSelectedViolation({ ...selectedViolation, kategori: e.target.value as any })}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Ringan">Ringan</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Berat">Berat</option>
                    </select>
                  </div>
                </div>

                {/* Deskripsi Pelanggaran */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Nama / Deskripsi Pelanggaran *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tulis detail pelanggaran aturan..."
                    value={selectedViolation.namaPelanggaran || ""}
                    onChange={(e) => setSelectedViolation({ ...selectedViolation, namaPelanggaran: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-normal"
                  />
                </div>

                {/* Poin */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Poin Pelanggaran (0 - 100) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={selectedViolation.poin || ""}
                    onChange={(e) => setSelectedViolation({ ...selectedViolation, poin: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
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
                  Apakah Anda yakin ingin menghapus jenis pelanggaran <span className="font-extrabold text-slate-700">"{deleteConfirm.code} - {deleteConfirm.name}"</span> dari daftar master? Siswa yang sudah terkena pasal ini tetap memiliki poin tercatat.
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
                    onClick={executeDeleteViolation}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Ya, Hapus
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
