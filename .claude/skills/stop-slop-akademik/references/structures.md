# Struktur yang Harus Diperbaiki — Versi Akademik

## 🟢 Struktur yang SAH dalam Konteks Akademik

Konvensi akademik yang TIDAK perlu diperangi:

**Daftar formal (1), (2), (3)**
- SAH. Gunakan bullet/number untuk enumerasi ilmiah.
- ❌ Jangan ubah jadi kalimat naratif panjang. Daftar itu lebih efisien.

**Kalimat pasif teknis: "Data dianalisis menggunakan SPSS"**
- SAH. Ini gaya standar metodologi penelitian Indonesia.
- ❌ Jangan dipaksa jadi "Peneliti menganalisis data menggunakan SPSS." Keduanya sah. Pilih yang lebih natural dalam konteks.

**Transisi meta: "Bab ini membahas...", "Pada bagian sebelumnya telah diuraikan..."**
- SAH. Di dokumen 100+ halaman, navigasi eksplisit diperlukan.
- ✅ Batasi: satu meta-komentar per transisi bab sudah cukup. Jangan tumpuk.

**Pembuka latar belakang normatif**
- SAH selama langsung ke topik spesifik.
- ❌ Tapi jangan mulai terlalu luas: "Perkembangan teknologi yang semakin pesat..." langsung potong.

---

## 🔴 Struktur yang HARUS DIPERBAIKI

### 1. Latar Belakang yang Terlalu Luas (Piramida Terbalik)

Ini adalah masalah nomor satu skripsi Indonesia — mulai dari "era globalisasi" baru ke topik spesifik di paragraf 4.

**❌ Buruk:**
> Perkembangan teknologi informasi dan komunikasi saat ini semakin pesat. Era digital telah membawa perubahan besar di berbagai sektor kehidupan. Salah satu sektor yang terdampak adalah sektor kesehatan. Di Indonesia, masalah gizi masih menjadi tantangan serius. Penelitian ini berfokus pada sistem prediksi diet di Cafe Nut Castle...

**✅ Lebih Baik:**
> Masalah malnutrisi di Indonesia — baik kelebihan maupun kekurangan berat badan — masih menjadi tantangan kesehatan serius dengan prevalensi X% (Riskesdas, 2023). Namun, akses terhadap intervensi gizi yang personal masih terbatas, terutama di kota menengah seperti Malang. Penelitian ini mengembangkan sistem prediksi program diet berbasis machine learning di Cafe Nut Castle...

📌 **Aturan:**
- Jangan lebih dari 2 kalimat konteks umum sebelum menyentuh topik spesifik.
- Paragraf 1 harus sudah nyentuh masalah spesifik.
- Data/statistik lebih baik dari pernyataan umum.

---

### 2. Kontras Biner yang Dipaksakan — tapi AGAR DIPAKAI SECUKUPNYA

Kontras biner (*bukan hanya X tetapi juga Y*) di skripsi biasanya cuma menambah jumlah kata tanpa informasi baru.

**❌ Buruk:**
> Sistem ini tidak hanya akurat dalam memprediksi program diet, tetapi juga efektif dalam memberikan rekomendasi awal.

**✅ Lebih Baik:**
> Sistem ini mencapai akurasi 93% dan rekomendasi dinilai layak oleh ahli gizi (skor 86,6%).

📌 **Tes:** Kalau kata "tidak hanya... tetapi juga" bisa dihapus dan sisanya masih bermakna penuh — hapus.

---

### 3. Rumusan Masalah yang Jadi Template

**❌ Buruk:**
> 1. Bagaimana mengimplementasikan machine learning dalam sistem prediksi program diet?
> 2. Bagaimana mengintegrasikan LLM dalam sistem rekomendasi diet?
> 3. Bagaimana menguji akurasi sistem prediksi?

**(Ini cuma ngulang judul — tidak spesifik.)**

**✅ Lebih Baik:**
> 1. Bagaimana performa algoritma Random Forest dalam memprediksi program diet (BB turun, BB naik, lemak turun) berdasarkan data komposisi tubuh pelanggan Cafe Nut Castle?
> 2. Bagaimana tingkat kelayakan rekomendasi diet yang dihasilkan oleh Gemini Flash-Lite API berdasarkan penilaian ahli gizi?
> 3. Bagaimana hasil pengujian black box pada fungsionalitas sistem yang dikembangkan?

📌 **Aturan:** Rumusan masalah harus mengandung BATA (Batas, Atribut, Target, Alat ukur).

---

### 4. "Berdasarkan" Syndrome

Skripsi Indonesia sering memulai kalimat dengan "Berdasarkan" setiap saat. Ini jadi kaku.

**❌ Buruk (3 kalimat berturut-turut):**
> Berdasarkan hasil pengujian, model Random Forest mencapai akurasi 93%. Berdasarkan confusion matrix, model memiliki precision 0,92. Berdasarkan evaluasi ahli, rekomendasi layak digunakan.

**✅ Lebih Baik:**
> Model Random Forest mencapai akurasi 93% pada data uji. Precision 0,92 tercatat dari confusion matrix. Ahli gizi menilai rekomendasi yang dihasilkan sangat layak (skor 86,6%).

📌 **Aturan:** Variasikan pembuka kalimat. *Berdasarkan* maksimal 1 dari 5 kalimat.

---

### 5. "Hasil dan Pembahasan" yang Cuma Menyajikan, Tidak Membahas

Ini masalah struktural paling umum di skripsi.

**❌ Buruk:**
> Tabel 4.1 menunjukkan hasil pengujian black box. Seluruh skenario pengujian berhasil. Dengan demikian, sistem berfungsi sesuai yang diharapkan.

**(Ini cuma melaporkan — tidak membahas. Tidak ada analisis, tidak ada interpretasi.)**

**✅ Lebih Baik:**
> Seluruh 15 skenario pengujian black box berhasil (Tabel 4.1), mengonfirmasi bahwa sistem menangani alur utama dan alur alternatif dengan benar. Temuan ini menegaskan bahwa implementasi teknis telah sesuai dengan spesifikasi kebutuhan yang dirumuskan pada tahap analisis.

📌 **Aturan:**
- **Hasil:** Apa yang ditemukan
- **Pembahasan:**
  - *Kenapa* hasilnya seperti itu?
  - *Apa artinya* dalam konteks penelitian?
  - *Cocok atau tidak* dengan penelitian sebelumnya?
  - *Implikasinya* apa?
- Kalau cuma menyajikan tabel tanpa satu paragraf interpretasi → itu hasil, bukan pembahasan.

---

### 6. Penutup Bab yang Klise

**❌ Buruk:**
> Dengan demikian, dapat disimpulkan bahwa metode Random Forest mampu memprediksi program diet dengan baik.

**✅ Lebih Baik:**
> Random Forest mencapai akurasi 93% pada data uji (Tabel 6.2), lebih tinggi dari Decision Tree (87%) dan Naive Bayes (82%) pada dataset yang sama. Algoritma ini dipilih untuk diintegrasikan ke dalam sistem produksi Cafe Nut Castle.

---

### 7. Daftar Pustaka Tercemar

**❌ Masalah:**
- Sumber dari blog/website tak jelas (bukan jurnal)
- Tidak ada rujukan 5-10 tahun terakhir (kecuali klasik)
- Hanya rujukan dari Google Scholar tanpa verifikasi DOI
- Self-plagiarism: merujuk skripsi sendiri sebagai "penelitian sebelumnya"

**✅ Aturan minimal:**
- ≥80% dari jurnal terindeks (Sinta/Scopus)
- ≥60% dari 5 tahun terakhir
- Tiap klaim di latar belakang ada rujukannya
- Konsisten format (APA 7 atau gaya yang ditentukan institusi)

---

### 8. "Metode Penelitian" yang Menjiplak Template Institusi

**❌ Buruk:**
> Metode penelitian yang digunakan dalam penelitian ini adalah metode penelitian kuantitatif dengan pendekatan eksperimen.

**(Ini cuma definisi dari buku metode penelitian, bukan metode yang kamu gunakan.)**

**✅ Lebih Baik:**
> Penelitian ini menggunakan lima tahap: (1) analisis data eksploratif pada 250 sampel data komposisi tubuh, (2) preprocessing (normalisasi, handling outlier), (3) pelatihan Random Forest dengan 10-fold cross-validation, (4) pengujian akurasi pada 50 data baru, dan (5) integrasi dengan Gemini Flash-Lite API untuk rekomendasi diet.

📌 **Aturan:** Jangan definisikan metode secara abstrak. Tulis APA YANG KAMU LAKUKAN secara spesifik.

---

### 9. Pola Ritme yang Kaku Akibat Struktur Template

Karena skripsi sering mengikuti template bab dari institusi, ritme tulisan jadi prediktabel.

| Pola | Masalah | Perbaikan |
|------|---------|-----------|
| "BAB X. ... → 1.1 ... → 1.1.1 ..." terus monoton | Ritme seragam | Dalam satu sub-bab, variasikan panjang paragraf |
| Setiap paragraf diawali "Berdasarkan...", "Hasil...", "Pada..." | Pembuka seragam | Variasikan antara data, klaim, rujukan, interpretasi |
| Setiap paragraf diakhiri simpulan kecil | Ritme seragam | Biarkan paragraf mengalir ke paragraf berikutnya |
| "Tabel X menunjukkan..." diikuti data | Terlalu mekanis | Kadang tulis interpretasi dulu, baru rujuk tabel |

---

### 10. Penggunaan "Penulis" Berlebihan

| ❌ Buruk | ✅ Lebih Baik |
|---------|-------------|
| Penulis melakukan pengumpulan data pada bulan Januari | Data dikumpulkan pada Januari |
| Penulis memilih algoritma Random Forest karena | Algoritma Random Forest dipilih karena |
| Dalam penelitian ini, penulis mengembangkan sistem | Sistem dikembangkan menggunakan... |

📌 Di skripsi, pasif lebih lazim. Gunakan pasif untuk metodologi, aktif hanya untuk komentar analitis penulis (*Penulis berpendapat bahwa...* — jarang perlu).

---

### 11. "Proses Dimulai Ketika" Syndrome — Pola Paling Dominan di Bab IV

Ini adalah **pola repetisi paling parah** di skripsi S1 Teknik Informatika. Deskripsi activity/sequence diagram selalu dimulai dengan struktur kalimat yang persis sama.

**❌ Buruk (diulang 15+ kali dalam satu bab):**
> Proses dimulai ketika pengguna memilih menu Login. Setelah itu, sistem akan menampilkan halaman login. Pengguna kemudian memasukkan email dan password. Setelah itu, sistem akan melakukan validasi akun dengan mengirimkan data ke database...

> *(pola yang sama diulang utuh untuk: Mengelola Data Pengguna, Mengelola Data Checkup, Mengelola Pendaftaran, Mengelola Jadwal, Mencetak Laporan, dll.)*

**✅ Lebih Baik — generalisasi:**
> Seluruh fitur dalam sistem mengikuti alur yang seragam: pengguna memilih menu dari antarmuka, sistem menampilkan data terkait, dan pengguna dapat melakukan operasi CRUD dengan konfirmasi di setiap langkah. Alur khusus hanya terjadi pada modul prediksi dan rekomendasi LLM yang membutuhkan komunikasi API dua arah.

📌 **Aturan:**
- Kalau >3 deskripsi diagram berurutan punya struktur kalimat yang identik → generalisasikan.
- Gunakan **tabel perbandingan** atau **satu paragraf ikhtisar** untuk diagram yang alurnya mirip.
- Detail diagram cukup **sekali** untuk satu tipe (misal: 1 deskripsi CRUD umum, sisanya cukup sebut nama diagram dan perbedaan alurnya saja).
- Hemat 5-10 halaman hanya dari pola ini.

---

### 12. CRUD Narrative Repetition — Template "Tambah → Edit → Hapus" yang Diulang Terus

Hampir setiap sub-bab "Mengelola Data X" di Bab IV mengulang struktur 4 paragraf ini:

| Langkah | Template Paragraf |
|---------|------------------|
| Tambah | *"Untuk menambahkan data X, pengguna menekan tombol Tambah, yang kemudian menampilkan formulir input. Setelah pengguna mengisi formulir dan menekan tombol Simpan, sistem mengirimkan data ke backend untuk divalidasi. Jika data valid, sistem akan menyimpan... Jika tidak valid, sistem menampilkan pesan kesalahan..."* |
| Edit | *"Proses pengeditan data X dimulai ketika pengguna menekan tombol Edit pada data yang ingin diubah. Sistem kemudian meminta data X terkait dan menampilkan formulir edit. Setelah pengguna melakukan perubahan..."* |
| Hapus | *"Untuk menghapus data X, pengguna menekan tombol Hapus, yang memicu permintaan konfirmasi penghapusan. Jika pengguna mengonfirmasi, sistem akan menghapus... Jika membatalkan, sistem memberikan notifikasi..."* |
| Penutup | *"Fitur ini memastikan bahwa pengelolaan data X dapat dilakukan secara fleksibel dan efisien..."* |

**❌ Masalah:** Struktur ini diulang untuk setiap entitas (pengguna, checkup, jadwal, program diet, pendaftaran, dll) — bisa 8-10× dalam satu bab dengan hanya mengganti nama entitas.

**✅ Lebih Baik:**
> Seluruh data master (pengguna, pelanggan, jadwal konsultasi, program diet) dikelola dengan pola CRUD yang seragam: tambah via formulir dengan validasi, edit dengan data yang sudah terisi, dan hapus dengan konfirmasi dua langkah. Notifikasi sukses/error ditampilkan di setiap akhir operasi.

📌 **Aturan:**
- Tulis CRUD general sekali untuk semua data master.
- Detail hanya untuk modul dengan **alur unik** (prediksi, rekomendasi LLM, cetak laporan).
- Hapus kalimat penutup *"Fitur ini memastikan/memungkinkan/mempermudah..."* — cukup tulis di awal bab atau hapus sama sekali.

---

### 13. Akronim Opening Fatigue — Tumpukan Akronim di Paragraf Pertama

Bab II (Landasan Teori) sering membanjiri pembaca dengan deretan akronim di paragraf pembuka.

**❌ Buruk:**
> Perkembangan Teknologi Informasi (TI) dan Artificial Intelligence (AI) di era Revolusi Industri 4.0 dan Society 5.0 telah membawa perubahan besar di berbagai sektor. Machine Learning (ML) dan Deep Learning (DL) sebagai bagian dari AI, serta Internet of Things (IoT) dan Big Data, telah menjadi teknologi kunci...

**(Pembaca sudah muak dengan deretan akronim ini. Tidak ada informasi baru.)**

**✅ Lebih Baik:**
> Penelitian ini menggunakan Random Forest untuk klasifikasi program diet berdasarkan data komposisi tubuh pelanggan Cafe Nut Castle. Random Forest dipilih karena skalanya sesuai (369 sampel, 3 kelas) dan memberikan hasil yang mudah diinterpretasikan.

📌 **Aturan:**
- Definisi akronim cukup satu baris di awal sub-bab, bukan berjajar di paragraf pertama.
- Jangan definisikan cabang-cabang yang tidak dipakai (Misal: definisi Supervised → Unsupervised → Reinforcement padahal cuma pakai Random Forest).
- Uji: *"Apakah pembaca perlu tahu definisi ini untuk paham penelitian saya?"* Kalau tidak, hapus atau pindahkan ke lampiran.
