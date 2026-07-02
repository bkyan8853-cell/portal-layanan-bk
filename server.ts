import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Siswa, Pelanggaran, Pencatatan, Pembinaan, User, AppSettings, DashboardStats, Remisi } from "./src/types";

const app = express();
const PORT = 3000;
const DATA_FILE = process.env.VERCEL
  ? path.join("/tmp", ".data.json")
  : path.join(process.cwd(), ".data.json");

app.use(express.json());

// Middleware to normalize and log requests (especially on Vercel)
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  
  // If running on Vercel and the url doesn't start with /api, but is handled by our api function
  if (process.env.VERCEL && req.url && !req.url.startsWith("/api")) {
    const originalUrl = req.url;
    req.url = "/api" + (originalUrl.startsWith("/") ? "" : "/") + originalUrl;
    console.log(`[Vercel URL Rewrite] Normalized ${originalUrl} -> ${req.url}`);
  }
  next();
});

// Inisialisasi Database Lokal / Fallback dengan Data Awal yang Kaya dan Realistis
const SEED_SISWA: Siswa[] = [
  { id: "s1", nis: "24001", nama: "Ahmad Rifai", kelas: "XI-IPA-1", jk: "L", namaOrangTua: "Hadi Wijaya", noHp: "081234567890" },
  { id: "s2", nis: "24002", nama: "Siti Aminah", kelas: "XI-IPA-1", jk: "P", namaOrangTua: "Slamet Santoso", noHp: "081345678901" },
  { id: "s3", nis: "24003", nama: "Budi Santoso", kelas: "XI-IPA-2", jk: "L", namaOrangTua: "Kusmono", noHp: "081456789012" },
  { id: "s4", nis: "24004", nama: "Dewi Lestari", kelas: "XI-IPA-2", jk: "P", namaOrangTua: "Budi Utomo", noHp: "081567890123" },
  { id: "s5", nis: "24005", nama: "Rian Hidayat", kelas: "XI-IPS-1", jk: "L", namaOrangTua: "Rahmat", noHp: "081678901234" },
  { id: "s6", nis: "24006", nama: "Indah Permata", kelas: "XI-IPS-1", jk: "P", namaOrangTua: "Suryono", noHp: "081789012345" },
  { id: "s7", nis: "24007", nama: "Eko Prasetyo", kelas: "XII-IPA-1", jk: "L", namaOrangTua: "Djoko", noHp: "081890123456" },
  { id: "s8", nis: "24008", nama: "Putri Utami", kelas: "XII-IPA-1", jk: "P", namaOrangTua: "Wawan", noHp: "081901234567" },
  { id: "s9", nis: "24009", nama: "Adi Wijaya", kelas: "XII-IPS-1", jk: "L", namaOrangTua: "Yanto", noHp: "081212345678" },
  { id: "s10", nis: "24010", nama: "Mega Saputri", kelas: "XII-IPS-1", jk: "P", namaOrangTua: "Hermawan", noHp: "081313456789" },
  { id: "s11", nis: "24011", nama: "Dodi Kurniawan", kelas: "XI-IPA-1", jk: "L", namaOrangTua: "Mulyadi", noHp: "081414567890" },
  { id: "s12", nis: "24012", nama: "Larasati", kelas: "XI-IPA-1", jk: "P", namaOrangTua: "Sudrajat", noHp: "081515678901" }
];

const SEED_PELANGGARAN: Pelanggaran[] = [
  { id: "p1", kode: "A01", namaPelanggaran: "Terlambat Masuk Sekolah (< 15 menit)", kategori: "Ringan", poin: 5 },
  { id: "p2", kode: "A02", namaPelanggaran: "Atribut Seragam Tidak Lengkap", kategori: "Ringan", poin: 5 },
  { id: "p3", kode: "A03", namaPelanggaran: "Rambut Gondrong / Tidak Rapi (Siswa Laki-laki)", kategori: "Ringan", poin: 10 },
  { id: "p4", kode: "A04", namaPelanggaran: "Membuang Sampah Sembarangan", kategori: "Ringan", poin: 5 },
  { id: "p5", kode: "B01", namaPelanggaran: "Membolos Sekolah / Meninggalkan Kelas Tanpa Izin", kategori: "Sedang", poin: 15 },
  { id: "p6", kode: "B02", namaPelanggaran: "Membawa HP saat jam pelajaran tanpa izin", kategori: "Sedang", poin: 15 },
  { id: "p7", kode: "B03", namaPelanggaran: "Membawa & Bermain Kartu / Game Judi di Sekolah", kategori: "Sedang", poin: 20 },
  { id: "p8", kode: "B04", namaPelanggaran: "Merokok di Lingkungan Sekolah", kategori: "Sedang", poin: 25 },
  { id: "p9", kode: "C01", namaPelanggaran: "Perkelahian / Tawuran", kategori: "Berat", poin: 50 },
  { id: "p10", kode: "C02", namaPelanggaran: "Melakukan Bullying (Perundungan) Fisik/Verbal", kategori: "Berat", poin: 50 },
  { id: "p11", kode: "C03", namaPelanggaran: "Pencurian atau Tindakan Kriminal", kategori: "Berat", poin: 75 },
  { id: "p12", kode: "C04", namaPelanggaran: "Membawa / Mengonsumsi Miras & Narkoba", kategori: "Berat", poin: 100 }
];

// Seed beberapa data pencatatan awal
const SEED_PENCATATAN: Pencatatan[] = [
  { id: "rec1", tanggal: "2026-06-15", nis: "24001", namaSiswa: "Ahmad Rifai", kelas: "XI-IPA-1", pelanggaran: "Terlambat Masuk Sekolah (< 15 menit)", poin: 5, petugas: "Drs. Joko Susilo (Guru Piket)", keterangan: "Terlambat karena ban motor bocor" },
  { id: "rec2", tanggal: "2026-06-16", nis: "24001", namaSiswa: "Ahmad Rifai", kelas: "XI-IPA-1", pelanggaran: "Rambut Gondrong / Tidak Rapi (Siswa Laki-laki)", poin: 10, petugas: "Iien Puspitasari, S.Pd (Koordinator BK)", keterangan: "Sudah ditegur sebelumnya" },
  { id: "rec3", tanggal: "2026-06-18", nis: "24003", namaSiswa: "Budi Santoso", kelas: "XI-IPA-2", pelanggaran: "Membolos Sekolah / Meninggalkan Kelas Tanpa Izin", poin: 15, petugas: "Dra. Endang (Wali Kelas)", keterangan: "Melompati pagar belakang sekolah" },
  { id: "rec4", tanggal: "2026-06-20", nis: "24005", namaSiswa: "Rian Hidayat", kelas: "XI-IPS-1", pelanggaran: "Merokok di Lingkungan Sekolah", poin: 25, petugas: "Iien Puspitasari, S.Pd (Koordinator BK)", keterangan: "Tertangkap merokok di kantin belakang" },
  { id: "rec5", tanggal: "2026-06-25", nis: "24005", namaSiswa: "Rian Hidayat", kelas: "XI-IPS-1", pelanggaran: "Melakukan Bullying (Perundungan) Fisik/Verbal", poin: 50, petugas: "Iien Puspitasari, S.Pd (Koordinator BK)", keterangan: "Mengintimidasi siswa kelas X" },
  { id: "rec6", tanggal: "2026-06-28", nis: "24007", namaSiswa: "Eko Prasetyo", kelas: "XII-IPA-1", pelanggaran: "Atribut Seragam Tidak Lengkap", poin: 5, petugas: "Siti Rahma, S.Pd (Guru Piket)", keterangan: "Tidak memakai sabuk sekolah" }
];

interface LocalDatabase {
  siswa: Siswa[];
  pelanggaran: Pelanggaran[];
  pencatatan: Pencatatan[];
  pembinaan: Pembinaan[];
  remisi: Remisi[];
  settings: AppSettings;
}

// Inisialisasi Database
let db: LocalDatabase = {
  siswa: SEED_SISWA,
  pelanggaran: SEED_PELANGGARAN,
  pencatatan: SEED_PENCATATAN,
  pembinaan: [],
  remisi: [],
  settings: {
    googleSheetUrl: "",
    syncEnabled: false
  }
};

// Hitung Pembinaan Awal
function calculateAllGuidance() {
  const pembinaanMap = new Map<string, { nis: string; namaSiswa: string; totalPoin: number }>();
  
  // Akumulasikan poin untuk setiap siswa
  db.pencatatan.forEach(rec => {
    const existing = pembinaanMap.get(rec.nis);
    if (existing) {
      existing.totalPoin += Number(rec.poin || 0);
    } else {
      pembinaanMap.set(rec.nis, {
        nis: rec.nis,
        namaSiswa: rec.namaSiswa,
        totalPoin: Number(rec.poin || 0)
      });
    }
  });

  const tempPembinaan: Pembinaan[] = [];
  pembinaanMap.forEach((val, nis) => {
    if (val.totalPoin > 0) {
      let tindakan = "Teguran Lisan";
      if (val.totalPoin > 100) tindakan = "Sidang Disiplin";
      else if (val.totalPoin >= 76) tindakan = "Surat Peringatan";
      else if (val.totalPoin >= 51) tindakan = "Pemanggilan Orang Tua";
      else if (val.totalPoin >= 26) tindakan = "Teguran Tertulis";
      
      tempPembinaan.push({
        id: "g-" + nis,
        nis: val.nis,
        namaSiswa: val.namaSiswa,
        totalPoin: val.totalPoin,
        tindakan: tindakan,
        tanggal: "2026-06-30" // Sesuai tanggal hari ini
      });
    }
  });
  
  db.pembinaan = tempPembinaan;
}

// Load dari file jika ada
function sanitizeDatabaseIds() {
  let updated = false;
  if (db.siswa && Array.isArray(db.siswa)) {
    db.siswa.forEach((s) => {
      if (!s.id) {
        s.id = "s-" + (s.nis || Math.random().toString(36).substring(2, 6));
        updated = true;
      }
    });
  }
  if (db.pelanggaran && Array.isArray(db.pelanggaran)) {
    db.pelanggaran.forEach((p) => {
      if (!p.id) {
        p.id = "p-" + (p.kode || Math.random().toString(36).substring(2, 6));
        updated = true;
      }
    });
  }
  if (db.pencatatan && Array.isArray(db.pencatatan)) {
    db.pencatatan.forEach((rec, idx) => {
      if (!rec.id) {
        rec.id = "rec-" + (rec.nis || "x") + "-" + idx + "-" + (rec.tanggal || "notate");
        updated = true;
      }
    });
  }
  return updated;
}

function loadDatabase() {
  try {
    let sourceFile = DATA_FILE;
    
    // On Vercel, if the writeable file in /tmp doesn't exist yet,
    // try to read from the read-only bundled .data.json in the project root
    if (process.env.VERCEL && !fs.existsSync(DATA_FILE)) {
      const rootDataFile = path.join(process.cwd(), ".data.json");
      if (fs.existsSync(rootDataFile)) {
        sourceFile = rootDataFile;
        console.log("Vercel: Initializing /tmp database from bundled project root .data.json");
      }
    }

    if (fs.existsSync(sourceFile)) {
      const data = fs.readFileSync(sourceFile, "utf-8");
      db = JSON.parse(data);
      if (!db.remisi) {
        db.remisi = [];
      }
      const updated = sanitizeDatabaseIds();
      if (updated || sourceFile !== DATA_FILE) {
        saveDatabase();
      }
    } else {
      calculateAllGuidance();
      saveDatabase();
    }
  } catch (err) {
    console.error("Gagal memuat database lokal, menggunakan in-memory:", err);
    calculateAllGuidance();
  }
}

// Simpan ke file
function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Gagal menyimpan database lokal:", err);
  }
}

loadDatabase();

// ================= GOOGLE APPS SCRIPT SYNC INTEGRATION =================
// Mengambil data dari Google Sheet atau fallback ke lokal
async function fetchFromGoogleSheet<T>(action: string, fallbackData: T[]): Promise<T[]> {
  if (!db.settings.googleSheetUrl || !db.settings.syncEnabled) {
    return fallbackData;
  }
  
  try {
    const url = `${db.settings.googleSheetUrl}?action=${action}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Apps Script responded with ${response.status}`);
    }
    const result = await response.json() as { success: boolean; data?: T[]; message?: string };
    if (result.success && result.data) {
      const data = result.data;
      if (action === "getViolations") {
        data.forEach((v: any) => {
          if (!v.id) v.id = "p-" + (v.kode || Math.random().toString(36).substring(2, 6));
        });
      } else if (action === "getStudents") {
        data.forEach((s: any) => {
          if (!s.id) s.id = "s-" + (s.nis || Math.random().toString(36).substring(2, 6));
        });
      } else if (action === "getRecords") {
        data.forEach((r: any, idx: number) => {
          if (!r.id) r.id = "rec-" + (r.nis || "x") + "-" + idx + "-" + (r.tanggal || "x");
        });
      }
      return data;
    } else {
      console.warn(`Apps Script returned error for ${action}:`, result.message);
      return fallbackData;
    }
  } catch (err) {
    console.error(`Gagal sync dari Google Sheet untuk action ${action}:`, err);
    return fallbackData;
  }
}

// Mengirim data ke Google Sheet
async function postToGoogleSheet(action: string, data: any): Promise<boolean> {
  if (!db.settings.googleSheetUrl || !db.settings.syncEnabled) {
    return false;
  }
  
  try {
    const url = db.settings.googleSheetUrl;
    const body = { action, ...data };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Google Apps Script responded with ${response.status}`);
    }
    const result = await response.json() as { success: boolean; message?: string };
    return result.success;
  } catch (err) {
    console.error(`Gagal sync ke Google Sheet untuk action ${action}:`, err);
    return false;
  }
}

// Sync ulang seluruh database dari Sheets
async function syncFromSheets() {
  if (!db.settings.googleSheetUrl || !db.settings.syncEnabled) return;
  
  console.log("Memulai Sinkronisasi penuh dari Google Sheets (Secara Paralel)...");
  try {
    const [s, p, r, g] = await Promise.all([
      fetchFromGoogleSheet<Siswa>("getStudents", db.siswa),
      fetchFromGoogleSheet<Pelanggaran>("getViolations", db.pelanggaran),
      fetchFromGoogleSheet<Pencatatan>("getRecords", db.pencatatan),
      fetchFromGoogleSheet<Pembinaan>("getGuidance", db.pembinaan)
    ]);
    
    db.siswa = s;
    db.pelanggaran = p;
    db.pencatatan = r;
    db.pembinaan = g;
    saveDatabase();
  } catch (err) {
    console.error("Gagal melakukan Sinkronisasi penuh dari Google Sheets:", err);
    throw err;
  }
}

let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 60 * 1000; // 1 menit

async function triggerBackgroundSync(force = false) {
  if (!db.settings.googleSheetUrl || !db.settings.syncEnabled) return;
  if (isSyncing) return;
  if (!force && (Date.now() - lastSyncTime < SYNC_COOLDOWN)) return;
  
  isSyncing = true;
  console.log("Memulai background sync dari Google Sheets...");
  try {
    await syncFromSheets();
    lastSyncTime = Date.now();
    console.log("Background sync dari Google Sheets berhasil!");
  } catch (err) {
    console.error("Gagal melakukan background sync:", err);
  } finally {
    isSyncing = false;
  }
}

// ================= AUTHENTICATION / JWT-LIKE HANDLERS =================
// Mock JWT: Simpan username, nama, dan role dienkripsi base64
function generateToken(user: User): string {
  const payload = { ...user, exp: Date.now() + 8 * 60 * 60 * 1000 }; // 8 jam
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function verifyToken(token: string): User | null {
  try {
    const payloadStr = Buffer.from(token, "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return {
      username: payload.username,
      role: payload.role,
      nama: payload.nama,
      kelas: payload.kelas
    };
  } catch {
    return null;
  }
}

// Middleware Autentikasi
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Akses tidak diizinkan, token hilang." });
  }
  
  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Sesi kedaluwarsa atau tidak valid." });
  }
  
  (req as any).user = user;
  next();
}

// ================= API ENDPOINTS =================

// Auth API
app.post("/api/auth/login", (req, res) => {
  const { username, password, role } = req.body;
  
  // Validasi login statis
  let authenticated = false;
  let nama = "";
  let kelas: string | undefined = undefined;
  
  if (role === "Admin" && username === "admin" && password === "admin123") {
    authenticated = true;
    nama = "Admin Utama BK";
  } else if (role === "Koordinator BK" && username === "gurubk" && password === "bk123") {
    authenticated = true;
    nama = "Iien Puspitasari, S.Pd";
  } else if (role === "Wali Kelas" && username === "walikelas" && password === "wali123") {
    authenticated = true;
    nama = "Dra. Endang Setyawati";
    kelas = "XI-IPA-1"; // Wali kelas kelas XI-IPA-1
  }
  
  if (authenticated) {
    const user: User = { username, role, nama, kelas };
    const token = generateToken(user);
    res.json({ success: true, token, user });
  } else {
    res.status(400).json({ success: false, message: "Kredensial salah atau Role tidak sesuai." });
  }
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false });
  }
  
  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false });
  }
});

// Settings API
app.get("/api/settings", authMiddleware, (req, res) => {
  res.json({ success: true, settings: db.settings });
});

app.post("/api/settings", authMiddleware, async (req, res) => {
  const { googleSheetUrl, syncEnabled } = req.body;
  
  db.settings.googleSheetUrl = googleSheetUrl || "";
  db.settings.syncEnabled = !!syncEnabled;
  saveDatabase();
  
  if (db.settings.syncEnabled && db.settings.googleSheetUrl) {
    try {
      await syncFromSheets();
      res.json({ success: true, message: "Pengaturan disimpan dan data berhasil disinkronisasi!", settings: db.settings });
    } catch (err: any) {
      res.json({ success: true, message: `Pengaturan disimpan, tetapi sinkronisasi gagal: ${err.message}`, settings: db.settings });
    }
  } else {
    res.json({ success: true, message: "Pengaturan berhasil disimpan!", settings: db.settings });
  }
});

// Force Sync API
app.post("/api/settings/sync", authMiddleware, async (req, res) => {
  if (!db.settings.googleSheetUrl) {
    return res.status(400).json({ success: false, message: "Konfigurasi URL Google Sheets belum diisi." });
  }
  try {
    db.settings.syncEnabled = true;
    await syncFromSheets();
    res.json({ success: true, message: "Database berhasil disinkronisasi penuh dengan Google Sheets!" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal sinkronisasi: ${err.message}` });
  }
});

// SISWA API
app.get("/api/students", authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, data: db.siswa });
    if (db.settings.syncEnabled) {
      triggerBackgroundSync().catch(err => console.error("Background sync err:", err));
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/students", authMiddleware, async (req, res) => {
  const studentData = req.body as Partial<Siswa>;
  const user = (req as any).user as User;
  
  if (user.role === "Wali Kelas") {
    return res.status(403).json({ success: false, message: "Wali Kelas tidak diizinkan menambah/mengubah data siswa." });
  }
  
  if (!studentData.nis || !studentData.nama || !studentData.kelas) {
    return res.status(400).json({ success: false, message: "NIS, Nama, dan Kelas harus diisi." });
  }
  
  const id = studentData.id || "s-" + Date.now();
  const student: Siswa = {
    id,
    nis: studentData.nis,
    nama: studentData.nama,
    kelas: studentData.kelas,
    jk: studentData.jk || "L",
    namaOrangTua: studentData.namaOrangTua || "",
    noHp: studentData.noHp || ""
  };
  
  // Update local
  const existingIndex = db.siswa.findIndex(s => s.id === id);
  if (existingIndex !== -1) {
    db.siswa[existingIndex] = student;
  } else {
    db.siswa.push(student);
  }
  saveDatabase();
  
  // Sync ke Google Sheets
  if (db.settings.syncEnabled) {
    await postToGoogleSheet("addStudent", student);
  }
  
  res.json({ success: true, data: student });
});

app.delete("/api/students/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const user = (req as any).user as User;
  
  if (user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Hanya Admin yang diizinkan menghapus siswa." });
  }
  
  const index = db.siswa.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
  }
  
  db.siswa.splice(index, 1);
  saveDatabase();
  
  if (db.settings.syncEnabled) {
    await postToGoogleSheet("deleteStudent", { id });
  }
  
  res.json({ success: true, message: "Siswa berhasil dihapus." });
});

// PELANGGARAN API (Master Pelanggaran)
app.get("/api/violations", authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, data: db.pelanggaran });
    if (db.settings.syncEnabled) {
      triggerBackgroundSync().catch(err => console.error("Background sync err:", err));
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/violations", authMiddleware, async (req, res) => {
  const violationData = req.body as Partial<Pelanggaran>;
  const user = (req as any).user as User;
  
  if (user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Hanya Admin yang diizinkan menambah/mengubah jenis pelanggaran." });
  }
  
  if (!violationData.kode || !violationData.namaPelanggaran || violationData.poin === undefined) {
    return res.status(400).json({ success: false, message: "Kode, Nama Pelanggaran, dan Poin harus diisi." });
  }
  
  const id = violationData.id || "p-" + Date.now();
  const violation: Pelanggaran = {
    id,
    kode: violationData.kode,
    namaPelanggaran: violationData.namaPelanggaran,
    kategori: violationData.kategori || "Ringan",
    poin: Number(violationData.poin)
  };
  
  const existingIndex = db.pelanggaran.findIndex(p => p.id === id);
  if (existingIndex !== -1) {
    db.pelanggaran[existingIndex] = violation;
  } else {
    db.pelanggaran.push(violation);
  }
  saveDatabase();
  
  if (db.settings.syncEnabled) {
    await postToGoogleSheet("addViolation", violation);
  }
  
  res.json({ success: true, data: violation });
});

app.delete("/api/violations/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const user = (req as any).user as User;
  
  if (user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Hanya Admin yang diizinkan menghapus jenis pelanggaran." });
  }
  
  const index = db.pelanggaran.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Jenis pelanggaran tidak ditemukan." });
  }
  
  db.pelanggaran.splice(index, 1);
  saveDatabase();
  
  if (db.settings.syncEnabled) {
    await postToGoogleSheet("deleteViolation", { id });
  }
  
  res.json({ success: true, message: "Jenis pelanggaran berhasil dihapus." });
});

// PENCATATAN API (Input & History)
app.get("/api/records", authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, data: db.pencatatan });
    if (db.settings.syncEnabled) {
      triggerBackgroundSync().catch(err => console.error("Background sync err:", err));
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tambah Pencatatan Baru (Otomatis hitung poin & update pembinaan)
app.post("/api/records", authMiddleware, async (req, res) => {
  const recordData = req.body as Partial<Pencatatan>;
  const user = (req as any).user as User;
  
  if (user.role === "Wali Kelas") {
    return res.status(403).json({ success: false, message: "Wali Kelas tidak diizinkan mencatatkan pelanggaran." });
  }
  
  if (!recordData.nis || !recordData.pelanggaran) {
    return res.status(400).json({ success: false, message: "NIS Siswa dan Jenis Pelanggaran harus diisi." });
  }
  
  // Cari siswa
  const siswa = db.siswa.find(s => s.nis === recordData.nis);
  if (!siswa) {
    return res.status(404).json({ success: false, message: `Siswa dengan NIS ${recordData.nis} tidak ditemukan.` });
  }
  
  // Cari master pelanggaran untuk ambil poin
  const masterPel = db.pelanggaran.find(p => p.namaPelanggaran === recordData.pelanggaran || p.kode === recordData.pelanggaran);
  if (!masterPel) {
    return res.status(404).json({ success: false, message: "Jenis pelanggaran tidak ditemukan di database master." });
  }
  
  const id = "rec-" + Date.now();
  const record: Pencatatan = {
    id,
    tanggal: recordData.tanggal || new Date().toISOString().split("T")[0],
    nis: siswa.nis,
    namaSiswa: siswa.nama,
    kelas: siswa.kelas,
    pelanggaran: masterPel.namaPelanggaran,
    poin: Number(masterPel.poin || 0),
    petugas: recordData.petugas || user.nama,
    keterangan: recordData.keterangan || ""
  };
  
  // Tambah ke local
  db.pencatatan.push(record);
  
  // Hitung ulang pembinaan siswa ini secara otomatis
  const studentRecords = db.pencatatan.filter(r => r.nis === siswa.nis);
  const totalPoin = studentRecords.reduce((acc, r) => acc + Number(r.poin || 0), 0);
  
  let tindakan = "Teguran Lisan";
  if (totalPoin > 100) tindakan = "Sidang Disiplin";
  else if (totalPoin >= 76) tindakan = "Surat Peringatan";
  else if (totalPoin >= 51) tindakan = "Pemanggilan Orang Tua";
  else if (totalPoin >= 26) tindakan = "Teguran Tertulis";
  
  // Update/Tambah Pembinaan
  const pembinaanIndex = db.pembinaan.findIndex(g => g.nis === siswa.nis);
  const guidance: Pembinaan = {
    id: pembinaanIndex !== -1 ? db.pembinaan[pembinaanIndex].id : "g-" + siswa.nis,
    nis: siswa.nis,
    namaSiswa: siswa.nama,
    totalPoin,
    tindakan,
    tanggal: record.tanggal
  };
  
  if (pembinaanIndex !== -1) {
    db.pembinaan[pembinaanIndex] = guidance;
  } else {
    db.pembinaan.push(guidance);
  }
  
  saveDatabase();
  
  // Sync ke Google Sheet
  if (db.settings.syncEnabled) {
    await postToGoogleSheet("addRecord", record);
  }
  
  res.json({ success: true, data: record, guidance });
});

app.delete("/api/records/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const user = (req as any).user as User;
  
  if (user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Hanya Admin yang diizinkan menghapus catatan pelanggaran." });
  }
  
  const index = db.pencatatan.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Catatan pelanggaran tidak ditemukan." });
  }
  
  const deletedRecord = db.pencatatan[index];
  db.pencatatan.splice(index, 1);
  
  // Hitung ulang pembinaan siswa pasca penghapusan
  const studentRecords = db.pencatatan.filter(r => r.nis === deletedRecord.nis);
  const totalPoin = studentRecords.reduce((acc, r) => acc + Number(r.poin || 0), 0);
  
  const pembinaanIndex = db.pembinaan.findIndex(g => g.nis === deletedRecord.nis);
  if (totalPoin === 0) {
    if (pembinaanIndex !== -1) {
      db.pembinaan.splice(pembinaanIndex, 1);
    }
  } else {
    let tindakan = "Teguran Lisan";
    if (totalPoin > 100) tindakan = "Sidang Disiplin";
    else if (totalPoin >= 76) tindakan = "Surat Peringatan";
    else if (totalPoin >= 51) tindakan = "Pemanggilan Orang Tua";
    else if (totalPoin >= 26) tindakan = "Teguran Tertulis";
    
    if (pembinaanIndex !== -1) {
      db.pembinaan[pembinaanIndex].totalPoin = totalPoin;
      db.pembinaan[pembinaanIndex].tindakan = tindakan;
    }
  }
  
  saveDatabase();
  
  if (db.settings.syncEnabled) {
    await postToGoogleSheet("deleteRecord", { id });
  }
  
  res.json({ success: true, message: "Catatan pelanggaran berhasil dihapus." });
});

// PEMBINAAN API
app.get("/api/guidance", authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, data: db.pembinaan });
    if (db.settings.syncEnabled) {
      triggerBackgroundSync().catch(err => console.error("Background sync err:", err));
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DASHBOARD STATISTICS API
app.get("/api/dashboard", authMiddleware, async (req, res) => {
  try {
    const force = req.query.force === "true";
    
    // Sinkronisasi data terlebih dahulu jika sync aktif agar dashboard selalu real-time
    if (db.settings.syncEnabled) {
      if (force) {
        await triggerBackgroundSync(true);
      } else {
        triggerBackgroundSync().catch(err => console.error("Background sync err:", err));
      }
    }
    
    const students = db.siswa;
    const records = db.pencatatan;
    const guidance = db.pembinaan;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().getMonth(); // 0-11
    const currentYear = new Date().getFullYear();
    
    // 1. Hitung metric utama
    const totalSiswa = students.length;
    
    const pelanggaranHariIni = records.filter(r => r.tanggal === todayStr).length;
    
    const pelanggaranBulanIni = records.filter(r => {
      const recDate = new Date(r.tanggal);
      return recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear;
    }).length;
    
    const totalPoinKeseluruhan = records.reduce((acc, r) => acc + Number(r.poin || 0), 0);
    
    // 2. Grafik Pelanggaran Per Bulan (12 Bulan terakhir)
    const bulanNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const pelanggaranPerBulan = bulanNames.map((name, index) => {
      const count = records.filter(r => {
        const d = new Date(r.tanggal);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      return { bulan: name, jumlah: count };
    });
    
    // 3. Grafik Pelanggaran Per Kategori
    const katCount = { Ringan: 0, Sedang: 0, Berat: 0 };
    const katPoin = { Ringan: 0, Sedang: 0, Berat: 0 };
    
    records.forEach(r => {
      const masterPel = db.pelanggaran.find(p => p.namaPelanggaran === r.pelanggaran);
      const kat = masterPel ? masterPel.kategori : "Ringan";
      katCount[kat]++;
      katPoin[kat] += Number(r.poin || 0);
    });
    
    const pelanggaranPerKategori = [
      { kategori: "Ringan", jumlah: katCount.Ringan, poin: katPoin.Ringan },
      { kategori: "Sedang", jumlah: katCount.Sedang, poin: katPoin.Sedang },
      { kategori: "Berat", jumlah: katCount.Berat, poin: katPoin.Berat }
    ];
    
    // 4. Top 10 Siswa Poin Tertinggi
    const studentPoints = new Map<string, { nama: string; kelas: string; totalPoin: number }>();
    students.forEach(s => {
      studentPoints.set(s.nis, { nama: s.nama, kelas: s.kelas, totalPoin: 0 });
    });
    records.forEach(r => {
      const p = studentPoints.get(r.nis);
      if (p) {
        p.totalPoin += Number(r.poin || 0);
      }
    });
    
    const topSiswa = Array.from(studentPoints.entries())
      .map(([nis, value]) => {
        const guid = guidance.find(g => g.nis === nis);
        return {
          nis,
          nama: value.nama,
          kelas: value.kelas,
          totalPoin: value.totalPoin,
          tindakan: guid ? guid.tindakan : "Tidak Ada Tindakan"
        };
      })
      .filter(s => s.totalPoin > 0)
      .sort((a, b) => b.totalPoin - a.totalPoin)
      .slice(0, 10);
      
    // 5. Top 10 Pelanggaran Terbanyak
    const violationCounts = new Map<string, { kategori: string; jumlah: number }>();
    records.forEach(r => {
      const existing = violationCounts.get(r.pelanggaran);
      if (existing) {
        existing.jumlah++;
      } else {
        const masterPel = db.pelanggaran.find(p => p.namaPelanggaran === r.pelanggaran);
        violationCounts.set(r.pelanggaran, {
          kategori: masterPel ? masterPel.kategori : "Ringan",
          jumlah: 1
        });
      }
    });
    
    const topPelanggaran = Array.from(violationCounts.entries())
      .map(([nama, value]) => ({
        nama,
        kategori: value.kategori,
        jumlah: value.jumlah
      }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10);
      
    const stats: DashboardStats = {
      totalSiswa,
      pelanggaranHariIni,
      pelanggaranBulanIni,
      totalPoinKeseluruhan,
      pelanggaranPerBulan,
      pelanggaranPerKategori,
      topSiswa,
      topPelanggaran
    };
    
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= REMISI API =================
app.get("/api/remisi", authMiddleware, async (req, res) => {
  try {
    res.json({ success: true, data: db.remisi || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/remisi", authMiddleware, async (req, res) => {
  const remisiData = req.body as Partial<Remisi>;
  const user = (req as any).user as User;

  if (user.role === "Wali Kelas") {
    return res.status(403).json({ success: false, message: "Wali Kelas tidak diizinkan mencatatkan remisi." });
  }

  if (!remisiData.nis || !remisiData.poinPengurangan) {
    return res.status(400).json({ success: false, message: "NIS Siswa dan Jumlah Poin Pengurangan harus diisi." });
  }

  const siswa = db.siswa.find(s => s.nis === remisiData.nis);
  if (!siswa) {
    return res.status(404).json({ success: false, message: `Siswa dengan NIS ${remisiData.nis} tidak ditemukan.` });
  }

  const id = "rem-" + Date.now();
  const remisi: Remisi = {
    id,
    tanggal: remisiData.tanggal || new Date().toISOString().split("T")[0],
    nis: siswa.nis,
    namaSiswa: siswa.nama,
    kelas: siswa.kelas,
    poinPengurangan: Number(remisiData.poinPengurangan),
    keterangan: remisiData.keterangan || "",
    petugas: remisiData.petugas || user.nama
  };

  db.remisi.push(remisi);
  saveDatabase();

  res.json({ success: true, data: remisi, message: "Remisi poin berhasil ditambahkan." });
});

app.delete("/api/remisi/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user as User;

  if (user.role === "Wali Kelas") {
    return res.status(403).json({ success: false, message: "Wali Kelas tidak diizinkan menghapus remisi." });
  }

  const index = db.remisi.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Data remisi tidak ditemukan." });
  }

  db.remisi.splice(index, 1);
  saveDatabase();

  res.json({ success: true, message: "Data remisi berhasil dihapus." });
});

// ================= VITE DEV / PRODUCTION SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled production assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server "Sistem Pencatatan Pelanggaran Siswa" running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
