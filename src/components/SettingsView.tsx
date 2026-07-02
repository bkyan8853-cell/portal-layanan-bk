import React, { useState, useEffect } from "react";
import { googleSheetApi } from "../services/googleSheetApi";
import { AppSettings } from "../types";
import { Save, RefreshCw, Copy, Check, Info, Server, HelpCircle, FileText, CheckCircle2, AlertTriangle, Play, Download, FileSpreadsheet } from "lucide-react";
import { motion } from "motion/react";
import * as XLSX from "xlsx";

const CODE_GS_CONTENT = `/**
 * GOOGLE APPS SCRIPT WEB APP - SYSTEM PENCATATAN PELANGGARAN SISWA
 * 
 * Petunjuk Penggunaan:
 * 1. Buka Google Sheets baru.
 * 2. Buat 4 Sheet dengan nama: "SISWA", "PELANGGARAN", "PENCATATAN", dan "PEMBINAAN" (huruf besar semua).
 * 3. Isi baris pertama (Header) masing-masing Sheet sebagai berikut:
 *    - SISWA: ID | NIS | Nama | Kelas | JK | Nama Orang Tua | No HP
 *    - PELANGGARAN: ID | Kode | Nama Pelanggaran | Kategori | Poin
 *    - PENCATATAN: ID | Tanggal | NIS | Nama Siswa | Kelas | Pelanggaran | Poin | Petugas | Keterangan
 *    - PEMBINAAN: ID | NIS | Nama Siswa | Total Poin | Tindakan | Tanggal
 * 4. Buka menu Ekstensi -> Apps Script.
 * 5. Hapus semua kode default, lalu salin seluruh isi file ini ke editor tersebut.
 * 6. Klik "Terapkan" -> "Penerapan Baru".
 * 7. Pilih Jenis: "Aplikasi Web".
 * 8. Jalankan sebagai: "Saya" (akun Google Anda).
 * 9. Yang memiliki akses: "Siapa saja".
 * 10. Klik "Terapkan", berikan izin akses yang diminta, lalu salin URL Aplikasi Web yang dihasilkan.
 * 11. Tempelkan URL tersebut ke Pengaturan Aplikasi ini.
 */

function A_PETUNJUK_MOHON_BACA_INI() {
  Logger.log("==========================================================================");
  Logger.log("⚠️ PETUNJUK PENTING: BACA SEBELUM MENJALANKAN KODE INI ⚠️");
  Logger.log("==========================================================================");
  Logger.log("Aplikasi ini dirancang sebagai Aplikasi Web (Web App) Google Apps Script.");
  Logger.log("Anda TIDAK perlu menekan tombol 'Jalankan' (Run) untuk kode-kode di sini!");
  Logger.log("");
  Logger.log("Menekan tombol 'Jalankan' pada doGet, doPost, atau getSheetData akan memicu");
  Logger.log("error karena fungsi tersebut membutuhkan parameter otomatis dari aplikasi.");
  Logger.log("");
  Logger.log("👉 CARA MENJALANKAN & MENDEPLOY DENGAN BENAR:");
  Logger.log("1. Klik tombol biru 'Terapkan' (Deploy) di bagian kanan atas editor ini.");
  Logger.log("2. Pilih 'Penerapan baru' (New deployment).");
  Logger.log("3. Klik ikon roda gigi (Gear) di sebelah 'Pilih jenis' (Select type) -> pilih 'Aplikasi Web' (Web App).");
  Logger.log("4. Isi keterangan/deskripsi jika diinginkan.");
  Logger.log("5. Pada kolom 'Jalankan sebagai' (Execute as), pilih 'Saya' (Me - email anda).");
  Logger.log("6. Pada kolom 'Yang memiliki akses' (Who has access), pilih 'Siapa saja' (Anyone).");
  Logger.log("7. Klik tombol biru 'Terapkan' (Deploy) di bagian bawah.");
  Logger.log("8. Jika diminta, klik 'Berikan akses' (Authorize access), pilih akun Google Anda,");
  Logger.log("   klik 'Advanced' -> 'Go to Project tak berjudul (unsafe)', lalu klik 'Allow'.");
  Logger.log("9. Salin URL Aplikasi Web yang diberikan (panjang, berakhiran '/exec').");
  Logger.log("10. Tempelkan URL tersebut ke Pengaturan aplikasi Anda.");
  Logger.log("==========================================================================");
}

function doGet(e) {
  if (!e || !e.parameter) {
    throw new Error("PENTING: Fungsi ini tidak bisa dijalankan langsung dengan tombol 'Jalankan' (Run) di editor. Fungsi doGet() otomatis dipanggil oleh sistem saat di-deploy sebagai Web App. Silakan pilih fungsi 'A_PETUNJUK_MOHON_BACA_INI' dari dropdown di atas untuk membaca petunjuk.");
  }
  const action = e.parameter.action;
  let ss;
  try {
    ss = SpreadsheetApp.openById("12Lq9U__OezS7sjRZyZlkJExqWD17o-cvKx9WzVgfVCo");
  } catch (err) {
    const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
    ss = SpreadsheetApp.openById(sheetId);
  }
  
  let result;
  try {
    if (action === 'getStudents') {
      result = getSheetData(ss, 'SISWA');
    } else if (action === 'getViolations') {
      result = getSheetData(ss, 'PELANGGARAN');
    } else if (action === 'getRecords') {
      result = getSheetData(ss, 'PENCATATAN');
    } else if (action === 'getGuidance') {
      result = getSheetData(ss, 'PEMBINAAN');
    } else {
      return createJsonResponse({ success: false, message: 'Action not found: ' + action });
    }
    return createJsonResponse({ success: true, data: result });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

function doPost(e) {
  if (!e) {
    throw new Error("PENTING: Fungsi ini tidak bisa dijalankan langsung dengan tombol 'Jalankan' (Run) di editor. Fungsi doPost() otomatis dipanggil oleh sistem saat di-deploy sebagai Web App. Silakan pilih fungsi 'A_PETUNJUK_MOHON_BACA_INI' dari dropdown di atas untuk membaca petunjuk.");
  }
  let postData;
  let action;
  
  try {
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
      action = postData.action;
    } else {
      action = e.parameter.action;
      postData = e.parameter;
    }
    
    if (!action) {
      return createJsonResponse({ success: false, message: 'Missing action' });
    }
    
    let ss;
    try {
      ss = SpreadsheetApp.openById("12Lq9U__OezS7sjRZyZlkJExqWD17o-cvKx9WzVgfVCo");
    } catch (err) {
      const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
      ss = SpreadsheetApp.openById(sheetId);
    }
    
    let result;
    
    if (action === 'addStudent') {
      result = saveStudent(ss, postData);
    } else if (action === 'addViolation') {
      result = saveViolation(ss, postData);
    } else if (action === 'addRecord') {
      result = saveRecord(ss, postData);
    } else if (action === 'deleteStudent') {
      result = deleteRow(ss, 'SISWA', postData.id);
    } else if (action === 'deleteViolation') {
      result = deleteRow(ss, 'PELANGGARAN', postData.id);
    } else if (action === 'deleteRecord') {
      result = deleteRecordAndUpdateGuidance(ss, postData.id);
    } else {
      return createJsonResponse({ success: false, message: 'Action not found or not supported in POST' });
    }
    
    return createJsonResponse({ success: true, data: result });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getSheetData(ss, sheetName) {
  if (!ss) {
    throw new Error("PENTING: Fungsi ini tidak bisa dijalankan langsung dengan tombol 'Jalankan' (Run) di editor. Fungsi ini adalah fungsi pembantu internal. Silakan pilih fungsi 'A_PETUNJUK_MOHON_BACA_INI' dari dropdown di atas untuk membaca petunjuk.");
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan.');
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  const data = [];
  let updatedSomeIds = false;
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    
    // Auto-generate ID if empty (great for manual bulk input directly on the spreadsheet)
    let idVal = row[0] ? row[0].toString().trim() : "";
    if (!idVal) {
      idVal = "auto-" + Utilities.getUuid().substring(0, 8);
      sheet.getRange(r + 2, 1).setValue(idVal);
      row[0] = idVal;
      updatedSomeIds = true;
    }
    
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      let key = headers[c].toString().trim();
      if (key === 'Nama Orang Tua') key = 'namaOrangTua';
      else if (key === 'No HP') key = 'noHp';
      else if (key === 'Nama Pelanggaran') key = 'namaPelanggaran';
      else if (key === 'Nama Siswa') key = 'namaSiswa';
      else if (key === 'Total Poin') key = 'totalPoin';
      else key = key.toLowerCase();
      
      let val = row[c];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[key] = val;
    }
    data.push(obj);
  }
  if (updatedSomeIds) {
    SpreadsheetApp.flush();
  }
  return data;
}

function saveStudent(ss, data) {
  const sheet = ss.getSheetByName('SISWA');
  if (!sheet) throw new Error('Sheet SISWA tidak ditemukan.');
  
  const id = data.id || Utilities.getUuid();
  const nis = data.nis || '';
  const nama = data.nama || '';
  const kelas = data.kelas || '';
  const jk = data.jk || 'L';
  const namaOrangTua = data.namaOrangTua || '';
  const noHp = data.noHp || '';
  
  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  if (data.id) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === id.toString()) {
        rowIndex = i + 1;
        break;
      }
    }
  }
  
  const rowData = [id, nis, nama, kelas, jk, namaOrangTua, noHp];
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { id, nis, nama, kelas, jk, namaOrangTua, noHp };
}

function saveViolation(ss, data) {
  const sheet = ss.getSheetByName('PELANGGARAN');
  if (!sheet) throw new Error('Sheet PELANGGARAN tidak ditemukan.');
  
  const id = data.id || Utilities.getUuid();
  const kode = data.kode || '';
  const namaPelanggaran = data.namaPelanggaran || '';
  const kategori = data.kategori || 'Ringan';
  const poin = parseInt(data.poin) || 0;
  
  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  if (data.id) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === id.toString()) {
        rowIndex = i + 1;
        break;
      }
    }
  }
  
  const rowData = [id, kode, namaPelanggaran, kategori, poin];
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { id, kode, namaPelanggaran, kategori, poin };
}

function saveRecord(ss, data) {
  const sheet = ss.getSheetByName('PENCATATAN');
  if (!sheet) throw new Error('Sheet PENCATATAN tidak ditemukan.');
  
  const id = Utilities.getUuid();
  const tanggal = data.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const nis = data.nis || '';
  const namaSiswa = data.namaSiswa || '';
  const kelas = data.kelas || '';
  const pelanggaran = data.pelanggaran || '';
  const poin = parseInt(data.poin) || 0;
  const petugas = data.petugas || '';
  const keterangan = data.keterangan || '';
  
  const rowData = [id, tanggal, nis, namaSiswa, kelas, pelanggaran, poin, petugas, keterangan];
  sheet.appendRow(rowData);
  
  recalculateGuidance(ss, nis, namaSiswa);
  
  return { id, tanggal, nis, namaSiswa, kelas, pelanggaran, poin, petugas, keterangan };
}

function deleteRow(ss, sheetName, id) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' tidak ditemukan.');
  
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }
  throw new Error('Data dengan ID ' + id + ' tidak ditemukan.');
}

function deleteRecordAndUpdateGuidance(ss, id) {
  const sheetPencatatan = ss.getSheetByName('PENCATATAN');
  if (!sheetPencatatan) throw new Error('Sheet PENCATATAN tidak ditemukan.');
  
  const values = sheetPencatatan.getDataRange().getValues();
  let nis = '';
  let namaSiswa = '';
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id.toString()) {
      nis = values[i][2].toString();
      namaSiswa = values[i][3].toString();
      sheetPencatatan.deleteRow(i + 1);
      break;
    }
  }
  
  if (nis) {
    recalculateGuidance(ss, nis, namaSiswa);
  }
  
  return { id: id, deleted: true };
}

function recalculateGuidance(ss, nis, namaSiswa) {
  const sheetPencatatan = ss.getSheetByName('PENCATATAN');
  const sheetPembinaan = ss.getSheetByName('PEMBINAAN');
  
  if (!sheetPencatatan || !sheetPembinaan) return;
  
  const records = sheetPencatatan.getDataRange().getValues();
  let totalPoin = 0;
  
  for (let i = 1; i < records.length; i++) {
    if (records[i][2].toString() === nis.toString()) {
      totalPoin += parseInt(records[i][6]) || 0;
    }
  }
  
  let tindakan = 'Teguran Lisan';
  if (totalPoin > 100) {
    tindakan = 'Sidang Disiplin';
  } else if (totalPoin >= 76) {
    tindakan = 'Surat Peringatan';
  } else if (totalPoin >= 51) {
    tindakan = 'Pemanggilan Orang Tua';
  } else if (totalPoin >= 26) {
    tindakan = 'Teguran Tertulis';
  } else if (totalPoin > 0) {
    tindakan = 'Teguran Lisan';
  } else {
    tindakan = 'Tidak Ada Tindakan';
  }
  
  const pembinaans = sheetPembinaan.getDataRange().getValues();
  let rowIndex = -1;
  let id = '';
  
  for (let i = 1; i < pembinaans.length; i++) {
    if (pembinaans[i][1].toString() === nis.toString()) {
      rowIndex = i + 1;
      id = pembinaans[i][0].toString();
      break;
    }
  }
  
  const tanggalHariIni = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  if (totalPoin === 0) {
    if (rowIndex !== -1) {
      sheetPembinaan.deleteRow(rowIndex);
    }
  } else {
    id = id || Utilities.getUuid();
    const rowData = [id, nis, namaSiswa, totalPoin, tindakan, tanggalHariIni];
    
    if (rowIndex !== -1) {
      sheetPembinaan.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheetPembinaan.appendRow(rowData);
    }
  }
}`;

export default function SettingsView({ isActive }: { isActive?: boolean }) {
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

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
      const isSilent = googleSheetUrl !== "" || syncEnabled;
      loadSettings(isSilent);
    }
  }, [isActive]);

  const loadSettings = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const settings = await googleSheetApi.getSettings();
      setGoogleSheetUrl(settings.googleSheetUrl || "");
      setSyncEnabled(settings.syncEnabled || false);
    } catch (err: any) {
      if (!isSilent) setMessage({ text: "Gagal memuat pengaturan: " + err.message, isError: true });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validasi URL jika diaktifkan
    if (syncEnabled && !googleSheetUrl.startsWith("https://script.google.com")) {
      setMessage({ text: "URL Google Apps Script tidak valid. Harus dimulai dengan https://script.google.com", isError: true });
      setLoading(false);
      return;
    }

    try {
      const settings: AppSettings = {
        googleSheetUrl,
        syncEnabled
      };
      const res = await googleSheetApi.saveSettings(settings);
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: any) {
      setMessage({ text: "Gagal menyimpan: " + err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!googleSheetUrl) {
      setMessage({ text: "Harap konfigurasikan URL terlebih dahulu sebelum sinkronisasi.", isError: true });
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const res = await googleSheetApi.triggerSync();
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: any) {
      setMessage({ text: "Sinkronisasi gagal: " + err.message, isError: true });
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(CODE_GS_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="settings-view" className="space-y-8 pb-12">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integrasi & Pengaturan</h1>
          <p className="text-slate-500 text-sm mt-1">Sambungkan aplikasi ini dengan Google Sheets untuk database cloud yang persisten.</p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-slate-800 font-semibold border-b border-slate-50 pb-3">
              <Server className="h-5 w-5 text-blue-600" />
              <h2>Sambungan Database</h2>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium border ${
                message.isError 
                  ? "bg-red-50 text-red-700 border-red-100" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Toggle Sync */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="text-sm font-bold text-slate-800 block">Hubungkan Google Sheets</label>
                  <span className="text-xs text-slate-500">Tulis/baca langsung dari cloud</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={syncEnabled} 
                    onChange={(e) => setSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Apps Script URL Input */}
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">URL Web App Google Apps Script</label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 text-slate-800"
                />
                <span className="text-[10px] text-slate-400 block pt-1">
                  Didapatkan setelah menerapkan proyek Apps Script sebagai Aplikasi Web (Web App).
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Simpan Pengaturan
                </button>

                {syncEnabled && googleSheetUrl && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Menyinkronkan..." : "Sinkronisasi Penuh Sekarang"}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Sheet Column Schema Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold border-b border-slate-50 pb-3">
              <Info className="h-5 w-5 text-blue-500" />
              <h3>Struktur Kolom & Template</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pastikan Anda membuat tab lembar kerja baru di spreadsheet dengan nama-nama sheet dan urutan kolom persis seperti berikut:
            </p>
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <div className="font-bold text-blue-700">1. SISWA</div>
                <code className="text-[10px] text-slate-600">ID | NIS | Nama | Kelas | JK | Nama Orang Tua | No HP</code>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <div className="font-bold text-blue-700">2. PELANGGARAN</div>
                <code className="text-[10px] text-slate-600">ID | Kode | Nama Pelanggaran | Kategori | Poin</code>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <div className="font-bold text-blue-700">3. PENCATATAN</div>
                <code className="text-[10px] text-slate-600">ID | Tanggal | NIS | Nama Siswa | Kelas | Pelanggaran | Poin | Petugas | Keterangan</code>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <div className="font-bold text-blue-700">4. PEMBINAAN</div>
                <code className="text-[10px] text-slate-600">ID | NIS | Nama Siswa | Total Poin | Tindakan | Tanggal</code>
              </div>
            </div>

            {/* Direct template download widget */}
            <div className="pt-4 border-t border-slate-100/80 space-y-3.5">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Unduh Template Manual
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Butuh format isian manual cepat? Kami sangat merekomendasikan mengunduh berkas <b>3-Sheet Excel Utama</b> di bawah ini yang mencakup ketiga template sekaligus.
              </p>

              {/* Combined 3-sheet Excel button */}
              <button
                type="button"
                onClick={downloadCombinedExcelTemplate}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-50 cursor-pointer transition-all active:scale-98"
              >
                <Download className="h-3.5 w-3.5" />
                Unduh Berkas 3-Sheet Excel (.xlsx)
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">Atau Unduh Terpisah (CSV)</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>
              
              <div className="space-y-2 pt-1">
                {/* Siswa Download */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">1. Template Siswa</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => downloadCsvTemplate('siswa', ';')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Excel (;)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsvTemplate('siswa', ',')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Sheets (,)
                    </button>
                  </div>
                </div>

                {/* Pelanggaran Download */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">2. Template Pelanggaran</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => downloadCsvTemplate('pelanggaran', ';')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Excel (;)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsvTemplate('pelanggaran', ',')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Sheets (,)
                    </button>
                  </div>
                </div>

                {/* Pencatatan Download */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">3. Template Pencatatan</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => downloadCsvTemplate('pencatatan', ';')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Excel (;)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsvTemplate('pencatatan', ',')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      Sheets (,)
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Code and Instructions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Instructions Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-slate-800 font-semibold border-b border-slate-50 pb-3">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <h2>Panduan Deployment Google Apps Script</h2>
            </div>
            <div className="relative border-l-2 border-blue-100 pl-6 ml-2 space-y-6 text-sm text-slate-600">
              <div className="relative">
                <span className="absolute -left-[31px] top-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <p className="font-bold text-slate-800">Persiapkan Spreadsheet</p>
                <p className="text-xs text-slate-500 mt-0.5">Buka Google Drive, buat Google Sheet baru dan namai (contoh: <b>Database SIPPS</b>). Tambahkan 4 tab dengan nama <b>SISWA</b>, <b>PELANGGARAN</b>, <b>PENCATATAN</b>, dan <b>PEMBINAAN</b>.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <p className="font-bold text-slate-800">Buka Google Apps Script</p>
                <p className="text-xs text-slate-500 mt-0.5">Pada menu atas Google Sheet, klik <b>Ekstensi</b> lalu pilih <b>Apps Script</b>.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <p className="font-bold text-slate-800">Tempel Kode Sumber (Code.gs)</p>
                <p className="text-xs text-slate-500 mt-0.5">Hapus seluruh isi file default <code>Kode.gs</code> di Apps Script, lalu salin dan tempelkan kode lengkap dari panel kanan di bawah.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                <p className="font-bold text-slate-800">Deploy sebagai Aplikasi Web</p>
                <p className="text-xs text-slate-500 mt-0.5">Klik tombol <b>Terapkan (Deploy)</b> di pojok kanan atas, lalu pilih <b>Penerapan Baru</b>. Pilih jenis <b>Aplikasi Web</b>. Atur "Jalankan sebagai" ke <b>Saya (akun anda)</b>, dan "Yang memiliki akses" ke <b>Siapa saja (Anyone)</b>. Klik <b>Terapkan</b>.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">5</span>
                <p className="font-bold text-slate-800">Salin URL ke Aplikasi Ini</p>
                <p className="text-xs text-slate-500 mt-0.5">Berikan otorisasi akses Google jika diminta, lalu salin <b>URL Aplikasi Web</b> yang disediakan. Tempelkan URL tersebut ke input sambungan database di kiri halaman ini, centang "Hubungkan Google Sheets", lalu simpan!</p>
              </div>
            </div>
          </div>

          {/* Code.gs Widget */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[520px]">
            <div className="bg-slate-800/80 px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">Code.gs</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="py-1 px-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Salin Kode
                  </>
                )}
              </button>
            </div>
            
            {/* Scrollable code window */}
            <div className="p-5 overflow-auto font-mono text-[11px] leading-relaxed text-slate-300 bg-slate-950 flex-1">
              <pre className="whitespace-pre">{CODE_GS_CONTENT}</pre>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
