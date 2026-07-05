export interface Siswa {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jk: 'L' | 'P';
  namaOrangTua: string;
  noHp: string;
}

export interface Pelanggaran {
  id: string;
  kode: string;
  namaPelanggaran: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

export interface Pencatatan {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nis: string;
  namaSiswa: string;
  kelas: string;
  pelanggaran: string;
  poin: number;
  petugas: string;
  keterangan: string;
}

export interface Pembinaan {
  id: string;
  nis: string;
  namaSiswa: string;
  totalPoin: number;
  tindakan: string;
  tanggal: string; // YYYY-MM-DD
}

export type UserRole = 'Admin' | 'Koordinator BK' | 'Wali Kelas';

export interface User {
  username: string;
  role: UserRole;
  nama: string;
  kelas?: string; // Khusus Wali Kelas
}

export interface AppSettings {
  googleSheetUrl: string;
  syncEnabled: boolean;
}

export interface Remisi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nis: string;
  namaSiswa: string;
  kelas: string;
  poinPengurangan: number;
  keterangan: string;
  petugas: string;
}

export interface Absensi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nis: string;
  namaSiswa: string;
  kelas: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';
  keterangan: string;
}

export interface DashboardStats {
  totalSiswa: number;
  pelanggaranHariIni: number;
  pelanggaranBulanIni: number;
  totalPoinKeseluruhan: number;
  pelanggaranPerBulan: { bulan: string; jumlah: number }[];
  pelanggaranPerKategori: { kategori: string; jumlah: number; poin: number }[];
  topSiswa: { nis: string; nama: string; kelas: string; totalPoin: number; tindakan: string }[];
  topPelanggaran: { nama: string; kategori: string; jumlah: number }[];
}
