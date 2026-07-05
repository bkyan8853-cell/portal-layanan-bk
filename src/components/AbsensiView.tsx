import React, { useState, useEffect } from "react";
import { googleSheetApi, getCurrentUser } from "../services/googleSheetApi";
import { Siswa, Absensi, User } from "../types";
import { 
  Check, Calendar, Search, Plus, UserCheck, UserX, UserMinus, 
  Sparkles, ClipboardList, BarChart3, AlertCircle, Loader2, 
  HelpCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Download, Info, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AbsensiViewProps {
  isActive?: boolean;
}

export default function AbsensiView({ isActive }: AbsensiViewProps) {
  // Core lists
  const [students, setStudents] = useState<Siswa[]>([]);
  const [attendance, setAttendance] = useState<Absensi[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Tab states: 'checklist' or 'rekap' or 'grafik'
  const [activeSubTab, setActiveSubTab] = useState<"checklist" | "rekap" | "grafik">("checklist");
  
  // Checklist filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // Checklist editing states
  const [checklistState, setChecklistState] = useState<{
    [nis: string]: { status: "Hadir" | "Sakit" | "Izin" | "Alfa"; keterangan: string };
  }>({});
  
  // Search query for filters
  const [searchQuery, setSearchQuery] = useState("");
  
  // Monthly recap parameters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [rekapMonth, setRekapMonth] = useState<number>(currentMonth);
  const [rekapYear, setRekapYear] = useState<number>(currentYear);
  const [rekapClass, setRekapClass] = useState<string>("");

  // Add student modal states
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Siswa>>({
    nis: "",
    nama: "",
    kelas: "",
    jk: "L",
    namaOrangTua: "",
    noHp: ""
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  // Authenticated user
  const currentUser: User | null = getCurrentUser();
  const isWali = currentUser?.role === "Wali Kelas";
  const userClass = currentUser?.kelas || "";

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allStudents, allAttendance] = await Promise.all([
        googleSheetApi.getStudents(),
        googleSheetApi.getAttendance()
      ]);
      setStudents(allStudents);
      setAttendance(allAttendance);
      
      // Determine default class selection
      const classes = Array.from(new Set(allStudents.map(s => s.kelas))).sort();
      if (isWali && userClass) {
        setSelectedClass(userClass);
        setRekapClass(userClass);
      } else if (classes.length > 0) {
        setSelectedClass(classes[0]);
        setRekapClass(classes[0]);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data absensi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchData();
    }
  }, [isActive]);

  // Handle building checklist editing state when date or class changes
  useEffect(() => {
    if (students.length === 0) return;
    
    // Filter attendance records of selected date
    const dateAttendance = attendance.filter(a => a.tanggal === selectedDate);
    
    const newState: typeof checklistState = {};
    
    students.forEach(student => {
      const existing = dateAttendance.find(a => a.nis === student.nis);
      if (existing) {
        newState[student.nis] = {
          status: existing.status,
          keterangan: existing.keterangan || ""
        };
      } else {
        // Default to Hadir if not marked yet
        newState[student.nis] = {
          status: "Hadir",
          keterangan: ""
        };
      }
    });
    
    setChecklistState(newState);
  }, [selectedDate, students, attendance]);

  // Distinct classes list
  const classesList: string[] = Array.from(new Set<string>(students.map(s => String(s.kelas || "")))).sort();

  // Distinct months in Indonesian
  const indonesianMonths = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Modify individual status in checklist
  const handleStatusChange = (nis: string, status: "Hadir" | "Sakit" | "Izin" | "Alfa") => {
    setChecklistState(prev => ({
      ...prev,
      [nis]: {
        ...prev[nis],
        status
      }
    }));
  };

  // Modify individual note in checklist
  const handleKeteranganChange = (nis: string, keterangan: string) => {
    setChecklistState(prev => ({
      ...prev,
      [nis]: {
        ...prev[nis],
        keterangan
      }
    }));
  };

  // Bulk mark class status
  const handleBulkMark = (status: "Hadir" | "Sakit" | "Izin" | "Alfa") => {
    setChecklistState(prev => {
      const next = { ...prev };
      filteredChecklistStudents.forEach(student => {
        next[student.nis] = {
          ...(next[student.nis] || { keterangan: "" }),
          status
        };
      });
      return next;
    });
  };

  // Save checklist
  const handleSaveChecklist = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const recordsToSave = filteredChecklistStudents.map(student => {
        const currentMark = checklistState[student.nis] || { status: "Hadir", keterangan: "" };
        return {
          tanggal: selectedDate,
          nis: student.nis,
          namaSiswa: student.nama,
          kelas: student.kelas,
          status: currentMark.status,
          keterangan: currentMark.keterangan
        };
      });

      await googleSheetApi.saveAttendance(recordsToSave);
      
      // Reload attendance lists
      const updatedAttendance = await googleSheetApi.getAttendance();
      setAttendance(updatedAttendance);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan absensi: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Save new student from attendance view
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.nis || !newStudent.nama || !newStudent.kelas) {
      setModalError("NIS, Nama, dan Kelas wajib diisi.");
      return;
    }

    setModalSaving(true);
    setModalError(null);
    try {
      const added = await googleSheetApi.addStudent(newStudent);
      
      // Update local students list
      const updatedStudents = [...students, added];
      setStudents(updatedStudents);
      
      // Automatically focus on the new student's class
      setSelectedClass(added.kelas);
      if (rekapClass === "") {
        setRekapClass(added.kelas);
      }
      
      // Clean modal state
      setNewStudent({
        nis: "",
        nama: "",
        kelas: isWali && userClass ? userClass : added.kelas,
        jk: "L",
        namaOrangTua: "",
        noHp: ""
      });
      setIsAddStudentOpen(false);
    } catch (err: any) {
      setModalError(err.message || "Gagal mendaftarkan siswa baru.");
    } finally {
      setModalSaving(false);
    }
  };

  // Calculations for Monthly Recap
  const getMonthlyRecapData = () => {
    // Filter attendance by selected month and year
    const monthlyRecords = attendance.filter(a => {
      const recordDate = new Date(a.tanggal);
      const recordMonth = recordDate.getMonth() + 1;
      const recordYear = recordDate.getFullYear();
      return recordMonth === rekapMonth && recordYear === rekapYear;
    });

    // Filter students by selected class (if not "Semua Kelas" or empty, and no active search query)
    const filteredStudents = (rekapClass.trim() && !searchQuery.trim())
      ? students.filter(s => s.kelas.toLowerCase().includes(rekapClass.toLowerCase().trim()))
      : students;

    // Aggregate counts
    const recap = filteredStudents.map(student => {
      const studentRecords = monthlyRecords.filter(r => r.nis === student.nis);
      
      const hadir = studentRecords.filter(r => r.status === "Hadir").length;
      const sakit = studentRecords.filter(r => r.status === "Sakit").length;
      const izin = studentRecords.filter(r => r.status === "Izin").length;
      const alfa = studentRecords.filter(r => r.status === "Alfa").length;
      const totalDays = hadir + sakit + izin + alfa;
      
      // Attendance percentage: Present days / Total marked days
      const percentage = totalDays > 0 
        ? Math.round((hadir / totalDays) * 100) 
        : 100;

      return {
        ...student,
        hadir,
        sakit,
        izin,
        alfa,
        totalDays,
        percentage
      };
    });

    // Filter by search query if any
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return recap.filter(
        r => r.nama.toLowerCase().includes(query) || r.nis.includes(query)
      );
    }

    return recap;
  };

  const recapData = getMonthlyRecapData();

  // Export Monthly Recap to Excel
  const handleExportRecapExcel = () => {
    try {
      const exportData = recapData.map((r, idx) => ({
        "No": idx + 1,
        "NIS": r.nis,
        "Nama Siswa": r.nama,
        "Kelas": r.kelas,
        "Jenis Kelamin": r.jk,
        "Hadir (H)": r.hadir,
        "Sakit (S)": r.sakit,
        "Izin (I)": r.izin,
        "Alfa (A)": r.alfa,
        "Total Hari": r.totalDays,
        "Persentase (%)": `${r.percentage}%`
      }));

      const classNameText = rekapClass || "Semua Kelas";
      const monthText = indonesianMonths[rekapMonth - 1];
      const sheetName = `REKAP_${classNameText.substring(0, 10)}`;
      const fileName = `Rekap_Absensi_${classNameText}_${monthText}_${rekapYear}.xlsx`;

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Gagal ekspor excel:", err);
      alert("Gagal melakukan ekspor data rekap ke Excel.");
    }
  };

  // Export Monthly Recap to PDF
  const handleExportRecapPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const classNameText = rekapClass.trim() || "Semua Kelas";
      const monthText = indonesianMonths[rekapMonth - 1];

      // Primary color palette
      const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800 (#1e293b)

      // 1. Header Title Block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("REKAPITULASI ABSENSI SISWA", 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Periode: ${monthText} ${rekapYear} | Kelas: ${classNameText}`, 14, 26);
      
      // Horizontal separator line
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.5);
      doc.line(14, 30, 196, 30);

      // 2. Metadata / Summary Information Card
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text("RINGKASAN KEHADIRAN BULANAN", 14, 37);

      const totalStudents = recapData.length;
      const totalHadir = recapData.reduce((acc, r) => acc + r.hadir, 0);
      const totalSakit = recapData.reduce((acc, r) => acc + r.sakit, 0);
      const totalIzin = recapData.reduce((acc, r) => acc + r.izin, 0);
      const totalAlfa = recapData.reduce((acc, r) => acc + r.alfa, 0);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Siswa Terdaftar : ${totalStudents}`, 14, 43);
      doc.text(`Akumulasi Hadir (H)   : ${totalHadir} hari`, 14, 48);
      doc.text(`Akumulasi Sakit (S)   : ${totalSakit} hari`, 14, 53);
      doc.text(`Akumulasi Izin (I)     : ${totalIzin} hari`, 110, 43);
      doc.text(`Akumulasi Alfa (A)    : ${totalAlfa} hari`, 110, 48);
      doc.text(`Tanggal Cetak         : ${new Date().toLocaleDateString("id-ID")}`, 110, 53);

      doc.line(14, 58, 196, 58);

      // 3. Main Data Table using jspdf-autotable
      const tableColumn = ["No", "NIS", "Nama Siswa", "Kelas", "H", "S", "I", "A", "% Kehadiran"];
      const tableRows = recapData.map((row, index) => [
        index + 1,
        row.nis,
        row.nama,
        row.kelas,
        row.hadir,
        row.sakit,
        row.izin,
        row.alfa,
        `${row.percentage}%`
      ]);

      autoTable(doc, {
        startY: 64,
        head: [tableColumn],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
          valign: "middle"
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 20 },
          2: { fontStyle: "bold", cellWidth: 55 },
          3: { halign: "center", cellWidth: 22 },
          4: { halign: "center", cellWidth: 12 },
          5: { halign: "center", cellWidth: 12 },
          6: { halign: "center", cellWidth: 12 },
          7: { halign: "center", cellWidth: 12 },
          8: { halign: "center", fontStyle: "bold", cellWidth: 25 }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          valign: "middle"
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        }
      });

      // 4. Signatures / Mengetahui Section
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      const pageHeight = doc.internal.pageSize.height;
      
      let sigY = finalY + 15;
      if (sigY + 35 > pageHeight) {
        doc.addPage();
        sigY = 25;
      }

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      
      doc.text("Mengetahui,", 20, sigY);
      doc.text("Koordinator BK,", 20, sigY + 5);
      doc.text("_________________________", 20, sigY + 25);
      
      doc.text("Kota Palembang, " + new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }), 125, sigY);
      doc.text(isWali ? "Wali Kelas," : "Petugas Absensi,", 125, sigY + 5);
      doc.text("_________________________", 125, sigY + 25);

      const fileName = `Rekap_Absensi_${classNameText.replace(/\s+/g, "_")}_${monthText}_${rekapYear}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Gagal cetak PDF:", err);
      alert("Terjadi kesalahan saat mengunduh berkas PDF.");
    }
  };

  // Calculations for Monthly Graphics
  const getMonthlyGraphicsData = () => {
    // Filter attendance by selected month and year
    const monthlyRecords = rekapClass.trim()
      ? attendance.filter(a => {
          const recordDate = new Date(a.tanggal);
          const recordMonth = recordDate.getMonth() + 1;
          const recordYear = recordDate.getFullYear();
          return recordMonth === rekapMonth && 
                 recordYear === rekapYear && 
                 a.kelas.toLowerCase().includes(rekapClass.toLowerCase().trim());
        })
      : attendance.filter(a => {
          const recordDate = new Date(a.tanggal);
          const recordMonth = recordDate.getMonth() + 1;
          const recordYear = recordDate.getFullYear();
          return recordMonth === rekapMonth && recordYear === rekapYear;
        });

    const total = monthlyRecords.length;
    const hadir = monthlyRecords.filter(r => r.status === "Hadir").length;
    const sakit = monthlyRecords.filter(r => r.status === "Sakit").length;
    const izin = monthlyRecords.filter(r => r.status === "Izin").length;
    const alfa = monthlyRecords.filter(r => r.status === "Alfa").length;

    const rate = total > 0 ? Math.round((hadir / total) * 100) : 100;

    // Daily distribution in this month
    const dailyMap = new Map<string, { tanggal: string; hadir: number; sakit: number; izin: number; alfa: number }>();
    
    monthlyRecords.forEach(rec => {
      const day = rec.tanggal.split("-")[2] || rec.tanggal;
      const existing = dailyMap.get(rec.tanggal) || {
        tanggal: day,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alfa: 0
      };
      
      if (rec.status === "Hadir") existing.hadir++;
      else if (rec.status === "Sakit") existing.sakit++;
      else if (rec.status === "Izin") existing.izin++;
      else if (rec.status === "Alfa") existing.alfa++;

      dailyMap.set(rec.tanggal, existing);
    });

    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    return {
      total,
      hadir,
      sakit,
      izin,
      alfa,
      rate,
      dailyTrend
    };
  };

  const graphData = getMonthlyGraphicsData();

  // Find students in current class checklist filter
  const checklistStudents = students.filter(s => s.kelas.toLowerCase().includes(selectedClass.toLowerCase().trim()));

  // Always show all students of the selected class to keep the layout of "buku absensi" intact
  const filteredChecklistStudents = checklistStudents;

  // Find global match if searched student is in a different class
  const globalMatch = searchQuery.trim()
    ? students.find(
        s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery)
      )
    : null;

  return (
    <div id="absensi-view-root" className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-blue-600" />
            Menu Absensi Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola daftar hadir siswa harian, rekapitulasi kehadiran bulanan, dan visualisasi statistik.
          </p>
        </div>

        {/* Action Button: Add Student */}
        <button
          onClick={() => {
            setNewStudent({
              nis: "",
              nama: "",
              kelas: isWali && userClass ? userClass : (classesList[0] || ""),
              jk: "L",
              namaOrangTua: "",
              noHp: ""
            });
            setModalError(null);
            setIsAddStudentOpen(true);
          }}
          className="self-start md:self-center inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md hover:shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Tambah Siswa Baru
        </button>
      </div>

      {/* Sub-Navigation Selector (Bento Style Tabs) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex max-w-md border border-slate-200/50">
        <button
          onClick={() => {
            setActiveSubTab("checklist");
            setSearchQuery("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "checklist"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="h-4 w-4 text-blue-600" />
          Absensi Harian
        </button>
        <button
          onClick={() => {
            setActiveSubTab("rekap");
            setSearchQuery("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "rekap"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Rekap Bulanan
        </button>
        <button
          onClick={() => {
            setActiveSubTab("grafik");
            setSearchQuery("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "grafik"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="h-4 w-4 text-violet-600" />
          Grafik Bulanan
        </button>
      </div>

      {/* Primary Loader / Error banner */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memuat data dari database...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition">
            Coba memuat ulang
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: ABSENSI HARIAN (CHECKLIST AREA) */}
          {activeSubTab === "checklist" && (
            <div className="space-y-6">
              {/* Checklist Settings & Filter Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Date Input */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Class Filter */}
                  <div>
                    {isWali && userClass ? (
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-700 rounded-xl">
                        Kelas: {userClass}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Ketik Kelas... (cth: XI-IPA-1)"
                          value={selectedClass}
                          onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setRekapClass(e.target.value);
                          }}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-40"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (classesList.length > 0) {
                              const match = classesList.find(c => c.toLowerCase().includes(selectedClass.toLowerCase().trim()));
                              if (match) {
                                setSelectedClass(match);
                                setRekapClass(match);
                              }
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-xs shadow-blue-500/10"
                        >
                          <Search className="h-3 w-3" />
                          <span>Cari</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Search */}
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari siswa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Bulk Actions Matrix */}
                <div className="flex items-center gap-1.5 self-start lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 w-full lg:w-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1.5">Tandai Semua:</span>
                  <button
                    onClick={() => handleBulkMark("Hadir")}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                  >
                    Hadir
                  </button>
                  <button
                    onClick={() => handleBulkMark("Sakit")}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                  >
                    Sakit
                  </button>
                  <button
                    onClick={() => handleBulkMark("Izin")}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                  >
                    Izin
                  </button>
                  <button
                    onClick={() => handleBulkMark("Alfa")}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                  >
                    Alfa
                  </button>
                </div>
              </div>



              {/* Suggestion to switch class if student is found in another class */}
              {globalMatch && globalMatch.kelas.toLowerCase() !== selectedClass.toLowerCase() && (
                <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-800 shadow-xs animate-pulse">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>
                      Siswa <span className="font-extrabold text-amber-950">"{globalMatch.nama}"</span> ditemukan di kelas <span className="font-extrabold text-amber-950">"{globalMatch.kelas}"</span>. Apakah Anda ingin berpindah kelas?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClass(globalMatch.kelas);
                      setRekapClass(globalMatch.kelas);
                    }}
                    className="self-start sm:self-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                  >
                    Buka Kelas {globalMatch.kelas}
                  </button>
                </div>
              )}

              {/* Alert if no matches anywhere */}
              {searchQuery.trim() && !filteredChecklistStudents.some(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery)) && !globalMatch && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800 shadow-xs">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>
                    Siswa dengan kata kunci <span className="font-extrabold text-red-950">"{searchQuery}"</span> tidak ditemukan di kelas ini ataupun di kelas lain.
                  </span>
                </div>
              )}

              {/* Checklist Table */}
              {filteredChecklistStudents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 space-y-2">
                  <UserMinus className="h-12 w-12 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold leading-normal">
                    {searchQuery.trim() ? (
                      <>Tidak ada siswa ditemukan dengan kata kunci <span className="font-extrabold text-slate-700">"{searchQuery}"</span>.</>
                    ) : (
                      <>Tidak ada siswa ditemukan di kelas <span className="font-extrabold text-slate-700">"{selectedClass}"</span>.</>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">Silakan tambahkan siswa atau sesuaikan pencarian Anda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">NIS</th>
                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Siswa</th>
                            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-72">Status Kehadiran</th>
                            <th className="py-4.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-64">Keterangan Catatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                          {filteredChecklistStudents.map((student) => {
                            const currentMark = checklistState[student.nis] || { status: "Hadir", keterangan: "" };
                            const isSearchActive = searchQuery.trim().length > 0;
                            const isMatched = isSearchActive && (
                              student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              student.nis.includes(searchQuery)
                            );

                            return (
                              <tr 
                                key={student.id} 
                                className={`transition-all duration-300 ${
                                  isSearchActive
                                    ? isMatched
                                      ? "bg-blue-50/90 hover:bg-blue-100/70 border-l-4 border-l-blue-600 shadow-xs"
                                      : "opacity-30 hover:opacity-75 scale-[0.99] grayscale-[10%]"
                                    : "hover:bg-slate-50/40 transition-colors"
                                }`}
                              >
                                <td className={`py-4 px-6 font-mono font-bold transition-colors ${isMatched ? "text-blue-700" : "text-slate-700"}`}>
                                  {student.nis}
                                </td>
                                <td className="py-4 px-6 font-bold">
                                  <div className="flex items-center">
                                    <span className={isMatched ? "text-blue-900 font-extrabold" : "text-slate-900"}>
                                      {student.nama}
                                    </span>
                                    {isMatched && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 ml-2 bg-blue-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse shadow-xs">
                                        <Search className="h-2 w-2" /> Fokus
                                      </span>
                                    )}
                                  </div>
                                  <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                                    {student.jk === "L" ? "Laki-laki" : "Perempuan"}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  {/* Multi-Checkbox/Radio Option Row */}
                                  <div className="flex items-center justify-center gap-1.5 max-w-xs mx-auto">
                                    {/* Option HADIR */}
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.nis, "Hadir")}
                                      className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold border transition-all text-center cursor-pointer ${
                                        currentMark.status === "Hadir"
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs shadow-emerald-500/20"
                                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                      }`}
                                    >
                                      Hadir
                                    </button>

                                    {/* Option SAKIT */}
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.nis, "Sakit")}
                                      className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold border transition-all text-center cursor-pointer ${
                                        currentMark.status === "Sakit"
                                          ? "bg-amber-500 border-amber-500 text-white shadow-xs shadow-amber-500/20"
                                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                      }`}
                                    >
                                      Sakit
                                    </button>

                                    {/* Option IZIN */}
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.nis, "Izin")}
                                      className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold border transition-all text-center cursor-pointer ${
                                        currentMark.status === "Izin"
                                          ? "bg-blue-500 border-blue-500 text-white shadow-xs shadow-blue-500/20"
                                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                      }`}
                                    >
                                      Izin
                                    </button>

                                    {/* Option ALFA */}
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.nis, "Alfa")}
                                      className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-extrabold border transition-all text-center cursor-pointer ${
                                        currentMark.status === "Alfa"
                                          ? "bg-red-500 border-red-500 text-white shadow-xs shadow-red-500/20"
                                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                      }`}
                                    >
                                      Alfa
                                    </button>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <input
                                    type="text"
                                    placeholder="Alasan / catatan..."
                                    value={currentMark.keterangan}
                                    onChange={(e) => handleKeteranganChange(student.nis, e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Checklist Save Action Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Info className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>
                        Menyimpan absensi untuk <span className="font-extrabold text-slate-700">{filteredChecklistStudents.length}</span> siswa kelas <span className="font-extrabold text-slate-700">{selectedClass}</span>.
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {saveSuccess && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                          ✓ Absensi berhasil disimpan!
                        </span>
                      )}
                      
                      <button
                        onClick={handleSaveChecklist}
                        disabled={saveLoading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-500/10"
                      >
                        {saveLoading ? (
                          <>
                            <Loader2 className="animate-spin h-3.5 w-3.5" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Simpan Absensi Harian
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REKAP BULANAN */}
          {activeSubTab === "rekap" && (
            <div className="space-y-6">
              {/* Filter Settings for Recap */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full md:max-w-4xl">
                  {/* Select Month */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Pilih Bulan</label>
                    <select
                      value={rekapMonth}
                      onChange={(e) => setRekapMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                    >
                      {indonesianMonths.map((name, idx) => (
                        <option key={idx} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Year */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Pilih Tahun</label>
                    <select
                      value={rekapYear}
                      onChange={(e) => setRekapYear(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Class */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Ketik Kelas</label>
                    {isWali && userClass ? (
                      <div className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50">
                        {userClass}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Semua Kelas (atau ketik...)"
                        value={rekapClass}
                        onChange={(e) => setRekapClass(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Quick Search */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cari Siswa</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Nama / NIS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.8 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap gap-2.5 self-start md:self-end">
                  <button
                    onClick={handleExportRecapExcel}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 h-10 shadow-xs"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Ekspor Excel
                  </button>
                  <button
                    onClick={handleExportRecapPdf}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 h-10 shadow-xs"
                  >
                    <Download className="h-4 w-4 text-red-600" />
                    Unduh PDF
                  </button>
                </div>
              </div>

              {/* Recap Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">H</div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Kehadiran</span>
                    <span className="text-xl font-black text-slate-800">{recapData.reduce((acc, r) => acc + r.hadir, 0)} hari</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">S</div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Sakit</span>
                    <span className="text-xl font-black text-slate-800">{recapData.reduce((acc, r) => acc + r.sakit, 0)} hari</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">I</div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Izin</span>
                    <span className="text-xl font-black text-slate-800">{recapData.reduce((acc, r) => acc + r.izin, 0)} hari</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold">A</div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Mangkir (Alfa)</span>
                    <span className="text-xl font-black text-slate-800">{recapData.reduce((acc, r) => acc + r.alfa, 0)} hari</span>
                  </div>
                </div>
              </div>

              {/* Recap Table */}
              {recapData.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
                  <UserX className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Tidak ada data rekap untuk pencarian atau bulan terpilih.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">NIS</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Siswa</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Kelas</th>
                          <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Hadir (H)</th>
                          <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Sakit (S)</th>
                          <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Izin (I)</th>
                          <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Alfa (A)</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-36">Rasio Kehadiran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                        {recapData.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-slate-700">{row.nis}</td>
                            <td className="py-4 px-6 font-bold text-slate-900">{row.nama}</td>
                            <td className="py-4 px-6 font-semibold text-slate-500">{row.kelas}</td>
                            <td className="py-4 px-4 text-center font-bold text-emerald-600 bg-emerald-50/10">{row.hadir}</td>
                            <td className="py-4 px-4 text-center font-bold text-amber-500 bg-amber-50/10">{row.sakit}</td>
                            <td className="py-4 px-4 text-center font-bold text-blue-500 bg-blue-50/10">{row.izin}</td>
                            <td className="py-4 px-4 text-center font-bold text-red-500 bg-red-50/10">{row.alfa}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-extrabold text-slate-800">{row.percentage}%</span>
                                <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      row.percentage >= 90 
                                        ? "bg-emerald-500" 
                                        : row.percentage >= 75 
                                        ? "bg-amber-500" 
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${row.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GRAFIK BULANAN */}
          {activeSubTab === "grafik" && (
            <div className="space-y-6">
              {/* Graphic Controls */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Bulan</label>
                    <select
                      value={rekapMonth}
                      onChange={(e) => setRekapMonth(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                    >
                      {indonesianMonths.map((name, idx) => (
                        <option key={idx} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tahun</label>
                    <select
                      value={rekapYear}
                      onChange={(e) => setRekapYear(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Kelas</label>
                    {isWali && userClass ? (
                      <div className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50">
                        {userClass}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Semua Kelas (atau ketik...)"
                        value={rekapClass}
                        onChange={(e) => setRekapClass(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 font-semibold uppercase">
                  Periode: {indonesianMonths[rekapMonth - 1]} {rekapYear}
                </div>
              </div>

              {/* Graphic Panel Content */}
              {graphData.total === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 space-y-2">
                  <BarChart3 className="h-12 w-12 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada rekaman absensi yang dicatatkan di periode terpilih.</p>
                  <p className="text-[10px] text-slate-400">Tandai absensi harian terlebih dahulu pada menu "Absensi Harian".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Donut Attendance % Overview */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center space-y-6">
                    <div className="self-start text-left">
                      <h3 className="font-bold text-slate-800 text-sm">Persentase Kehadiran</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Persentase kehadiran bersih (Hadir/Total hari).</p>
                    </div>

                    {/* Circular Progress Ring */}
                    <div className="relative h-40 w-40 flex items-center justify-center">
                      <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Circle Background */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#f1f5f9"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        {/* Progress Circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#10b981"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - graphData.rate / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      {/* Central Percentage */}
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-slate-800 tracking-tight">{graphData.rate}%</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hadir</span>
                      </div>
                    </div>

                    <div className="w-full text-left bg-slate-50 p-3 rounded-xl border border-slate-100/50 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Statistik Volume</span>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                        Total pencatatan di bulan ini adalah <span className="font-black text-slate-900">{graphData.total}</span> data kehadiran.
                      </p>
                    </div>
                  </div>

                  {/* Middle & Right Columns: Interactive 3D Bar Chart breakdown */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Distribusi Status Kehadiran</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Perbandingan proporsi total sakit, izin, mangkir, dan hadir.</p>
                    </div>

                    {/* Styled Custom Visual Bar Graph */}
                    <div className="space-y-4">
                      {/* Hadir Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Hadir (H)
                          </span>
                          <span className="font-mono text-slate-500">
                            <span className="font-extrabold text-slate-800">{graphData.hadir}</span> hari ({Math.round(graphData.hadir / graphData.total * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-lg transition-all duration-500"
                            style={{ width: `${(graphData.hadir / graphData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Sakit Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Sakit (S)
                          </span>
                          <span className="font-mono text-slate-500">
                            <span className="font-extrabold text-slate-800">{graphData.sakit}</span> hari ({Math.round(graphData.sakit / graphData.total * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-lg transition-all duration-500"
                            style={{ width: `${(graphData.sakit / graphData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Izin Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Izin (I)
                          </span>
                          <span className="font-mono text-slate-500">
                            <span className="font-extrabold text-slate-800">{graphData.izin}</span> hari ({Math.round(graphData.izin / graphData.total * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-lg transition-all duration-500"
                            style={{ width: `${(graphData.izin / graphData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Alfa Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Alfa (A)
                          </span>
                          <span className="font-mono text-slate-500">
                            <span className="font-extrabold text-slate-800">{graphData.alfa}</span> hari ({Math.round(graphData.alfa / graphData.total * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-lg transition-all duration-500"
                            style={{ width: `${(graphData.alfa / graphData.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-3">
                      * Data teragregasi secara real-time dari database harian.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL MODULAR: TAMBAH SISWA BARU */}
      <AnimatePresence>
        {isAddStudentOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  Tambah Data Siswa Baru
                </h3>
                <button
                  onClick={() => setIsAddStudentOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* NIS */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">NIS (Nomor Induk) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 24010"
                      value={newStudent.nis || ""}
                      onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value })}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Kelas */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Kelas *</label>
                    {isWali && userClass ? (
                      <input
                        type="text"
                        disabled
                        value={userClass}
                        className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-bold"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Contoh: XI-IPA-1"
                        value={newStudent.kelas || ""}
                        onChange={(e) => setNewStudent({ ...newStudent, kelas: e.target.value })}
                        className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    placeholder="Contoh: Muhammad Farhan"
                    value={newStudent.nama || ""}
                    onChange={(e) => setNewStudent({ ...newStudent, nama: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* JK */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Jenis Kelamin</label>
                  <div className="flex gap-4 p-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="jk-modal"
                        checked={newStudent.jk === "L"}
                        onChange={() => setNewStudent({ ...newStudent, jk: "L" })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      Laki-laki (L)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="jk-modal"
                        checked={newStudent.jk === "P"}
                        onChange={() => setNewStudent({ ...newStudent, jk: "P" })}
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
                    placeholder="Contoh: Ahmad Subardjo"
                    value={newStudent.namaOrangTua || ""}
                    onChange={(e) => setNewStudent({ ...newStudent, namaOrangTua: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* No HP */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">No HP Orang Tua / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 08213456789"
                    value={newStudent.noHp || ""}
                    onChange={(e) => setNewStudent({ ...newStudent, noHp: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(false)}
                    className="py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {modalSaving ? (
                      <>
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                        Mendaftarkan...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Tambahkan Siswa
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
