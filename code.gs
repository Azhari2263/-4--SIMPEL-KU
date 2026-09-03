/**
 * SISTEM MONITORING PELAYANAN DAN KEBERSIHAN UMUM
 * Backend Engine - Google Apps Script (GAS)
 * Pengaturan:
 * Masukkan ID Google Spreadsheet Anda pada konstanta SPREADSHEET_ID di bawah ini.
 */

const SPREADSHEET_ID = "1c2XUeoYFt_UEqJruBSciKPAIiPEdNoJvTO9epLWVTqs"; // Ganti dengan Spreadsheet ID Anda
const SESSION_DURATION_SEC = 21600; // Durasi sesi login: 6 Jam

// Pemetaan nama bulan Indonesia ke angka
const MONTH_MAP_ID = {
  'JANUARI': 1, 'FEBRUARI': 2, 'MARET': 3, 'APRIL': 4,
  'MEI': 5, 'JUNI': 6, 'JULI': 7, 'AGUSTUS': 8,
  'SEPTEMBER': 9, 'OKTOBER': 10, 'NOVEMBER': 11, 'DESEMBER': 12
};

// Kata kunci baris yang harus di-skip (bukan baris kegiatan dan bukan baris header bagian)
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
    .setTitle('Sistem Monitoring Pelayanan & Kebersihan')
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
 * Handler pemrosesan API untuk integrasi deployment standalone/eksternal
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
 * Helper untuk menyertakan file HTML parsial (CSS & JS)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Mendapatkan instance Spreadsheet yang aktif
 */
function getDb() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "MASUKKAN_SPREADSHEET_ID_ANDA_DI_SINI") {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Membaca jenis tugas pegawai dari beberapa baris pertama sheet mereka.
 * Mengembalikan salah satu dari: 'PIKET KEBERSIHAN KANTOR' | 'RESEPSIONIS' | 'KEAMANAN KANTOR'
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
  return 'PIKET KEBERSIHAN KANTOR'; // default
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
    const userSheet = ss.getSheetByName("Users");

    if (!userSheet) {
      return { success: false, message: "Sheet 'Users' tidak ditemukan. Harap jalankan inisialisasi database." };
    }

    const data = userSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: false, message: "Data pengguna masih kosong." };
    }

    // Header index: Username (0), Nama Pegawai (1), Nama Sheet (2), Password (3)
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    let matchedUser = null;

    for (let i = 1; i < data.length; i++) {
      const rowUsername = String(data[i][0]).trim().toLowerCase();
      const rowNamaPegawai = String(data[i][1]).trim();
      const rowNamaSheet = String(data[i][2]).trim();
      const rowPassword = String(data[i][3]).trim();

      if (rowUsername === cleanUsername && rowPassword === cleanPassword) {
        matchedUser = {
          username: data[i][0],
          namaPegawai: rowNamaPegawai,
          namaSheet: rowNamaSheet
        };
        break;
      }
    }

    if (!matchedUser) {
      return { success: false, message: "Username atau Password salah." };
    }

    // Validasi apakah sheet pegawai benar-benar ada
    const targetSheet = ss.getSheetByName(matchedUser.namaSheet);
    if (!targetSheet) {
      return {
        success: false,
        message: "Sheet '" + matchedUser.namaSheet + "' untuk pegawai ini tidak ditemukan pada spreadsheet."
      };
    }

    // Baca jenis tugas dari header sheet pegawai
    const jenisSheet = getSheetJenis(targetSheet);

    // Buat token sesi aman menggunakan CacheService
    const token = Utilities.getUuid();
    const cache = CacheService.getScriptCache();

    const sessionPayload = {
      username: matchedUser.username,
      namaPegawai: matchedUser.namaPegawai,
      namaSheet: matchedUser.namaSheet,
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
 *
 * @param {string} token - Session Token
 * @param {string} oldPassword - Password saat ini
 * @param {string} newUsername - Username baru
 * @param {string} newPassword - Password baru (opsional jika hanya ubah username)
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
    const userSheet = ss.getSheetByName("Users");
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

    // Cari user saat ini berdasarkan username / namaSheet
    let userRowIndex = -1; // 1-based index baris sheet
    let currentStoredUser = null;

    for (let i = 1; i < data.length; i++) {
      const uName = String(data[i][0] || '').trim().toLowerCase();
      const nSheet = String(data[i][2] || '').trim();

      if (uName === String(session.username).trim().toLowerCase() || nSheet === session.namaSheet) {
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
    if (currentStoredUser.password !== cleanOldPass) {
      return { success: false, message: "Password saat ini salah. Perubahan kredensial ditolak." };
    }

    // Dapatkan tanggal hari ini (Format: YYYY-MM-DD)
    const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

    // Periksa apakah pengguna sudah pernah mengganti kredensial hari ini
    if (currentStoredUser.lastChange) {
      let lastDateStr = currentStoredUser.lastChange;
      if (lastDateStr.length > 10) {
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

    // Simpan ke sheet Users (Kolom A, D, E)
    userSheet.getRange(userRowIndex, 1).setValue(targetUsername);
    userSheet.getRange(userRowIndex, 4).setValue(targetPassword);
    userSheet.getRange(userRowIndex, 5).setValue(nowTimestamp);

    // Perbarui data sesi di Cache
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
      message: "Username dan/atau password berhasil diperbarui!",
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
    const sheet = ss.getSheetByName(session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet monitoring tidak ditemukan." };
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
 * Mengambil Data Matriks Monitoring Lengkap (Kebersihan / Pelayanan / Keamanan)
 */
function getMonitoringData(token, jenis, bulan, tahun, filterRuangan, filterStatus) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = ss.getSheetByName(session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet monitoring tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    // Filter Ruangan
    let filteredItems = parsedData.items;
    if (filterRuangan && filterRuangan !== "SEMUA") {
      filteredItems = filteredItems.filter(item => item.ruangan === filterRuangan);
    }

    // Filter Status (Selesai / Belum)
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
 * Toggle Status Checklist — Menyimpan langsung ke kolom spreadsheet yang tepat
 * @param {string} token - Session token
 * @param {number} rowIndex - Baris spreadsheet (1-based) dari item kegiatan
 * @param {number} colIndex - Kolom spreadsheet (1-based) untuk tanggal yang diklik
 * @param {boolean} newStatus - Status baru: true = selesai, false = belum
 */
function updateMonitoringStatus(token, rowIndex, colIndex, newStatus, dayNum, monthNum, yearNum) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const ss = getDb();
    const sheet = ss.getSheetByName(session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet tidak ditemukan." };
    }

    const targetRow = Number(rowIndex);
    const targetCol = Number(colIndex); // Kolom spreadsheet aktual (1-based)

    // Cek tanggal cell vs tanggal hari ini
    const now = new Date();
    const todayNum = now.getDate();
    const todayMonth = now.getMonth() + 1;
    const todayYear = now.getFullYear();

    const targetDay = dayNum ? Number(dayNum) : todayNum;
    const targetMonth = monthNum ? Number(monthNum) : todayMonth;
    const targetYear = yearNum ? Number(yearNum) : todayYear;

    const cellDate = new Date(targetYear, targetMonth - 1, targetDay);
    const currentDate = new Date(todayYear, todayMonth - 1, todayNum);

    // Cek nilai cell saat ini pada spreadsheet
    const currentVal = sheet.getRange(targetRow, targetCol).getValue();
    const isAlreadyTrue = (currentVal === true || currentVal === 1 || currentVal === '1' || currentVal === '✓');

    // Jika cell bertanggal lampau (sebelum hari ini) DAN sudah TRUE, kunci pengubahan
    if (cellDate < currentDate && isAlreadyTrue && (newStatus === false || newStatus === 0 || newStatus === '0' || !newStatus)) {
      return { success: false, message: "Data pada tanggal lampau yang sudah diisi (TRUE) tidak dapat diubah kembali." };
    }

    // Simpan sebagai boolean sesuai format Excel asli (TRUE/FALSE)
    const cellValue = (newStatus === true || newStatus === 1 || newStatus === "1" || newStatus === "✓") ? true : false;
    sheet.getRange(targetRow, targetCol).setValue(cellValue);

    return { success: true, message: "Status berhasil diperbarui." };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan status: " + err.message };
  }
}

/**
 * Mengambil Data Rekapitulasi Lengkap untuk Visualisasi dan Chart
 */
function getRekapMonitoring(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid." };
    }

    const ss = getDb();
    const sheet = ss.getSheetByName(session.namaSheet);
    if (!sheet) {
      return { success: false, message: "Sheet tidak ditemukan." };
    }

    const parsedData = readSheetMonitoring(sheet, bulan, tahun);

    // Rekap Berdasarkan Jenis
    const rekapJenis = {};

    // Rekap Berdasarkan Ruangan
    const rekapRuangan = {};

    // Rekap Per Hari — berdasarkan activeDays (bukan 1..31)
    const rekapHarianMap = {}; // dayNum → index
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

      // Iterasi hari aktif
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
 * Mengambil Jadwal Piket Keamanan dari sheet JadwalPiketSecurity.
 * Membaca jadwal berdasarkan nama pegawai yang login dan bulan yang dipilih.
 * Kode shift: P=Pagi, S=Sore, M=Malam, O=Libur
 */
function getJadwalKeamanan(token, bulan, tahun) {
  try {
    const session = getSessionUser(token);
    if (!session) {
      return { success: false, message: "Sesi tidak valid. Silakan login kembali." };
    }

    const ss = getDb();
    const jadwalSheet = ss.getSheetByName("JadwalPiketSecurity");
    if (!jadwalSheet) {
      return { success: false, message: "Sheet 'JadwalPiketSecurity' tidak ditemukan." };
    }

    const values = jadwalSheet.getDataRange().getValues();
    const selectedMonth = bulan ? Number(bulan) : (new Date().getMonth() + 1);

    // Struktur JadwalPiketSecurity:
    // Baris 2 (index 1): 'NO', 'KEAMANAN KANTOR', ..., 'SEPTEMBER', ...
    // Baris 3 (index 2): tanggal (angka)
    // Baris 4 (index 3): nama hari
    // Baris 5+ (index 4+): data pegawai dan kode shift
    const HEADER_ROW  = 1; // 0-based index
    const DATE_ROW    = 2;
    const DAY_ROW     = 3;
    const DATA_START  = 4;

    // Bangun peta bulan → kolom awal
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

    // Tentukan rentang akhir kolom bulan yang dipilih
    const dateRow = values[DATE_ROW] || [];
    var monthEndCol = dateRow.length - 1;
    Object.values(monthStartColMap).forEach(function(startCol) {
      if (startCol > monthStartCol && startCol <= monthEndCol) {
        monthEndCol = startCol - 1;
      }
    });

    // Kumpulkan kolom untuk bulan terpilih (hanya kolom dengan tanggal valid)
    const dayRow = values[DAY_ROW] || [];
    const schedCols = []; // [{colIdx, tanggal, hari}]
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

    // Cari baris pegawai berdasarkan namaPegawai (kolom B = index 1)
    const namaPegawai = session.namaPegawai;
    var employeeRowIdx = -1;
    var normalize = function(s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); };
    var normTarget = normalize(namaPegawai);

    for (var r = DATA_START; r < values.length; r++) {
      var namaCel = String(values[r][1] || '').trim();
      if (!namaCel) continue;
      // Exact match atau normalized match
      if (normalize(namaCel) === normTarget) {
        employeeRowIdx = r;
        break;
      }
      // Partial: nama depan sama
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

    // Bangun array jadwal
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

    // Rekapitulasi shift
    var summary = { P: 0, S: 0, M: 0, O: 0 };
    jadwal.forEach(function(j) {
      if (j.kodeShift in summary) summary[j.kodeShift]++;
    });

    // Membaca data tugas dari sheet pegawai
    let taskItems = [];
    const empSheet = ss.getSheetByName(session.namaSheet);
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
 * ═══════════════════════════════════════════════════════════════
 * ENGINE PARSER DATA SPREADSHEET — VERSI BARU
 * Mendukung struktur spreadsheet nyata:
 *
 * Baris 1 : Judul (misal: "PIKET KEBERSIHAN KANTOR") + nama bulan
 *            di kolom pertama setiap blok bulan
 * Baris 2 : Nomor tanggal (1-31). Kolom dengan nilai None = libur/separator
 * Baris 3 : Nama hari (Sel, Ra, Ka, Ju, Sa, Mi, Sen)
 * Baris 4+: Baris kegiatan (teks + True/False di kolom tanggal)
 *            atau header ruangan/section (hanya teks, semua kolom tanggal = null)
 * ═══════════════════════════════════════════════════════════════
 */
function readSheetMonitoring(sheet, bulan, tahun) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 3) {
    return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
  }

  const now = new Date();
  const selectedMonth = bulan ? Number(bulan) : (now.getMonth() + 1);

  // ── LANGKAH 1: Temukan baris tanggal ──────────────────────────────────────
  // Baris tanggal ditandai dengan banyak angka 1-31 (setidaknya 20 angka)
  let dateRowIdx = -1;
  for (let r = 0; r < Math.min(6, values.length); r++) {
    const numCount = values[r].filter(v => typeof v === 'number' && v >= 1 && v <= 31).length;
    if (numCount >= 20) {
      dateRowIdx = r;
      break;
    }
  }

  if (dateRowIdx === -1) {
    // Fallback: cari baris dengan paling banyak angka 1-31
    let maxCount = 0;
    for (let r = 0; r < Math.min(6, values.length); r++) {
      const numCount = values[r].filter(v => typeof v === 'number' && v >= 1 && v <= 31).length;
      if (numCount > maxCount) { maxCount = numCount; dateRowIdx = r; }
    }
    if (maxCount < 5) {
      return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis: 'Kebersihan' };
    }
  }

  const monthHeaderRowIdx = dateRowIdx - 1; // Baris di atas baris tanggal = nama bulan

  // ── LANGKAH 2: Ekstrak jenis monitoring dari baris judul ──────────────────
  let jenis = 'Kebersihan';
  for (let r = 0; r <= Math.max(0, monthHeaderRowIdx); r++) {
    for (let c = 0; c < Math.min(values[r].length, 5); c++) {
      const cellVal = String(values[r][c] || '').toUpperCase().trim();
      if (cellVal.includes('KEBERSIHAN')) { jenis = 'Kebersihan'; }
      else if (cellVal.includes('RESEPSIONIS') || cellVal.includes('PELAYANAN')) { jenis = 'Pelayanan'; }
      else if (cellVal.includes('KEAMANAN')) { jenis = 'Keamanan'; }
    }
  }

  // ── LANGKAH 3: Bangun peta bulan → kolom awal dari baris nama bulan ───────
  const monthStartColMap = {}; // monthNum → colIdx (0-based)
  if (monthHeaderRowIdx >= 0) {
    values[monthHeaderRowIdx].forEach((cell, colIdx) => {
      if (cell && typeof cell === 'string') {
        const mNum = MONTH_MAP_ID[cell.trim().toUpperCase()];
        if (mNum) monthStartColMap[mNum] = colIdx;
      }
    });
  }

  // ── LANGKAH 4: Tentukan kolom kegiatan ────────────────────────────────────
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

  // Kolom kegiatan = kolom tepat sebelum kolom tanggal pertama
  const kegiatanColIdx = firstDateColIdx > 0 ? firstDateColIdx - 1 : 0;

  // ── LANGKAH 5: Tentukan rentang kolom untuk bulan yang dipilih ────────────
  let monthStartCol = monthStartColMap[selectedMonth];

  if (monthStartCol === undefined) {
    if (Object.keys(monthStartColMap).length === 0) {
      // Sheet tanpa header bulan (single-month) → gunakan kolom pertama tanggal
      monthStartCol = firstDateColIdx;
    } else {
      // Bulan tidak ada di sheet ini
      return { items: [], daysInMonth: 30, activeDays: [], daftarRuangan: [], headers: [], jenis };
    }
  }

  // Cari akhir kolom bulan yang dipilih
  let monthEndCol = dateRow.length - 1;
  Object.values(monthStartColMap).forEach(startCol => {
    if (startCol > monthStartCol && startCol <= monthEndCol) {
      monthEndCol = startCol - 1;
    }
  });

  // ── LANGKAH 6: Bangun peta hari → kolom spreadsheet aktual (1-based) ──────
  const dayColMap = {}; // dayNum → spreadsheet col (1-based, untuk getRange)
  const activeDays = [];

  for (let c = monthStartCol; c <= monthEndCol; c++) {
    const dayNum = dateRow[c];
    if (typeof dayNum === 'number' && dayNum >= 1 && dayNum <= 31) {
      dayColMap[dayNum] = c + 1; // 1-based spreadsheet column
      activeDays.push(dayNum);
    }
  }

  activeDays.sort((a, b) => a - b);
  const daysInMonth = activeDays.length > 0 ? Math.max.apply(null, activeDays) : 30;

  // ── LANGKAH 7: Parse baris kegiatan mulai dari baris setelah nama hari ─────
  const dataStartRow = dateRowIdx + 2; // Lewati baris tanggal + baris nama hari
  let currentRuangan = 'Umum';
  const items = [];
  const ruanganSet = new Set();

  for (let r = dataStartRow; r < values.length; r++) {
    const row = values[r];
    const kegiatanRaw = row[kegiatanColIdx];
    const kegiatanText = String(kegiatanRaw !== null && kegiatanRaw !== undefined ? kegiatanRaw : '').trim();

    if (!kegiatanText) continue;

    // Skip baris yang mengandung kata kunci khusus
    const upperText = kegiatanText.toUpperCase();
    let shouldSkip = false;
    for (let k = 0; k < SKIP_ROW_KEYWORDS.length; k++) {
      if (upperText === SKIP_ROW_KEYWORDS[k] || upperText.indexOf(SKIP_ROW_KEYWORDS[k]) === 0) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    // Deteksi: header ruangan vs baris kegiatan
    // Header ruangan = ada teks tapi SEMUA kolom tanggal aktif bernilai null (tidak ada True/False)
    let hasCheckboxData = false;
    for (let di = 0; di < activeDays.length; di++) {
      const d = activeDays[di];
      const val = row[dayColMap[d] - 1]; // 0-based index
      if (val === true || val === false) {
        hasCheckboxData = true;
        break;
      }
    }

    if (!hasCheckboxData) {
      // Header ruangan/section
      currentRuangan = kegiatanText;
      ruanganSet.add(currentRuangan);
      continue;
    }

    // Baris kegiatan — parse status harian
    ruanganSet.add(currentRuangan);

    const dailyStatus = {};
    let selesaiCount = 0;

    activeDays.forEach(d => {
      const colIdx0 = dayColMap[d] - 1; // 0-based index untuk values[]
      const val = row[colIdx0];
      if (val === true || val === 1 || val === '1' || val === '✓') {
        dailyStatus[d] = '1'; // TRUE / Tercentang
        selesaiCount++;
      } else if (val === false || val === 0 || val === '0') {
        dailyStatus[d] = '0'; // FALSE / Red Checkbox (Wajib Dicentang)
      } else {
        dailyStatus[d] = '-'; // Blank / Grey cell (Bebas Tugas)
      }
    });

    items.push({
      sheetRowIndex: r + 1,         // 1-based, untuk sheet.getRange(row, col)
      ruangan: currentRuangan,
      jenis: jenis,
      kegiatan: kegiatanText,
      dailyStatus: dailyStatus,
      colMapping: dayColMap,        // dayNum → spreadsheet col (1-based)
      totalHariAktif: activeDays.length,
      selesaiCount: selesaiCount
    });
  }

  return {
    items: items,
    daysInMonth: daysInMonth,
    activeDays: activeDays,
    headers: dateRow,
    daftarRuangan: Array.from(ruanganSet),
    jenis: jenis
  };
}

/**
 * FUNGSI SETUP DATABASE OTOMATIS
 * Jalankan fungsi ini sekali dari Script Editor untuk mengisi sheet Users
 * dengan seluruh pegawai yang ada di spreadsheet.
 */
function setupAllUsers() {
  const ss = getDb();

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

  // Daftar lengkap pegawai sesuai sheet yang ada di spreadsheet
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

  return "Setup Users Berhasil! " + allUsers.length + " pengguna telah ditambahkan.";
}

/**
 * @deprecated Gunakan setupAllUsers() untuk data nyata
 * Fungsi lama untuk keperluan backward-compatibility
 */
function setupSampleDatabase() {
  return setupAllUsers();
}