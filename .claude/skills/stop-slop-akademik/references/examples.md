# Contoh Before/After — Versi Akademik

## 1. Latar Belakang — Potong Piramida Terbalik

**❌ Before (skripsi biasa):**
> Perkembangan teknologi informasi di era globalisasi saat ini semakin pesat dan telah merambah ke berbagai sektor. Salah satu sektor yang merasakan dampak signifikan adalah sektor kesehatan. Di Indonesia, masalah gizi masih menjadi isu kesehatan yang cukup serius. Menurut data Riskesdas, angka kelebihan berat badan di Indonesia terus mengalami peningkatan setiap tahunnya. Oleh karena itu, diperlukan solusi berbasis teknologi untuk membantu mengatasi masalah tersebut.

**✅ After (padat + spesifik):**
> Prevalensi kelebihan berat badan di Indonesia naik dari 21,8% (Riskesdas 2018) menjadi 31,0% (Riskesdas 2023). Di Malang, data Dinas Kesehatan 2023 mencatat 4 dari 10 penduduk dewasa mengalami kelebihan berat badan. Namun, akses terhadap konsultasi gizi personal masih terbatas — rasio ahli gizi terhadap penduduk di Jawa Timur adalah 1:8.000. Penelitian ini mengembangkan sistem prediksi program diet berbasis machine learning untuk mengisi celah tersebut.

📌 **Perubahan:** 6 kalimat → 3 kalimat. Konteks umum dipotong. Data spesifik langsung di paragraf 1.

---

## 2. Kontras Biner — Langsung ke Inti

**❌ Before:**
> Hasil ini menunjukkan bahwa sistem yang dikembangkan tidak hanya akurat dalam memprediksi program diet, tetapi juga efektif dalam memberikan rekomendasi awal yang dapat mendukung pengambilan keputusan dalam layanan konsultasi gizi secara digital.

**✅ After:**
> Sistem mencapai akurasi prediksi 93% dan rekomendasi diet dinilai sangat layak oleh ahli gizi (86,6%).

📌 **Perubahan:** 30 kata → 14 kata. Kontras biner dihilangkan. Dua klaim digabung dengan data spesifik.

---

## 3. Pembahasan yang Sebenarnya Hasil — Tambah Interpretasi

**❌ Before (hanya hasil):**
> Tabel 4.5 menunjukkan hasil pengujian black box pada modul login. Seluruh skenario dinyatakan valid. Dengan demikian, modul login berfungsi dengan baik.

**✅ After (hasil + interpretasi):**
> Seluruh 8 skenario pengujian black box pada modul login dinyatakan valid (Tabel 4.5), termasuk skenario alur alternatif (salah password, akun tidak aktif). Ini mengonfirmasi bahwa validasi input dan mekanisme autentikasi telah berjalan sesuai spesifikasi — dan bahwa penanganan error telah mencakup edge case yang diidentifikasi saat analisis kebutuhan.

📌 **Perubahan:** Melaporkan fakta → fakta + interpretasi + implikasi.

---

## 4. Filler Intensifier — Hapus "sangat" dan "cukup"

**❌ Before:**
> Masalah malnutrisi masih menjadi tantangan kesehatan yang **sangat** serius. Gaya hidup urban yang tidak sehat menjadi faktor yang **cukup** dominan.

**✅ After:**
> Malnutrisi menjadi tantangan kesehatan dengan prevalensi 31% (Riskesdas 2023). Konsumsi makanan ultra-proses dan sedentari menjadi dua faktor dominan (WHO, 2023).

📌 **Perubahan:** *sangat serius* → data 31%. *cukup dominan* → dua faktor spesifik dengan rujukan.

---

## 5. Klise Penutup Skripsi — Jadi Spesifik

**❌ Before:**
> Penelitian ini masih jauh dari sempurna. Oleh karena itu, perlu diteliti lebih lanjut untuk menyempurnakan hasil yang telah dicapai. Diharapkan penelitian ini dapat bermanfaat bagi pembaca dan menjadi acuan bagi peneliti selanjutnya.

**✅ After:**
> Penelitian ini memiliki dua keterbatasan utama: (1) data hanya berasal dari satu lokasi (Cafe Nut Castle, Malang), dan (2) model tidak diuji pada data longitudinal. Penelitian selanjutnya disarankan untuk memperluas cakupan data ke beberapa kota serta menguji performa model pada data pola konsumsi jangka panjang.

📌 **Perubahan:** Klise generik → keterbatasan spesifik + arah riset lanjutan yang konkret.

---

## 6. "Berdasarkan" Syndrome — Variasikan Pembuka

**❌ Before:**
> **Berdasarkan** hasil pengujian, model Random Forest mencapai akurasi 93%. **Berdasarkan** confusion matrix, precision model adalah 0,92. **Berdasarkan** evaluasi ahli gizi, rekomendasi dinilai layak.

**✅ After:**
> Model Random Forest mencapai akurasi 93% pada data uji. Dari confusion matrix, precision tercatat 0,92 — tertinggi di antara tiga algoritma yang diuji. Ahli gizi menilai rekomendasi LLM sangat layak (86,6%) setelah memverifikasi 30 sampel rekomendasi.

📌 **Perubahan:** Tiga "Berdasarkan" dalam 3 kalimat → variasi pembuka + satu kalimat berisi insight tambahan.

---

## 7. Meta-Komentar Berlebihan — Satu Sudah Cukup

**❌ Before:**
> **Pada bagian ini** akan dibahas mengenai hasil pengujian model. **Seperti yang telah disebutkan pada bab sebelumnya**, pengujian dilakukan dengan tiga skenario. **Berikut adalah** hasil pengujian tersebut:

**✅ After:**
> Pengujian model dilakukan dalam tiga skenario: (1) data uji dari dataset, (2) 50 data baru, dan (3) validasi silang 10-fold. Hasilnya sebagai berikut.

📌 **Perubahan:** Meta-komentar berantai → satu kalimat substansi + langsung ke hasil.

---

## 8. Paragraf Metodologi yang Cuma Definisi

**❌ Before:**
> Metode pengembangan yang digunakan dalam penelitian ini adalah metode waterfall. Metode ini memiliki tahapan-tahapan sistematis yaitu requirements, design, implementation, testing, dan maintenance. Metode ini dipilih karena sesuai dengan kebutuhan pengembangan sistem.

**✅ After:**
> Pengembangan sistem mengikuti model Waterfall melalui lima tahap: analisis kebutuhan (wawancara dengan 3 ahli gizi Cafe Nut Castle), perancangan (UML), implementasi (Laravel, Python scikit-learn), pengujian (black box, SUS, akurasi model), dan pemeliharaan.

📌 **Perubahan:** Definisi abstrak → spesifik: siapa, pakai apa, berapa banyak.

---

## 9. Rumusan Masalah yang Terlalu Umum

**❌ Before:**
> 1. Bagaimana mengimplementasikan machine learning dalam sistem prediksi program diet?
> 2. Bagaimana mengintegrasikan LLM dalam sistem rekomendasi diet?

**✅ After:**
> 1. Bagaimana performa Random Forest dalam memprediksi tiga kelas program diet (BB turun, BB naik, lemak turun) pada data komposisi tubuh 250 pelanggan Cafe Nut Castle?
> 2. Bagaimana tingkat kelayakan rekomendasi diet dari Gemini Flash-Lite API berdasarkan evaluasi ahli gizi menggunakan skala Likert 5 poin?

📌 **Perubahan:** Pertanyaan umum → BATA (Batas, Atribut, Target, Alat ukur) jelas.

---

## 10. Halaman Saran yang Terlalu Generik

**❌ Before:**
> 1. Bagi peneliti selanjutnya, disarankan untuk menambahkan variabel lain.
> 2. Sistem ini dapat dikembangkan dengan menambahkan fitur yang lebih lengkap.

**✅ After:**
> 1. Penelitian selanjutnya dapat menambahkan variabel usia, riwayat penyakit, dan preferensi makanan sebagai fitur prediksi — karena ketiganya menunjukkan korelasi signifikan pada studi sebelumnya (Putri, 2023).
> 2. Fitur tracking progres harian berbasis mobile dapat dikembangkan untuk memantau kepatuhan diet secara real-time.

📌 **Perubahan:** Saran generik tanpa arah → saran spesifik dengan rujukan dan justifikasi.
