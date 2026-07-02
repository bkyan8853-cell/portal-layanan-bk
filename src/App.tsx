import React, { useState, useEffect } from "react";
import { getCurrentUser, googleSheetApi } from "./services/googleSheetApi";
import { User } from "./types";
import { 
  BookOpen, Users, AlertTriangle, Tag, History, FileSpreadsheet, 
  Server, LogOut, UserCheck, Menu, X, ShieldAlert, Award, 
  ShieldCheck, HelpCircle, GraduationCap, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Views Components
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import SiswaView from "./components/SiswaView";
import PelanggaranView from "./components/PelanggaranView";
import PencatatanView from "./components/PencatatanView";
import RemisiView from "./components/RemisiView";
import LaporanView from "./components/LaporanView";
import SettingsView from "./components/SettingsView";
import SiswaDetailModal from "./components/SiswaDetailModal";

type ActiveTab = "dashboard" | "siswa" | "pelanggaran" | "pencatatan" | "remisi" | "laporan" | "settings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Selected Student for Detail Modal
  const [selectedStudentNis, setSelectedStudentNis] = useState<string | null>(null);

  // Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncStatus("idle");
    try {
      const res = await googleSheetApi.triggerSync();
      if (res.success) {
        setSyncStatus("success");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setSyncStatus("error");
        alert("Gagal sinkronisasi: " + res.message);
      }
    } catch (err: any) {
      setSyncStatus("error");
      alert("Gagal sinkronisasi: " + (err.message || err));
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  useEffect(() => {
    // Muat user yang sedang login saat inisialisasi
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Daftarkan listener perubahan autentikasi
    const handleAuthChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    googleSheetApi.logout();
    setActiveTab("dashboard");
    setShowLogoutConfirm(false);
  };

  // Navigasi langsung ke tab detail siswa dari komponen lain
  const handleViewStudentDetail = (nis: string) => {
    setSelectedStudentNis(nis);
  };

  if (!user) {
    return <LoginView onLoginSuccess={() => setUser(getCurrentUser())} />;
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Award, roles: ["Admin", "Koordinator BK", "Wali Kelas"] },
    { id: "siswa", label: "Data Siswa", icon: Users, roles: ["Admin", "Koordinator BK", "Wali Kelas"] },
    { id: "pelanggaran", label: "Master Pelanggaran", icon: Tag, roles: ["Admin", "Koordinator BK", "Wali Kelas"] },
    { id: "pencatatan", label: "Input Pelanggaran", icon: AlertTriangle, roles: ["Admin", "Koordinator BK"] },
    { id: "remisi", label: "Remisi Poin", icon: ShieldCheck, roles: ["Admin", "Koordinator BK"] },
    { id: "laporan", label: "Rekap & Laporan", icon: FileSpreadsheet, roles: ["Admin", "Koordinator BK", "Wali Kelas"] },
    { id: "settings", label: "Integrasi Sheets", icon: Server, roles: ["Admin"] }
  ];

  const allowedNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* 1. SIDEBAR NAVIGATION PANEL (Hides on standard system print) */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shrink-0 print:hidden">
        
        <div className="flex flex-col">
          {/* Brand/School Logo */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-black text-white text-sm tracking-widest leading-none">SIPPS</h1>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">YAN EDUCATIONAL INSTITUTION</span>
              </div>
            </div>
            
            {/* Mobile Menu Trigger Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="p-1 md:hidden hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* User Logged Info */}
          <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800/50 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-slate-700 text-xs">
              {user.nama.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-extrabold text-white truncate">{user.nama}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  user.role === "Admin" ? "bg-red-500" : user.role === "Koordinator BK" ? "bg-emerald-500" : "bg-amber-500"
                }`} />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{user.role}</span>
              </div>
            </div>
          </div>

          {/* Sidebar Menu Items (Desktop view) */}
          <nav className="p-4 space-y-1.5 hidden md:block">
            {allowedNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/10" 
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Sync Button */}
          <div className="px-4 pb-4 hidden md:block">
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer ${
                syncLoading
                  ? "bg-slate-800 text-slate-500 border-slate-800"
                  : syncStatus === "success"
                  ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/30"
                  : syncStatus === "error"
                  ? "bg-red-950/20 text-red-400 border-red-800/30"
                  : "bg-slate-850 hover:bg-slate-800/85 text-blue-400 border-slate-800/50 hover:border-slate-700"
              }`}
            >
              <RefreshCw className={`h-4.5 w-4.5 shrink-0 ${syncLoading ? "animate-spin text-blue-400" : syncStatus === "success" ? "text-emerald-400" : "text-blue-400"}`} />
              <span>
                {syncLoading 
                  ? "Sinkronisasi..." 
                  : syncStatus === "success" 
                  ? "Berhasil!" 
                  : "Sinkronkan Sheets"}
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer Logout Button */}
        <div className="p-4 border-t border-slate-800/80 hidden md:block">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 text-red-400/80" />
            Keluar Aplikasi
          </button>
        </div>

      </aside>

      {/* 2. MOBILE FLOATING NAVIGATION MENU OVERLAY (Hides on standard system print) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-16 left-0 right-0 bg-slate-900 z-40 border-b border-slate-800 p-4 space-y-2 shadow-xl print:hidden"
          >
            {allowedNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              );
            })}
            
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSync();
              }}
              disabled={syncLoading}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                syncLoading
                  ? "bg-slate-800 text-slate-500 border-slate-800"
                  : syncStatus === "success"
                  ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/30"
                  : syncStatus === "error"
                  ? "bg-red-950/20 text-red-400 border-red-800/30"
                  : "bg-slate-850 hover:bg-slate-800/85 text-blue-400 border-slate-800/50 hover:border-slate-700"
              }`}
            >
              <RefreshCw className={`h-4.5 w-4.5 shrink-0 ${syncLoading ? "animate-spin text-blue-400" : "text-blue-400"}`} />
              <span>
                {syncLoading 
                  ? "Menyingkronkan..." 
                  : syncStatus === "success" 
                  ? "Sinkron Berhasil!" 
                  : "Sinkronkan Sheets"}
              </span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogoutClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5" />
              Keluar Aplikasi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN APP WORKSPACE CONTAINER */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full transition-all print:p-0 print:max-w-none print:mx-0">
        
        {/* Dynamic Section Renderer */}
        <div className="relative">
          {allowedNavItems.some(item => item.id === "dashboard") && (
            <div className={activeTab === "dashboard" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "dashboard" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <DashboardView onNavigateToSiswaDetail={handleViewStudentDetail} isActive={activeTab === "dashboard"} />
              </motion.div>
            </div>
          )}
          
          {allowedNavItems.some(item => item.id === "siswa") && (
            <div className={activeTab === "siswa" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "siswa" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <SiswaView onViewDetail={handleViewStudentDetail} isActive={activeTab === "siswa"} />
              </motion.div>
            </div>
          )}

          {allowedNavItems.some(item => item.id === "pelanggaran") && (
            <div className={activeTab === "pelanggaran" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "pelanggaran" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <PelanggaranView isActive={activeTab === "pelanggaran"} />
              </motion.div>
            </div>
          )}

          {allowedNavItems.some(item => item.id === "pencatatan") && (
            <div className={activeTab === "pencatatan" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "pencatatan" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <PencatatanView isActive={activeTab === "pencatatan"} />
              </motion.div>
            </div>
          )}

          {allowedNavItems.some(item => item.id === "remisi") && (
            <div className={activeTab === "remisi" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "remisi" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <RemisiView isActive={activeTab === "remisi"} />
              </motion.div>
            </div>
          )}

          {allowedNavItems.some(item => item.id === "laporan") && (
            <div className={activeTab === "laporan" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "laporan" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <LaporanView isActive={activeTab === "laporan"} />
              </motion.div>
            </div>
          )}

          {allowedNavItems.some(item => item.id === "settings") && (
            <div className={activeTab === "settings" ? "block" : "hidden"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={activeTab === "settings" ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.15 }}
              >
                <SettingsView isActive={activeTab === "settings"} />
              </motion.div>
            </div>
          )}
        </div>

      </main>

      {/* 4. MODAL DETIL REFERENSI SISWA (BISA DIAKSES DARI MANA SAJA) */}
      <AnimatePresence>
        {selectedStudentNis && (
          <SiswaDetailModal 
            studentNis={selectedStudentNis} 
            onClose={() => setSelectedStudentNis(null)} 
          />
        )}
      </AnimatePresence>

      {/* 5. MODAL KONFIRMASI KELUAR APLIKASI */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div id="logout-confirm-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 text-center space-y-4"
            >
              <div className="mx-auto h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <LogOut className="h-6 w-6" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-800">Konfirmasi Keluar</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin keluar dari sistem SIPPS? Sesi Anda akan diakhiri dan Anda perlu masuk kembali untuk mengakses data.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLogout}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow cursor-pointer"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
