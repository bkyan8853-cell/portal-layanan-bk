import React, { useState, useEffect } from "react";
import { googleSheetApi } from "../services/googleSheetApi";
import { DashboardStats } from "../types";
import { Users, AlertOctagon, Calendar, BarChart3, Award, TrendingUp, Sparkles, User, RefreshCw, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface DashboardViewProps {
  onNavigateToSiswaDetail: (nis: string) => void;
  isActive?: boolean;
}

export default function DashboardView({ onNavigateToSiswaDetail, isActive }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<{ index: number; x: number; y: number; val: number; name: string } | null>(null);

  useEffect(() => {
    if (isActive) {
      const isSilent = stats !== null;
      fetchStats(isSilent, false);
    }
  }, [isActive]);

  const fetchStats = async (isSilent = false, force = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await googleSheetApi.getDashboardStats(force);
      setStats(data);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "Gagal memuat statistik dashboard.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
        {/* Skeleton Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl border border-slate-100" />
          ))}
        </div>
        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-slate-200 animate-pulse rounded-2xl border border-slate-100" />
          <div className="h-[350px] bg-slate-200 animate-pulse rounded-2xl border border-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
        <AlertOctagon className="h-12 w-12 text-red-500 mx-auto" />
        <div className="text-red-800 font-semibold">{error || "Terjadi kesalahan pada server."}</div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // Parameter untuk SVG Bar Chart (Pelanggaran per Bulan)
  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;
  const maxVal = Math.max(...stats.pelanggaranPerBulan.map(d => d.jumlah), 5); // Fallback minimal skala 5

  // Donut Chart Calculations for Kategori Pelanggaran
  const totalKategoriCount = stats.pelanggaranPerKategori.reduce((acc, c) => acc + c.jumlah, 0);
  let accumulatedAngle = 0;

  const donutCategories = stats.pelanggaranPerKategori.map((c) => {
    const percentage = totalKategoriCount > 0 ? (c.jumlah / totalKategoriCount) * 100 : 0;
    const angle = totalKategoriCount > 0 ? (c.jumlah / totalKategoriCount) * 360 : 0;
    const item = {
      ...c,
      percentage,
      startAngle: accumulatedAngle,
      endAngle: accumulatedAngle + angle,
      color: c.kategori === "Ringan" ? "#3b82f6" : c.kategori === "Sedang" ? "#eab308" : "#ef4444"
    };
    accumulatedAngle += angle;
    return item;
  });

  return (
    <div id="dashboard-view" className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kinerja Kedisiplinan Sekolah</h1>
          <p className="text-slate-500 text-sm mt-1">Analisis dan ringkasan pencatatan pelanggaran siswa hari ini.</p>
        </div>
        <button
          onClick={() => fetchStats(false, true)}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Perbarui Data
        </button>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Siswa */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Siswa</span>
            <div className="text-3xl font-black text-slate-800">{stats.totalSiswa}</div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" /> Terdaftar aktif
            </span>
          </div>
          <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-100">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Pelanggaran Hari Ini */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pelanggaran Hari Ini</span>
            <div className={`text-3xl font-black ${stats.pelanggaranHariIni > 0 ? "text-red-600" : "text-slate-800"}`}>
              {stats.pelanggaranHariIni}
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" /> Hari ini berjalan
            </span>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
            stats.pelanggaranHariIni > 0 ? "bg-red-50 text-red-600 group-hover:bg-red-100" : "bg-slate-100 text-slate-600"
          }`}>
            <AlertOctagon className="h-6 w-6" />
          </div>
        </div>

        {/* Pelanggaran Bulan Ini */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pelanggaran Bulan Ini</span>
            <div className="text-3xl font-black text-slate-800">{stats.pelanggaranBulanIni}</div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Rekapitulasi bulan ini
            </span>
          </div>
          <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 transition-colors group-hover:bg-amber-100">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>

        {/* Total Poin Keseluruhan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Akumulasi Poin BK</span>
            <div className="text-3xl font-black text-slate-800">{stats.totalPoinKeseluruhan}</div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Award className="h-3 w-3 text-indigo-500" /> Total seluruh siswa
            </span>
          </div>
          <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-100">
            <Award className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Monthly Violations Chart (Bar Chart Custom SVG) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Tren Pelanggaran</h3>
            <p className="text-xs text-slate-400 mt-0.5">Jumlah kasus per bulan dalam tahun ajaran ini.</p>
          </div>
          
          <div className="my-6 relative flex justify-center w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingY}`} className="w-full max-w-[500px] h-[180px]">
              {/* Garis Grid Horizontal */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + (1 - ratio) * (chartHeight - paddingY * 2);
                const value = Math.round(ratio * maxVal);
                return (
                  <g key={i} className="opacity-40">
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={chartWidth - paddingX} 
                      y2={y} 
                      stroke="#cbd5e1" 
                      strokeDasharray="4,4" 
                      strokeWidth="1"
                    />
                    <text 
                      x={paddingX - 8} 
                      y={y + 3} 
                      textAnchor="end" 
                      fill="#64748b" 
                      className="font-mono text-[9px] font-semibold"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* Batang Bar Chart */}
              {stats.pelanggaranPerBulan.map((data, index) => {
                const colWidth = (chartWidth - paddingX * 2) / stats.pelanggaranPerBulan.length;
                const barWidth = Math.min(22, colWidth - 8);
                const x = paddingX + index * colWidth + (colWidth - barWidth) / 2;
                
                const barRatio = data.jumlah / maxVal;
                const barHeight = Math.max(3, barRatio * (chartHeight - paddingY * 2));
                const y = chartHeight - paddingY - barHeight;

                const isHovered = hoveredMonth?.index === index;

                return (
                  <g 
                    key={index}
                    onMouseEnter={(e) => setHoveredMonth({ index, x: x + barWidth / 2, y, val: data.jumlah, name: data.bulan })}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="cursor-pointer"
                  >
                    {/* Batang Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={isHovered ? "#2563eb" : "#93c5fd"}
                      className="transition-all duration-200"
                    />
                    {/* Label Bulan di bawah */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill={isHovered ? "#1e293b" : "#94a3b8"}
                      className="text-[9px] font-bold"
                    >
                      {data.bulan}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Custom Tooltip on Hover */}
            {hoveredMonth && (
              <div 
                className="absolute z-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg pointer-events-none flex flex-col font-sans"
                style={{
                  left: `${(hoveredMonth.x / chartWidth) * 100}%`,
                  bottom: `${chartHeight - hoveredMonth.y + 12}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <span className="font-bold">{hoveredMonth.name}</span>
                <span>{hoveredMonth.val} Kasus</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown (Donut Chart / Progress Style Custom) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Kategori Pelanggaran</h3>
            <p className="text-xs text-slate-400 mt-0.5">Proporsi kasus berdasarkan tingkat keparahan.</p>
          </div>

          <div className="my-4 flex justify-center">
            {/* Visual Mini Donut */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {totalKategoriCount === 0 ? (
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                ) : (
                  donutCategories.map((cat, i) => {
                    const radius = 38;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (cat.percentage / 100) * circumference;
                    
                    // Hitung akumulasi offset
                    let offsetAccum = 0;
                    for (let j = 0; j < i; j++) {
                      offsetAccum += (donutCategories[j].percentage / 100) * circumference;
                    }

                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={cat.color}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={-offsetAccum}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    );
                  })
                )}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800">{totalKategoriCount}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kasus</span>
              </div>
            </div>
          </div>

          {/* Legend Progress Info */}
          <div className="space-y-2 text-xs">
            {donutCategories.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="font-medium text-slate-600">{c.kategori}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="font-bold text-slate-800">{c.jumlah} kasus</span>
                  <span className="text-[10px] text-slate-400 font-bold">({Math.round(c.percentage)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Rankings / Leaderboards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top 10 Siswa Poin Tertinggi */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="border-b border-slate-50 pb-4 mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Top 10 Akumulasi Poin Tertinggi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Siswa dengan akumulasi pelanggaran terbanyak.</p>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 py-1 px-2.5 rounded-full">
              Butuh Pembinaan
            </span>
          </div>

          {stats.topSiswa.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Tidak ada data siswa bermasalah. Sekolah kondusif dan disiplin!
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-8">Rank</th>
                    <th className="py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama</th>
                    <th className="py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Kelas</th>
                    <th className="py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center w-16">Poin</th>
                    <th className="py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right w-32">Status Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {stats.topSiswa.map((siswa, index) => {
                    let badgeColor = "bg-blue-50 text-blue-800";
                    if (siswa.tindakan === "Sidang Disiplin") badgeColor = "bg-red-100 text-red-800 border-red-200 font-extrabold";
                    else if (siswa.tindakan === "Surat Peringatan") badgeColor = "bg-orange-50 text-orange-800 border-orange-200 font-bold";
                    else if (siswa.tindakan === "Pemanggilan Orang Tua") badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                    else if (siswa.tindakan === "Teguran Tertulis") badgeColor = "bg-yellow-50 text-yellow-800 border-yellow-200";

                    return (
                      <tr key={siswa.nis} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 font-bold text-slate-400 text-center">{index + 1}</td>
                        <td className="py-2.5">
                          <button 
                            onClick={() => onNavigateToSiswaDetail(siswa.nis)}
                            className="font-bold text-blue-600 hover:underline text-left focus:outline-none flex items-center gap-1 group"
                          >
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-500" />
                            {siswa.nama}
                          </button>
                        </td>
                        <td className="py-2.5 font-medium text-slate-600">{siswa.kelas}</td>
                        <td className="py-2.5 text-center font-black text-red-600">{siswa.totalPoin}</td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${badgeColor}`}>
                            {siswa.tindakan}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top 10 Pelanggaran Terbanyak */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="border-b border-slate-50 pb-4 mb-4">
            <h3 className="font-extrabold text-slate-800 text-base">Top 10 Pelanggaran Terbanyak</h3>
            <p className="text-xs text-slate-400 mt-0.5">Jenis pelanggaran yang paling sering dilakukan.</p>
          </div>

          {stats.topPelanggaran.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Tidak ada data pencatatan pelanggaran saat ini.
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {stats.topPelanggaran.map((pel, index) => {
                let colorClass = "bg-blue-600";
                if (pel.kategori === "Sedang") colorClass = "bg-amber-500";
                else if (pel.kategori === "Berat") colorClass = "bg-red-500";

                const percentage = Math.round((pel.jumlah / stats.totalPoinKeseluruhan) * 100) || 5;

                return (
                  <div key={index} className="space-y-1.5 p-2 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 line-clamp-1 flex-1 pr-3">
                        {index + 1}. {pel.nama}
                      </span>
                      <span className="text-slate-500 shrink-0">
                        {pel.jumlah} Kasus
                      </span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colorClass} rounded-full transition-all duration-300`} 
                        style={{ width: `${Math.min(100, Math.max(5, percentage * 2))}%` }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-bold uppercase ${
                        pel.kategori === "Ringan" ? "text-blue-600" : pel.kategori === "Sedang" ? "text-amber-600" : "text-red-600"
                      }`}>{pel.kategori}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
