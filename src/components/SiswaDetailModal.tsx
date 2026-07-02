import React, { useState, useEffect } from "react";
import { googleSheetApi, formatDisplayDate } from "../services/googleSheetApi";
import { Siswa, Pencatatan, Pembinaan } from "../types";
import { X, User, Award, ShieldAlert, History, MessageSquare, Phone, MapPin, Calendar, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface SiswaDetailModalProps {
  studentNis: string;
  onClose: () => void;
}

export default function SiswaDetailModal({ studentNis, onClose }: SiswaDetailModalProps) {
  const [student, setStudent] = useState<Siswa | null>(null);
  const [records, setRecords] = useState<Pencatatan[]>([]);
  const [guidance, setGuidance] = useState<Pembinaan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentDetail();
  }, [studentNis]);

  const fetchStudentDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsData, recordsData, guidanceData] = await Promise.all([
        googleSheetApi.getStudents(),
        googleSheetApi.getRecords(),
        googleSheetApi.getGuidance()
      ]);

      const foundStudent = studentsData.find(s => s.nis === studentNis);
      if (!foundStudent) {
        throw new Error(`Siswa dengan NIS ${studentNis} tidak ditemukan.`);
      }

      const studentRecords = recordsData.filter(r => r.nis === studentNis);
      const studentGuidance = guidanceData.find(g => g.nis === studentNis);

      setStudent(foundStudent);
      setRecords(studentRecords);
      setGuidance(studentGuidance || null);
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail data siswa.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Memuat berkas pelanggaran siswa...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-red-100 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle className="h-5 w-5" />
            <h3>Kesalahan</h3>
          </div>
          <p className="text-xs text-slate-600 font-medium">{error || "Siswa tidak dapat dimuat."}</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    );
  }

  // Menjumlahkan total poin
  const totalPoin = records.reduce((acc, r) => acc + Number(r.poin || 0), 0);

  // Tentukan tindakan pembinaan berdasarkan poin
  let currentTindakan = "Teguran Lisan";
  let activeThresholdIndex = 0;
  if (totalPoin > 100) {
    currentTindakan = "Sidang Disiplin";
    activeThresholdIndex = 4;
  } else if (totalPoin >= 76) {
    currentTindakan = "Surat Peringatan";
    activeThresholdIndex = 3;
  } else if (totalPoin >= 51) {
    currentTindakan = "Pemanggilan Orang Tua";
    activeThresholdIndex = 2;
  } else if (totalPoin >= 26) {
    currentTindakan = "Teguran Tertulis";
    activeThresholdIndex = 1;
  } else if (totalPoin > 0) {
    currentTindakan = "Teguran Lisan";
    activeThresholdIndex = 0;
  } else {
    currentTindakan = "Tidak Ada Tindakan";
    activeThresholdIndex = -1;
  }

  const thresholds = [
    { label: "Teguran Lisan", range: "1 - 25 Poin" },
    { label: "Teguran Tertulis", range: "26 - 50 Poin" },
    { label: "Pemanggilan Ortu", range: "51 - 75 Poin" },
    { label: "Surat Peringatan", range: "76 - 100 Poin" },
    { label: "Sidang Disiplin", range: "> 100 Poin" }
  ];

  return (
    <div id="siswa-detail-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="font-extrabold text-slate-800 text-base">Berkas Kasus & Riwayat Siswa</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Profil Siswa & Poin Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Profil Meta */}
            <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 border border-blue-200 shadow-sm">
                  {student.nama.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">{student.nama}</h3>
                  <p className="text-xs text-slate-500 font-bold font-mono mt-0.5">NIS: {student.nis}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 mt-1.5 uppercase tracking-wide border border-blue-200/50">
                    Kelas {student.kelas}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase block text-[9px]">Jenis Kelamin</span>
                  <span className="font-semibold text-slate-800">{student.jk === "L" ? "Laki-laki (L)" : "Perempuan (P)"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase block text-[9px]">Orang Tua / Wali</span>
                  <span className="font-semibold text-slate-800">{student.namaOrangTua || "-"}</span>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-slate-400 font-bold uppercase block text-[9px] flex items-center gap-1">
                    <Phone className="h-3 w-3" /> No Handphone Orang Tua
                  </span>
                  <span className="font-mono font-bold text-slate-800">{student.noHp || "Tidak tersedia"}</span>
                </div>
              </div>
            </div>

            {/* Poin Gauge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Akumulasi Poin BK</span>
              <div className="relative h-24 w-24 flex items-center justify-center">
                {/* SVG circular track */}
                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    stroke={totalPoin > 50 ? "#ef4444" : totalPoin > 25 ? "#eab308" : "#2563eb"} 
                    strokeWidth="3.2" 
                    strokeDasharray="100"
                    strokeDashoffset={100 - Math.min(100, totalPoin)}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-800">{totalPoin}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Poin</span>
                </div>
              </div>

              {/* Status Action Label */}
              <div className="pt-1.5">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  totalPoin > 50 
                    ? "bg-red-50 text-red-700 border-red-200" 
                    : totalPoin > 0 
                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                      : "bg-slate-50 text-slate-500 border-slate-200"
                }`}>
                  {currentTindakan}
                </span>
              </div>
            </div>

          </div>

          {/* Section 2: Visual Thresholds Milestones (Milestone Disiplin) */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Tangga Ambang Batas Disiplin & Konsekuensi
            </h4>
            
            <div className="grid grid-cols-5 gap-2 pt-2">
              {thresholds.map((t, idx) => {
                const isPassed = activeThresholdIndex >= idx;
                const isActive = activeThresholdIndex === idx;
                
                let boxBg = "bg-white border-slate-100 text-slate-400";
                if (isActive) {
                  boxBg = "bg-red-600 border-red-600 text-white font-extrabold ring-4 ring-red-100 shadow-md";
                } else if (isPassed) {
                  boxBg = "bg-slate-200 border-slate-300 text-slate-600";
                }

                return (
                  <div 
                    key={idx} 
                    className={`p-2.5 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${boxBg}`}
                  >
                    <span className="text-[10px] font-black tracking-tight leading-tight block">{t.label}</span>
                    <span className={`text-[8px] font-bold block mt-1 uppercase ${
                      isActive ? "text-red-100" : isPassed ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {t.range}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Riwayat Kasus Pelanggaran */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-4 w-4 text-blue-500" />
              Riwayat Kasus Pelanggaran Tercatat ({records.length})
            </h4>

            {records.length === 0 ? (
              <div className="py-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200">
                Siswa tidak memiliki catatan pelanggaran. Bersih!
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-2 px-4 font-bold text-slate-400 uppercase tracking-wider w-20">Tanggal</th>
                      <th className="py-2 px-4 font-bold text-slate-400 uppercase tracking-wider">Uraian Kasus</th>
                      <th className="py-2 px-4 font-bold text-slate-400 uppercase tracking-wider text-center w-12">Poin</th>
                      <th className="py-2 px-4 font-bold text-slate-400 uppercase tracking-wider">Petugas / Piket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/20">
                        <td className="py-2.5 px-4 font-semibold text-slate-600">{formatDisplayDate(r.tanggal)}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-800">{r.pelanggaran}</div>
                          {r.keterangan && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">"{r.keterangan}"</p>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-black text-red-600">{r.poin}</td>
                        <td className="py-2.5 px-4 text-slate-500">{r.petugas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Riwayat Pembinaan yang Diambil */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Sesi Pembinaan BK Aktif
            </h4>

            {!guidance ? (
              <div className="py-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200">
                Siswa belum memerlukan pemantauan konseling khusus (Poin 0).
              </div>
            ) : (
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-purple-900 uppercase tracking-wide">
                    {guidance.tindakan}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Diputuskan tanggal {formatDisplayDate(guidance.tanggal)} setelah melewati ambang batas akumulasi poin.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-3 py-1 bg-purple-100 text-purple-800 rounded-full shrink-0 border border-purple-200">
                  Pembinaan Aktif
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
          >
            Tutup Berkas
          </button>
        </div>
      </motion.div>
    </div>
  );
}
