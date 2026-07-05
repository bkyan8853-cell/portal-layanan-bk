/**
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
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Active spreadsheet is null");
    }
  } catch (err) {
    try {
      ss = SpreadsheetApp.openById("1UJZGkmLpTV99LMdEY70VIOFlqPUVBNfjjd7rI5ZuOqM");
    } catch (e2) {
      ss = SpreadsheetApp.openById("12Lq9U__OezS7sjRZyZlkJExqWD17o-cvKx9WzVgfVCo");
    }
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
    } else if (action === 'getAll') {
      return createJsonResponse({
        success: true,
        data: {
          siswa: getSheetData(ss, 'SISWA'),
          pelanggaran: getSheetData(ss, 'PELANGGARAN'),
          pencatatan: getSheetData(ss, 'PENCATATAN'),
          pembinaan: getSheetData(ss, 'PEMBINAAN')
        }
      });
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
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) {
        throw new Error("Active spreadsheet is null");
      }
    } catch (err) {
      try {
        ss = SpreadsheetApp.openById("1UJZGkmLpTV99LMdEY70VIOFlqPUVBNfjjd7rI5ZuOqM");
      } catch (e2) {
        ss = SpreadsheetApp.openById("12Lq9U__OezS7sjRZyZlkJExqWD17o-cvKx9WzVgfVCo");
      }
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

// Helper untuk format JSON
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Tangani Request Preflight OPTIONS untuk CORS
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Membaca seluruh data dari sheet tertentu sebagai array of objects
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
      // Konversi nama kolom ke key unta (camelCase)
      if (key === 'Nama Orang Tua') key = 'namaOrangTua';
      else if (key === 'No HP') key = 'noHp';
      else if (key === 'Nama Pelanggaran') key = 'namaPelanggaran';
      else if (key === 'Nama Siswa') key = 'namaSiswa';
      else if (key === 'Total Poin') key = 'totalPoin';
      else key = key.toLowerCase(); // id, nis, nama, kelas, jk, kode, kategori, poin, tanggal, petugas, keterangan, tindakan
      
      let val = row[c];
      // Format tanggal jika objek Date
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

// Menyimpan atau meng-update data siswa
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
  
  // Cari ID jika update
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

// Menyimpan atau meng-update master pelanggaran
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

// Menyimpan pencatatan pelanggaran baru dan meng-update pembinaan
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
  
  // Update akumulasi poin & status pembinaan siswa
  recalculateGuidance(ss, nis, namaSiswa);
  
  return { id, tanggal, nis, namaSiswa, kelas, pelanggaran, poin, petugas, keterangan };
}

// Menghapus baris berdasarkan ID pada sheet tertentu
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

// Menghapus pencatatan pelanggaran dan me-rekap ulang pembinaan siswa tersebut
function deleteRecordAndUpdateGuidance(ss, id) {
  const sheetPencatatan = ss.getSheetByName('PENCATATAN');
  if (!sheetPencatatan) throw new Error('Sheet PENCATATAN tidak ditemukan.');
  
  const values = sheetPencatatan.getDataRange().getValues();
  let nis = '';
  let namaSiswa = '';
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0].toString() === id.toString()) {
      nis = values[i][2].toString(); // NIS
      namaSiswa = values[i][3].toString(); // Nama Siswa
      sheetPencatatan.deleteRow(i + 1);
      break;
    }
  }
  
  if (nis) {
    recalculateGuidance(ss, nis, namaSiswa);
  }
  
  return { id: id, deleted: true };
}

// Rekapitulasi poin siswa dan update pembinaan
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
  
  // Tentukan tindakan pembinaan berdasarkan poin
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
    // Jika poin sudah kembali 0, hapus dari sheet pembinaan
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
}
