/**
 * SISTEM MONITORING PELAYANAN DAN KEBERSIHAN UMUM (SIMPEL-KU)
 * Backend Engine - Google Apps Script (GAS)
 */

const SPREADSHEET_ID = "1c2XUeoYFt_UEqJruBSciKPAIiPEdNoJvTO9epLWVTqs"; // Spreadsheet ID
const SESSION_DURATION_SEC = 21600; // Durasi sesi login: 6 Jam
const CACHE_TTL_SEC = 60;           // Cache parsed data: 60 detik (akselerasi loading)

// Pemetaan nama bulan Indonesia ke angka
const MONTH_MAP_ID = {
  'JANUARI': 1, 'FEBRUARI': 2, 'MARET': 3, 'APRIL': 4,
  'MEI': 5, 'JUNI': 6, 'JULI': 7, 'AGUSTUS': 8,
  'SEPTEMBER': 9, 'OKTOBER': 10, 'NOVEMBER': 11, 'DESEMBER': 12
};

// Kata kunci baris yang harus di-skip
const SKIP_ROW_KEYWORDS = [
  'HITUNG SKOR', 'CATATAN', 'SELAIN TUGAS', 'SELAIN TUGAS-TUGAS',
  'SELAMA JAM KERJA MENGGUNAKAN', 'SHIFT PAGI', 'SHIFT SORE', 'SHIFT MALAM'
];

/**
 * Entry point untuk Web App (Mendukung Web UI GAS & JSON API Endpoint)
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter);
  }
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Sistem Monitoring Pelayanan, Keamanan & Kebersihan (SIMPEL-KU)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Entry point untuk request POST API dari deployment eksternal
 */
function doPost(e) {
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    params = (e && e.parameter) || {};
  }
  return handleApiRequest(params);
}

/**
 * Handler pemrosesan API untuk integrasi deployment standalone / eksternal
 */
function handleApiRequest(params) {
  var result = { success: false, message: 'Invalid action' };
  var action = params.action;
  try {
    if (action === 'login') {
      result = login(params.username, params.password);
    } else if (action === 'logout') {
      result = logout(params.token);
    } else if (action === 'getDashboardData') {
      result = getDashboardData(params.token, params.bulan, params.tahun);
    } else if (action === 'getMonitoringData') {
      result = getMonitoringData(
        params.token,
        params.jenis,
        params.bulan,
        params.tahun,
        params.filterRuangan || 'SEMUA',
        params.filterStatus || 'SEMUA'
      );
    } else if (action === 'updateMonitoringStatus') {
      result = updateMonitoringStatus(
        params.token,
        params.rowIndex || params.sheetRowIndex,
        params.colIndex,
        params.newStatus,
        params.dayNum,
        params.monthNum || params.bulan,
        params.yearNum || params.tahun
      );
    } else if (action === 'getRekapMonitoring') {
      result = getRekapMonitoring(params.token, params.bulan, params.tahun);
    } else if (action === 'getJadwalKeamanan') {
      result = getJadwalKeamanan(params.token, params.bulan, params.tahun);
    } else if (action === 'changeCredentials') {
      result = changeCredentials(params.token, params.oldPassword, params.newUsername, params.newPassword);
    } else {
      result = { success: false, message: 'Aksi "' + action + '" tidak dikenali.' };
    }
  } catch (e) {
    result = { success: false, message: 'Server error: ' + e.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper untuk menyertakan file HTML parsial
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Instance Spreadsheet aktif (dengan fallback aman)
 */
let _cachedDb = null;
function getDb() {
  if (_cachedDb) return _cachedDb;
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "MASUKKAN_SPREADSHEET_ID_ANDA_DI_SINI") {
      _cachedDb = SpreadsheetApp.openById(SPREADSHEET_ID);
      return _cachedDb;
    }
  } catch (e) {
    // fallback
  }
  try {
    _cachedDb = SpreadsheetApp.getActiveSpreadsheet();
    return _cachedDb;
  } catch (e) {
    return null;
  }
}

/**
 * Mencari Sheet secara fleksibel (toleran spasi dan huruf besar/kecil)
 */
function findSheet(ss, sheetName) {
  if (!ss || !sheetName) return null;
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  var norm = function(s) { return String(s || '').toLowerCase().replace(/[\s_\-]/g, ''); };
  var targetNorm = norm(sheetName);
  var allSheets = ss.getSheets();

  // 1. Cek kecocokan normalisasi eksak
  for (var i = 0; i < allSheets.length; i++) {
    if (norm(allSheets[i].getName()) === targetNorm) {
      return allSheets[i];
    }
  }
  // 2. Cek kecocokan substring
  for (var i = 0; i < allSheets.length; i++) {
    var sNameNorm = norm(allSheets[i].getName());
    if (sNameNorm && (sNameNorm.indexOf(targetNorm) >= 0 || targetNorm.indexOf(sNameNorm) >= 0)) {
      return allSheets[i];
    }
  }
  return null;
}

/**
 * Membaca jenis tugas pegawai dari sheet mereka
 */
function getSheetJenis(sheet) {
  try {
    const maxCols = Math.min(sheet.getMaxColumns(), 5);
    const maxRows = Math.min(sheet.getMaxRows(), 4);
    const vals = sheet.getRange(1, 1, maxRows, maxCols).getValues();
    for (var r = 0; r < vals.length; r++) {
      for (var c = 0; c < vals[r].length; c++) {
        var v = String(vals[r][c] || '').toUpperCase().trim();
        if (v.indexOf('KEBERSIHAN') >= 0) return 'PIKET KEBERSIHAN KANTOR';
        if (v.indexOf('RESEPSIONIS') >= 0) return 'RESEPSIONIS';
        if (v.indexOf('KEAMANAN') >= 0) return 'KEAMANAN KANTOR';
      }
    }
  } catch (e) { /* ignore */ }
  return 'PIKET KEBERSIHAN KANTOR';
}

/**
 * Autentikasi Pengguna & Pembuatan Sesi Aman
 */
function login(username, password) {
  try {
    if (!username || !password) {
      return { success: false, message: "Username dan Password wajib diisi." };
    }

    const ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi database spreadsheet gagal. Pastikan SPREADSHEET_ID valid." };
    }

    const userSheet = findSheet(ss, "Users");
    if (!userSheet) {
      return { success: false, message: "Sheet 'Users' tidak ditemukan. Harap jalankan inisialisasi database." };
    }

    const data = userSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: false, message: "Data pengguna pada sheet 'Users' masih kosong." };
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    let matchedUser = null;

    for (let i = 1; i < data.length; i++) {
      const rowUsername = String(data[i][0] || '').trim().toLowerCase();
      const rowNamaPegawai = String(data[i][1] || '').trim();
      const rowNamaSheet = String(data[i][2] || '').trim();
      const rowPassword = String(data[i][3] || '').trim();

      if (rowUsername === cleanUsername && rowPassword === cleanPassword) {
        matchedUser = {
          username: String(data[i][0] || '').trim(),
          namaPegawai: rowNamaPegawai,
          namaSheet: rowNamaSheet
        };
        break;
      }
    }

    if (!matchedUser) {
      return { success: false, message: "Username atau Password salah." };
    }

    // Cari sheet target pegawai secara fleksibel
    let targetSheet = findSheet(ss, matchedUser.namaSheet);
    if (!targetSheet) {
      targetSheet = findSheet(ss, matchedUser.namaPegawai);
    }

    if (!targetSheet) {
      return {
        success: false,
        message: "Sheet '" + matchedUser.namaSheet + "' untuk pegawai " + matchedUser.namaPegawai + " tidak ditemukan pada spreadsheet."
      };
    }

    const actualSheetName = targetSheet.getName();
    const jenisSheet = getSheetJenis(targetSheet);

    const token = Utilities.getUuid();
    const cache = CacheService.getScriptCache();

    const sessionPayload = {
      username: matchedUser.username,
      namaPegawai: matchedUser.namaPegawai,
      namaSheet: actualSheetName,
      jenis: jenisSheet,
      loginTime: new Date().toISOString()
    };

    cache.put(token, JSON.stringify(sessionPayload), SESSION_DURATION_SEC);

    return {
      success: true,
      token: token,
      user: {
        username: matchedUser.username,
        namaPegawai: matchedUser.namaPegawai,
        jenis: jenisSheet
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan server: " + err.message };
  }
}

/**
 * Validasi Session Token dari Cache
 */
function getSessionUser(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get(token);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Mengubah Username dan/atau Password Pengguna
 * Aturan Keamanan: Pembatasan maksimal 1 kali perubahan per hari (zona waktu Asia/Jakarta).
 */
function changeCredentials(token, oldPassword, newUsername, newPassword) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    if (!oldPassword) {
      return { success: false, message: "Password saat ini wajib diisi untuk verifikasi keamanan." };
    }

    const cleanOldPass = String(oldPassword).trim();
    const cleanNewUser = newUsername ? String(newUsername).trim().toLowerCase() : '';
    const cleanNewPass = newPassword ? String(newPassword).trim() : '';

    if (!cleanNewUser && !cleanNewPass) {
      return { success: false, message: "Harap masukkan username baru atau password baru yang ingin diubah." };
    }

    if (cleanNewUser && cleanNewUser.length < 3) {
      return { success: false, message: "Username baru minimal harus terdiri dari 3 karakter." };
    }

    if (cleanNewPass && cleanNewPass.length < 4) {
      return { success: false, message: "Password baru minimal harus terdiri dari 4 karakter." };
    }

    const ss = getDb();
    if (!ss) {
      return { success: false, message: "Koneksi database gagal." };
    }

    const userSheet = findSheet(ss, "Users");
    if (!userSheet) {
      return { success: false, message: "Sheet 'Users' tidak ditemukan pada spreadsheet." };
    }

    const data = userSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: false, message: "Data pengguna kosong." };
    }

    // Pastikan header kolom ke-5 ada jika belum ada
    if (data[0].length < 5 || !data[0][4]) {
      userSheet.getRange(1, 5).setValue("Terakhir Ganti Kredensial");
      userSheet.getRange(1, 5)
        .setBackground("#1e40af")
        .setFontColor("#ffffff")
        .setFontWeight("bold");
    }

    // Cari baris pengguna saat ini
    let userRowIndex = -1;
    let currentStoredUser = null;
    const sessionUserLower = String(session.username || '').trim().toLowerCase();
    const sessionSheetLower = String(session.namaSheet || '').trim().toLowerCase().replace(/[\s_\-]/g, '');
    const sessionNamaLower = String(session.namaPegawai || '').trim().toLowerCase().replace(/[\s_\-]/g, '');

    for (let i = 1; i < data.length; i++) {
      const uName = String(data[i][0] || '').trim().toLowerCase();
      const nPeg = String(data[i][1] || '').trim().toLowerCase().replace(/[\s_\-]/g, '');
      const nSheet = String(data[i][2] || '').trim().toLowerCase().replace(/[\s_\-]/g, '');

      if (uName === sessionUserLower || nSheet === sessionSheetLower || nPeg === sessionNamaLower) {
        userRowIndex = i + 1;
        currentStoredUser = {
          username: String(data[i][0] || '').trim(),
          namaPegawai: String(data[i][1] || '').trim(),
          namaSheet: String(data[i][2] || '').trim(),
          password: String(data[i][3] || '').trim(),
          lastChange: data[i][4] ? String(data[i][4]).trim() : ''
        };
        break;
      }
    }

    if (!currentStoredUser || userRowIndex === -1) {
      return { success: false, message: "Data akun tidak ditemukan pada sheet Users." };
    }

    // Verifikasi kesesuaian password saat ini
    if (String(currentStoredUser.password).trim() !== cleanOldPass) {
      return { success: false, message: "Password saat ini salah. Perubahan kredensial ditolak." };
    }

    // Dapatkan tanggal hari ini (Format: YYYY-MM-DD) di WIB
    const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

    // Periksa apakah pengguna sudah pernah mengganti kredensial hari ini
    if (currentStoredUser.lastChange) {
      let lastDateStr = currentStoredUser.lastChange;
      if (lastDateStr.length >= 10) {
        lastDateStr = lastDateStr.substring(0, 10);
      }
      if (lastDateStr === todayStr) {
        return {
          success: false,
          message: "Anda sudah melakukan perubahan kredensial hari ini (" + todayStr + "). Pembatasan sistem: penggantian username/password hanya dapat dilakukan 1 kali dalam 1 hari. Silakan coba lagi besok."
        };
      }
    }

    // Validasi duplikasi username dengan pengguna lain
    const targetUsername = cleanNewUser ? cleanNewUser : currentStoredUser.username;
    if (cleanNewUser && cleanNewUser !== currentStoredUser.username.toLowerCase()) {
      for (let i = 1; i < data.length; i++) {
        if (i + 1 !== userRowIndex) {
          const otherUser = String(data[i][0] || '').trim().toLowerCase();
          if (otherUser === cleanNewUser) {
            return {
              success: false,
              message: "Username '" + cleanNewUser + "' sudah digunakan oleh pegawai lain. Silakan pilih username lain."
            };
          }
        }
      }
    }

    const targetPassword = cleanNewPass ? cleanNewPass : currentStoredUser.password;
    const nowTimestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    // Simpan perubahan ke sheet Users
    userSheet.getRange(userRowIndex, 1).setValue(targetUsername);
    userSheet.getRange(userRowIndex, 4).setValue(targetPassword);
    userSheet.getRange(userRowIndex, 5).setValue(nowTimestamp);

    // FLUSH LANGSUNG KE SPREADSHEET
    SpreadsheetApp.flush();

    // Perbarui sesi aktif di Cache
    const cache = CacheService.getScriptCache();
    const updatedPayload = {
      username: targetUsername,
      namaPegawai: session.namaPegawai,
      namaSheet: session.namaSheet,
      jenis: session.jenis,
      loginTime: session.loginTime || new Date().toISOString()
    };
    cache.put(token, JSON.stringify(updatedPayload), SESSION_DURATION_SEC);

    return {
      success: true,
      message: "Username dan/atau password berhasil disimpan ke spreadsheet!",
      user: {
        username: targetUsername,
        namaPegawai: session.namaPegawai,
        jenis: session.jenis
      }
    };

  } catch (err) {
    return { success: false, message: "Terjadi kesalahan: " + err.message };
  }
}

/**
 * Mengambil Data Dashboard Ringkasan Pegawai
 */
function getDashboardData(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = findSheet(ss, session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet monitoring '" + session.namaSheet + "' tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    let totalKegiatan = 0;
    let kegiatanSelesai = 0;
    let kegiatanBelum = 0;
    const progressPerRuangan = {};

    parsedData.items.forEach(item => {
      totalKegiatan += item.totalHariAktif;
      kegiatanSelesai += item.selesaiCount;
      kegiatanBelum += (item.totalHariAktif - item.selesaiCount);

      if (!progressPerRuangan[item.ruangan]) {
        progressPerRuangan[item.ruangan] = {
          ruangan: item.ruangan,
          total: 0,
          selesai: 0
        };
      }
      progressPerRuangan[item.ruangan].total += item.totalHariAktif;
      progressPerRuangan[item.ruangan].selesai += item.selesaiCount;
    });

    const persenTotal = totalKegiatan > 0 ? Math.round((kegiatanSelesai / totalKegiatan) * 100) : 0;

    const listRuangan = Object.values(progressPerRuangan).map(r => ({
      ruangan: r.ruangan,
      total: r.total,
      selesai: r.selesai,
      persen: r.total > 0 ? Math.round((r.selesai / r.total) * 100) : 0
    }));

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        username: session.username,
        jenis: parsedData.jenis,
        totalKegiatan: totalKegiatan,
        kegiatanSelesai: kegiatanSelesai,
        kegiatanBelum: kegiatanBelum,
        persenPenyelesaian: persenTotal,
        progressRuangan: listRuangan,
        totalItemMonitoring: parsedData.items.length
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengambil Data Matriks Monitoring Lengkap
 */
function getMonitoringData(token, jenis, bulan, tahun, filterRuangan, filterStatus) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = findSheet(ss, session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet monitoring '" + session.namaSheet + "' tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    let filteredItems = parsedData.items;
    if (filterRuangan && filterRuangan !== "SEMUA") {
      filteredItems = filteredItems.filter(item => item.ruangan === filterRuangan);
    }

    if (filterStatus && filterStatus !== "SEMUA") {
      filteredItems = filteredItems.filter(item => {
        const isCompleted = item.selesaiCount === item.totalHariAktif && item.totalHariAktif > 0;
        if (filterStatus === "SELESAI") return isCompleted;
        if (filterStatus === "BELUM") return !isCompleted;
        return true;
      });
    }

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        jenis: parsedData.jenis,
        daysInMonth: parsedData.daysInMonth,
        activeDays: parsedData.activeDays,
        headers: parsedData.headers,
        items: filteredItems,
        daftarRuangan: parsedData.daftarRuangan
      }
    };

  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Toggle Status Checklist
 */
function updateMonitoringStatus(token, rowIndex, colIndex, newStatus, dayNum, monthNum, yearNum) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = findSheet(ss, session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet tidak ditemukan." };
    }

    const targetRow = Number(rowIndex);
    const targetCol = Number(colIndex);

    const now = new Date();
    const todayNum = now.getDate();
    const todayMonth = now.getMonth() + 1;
    const todayYear = now.getFullYear();

    const targetDay = dayNum ? Number(dayNum) : todayNum;
    const targetMonth = monthNum ? Number(monthNum) : todayMonth;
    const targetYear = yearNum ? Number(yearNum) : todayYear;

    const cellDate = new Date(targetYear, targetMonth - 1, targetDay);
    const currentDate = new Date(todayYear, todayMonth - 1, todayNum);

    const currentVal = sheet.getRange(targetRow, targetCol).getValue();
    const isAlreadyTrue = (currentVal === true || currentVal === 1 || currentVal === '1' || currentVal === '✓');

    if (cellDate < currentDate && isAlreadyTrue && (newStatus === false || newStatus === 0 || newStatus === '0' || !newStatus)) {
      return { success: false, message: "Data pada tanggal lampau yang sudah diisi (TRUE) tidak dapat diubah kembali." };
    }

    const cellValue = (newStatus === true || newStatus === 1 || newStatus === "1" || newStatus === "✓") ? true : false;
    sheet.getRange(targetRow, targetCol).setValue(cellValue);
    
    // FLUSH LANGSUNG KE SPREADSHEET
    SpreadsheetApp.flush();

    // Hapus cache parsed sheet agar request berikutnya selalu up-to-date
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = "cache_m_" + sheet.getName() + "_" + targetMonth + "_" + targetYear;
      cache.remove(cacheKey);
    } catch (ce) { /* ignore */ }

    return { success: true, message: "Status berhasil diperbarui." };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan status: " + err.message };
  }
}

/**
 * Mengambil Data Rekapitulasi Lengkap
 */
function getRekapMonitoring(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid." };
    }

    const ss = getDb();
    const sheet = findSheet(ss, session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    const rekapJenis = {};
    const rekapRuangan = {};

    const rekapHarianMap = {};
    const rekapHarian = parsedData.activeDays.map((d, i) => {
      rekapHarianMap[d] = i;
      return { hari: d, total: 0, selesai: 0 };
    });

    parsedData.items.forEach(item => {
      const jns = item.jenis || "Kebersihan";
      if (!rekapJenis[jns]) rekapJenis[jns] = { total: 0, selesai: 0 };
      rekapJenis[jns].total += item.totalHariAktif;
      rekapJenis[jns].selesai += item.selesaiCount;

      if (!rekapRuangan[item.ruangan]) {
        rekapRuangan[item.ruangan] = { ruangan: item.ruangan, total: 0, selesai: 0, itemCount: 0 };
      }
      rekapRuangan[item.ruangan].total += item.totalHariAktif;
      rekapRuangan[item.ruangan].selesai += item.selesaiCount;
      rekapRuangan[item.ruangan].itemCount += 1;

      parsedData.activeDays.forEach(d => {
        const isDone = item.dailyStatus[d] === "1" || item.dailyStatus[d] === 1;
        const idx = rekapHarianMap[d];
        if (idx !== undefined) {
          rekapHarian[idx].total += 1;
          if (isDone) rekapHarian[idx].selesai += 1;
        }
      });
    });

    return {
      success: true,
      data: {
        namaPegawai: session.namaPegawai,
        jenis: parsedData.jenis,
        rekapJenis: rekapJenis,
        rekapRuangan: Object.values(rekapRuangan),
        rekapHarian: rekapHarian,
        totalItems: parsedData.items.length
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengambil Jadwal Piket Keamanan dari sheet JadwalPiketSecurity
 */
function getJadwalKeamanan(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    const jadwalSheet = findSheet(ss, "JadwalPiketSecurity");
    if (!jadwalSheet) {
      return { success: false, message: "Sheet 'JadwalPiketSecurity' tidak ditemukan." };
    }

    const values = jadwalSheet.getDataRange().getValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);

    const HEADER_ROW  = 1;
    const DATE_ROW    = 2;
    const DAY_ROW     = 3;
    const DATA_START  = 4;

    const monthStartColMap = {};
    const headerRow = values[HEADER_ROW] || [];
    headerRow.forEach(function(cell, colIdx) {
      if (cell && typeof cell === 'string') {
        var mNum = MONTH_MAP_ID[cell.trim().toUpperCase()];
        if (mNum) monthStartColMap[mNum] = colIdx;
      }
    });

    const monthStartCol = monthStartColMap[selectedMonth];
    if (monthStartCol === undefined) {
      return { success: false, message: "Data jadwal untuk bulan ini belum tersedia di spreadsheet." };
    }

    const dateRow = values[DATE_ROW] || [];
    var monthEndCol = dateRow.length - 1;
    Object.values(monthStartColMap).forEach(function(startCol) {
      if (startCol > monthStartCol && startCol <= monthEndCol) {
        monthEndCol = startCol - 1;
      }
    });

    const dayRow = values[DAY_ROW] || [];
    const schedCols = [];
    for (var c = monthStartCol; c <= monthEndCol; c++) {
      var dayNum = dateRow[c];
      if (typeof dayNum === 'number' && dayNum >= 1 && dayNum <= 31) {
        schedCols.push({
          colIdx: c,
          tanggal: dayNum,
          hari: String(dayRow[c] || '').trim()
        });
      }
    }

    const namaPegawai = session.namaPegawai;
    var employeeRowIdx = -1;
    var normalize = function(s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); };
    var normTarget = normalize(namaPegawai);

    for (var r = DATA_START; r < values.length; r++) {
      var namaCel = String(values[r][1] || '').trim();
      if (!namaCel) continue;
      if (normalize(namaCel) === normTarget) {
        employeeRowIdx = r;
        break;
      }
      var firstWordTarget = normTarget.split('')[0] !== '' ? normTarget.substring(0, 4) : '';
      if (firstWordTarget && normalize(namaCel).indexOf(firstWordTarget) === 0) {
        employeeRowIdx = r;
        break;
      }
    }

    if (employeeRowIdx === -1) {
      return { success: false, message: "Jadwal untuk '" + namaPegawai + "' tidak ditemukan di JadwalPiketSecurity." };
    }

    const SHIFT_LABEL = { 'P': 'Pagi', 'S': 'Sore', 'M': 'Malam', 'O': 'Libur' };
    const empRow = values[employeeRowIdx];

    const jadwal = schedCols.map(function(col) {
      var kode = String(empRow[col.colIdx] || '').trim().toUpperCase();
      return {
        tanggal: col.tanggal,
        hari: col.hari,
        kodeShift: kode,
        namaShift: SHIFT_LABEL[kode] || kode,
        isLibur: kode === 'O'
      };
    });

    var summary = { P: 0, S: 0, M: 0, O: 0 };
    jadwal.forEach(function(j) {
      if (j.kodeShift in summary) summary[j.kodeShift]++;
    });

    let taskItems = [];
    const empSheet = findSheet(ss, session.namaSheet);
    if (empSheet) {
      const parsedTasks = readSheetMonitoring(empSheet, bulan, tahun);
      taskItems = parsedTasks.items || [];
    }

    return {
      success: true,
      data: {
        namaPegawai: namaPegawai,
        jadwal: jadwal,
        summary: summary,
        totalHariKerja: (summary.P || 0) + (summary.S || 0) + (summary.M || 0),
        taskItems: taskItems
      }
    };

  } catch (err) {
    return { success: false, message: "Gagal memuat jadwal: " + err.message };
  }
}

/**
 * Logout & Menghapus Sesi Pengguna
 */
function logout(token) {
  try {
    if (token) {
      const cache = CacheService.getScriptCache();
      cache.remove(token);
    }
    return { success: true };
  } catch (err) {
    return { success: true };
  }
}

/**
 * ENGINE PARSER DATA SPREADSHEET (Dengan Caching Pintar untuk Akselerasi Cepat)
 */
function readSheetMonitoring(sheet, bulan, tahun) {
  const now = new Date();
  const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);
  const selectedYear = tahun ? Number(tahun) : now.getFullYear();

  // Cek cache memori untuk menghindari re-parsing berulang
  const cacheKey = "cache_m_" + sheet.getName() + "_" + selectedMonth + "_" + selectedYear;
  try {
    const cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (ce) { /* ignore cache read error */ }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 3) {
    return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
  }

  // 1. Temukan baris tanggal
  let dateRowIdx = -1;
  for (let r = 0; r < Math.min(6, values.length); r++) {
    const numCount = values[r].filter(v => typeof v === 'number' && v >= 1 && v <= 31).length;
    if (numCount >= 20) {
      dateRowIdx = r;
      break;
    }
  }

  if (dateRowIdx === -1) {
    let maxCount = 0;
    for (let r = 0; r < Math.min(6, values.length); r++) {
      const numCount = values[r].filter(v => typeof v === 'number' && v >= 1 && v <= 31).length;
      if (numCount > maxCount) { maxCount = numCount; dateRowIdx = r; }
    }
    if (maxCount < 5) {
      return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
    }
  }

  const monthHeaderRowIdx = dateRowIdx - 1;

  // 2. Ekstrak jenis monitoring
  let jenis = 'Kebersihan';
  for (let r = 0; r <= Math.max(0, monthHeaderRowIdx); r++) {
    for (let c = 0; c < Math.min(values[r].length, 5); c++) {
      const cellVal = String(values[r][c] || '').toUpperCase().trim();
      if (cellVal.includes('KEBERSIHAN')) { jenis = 'Kebersihan'; }
      else if (cellVal.includes('RESEPSIONIS') || cellVal.includes('PELAYANAN')) { jenis = 'Pelayanan'; }
      else if (cellVal.includes('KEAMANAN')) { jenis = 'Keamanan'; }
    }
  }

  // 3. Bangun peta bulan
  const monthStartColMap = {};
  if (monthHeaderRowIdx >= 0) {
    values[monthHeaderRowIdx].forEach((cell, colIdx) => {
      if (cell && typeof cell === 'string') {
        const mNum = MONTH_MAP_ID[cell.trim().toUpperCase()];
        if (mNum) monthStartColMap[mNum] = colIdx;
      }
    });
  }

  // 4. Kolom kegiatan
  const dateRow = values[dateRowIdx];
  let firstDateColIdx = -1;
  for (let c = 0; c < dateRow.length; c++) {
    if (typeof dateRow[c] === 'number' && dateRow[c] >= 1 && dateRow[c] <= 31) {
      firstDateColIdx = c;
      break;
    }
  }

  if (firstDateColIdx < 0) {
    return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis };
  }

  const kegiatanColIdx = firstDateColIdx > 0 ? firstDateColIdx - 1 : 0;

  // 5. Rentang kolom bulan terpilih
  let monthStartCol = monthStartColMap[selectedMonth];

  if (monthStartCol === undefined) {
    if (Object.keys(monthStartColMap).length === 0) {
      monthStartCol = firstDateColIdx;
    } else {
      return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis };
    }
  }

  let monthEndCol = dateRow.length - 1;
  Object.values(monthStartColMap).forEach(startCol => {
    if (startCol > monthStartCol && startCol <= monthEndCol) {
      monthEndCol = startCol - 1;
    }
  });

  // 6. Peta hari -> kolom aktual
  const dayColMap = {};
  const activeDays = [];

  for (let c = monthStartCol; c <= monthEndCol; c++) {
    const dayNum = dateRow[c];
    if (typeof dayNum === 'number' && dayNum >= 1 && dayNum <= 31) {
      dayColMap[dayNum] = c + 1;
      activeDays.push(dayNum);
    }
  }

  activeDays.sort((a, b) => a - b);
  const daysInMonth = activeDays.length > 0 ? Math.max.apply(null, activeDays) : 30;

  // 7. Parse baris kegiatan
  const dataStartRow = dateRowIdx + 2;
  let currentRuangan = 'Umum';
  const items = [];
  const ruanganSet = new Set();

  for (let r = dataStartRow; r < values.length; r++) {
    const row = values[r];
    const kegiatanRaw = row[kegiatanColIdx];
    const kegiatanText = String(kegiatanRaw !== null && kegiatanRaw !== undefined ? kegiatanRaw : '').trim();

    if (!kegiatanText) continue;

    const upperText = kegiatanText.toUpperCase();
    let shouldSkip = false;
    for (let k = 0; k < SKIP_ROW_KEYWORDS.length; k++) {
      if (upperText === SKIP_ROW_KEYWORDS[k] || upperText.indexOf(SKIP_ROW_KEYWORDS[k]) === 0) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    let hasCheckboxData = false;
    for (let di = 0; di < activeDays.length; di++) {
      const d = activeDays[di];
      const val = row[dayColMap[d] - 1];
      if (val === true || val === false) {
        hasCheckboxData = true;
        break;
      }
    }

    if (!hasCheckboxData) {
      currentRuangan = kegiatanText;
      ruanganSet.add(currentRuangan);
      continue;
    }

    ruanganSet.add(currentRuangan);

    const dailyStatus = {};
    let selesaiCount = 0;

    activeDays.forEach(d => {
      const colIdx0 = dayColMap[d] - 1;
      const val = row[colIdx0];
      if (val === true || val === 1 || val === '1' || val === '✓') {
        dailyStatus[d] = '1';
        selesaiCount++;
      } else if (val === false || val === 0 || val === '0') {
        dailyStatus[d] = '0';
      } else {
        dailyStatus[d] = '-';
      }
    });

    items.push({
      sheetRowIndex: r + 1,
      ruangan: currentRuangan,
      jenis: jenis,
      kegiatan: kegiatanText,
      dailyStatus: dailyStatus,
      colMapping: dayColMap,
      totalHariAktif: activeDays.length,
      selesaiCount: selesaiCount
    });
  }

  const result = {
    items: items,
    daysInMonth: daysInMonth,
    activeDays: activeDays,
    headers: dateRow,
    daftarRuangan: Array.from(ruanganSet),
    jenis: jenis
  };

  // Simpan ke CacheService untuk akselerasi
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), CACHE_TTL_SEC);
  } catch (ce) { /* ignore cache write error */ }

  return result;
}

/**
 * FUNGSI SETUP DATABASE OTOMATIS
 */
function setupAllUsers() {
  const ss = getDb();
  if (!ss) return "Koneksi database gagal.";

  let userSheet = ss.getSheetByName("Users");
  if (!userSheet) {
    userSheet = ss.insertSheet("Users");
  } else {
    userSheet.clear();
  }

  userSheet.getRange(1, 1, 1, 5).setValues([["Username", "Nama Pegawai", "Nama Sheet", "Password", "Terakhir Ganti Kredensial"]]);
  userSheet.getRange(1, 1, 1, 5)
    .setBackground("#1e40af")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  const allUsers = [
    ["dede",           "Nurramadhanial",    "Nurramadhanial",    "dede123",  ""],
    ["slamet",         "Slamet Riyadi",     "SlametRiyadi",      "slamet123", ""],
    ["syukri",         "M. Syukri",         "MSyukri",           "syukri123", ""],
    ["ramadhan",       "Ramadhan",          "Ramadhan",          "rama123",   ""],
    ["yuni",           "Yuni Juniarti",     "YuniJuniarti",      "yuni123",   ""],
    ["rania",          "Rania Naila Husna", "RaniaNailaHusna",   "rania123",  ""],
    ["alfiana",        "Alfiana Ayuni",     "AlfianaAyuni",      "alfiana123",""],
    ["mawardi",        "Mawardi",           "Mawardi",           "mawardi123",""],
    ["eddy",           "Eddy Suryadi",      "EddySuryadi",       "eddy123",   ""],
    ["reza",           "Sy. Reza Nopriadrian", "SyReza",         "reza123",   ""],
    ["feri",           "Feri Yustami",      "FeriYustami",       "feri123",   ""],
    ["eko",            "Eko Prasetyo",      "EkoPrasetyo",       "eko123",   ""],
    ["agus",           "Agus Tetriansyah",  "AgusTetriansyah",   "agus123",   ""],
    ["rizki",          "Rizki Fadil",       "RizkiFadil",        "rizki123",  ""]
  ];

  userSheet.getRange(2, 1, allUsers.length, 5).setValues(allUsers);
  userSheet.autoResizeColumns(1, 5);
  SpreadsheetApp.flush();

  return "Setup Users Berhasil! " + allUsers.length + " pengguna telah ditambahkan.";
}

function setupSampleDatabase() {
  return setupAllUsers();
}