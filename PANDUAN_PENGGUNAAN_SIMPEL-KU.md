# 📘 BUKU PANDUAN PENGGUNAAN APLIKASI
## **SIMPEL-KU**
### *(Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum)*
**Badan Pusat Statistik (BPS) Provinsi Kalimantan Barat**

---

## 📑 DAFTAR ISI
1. [Tentang Aplikasi SIMPEL-KU](#1-tentang-aplikasi-simpel-ku)
2. [Akses dan Autentikasi Pengguna](#2-akses-dan-autentikasi-pengguna)
   - 2.1 Membuka Aplikasi
   - 2.2 Langkah Login
   - 2.3 Durasi Sesi & Logout
3. [Mengenal Antarmuka & Navigasi](#3-mengenal-antarmuka--navigasi)
   - 3.1 Sidebar & Fitur Ciutkan (Collapse)
   - 3.2 Topbar & Pemilih Periode Global (Bulan/Tahun)
   - 3.3 Penyesuaian Menu Berdasarkan Peran (Role)
4. [Panduan Modul: Dashboard Ringkasan](#4-panduan-modul-dashboard-ringkasan)
5. [Panduan Modul: Monitoring Kebersihan & Pelayanan](#5-panduan-modul-monitoring-kebersihan--pelayanan)
   - 5.1 Mode Tampilan Harian (Kartu & Tabel)
   - 5.2 Mode Tampilan Mingguan
   - 5.3 Mode Tampilan Bulanan
   - 5.4 Fitur Filter Ruangan, Status, dan Pencarian
   - 5.5 Aturan & Validasi Checklist (Hari Ini vs Tanggal Lampau)
   - 5.6 Penanganan Hari Libur (Sabtu & Minggu)
6. [Panduan Modul: Monitoring & Piket Keamanan (Satpam)](#6-panduan-modul-monitoring--piket-keamanan-satpam)
   - 6.1 Ringkasan Shift Kerja
   - 6.2 Memilih Tanggal & Melihat Kode Shift
   - 6.3 Mengisi Checklist Tugas Shift (Pagi, Jam Kerja, Malam)
7. [Panduan Modul: Rekapitulasi & Visualisasi](#7-panduan-modul-rekapitulasi--visualisasi)
   - 7.1 Grafik Tren Harian & Pencapaian Ruangan
   - 7.2 Tabel Rekapitulasi Per Ruangan
8. [Panduan Modul: Profil Akun & Ganti Kredensial](#8-panduan-modul-profil-akun--ganti-kredensial)
   - 8.1 Melihat Informasi Akun
   - 8.2 Prosedur Ganti Username & Password Mandiri
9. [Tanya Jawab (FAQ) & Penyelesaian Masalah](#9-tanya-jawab-faq--penyelesaian-masalah)

---

## 1. Tentang Aplikasi SIMPEL-KU

**SIMPEL-KU** (*Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum*) adalah aplikasi berbasis web yang dirancang khusus untuk memonitor, mencatat, dan merekapitulasi pelaksanaan tugas harian petugas pendukung di lingkungan **BPS Provinsi Kalimantan Barat**.

### 🌟 Fitur Utama Aplikasi:
* **Checklist Real-Time Terintegrasi**: Terhubung langsung dengan Google Spreadsheet sebagai database utama (*live sync*).
* **Personalisasi Berbasis Peran**: Setiap pegawai otomatis mendapatkan lembar kerja monitoring dan menu navigasi sesuai tugasnya:
  1. **Petugas Kebersihan (Cleaning Service)**: Monitoring kebersihan ruangan, toilet, lobby, dan halaman kantor.
  2. **Petugas Pelayanan / Resepsionis (Front Office / PST)**: Standar pelayanan tamu, perlengkapan ATK, dan kebersihan area pelayanan.
  3. **Petugas Keamanan (Security / Satpam)**: Pemantauan jadwal shift kerja (*Pagi, Sore, Malam, Libur*) dan checklist patroli pengamanan gedung & aset.
* **Aturan Penguncian Data Lampau**: Menjaga integritas data di mana checklist tanggal lampau yang sudah selesai (*TRUE*) terkunci otomatis, sementara checklist hari ini dapat dibatalkan jika terjadi salah klik.
* **Tampilan Multi-Periode Responsif**: Mendukung mode Harian, Mingguan, dan Bulanan yang pas di layar perangkat komputer maupun smartphone.
* **Ganti Kredensial Mandiri**: Pegawai dapat mengubah username dan password akunnya sendiri secara aman.

---

## 2. Akses dan Autentikasi Pengguna

### 2.1 Membuka Aplikasi
Aplikasi SIMPEL-KU dapat diakses melalui web browser modern (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) pada komputer desktop, laptop, tablet, maupun smartphone melalui tautan web aplikasi yang disediakan oleh Administrator BPS Provinsi Kalimantan Barat.

### 2.2 Langkah Login
1. Buka halaman utama aplikasi SIMPEL-KU.
2. Masukkan **Username** akun Anda (misalnya: slamet, dede, eddy, ania, yuni, dll.).
3. Masukkan **Password** akun Anda.
4. *(Opsional)* Klik ikon mata (<i class=fa-solid fa-eye></i>) pada kolom password jika ingin memastikan sandi yang diketik sudah benar.
5. Klik tombol **Masuk ke Dashboard**.
6. Jika kredensial sesuai, sistem akan menampilkan notifikasi hijau *Login berhasil!* dan membuka antarmuka utama aplikasi.

> 💡 **Catatan:** Jika muncul pesan kesalahan merah, periksa kembali penulisan huruf besar/kecil dan pastikan tidak ada spasi berlebih pada username maupun password.

### 2.3 Durasi Sesi & Logout
* **Durasi Sesi**: Sesi login aktif selama **6 Jam**. Setelah 6 jam, pengguna perlu login kembali untuk alasan keamanan data.
* **Logout**: Untuk keluar dari aplikasi, buka menu navigasi (sidebar) lalu klik tombol **Keluar (Logout)** di bagian bawah atau melalui menu **Profil Akun**.

---

## 3. Mengenal Antarmuka & Navigasi

`
+-------------------------------------------------------------------------------+
| [Logo SIMPEL-KU]  [Dashboard Ringkasan]         [Bulan: September v] [2026 v] |
|-------------------------------------------------------------------------------|
| [Navigasi]        |  [Halo, Nama Pegawai!]                                    |
| - Dashboard       |  +------------+ +------------+ +------------+ +---------+ |
| - Monitoring      |  | Total: 120 | | Selesai:95 | | Belum: 25  | | 79%     | |
| - Rekapitulasi    |  +------------+ +------------+ +------------+ +---------+ |
| - Profil Akun     |                                                           |
|                   |  [Progress Per Ruangan]       [Aksi Cepat]                |
| [Keluar / Logout] |  - Ruang Rapat: 100%          [> Checklist Monitoring]    |
|                   |  - Lobby Utama: 85%           [> Laporan & Rekap]         |
+-------------------------------------------------------------------------------+
`

### 3.1 Sidebar & Fitur Ciutkan (Collapse)
* **Sidebar Desktop**: Terletak di sisi kiri layar berisi info avatar pengguna, nama akun, serta menu navigasi aktif.
* **Tombol Ciutkan (Collapse)**: Klik ikon panah di sudut kanan atas sidebar desktop untuk menciutkan navigasi menjadi ikon ramping. Fitur ini sangat berguna untuk memperlebar area kerja saat memantau matriks tabel.
* **Navigasi Mobile (HP)**: Pada layar smartphone, menu navigasi dapat dibuka dengan menyentuh tombol ikon hamburger (<i class=fa-solid fa-bars></i>) di sudut kiri atas.

### 3.2 Topbar & Pemilih Periode Global (Bulan & Tahun)
Di bagian kanan atas layar selalu tersedia pemilih **Bulan** dan **Tahun**.
* Secara otomatis terisi dengan bulan dan tahun berjalan saat ini.
* Jika ingin melihat arsip atau checklist bulan sebelumnya / bulan mendatang, cukup ubah pilihan bulan atau tahun pada dropdown tersebut, maka seluruh data pada halaman aktif akan diperbarui seketika.

### 3.3 Penyesuaian Menu Berdasarkan Peran (Role)
Menu yang muncul di sidebar otomatis menyesuaikan peran pegawai yang sedang login:
* **Petugas Kebersihan**: Muncul menu **Monitoring Kebersihan**.
* **Petugas Pelayanan / Resepsionis**: Muncul menu **Monitoring Pelayanan**.
* **Petugas Keamanan**: Muncul menu **Monitoring Keamanan** (dilengkapi jadwal shift & checklist tugas piket).

---

## 4. Panduan Modul: Dashboard Ringkasan

Halaman Dashboard menyajikan ringkasan statistik performa kerja pegawai pada bulan aktif yang dipilih.

### Komponen Dashboard:
1. **Kartu Sambutan Pengguna**: Menampilkan nama pegawai dan ucapan selamat datang.
2. **Kartu Statistik Utama**:
   * **Total Checklist**: Jumlah seluruh target tugas yang harus dikerjakan pada bulan terpilih.
   * **Selesai (Hijau)**: Total tugas yang telah berhasil dicentang (*TRUE*).
   * **Belum (Merah)**: Total tugas yang masih berstatus belum selesai (*FALSE / Kotak Merah*).
   * **Persentase Pencapaian**: Tingkat ketercapaian tugas dalam persen beserta progress bar visual.
3. **Pencapaian Berdasarkan Ruangan**: Menampilkan daftar ruangan kerja beserta persentase penyelesaian tugas pada masing-masing ruangan.
4. **Tombol Aksi Cepat**: Tombol pintas untuk langsung membuka lembar checklist tugas atau laporan grafik rekapitulasi.

---

## 5. Panduan Modul: Monitoring Kebersihan & Pelayanan

Modul ini adalah lembar kerja utama untuk mencatat dan menandai pelaksanaan tugas sehari-hari.

`
Pilihan Periode: [ [Harian (Default)] | [Mingguan] | [Bulanan] ]
---------------------------------------------------------------------------------------
Sub-Nav Harian : [ Hari Ini ] | [<] Mg 1 (1-6) [>] | [Sen 1] [Sel 2] [Rab 3] [Kam 4] ...
Format Tampilan: [ (o) Kartu ] [ ( ) Tabel ]
Filter Bar     : [ Filter Ruangan: Semua v ] [ Filter Status: Semua v ] [ Cari Kegiatan... ]
`

### 5.1 Mode Tampilan Harian
Mode Harian adalah tampilan default yang paling nyaman dan fokus untuk penggunaan harian:

#### A. Format Kartu (Cards)
* Menampilkan daftar kegiatan yang dikelompokkan rapi per ruangan untuk **satu tanggal yang dipilih**.
* **Item Belum Dicentang**: Berwarna **merah muda** dengan tombol bertuliskan **Centang Selesai**. Cukup klik kartu tersebut untuk menandai kegiatan selesai.
* **Item Sudah Dicentang**: Berwarna **hijau** dengan tulisan **✓ TRUE** dan teks kegiatan tercoret rapi.

#### B. Format Tabel (Table)
* Menampilkan daftar kegiatan dalam bentuk baris tabel dengan kolom tanggal terpilih di sisi kanan.
* Kotak merah menandakan belum dikerjakan, kotak hijau menandakan telah selesai.

#### C. Navigasi Slider Tanggal Harian
* **Tombol Hari Ini**: Langsung melompat ke tanggal hari ini secara instan.
* **Pills Tanggal**: Tombol-tombol tanggal (1, 2, 3, dst.) yang dilengkapi nama hari pendek. Klik tanggal yang diinginkan untuk berpindah hari.
* **Navigasi Minggu (Mg 1, Mg 2, dst.)**: Gunakan tombol panah kiri/kanan pada badge minggu untuk melihat kelompok tanggal minggu berikutnya.

---

### 5.2 Mode Tampilan Mingguan
* Menampilkan matriks kegiatan untuk **1 minggu kalender penuh** (Senin s/d Minggu).
* Pengguna dapat memilih tab **Minggu 1**, **Minggu 2**, **Minggu 3**, **Minggu 4**, atau **Minggu 5**.
* Memudahkan pegawai untuk mengevaluasi kelengkapan checklist dalam rentang 1 pekan tanpa terpotong.

---

### 5.3 Mode Tampilan Bulanan
* Menampilkan matriks seluruh kegiatan dalam satu bulan penuh.
* Dilengkapi dengan **Pagination per Minggu Kalender** (*Minggu 1, Minggu 2, dst.*) sehingga tabel selalu pas dan rapi dalam satu layar monitor tanpa perlu menggulir (*scroll*) horizontal yang melelahkan.

---

### 5.4 Fitur Filter Ruangan, Status, dan Pencarian
1. **Filter Ruangan**: Memilih satu ruangan tertentu (misal: *Ruang Kepala BPS, Toilet Pria, Ruang Rapat*) atau *Semua Ruangan*.
2. **Filter Status**:
   * *Semua Item Checkbox*: Menampilkan semua kegiatan.
   * *Belum Dicentang (Kotak Merah)*: Hanya menampilkan tugas-tugas yang belum selesai (sangat berguna untuk memeriksa tugas yang tersisa).
   * *Sudah Dicentang (TRUE)*: Hanya menampilkan tugas yang telah selesai.
3. **Pencarian Kegiatan**: Ketikkan kata kunci (misal: *sapu*, *kaca*, *sampah*, *formulir*) untuk menemukan tugas secara spesifik dalam hitungan detik.

---

### 5.5 Aturan & Validasi Checklist (Hari Ini vs Tanggal Lampau)

| Kondisi Tanggal | Status Awal | Tindakan yang Terjadi Saat Diklik | Keterangan Aturan |
| :--- | :---: | :---: | :--- |
| **Hari Ini** | Belum (Merah / FALSE) | Berubah menjadi **Selesai (Hijau / TRUE)** | Menandai tugas hari ini berhasil dilaksanakan. |
| **Hari Ini** | Selesai (Hijau / TRUE) | Berubah kembali menjadi **Belum (FALSE)** | **Dapat Dibatalkan:** Mencegah kesalahan apabila petugas salah menekan tombol. |
| **Tanggal Lampau** | Selesai (Hijau / TRUE) | **Terkunci 🔒 (Tidak dapat diubah)** | Menjaga validitas dan kejujuran data monitoring yang telah lewat. |
| **Tanggal Lampau** | Belum (Merah / FALSE) | Dapat diisi menjadi **Selesai (TRUE)** | Memungkinkan pengisian susulan jika baru sempat mencatat. |

---

### 5.6 Penanganan Hari Libur (Sabtu & Minggu)
* Tanggal yang jatuh pada hari **Sabtu** atau **Minggu** otomatis ditandai sebagai **HARI LIBUR (Bebas Tugas)** dengan warna aksen merah muda.
* Pada mode kartu harian, sistem akan menampilkan banner informatif *Hari Libur - Seluruh kegiatan checklist monitoring tidak wajib diisi pada hari ini.*
* Pada mode tabel matriks, kolom hari Sabtu dan Minggu bertuliskan *Libur*.

---

## 6. Panduan Modul: Monitoring & Piket Keamanan (Satpam)

Modul khusus bagi **Petugas Keamanan / Satpam** yang terhubung langsung dengan sheet jadwal piket security kantor.

`
+-------------------------------------------------------------------------------+
| Ringkasan Shift: [Total: 22 Hari] [Pagi: 10] [Sore: 6] [Malam: 6]             |
|-------------------------------------------------------------------------------|
| Kalender Shift : [ 1 Sen - Pagi ] [ 2 Sel - Pagi ] [ 3 Rab - Malam ] ...      |
|-------------------------------------------------------------------------------|
| Tanggal Terpilih: Senin, 1 September 2026 - Shift Pagi (06.00 - 16.00)        |
| Pencapaian Tugas: 7 / 7 Selesai (100%)                                        |
| [v] Mengatur lalu lintas dan membantu menyeberangkan karyawan ke kantor       |
| [v] Mengatur dan mengarahkan parkiran kendaraan roda-4                        |
| [v] Menyambut dan membukakan pintu kendaraan pimpinan                         |
| [v] Patroli keamanan gedung dan memeriksa area kantor melalui CCTV            |
+-------------------------------------------------------------------------------+
`

### 6.1 Ringkasan Shift Kerja
Di bagian atas modul terdapat 4 kartu informasi shift untuk bulan aktif:
* **Total Hari Kerja**: Jumlah hari masuk tugas dalam 1 bulan.
* **Shift Pagi**: Jumlah jadwal dinas Pagi (06.00 – 16.00).
* **Shift Sore**: Jumlah jadwal dinas Sore (15.30 – 23.30).
* **Shift Malam**: Jumlah jadwal dinas Malam (23.00 – 07.30).

### 6.2 Memilih Tanggal & Membaca Legenda Shift
* Kalender shift menampilkan seluruh tanggal dalam bulan terpilih beserta kode status:
  * 🔵 **Pagi (P)**: Dinas Pagi.
  * 🟡 **Sore (S)**: Dinas Sore.
  * 🟣 **Malam (M)**: Dinas Malam.
  * ⚪ **Libur (O)**: Hari Bebas Tugas / Lepas Piket.
* Klik salah satu kotak tanggal untuk membuka daftar checklist tugas pengamanan pada tanggal tersebut.

### 6.3 Mengisi Checklist Tugas Shift
Daftar tugas yang tampil otomatis menyesuaikan shift dinas pada tanggal yang dipilih:
1. **Jika Mendapat Shift Pagi (P)**:
   * Menampilkan tugas: **PAGI (06.00–07.30)** *(penyeberangan, parkir pimpinan, parkir motor)* dan tugas **SELAMA JAM KERJA (07.30–16.00)** *(patroli CCTV tiap 2 jam, pengawasan keluar-masuk barang/tamu)*.
2. **Jika Mendapat Shift Sore (S) atau Malam (M)**:
   * Menampilkan tugas: **MALAM** *(patroli keliling gedung, memastikan pintu/jendela/ruangan terkunci rapat, pencegahan bahaya kebakaran/pencurian)*.
3. **Jika Berstatus Libur (O)**:
   * Menampilkan keterangan bebas tugas.
4. **Cara Mencentang**:
   * Sentuh / klik baris tugas untuk menandai selesai (kotak berubah hijau dan teks dicoret).
   * Persentase pencapaian shift akan bertambah secara otomatis.

---

## 7. Panduan Modul: Rekapitulasi & Visualisasi

Modul Rekapitulasi menyajikan laporan visual grafis untuk evaluasi bulanan:

### 7.1 Grafik Tren Harian & Pencapaian Ruangan
1. **Grafik Tren Kepatuhan Checklist Harian (Line Chart)**:
   * Menggambarkan grafik garis naik/turun jumlah kegiatan yang diselesaikan dari tanggal 1 hingga akhir bulan.
2. **Grafik Pencapaian Berdasarkan Ruangan (Bar Chart)**:
   * Menampilkan perbandingan diagram batang hijau (tugas selesai) vs batang abu-abu (total target) untuk setiap ruangan kerja.

### 7.2 Tabel Rekapitulasi Per Ruangan
Menyajikan rincian data tabular:
* Nama Ruangan
* Jumlah Item Kegiatan
* Total Target Checklist
* Selesai Dikerjakan
* Persentase Pencapaian (%)
* Indikator Status Bar Warna

---

## 8. Panduan Modul: Profil Akun & Ganti Kredensial

Modul Profil memungkinkan pegawai memeriksa identitas akun serta memperbarui username dan password secara mandiri tanpa harus meminta bantuan teknis admin spreadsheet.

`
+-------------------------------------------------------------------------------+
| [Avatar]  Nama Pegawai (@username)              [Sesi Aktif & Terlindungi]    |
|-------------------------------------------------------------------------------|
| [Form Ganti Username & Password]                                              |
| Password Saat Ini *        : [ •••••••• ]                                     |
| Username Baru *            : [ slamet ]                                       |
| Password Baru              : [ •••••••• ] (Minimal 4 karakter)                |
| Konfirmasi Password Baru   : [ •••••••• ]                                     |
|                                                                               |
|                     [ Simpan Perubahan Kredensial ]                           |
+-------------------------------------------------------------------------------+
`

### 8.1 Melihat Informasi Akun
* Menampilkan Nama Lengkap, Username Login, Otorisasi Lembar Kerja Pegawai, serta penjelasan aturan penguncian tanggal lampau.

### 8.2 Prosedur Ganti Username & Password Mandiri
1. Buka menu **Profil Akun** di sidebar.
2. Gulir ke bawah menuju kartu **Ganti Username & Password**.
3. Masukkan **Password Saat Ini** pada kolom verifikasi keamanan.
4. Ubah **Username Baru** jika ingin mengganti nama pengguna login (minimal 3 karakter).
5. Masukkan **Password Baru** (minimal 4 karakter) dan ketik ulang pada **Konfirmasi Password Baru**. *(Kosongkan kolom password baru jika Anda hanya ingin mengubah username).*
6. Klik tombol **Simpan Perubahan Kredensial**.
7. Sistem akan memverifikasi password lama dan langsung memperbarui data akun ke sheet **Users** pada Google Spreadsheet.
8. Muncul notifikasi sukses berwarna hijau. Gunakan username dan password baru tersebut untuk login berikutnya.

> ⚠️ **PENTING:** Selalu ingat atau catat username dan password baru Anda di tempat yang aman.

---

## 9. Tanya Jawab (FAQ) & Penyelesaian Masalah

#### Q1: Mengapa saya tidak bisa membatalkan centang (TRUE) pada tanggal 3 hari yang lalu?
> **Jawaban:** Demi menjaga integritas dan akuntabilitas data monitoring, sistem SIMPEL-KU secara otomatis mengunci (*lock*) data pada tanggal lampau yang sudah berstatus selesai. Pembatalan centang hanya diizinkan untuk kegiatan pada **Hari Ini**.

#### Q2: Mengapa pada hari Sabtu dan Minggu checklist saya tidak muncul atau berstatus Libur?
> **Jawaban:** Hari Sabtu dan Minggu merupakan hari libur kerja resmi di BPS Provinsi Kalimantan Barat, sehingga sistem secara otomatis membebaskan tugas checklist pada hari-hari tersebut.

#### Q3: Bagaimana cara melihat rekap checklist bulan lalu?
> **Jawaban:** Pada bagian pojok kanan atas layar (Topbar), ubah pilihan dropdown **Bulan** ke bulan yang diinginkan (misal: *Agustus*) dan **Tahun** yang sesuai. Seluruh matriks dan statistik akan otomatis menampilkan data bulan tersebut.

#### Q4: Saya lupa password login saya, apa yang harus saya lakukan?
> **Jawaban:** Hubungi Administrator SIMPEL-KU BPS Provinsi Kalimantan Barat untuk melakukan reset password akun Anda langsung pada sheet Users di spreadsheet database.

#### Q5: Apakah data checklist yang saya centang di HP otomatis tersimpan ke spreadsheet kantor?
> **Jawaban:** Ya. Aplikasi SIMPEL-KU terhubung secara real-time (*live sync*) dengan database Google Spreadsheet. Setiap kali Anda mencentang kegiatan atau mengubah kredensial, perubahan tersebut seketika tersimpan di spreadsheet secara permanen.

---

**Sistem Monitoring Pelayanan, Keamanan & Kebersihan Umum (SIMPEL-KU)**  
*Subbagian Umum / Tim TI - BPS Provinsi Kalimantan Barat*  
*Versi Aplikasi: 2.0 (Modern GAS Web App)*
