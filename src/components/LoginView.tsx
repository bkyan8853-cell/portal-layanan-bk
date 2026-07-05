import React, { useState } from "react";
import { googleSheetApi } from "../services/googleSheetApi";
import { UserRole } from "../types";
import { Shield, BookOpen, UserCheck, Lock, User as UserIcon, AlertCircle, Loader2, GraduationCap } from "lucide-react";
import { motion } from "motion/react";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [role, setRole] = useState<UserRole>("Admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    const cleanVal = val.toLowerCase().trim();
    if (cleanVal === "admin") {
      setRole("Admin");
    } else if (cleanVal === "gurubk") {
      setRole("Koordinator BK");
    } else if (cleanVal === "walikelas") {
      setRole("Wali Kelas");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan Password wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await googleSheetApi.login(username, password, role);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <BookOpen className="h-9 w-9" />
          </div>
          <h2 className="mt-6 tracking-tight leading-tight">
            <span className="block text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-blue-600 mb-1.5">
              PORTAL LAYANAN
            </span>
            <span className="block text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              BIMBINGAN & KONSELING PINTAR
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Sistem Pencatatan Pelanggaran Siswa
          </p>
          <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full text-center text-xs font-bold bg-blue-50 text-blue-800 leading-normal">
            SMAN 4 KOTA TANGERANG SELATAN
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start space-x-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 font-medium">{error}</div>
          </motion.div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Role Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              PILIH ROLE AKSES
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              {(["Admin", "Koordinator BK", "Wali Kelas"] as UserRole[]).map((r) => {
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setError(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                      isActive
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {r === "Admin" && <Shield className="h-4 w-4" />}
                    {r === "Koordinator BK" && <UserCheck className="h-4 w-4" />}
                    {r === "Wali Kelas" && <GraduationCap className="h-4 w-4" />}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  placeholder="Masukkan password"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Sedang Memproses...
              </>
            ) : (
              "Masuk ke Sistem"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
