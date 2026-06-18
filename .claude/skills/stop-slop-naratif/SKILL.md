---
name: stop-slop-naratif
description: Bikin tulisan lebih enak dibaca — tidak kaku, tidak terlalu santai, cocok buat laporan, dokumentasi, atau tulisan teknis yang perlu dipahami semua orang.
metadata:
  trigger: Menulis laporan, dokumentasi, panduan, artikel, atau tulisan teknis yang perlu mudah dipahami siapa saja
  author: stop-slop
---

# Stop Slop — Naratif

Cara nulis yang **mengalir kayak ngomong, tapi tetap rapi**. Tidak kaku kayak skripsi, tidak terlalu santai kayak chat sama teman.

---

## Prinsipnya

1. **Cerita, bukan laporan.** Bayangin kamu lagi jelasin ke teman. Urutannya rapi, bahasanya santun, tapi nggak kaku.

2. **Pikirin pembaca.** Mereka paham teknologi, tapi belum tentu ahli bidang ini. Kalau ada istilah asing, jelasin atau kasih padanan.

3. **Utamakan bahasa Indonesia. Tapi jangan dipaksa.** Kalau istilah Inggrisnya lebih umum dan padanan Indonesianya aneh, pakai Inggris saja. Misal: *Random Forest*, *API*. Nggak usah dipaksa jadi "hutan acak" atau "antar muka pemrograman aplikasi" — itu malah bikin bingung.

4. **Akademik sedikit boleh. Tapi jangan berlebihan.** Kata kayak *implementasi*, *optimalisasi*, *berdasarkan hasil penelitian* — itu bikin tulisan kaku. Pakai kalau terpaksa, tapi kalau ada cara yang lebih sederhana, pilih yang sederhana.

---

## Aturan Pakai

### ✅ Ini Boleh

- **Alur cerita** — *"Pertama, ambil data dari sensor. Lalu bersihkan dari angka-angka aneh. Baru setelah itu, data siap dipakai."* — lebih enak dibaca daripada langkah-langkah kaku.
- **Kalimat aktif** — *"Kita pakai Random Forest karena..."* lebih enak dari *"Random Forest digunakan karena..."*
- **Pakai kata "kita"** — untuk tulisan tim terasa dekat. Untuk laporan resmi, "penulis" atau "kami" bisa dipakai.
- **Istilah asing dikasih penjelasan** — *"Data dibagi jadi training set (data latih) dan testing set (data uji)."* Atau cukup: *"training/testing"*
- **Paragraf pendek** — 3-5 kalimat langsung inti. Jangan 10 kalimat kayak skripsi.
- **Kata penghubung yang wajar** — *"Nah, setelah model siap..."* — boleh, asal tidak tiap paragraf.

### ❌ Ini Jangan — Terlalu Kaku

Kata-kata ini bikin tulisan terdengar kayak laporan formal.

| ❌ Jangan | ✅ Ganti |
|-----------|----------|
| Berdasarkan hasil penelitian yang telah dilakukan | Dari hasil pengujian, / Hasilnya menunjukkan, |
| Metode yang digunakan dalam penelitian ini adalah | Penelitian ini pakai / Metode yang dipakai adalah |
| Dapat disimpulkan bahwa | Kesimpulannya, / Intinya, |
| Mengimplementasikan | Menerapkan, bikin, pakai |
| Optimalisasi | Perbaikan, cara terbaik |
| Mengeksekusi | Menjalankan, melakukan |
| Memfasilitasi | Membantu, mendukung |
| Mentransformasi | Mengubah |
| Berdasarkan uraian di atas | (langsung aja ke inti) |
| Dengan demikian | Jadi, / Karena itu, / (langsung) |
| Sebagaimana telah disebutkan | (nggak perlu, langsung ke inti) |
| Pada era perkembangan teknologi | (potong — langsung ke topik) |

### ❌ Ini Juga Jangan — Terlalu Santai

Jangan kebalik jadi kayak chat.

| ❌ Jangan | ✅ Ganti |
|-----------|----------|
| Guys, jadi gini | (jangan) |
| Pokoknya | (jangan) |
| Aplikasi ini mantap | **Aplikasi ini bekerja dengan baik** |
| Ngebug | **error, bermasalah** |
| Alay | (jangan) |
| Gitu deh | (jangan) |

### ✅ Aturan Istilah Asing

Ini yang penting buat **pembaca umum**:

**1. Istilah asing pertama muncul → kasih padanan**
- *dataset / kumpulan data*
- *training / pelatihan*
- *testing / pengujian*
- *machine learning / pembelajaran mesin*

Setelah itu, terserah mau pakai Indonesia atau Inggris. Yang penting konsisten.

**2. Istilah yang sudah umum di Indonesia → nggak perlu diterjemahkan**
- *AI, API, CPU, internet, website, database*

**3. Istilah yang nggak punya padanan → biarkan Inggris**
- *Random Forest* — diterjemahin jadi "hutan acak" malah aneh
- *Tokenisasi* — sudah diserap jadi bahasa Indonesia
- *Inference* — belum ada padanan yang pas, biarkan
- *Embedding* — sama, biarkan

### ✅ Aturan Khusus Buat Istilah Skripsi

Kalau kata itu **istilah teknis yang memang spesifik di topik skripsi** dan nggak ada padanan yang wajar di Indonesia → **biarkan**. Jangan dipaksakan.

**Dari skripsi tentang prediksi diet:**
- *Random Forest* → biarkan
- *Precision, Recall, F1-Score* → biarkan, sudah baku
- *LLM (Large Language Model)* → tulis lengkap sekali, setelahnya LLM aja
- *Prompt* → biarkan. Padanan "perintah" tidak tepat
- *Feature importance* → bisa dikasih padanan: *feature importance / tingkat kepentingan fitur*
- *Body composition* → kasih padanan sekali: *body composition / komposisi tubuh*

**Dari skripsi deteksi anomali:**
- *Isolation Forest* → biarkan
- *Contamination, n_estimators, max_samples* → parameter teknis, biarkan
- *SHAP* → akronim baku, biarkan. Tapi kalo perlu dijelasin: *SHAP — cara lihat fitur mana yang paling berpengaruh*

**Yang penting:** Coba tanya ke diri sendiri — "Kalau saya bacain ini ke adik kelas / orang tua / teman yang bukan IT, mereka paham?" Kalau jawabannya nggak, kasih penjelasan.

---

## 📋 Pola-pola dari Skripsi yang Sering Bikin Kaku

Ini saya ambil langsung dari **dua skripsi S1 Teknik Informatika**. Pola ini sering muncul dan bikin tulisan jadi kaku.

### "Hal Ini" Dipakai Terus

Dalam satu halaman bisa muncul 4-5 kali:
> *"Kesehatan itu penting. **Hal ini menyebabkan** kesadaran naik... **Hal ini menunjukkan** kontribusi... **Hal ini mengakibatkan** kesalahan... **Hal ini dapat berdampak** negatif..."*

**Aturannya:** "Hal ini" cukup 1 kali setiap 3 paragraf. Lebih dari itu, ganti:
- "Hal ini" → **"Temuan ini"**, **"Kondisi ini"**, **"Data ini"**
- Atau langsung aja: *"Akibatnya, kesalahan prediksi pernah terjadi..."*

### "Selain Itu" Berulang

Banyak skripsi setiap paragraf mulai dengan "Selain itu":
> *"Selain itu, pencatatan manual lemah... Selain itu, machine learning membantu... Selain itu, parameternya..."*

**Aturannya:** Variasikan. Kadang pakai "Di sisi lain", "Sementara itu", "Lebih jauh lagi". Kadang langsung aja tanpa kata penghubung.

### "Berdasarkan" di Awal Kalimat

> *"**Berdasarkan** latar belakang... **Berdasarkan** hasil pengujian... **Berdasarkan** rumusan masalah..."*

**Aturannya:** Maksimal 1 dari 5 kalimat mulai dengan "Berdasarkan". Sisanya variasikan.

### "Penelitian Ini", "Sistem Ini" Diulang Terus

Dalam satu paragraf bisa muncul 3-4 kali:
> *"**penelitian ini** mengusulkan... **Sistem ini** mendukung... **Sistem ini** dirancang... **Penelitian ini** diharapkan..."*

**Aturannya:** Kalau sudah lebih dari 2 kali dalam satu paragraf, beberapa bisa dihapus. Konteksnya sudah jelas.

### "Dapat" Dipakai di Mana-mana

Dalam 3 paragraf bisa muncul 9 kali:
> *"**dapat** meminimalkan, **dapat** memberikan, **dapat** dijadikan, **dapat** berjalan, **dapat** membantu, **dapat** dilakukan..."*

**Aturannya:** "Dapat" itu kata yang bikin pernyataan jadi ragu-ragu. Kecuali memang butuh (berarti *mampu*), lebih baik hapus.

| ❌ | ✅ |
|--|--|
| Sistem ini dapat membantu | Sistem ini membantu |
| Dapat disimpulkan bahwa | Random Forest akurat dengan 93% |
| Data dapat diakses | Data bisa diakses / Data diakses |

### Definisi yang Kebanyakan

Banyak skripsi tulis definisi Machine Learning → Supervised → Unsupervised → Semi-supervised → Reinforcement — padahal yang dipakai cuma Random Forest (Supervised).

**Aturannya:** Tulis saja yang relevan. Nggak usah definisikan semua sub-topik kalau nggak semuanya dipakai.

### "Menurut ..." Berjajar

> *"Menurut (Peneliti A, 2019)... Penelitian oleh (Peneliti B, 2020)... Penelitian selanjutnya oleh (Peneliti C, 2021)..."* — 7 paragraf formatnya sama.

**Aturannya:** Setelah 2-3 paper, jangan cuma "si A bilang X, si B bilang Y". Harus ada perbandingan atau pola yang kamu lihat di antara mereka.

### Kalimat Kepanjangan

**Contoh (62 kata dalam satu kalimat):**
> *"Penelitian tentang hubungan antara makanan ultra proses dengan kualitas pola makan yang dilakukan oleh (Shim dkk., 2022) menunjukkan bahwa makanan olahan ultra proses memberikan kontribusi terhadap konsumsi energi pada orang dewasa di Korea dengan rata-rata asupan energi yang dilaporkan adalah 2.031 kilokalori dengan 25,1% berasal dari makanan ultra proses."*

**Aturannya:** Kalau kalimat >40 kata, patahkan jadi 2. Atau potong kata penghubung yang nggak perlu.

> ✅ *Shim dkk. (2022) meneliti hubungan makanan ultra proses dengan kualitas pola makan. Hasilnya: rata-rata asupan 2.031 kkal — 25,1% dari makanan ultra proses.*

### "Sangat" di Mana-mana

> *"sangat penting", "sangat besar", "sangat efektif", "sangat akurat"*

**Aturannya:** Hapus "sangat" dari semua kalimat. Kalau sesuatu penting, buktikan. Kalau nggak, tanpa "sangat" juga cukup.

### "Gambar ... Menunjukkan" Tanpa Penjelasan

> *"Gambar 5.1 menunjukkan halaman dashboard. Gambar 5.2 menunjukkan halaman login."* — 20+ gambar deskripsinya sama.

**Aturannya:** Setelah "Gambar X menunjukkan...", kasih interpretasi. Jangan cuma bacain ulang judul gambar.

### Rumusan Masalah yang Cuma Ngulang Judul

Banyak skripsi rumusan masalahnya isinya cuma ngulang judul dengan gaya tanya:

> ❌ *"Bagaimana mengimplementasikan machine learning dalam sistem prediksi program diet?"*
> (Ini sama aja kayak judul dikasih tanda tanya — tidak spesifik.)

**Aturannya:** Rumusan masalah harus jelas — **metode yang dipakai, target yang diukur, dan tolok ukurnya**.

> ✅ *"Bagaimana performa Random Forest dalam memprediksi 3 program diet (BB turun, BB naik, lemak turun) pada data 250 pelanggan Cafe Nut Castle?"*
> 👆 Ada metode (Random Forest), target (3 program diet), dan tolok ukur (performa).

Coba cek: kalau rumusan masalah diubah jadi pernyataan (bukan tanya), apa masih ada informasinya? Kalau cuma "Menerapkan X untuk Y", berarti ngulang judul — perlu diperbaiki.

### "Proses Dimulai Ketika" Syndrome

Ini pola paling dominan di Bab IV skripsi S1. Deskripsi activity / sequence diagram dimulai dengan kalimat yang itu-itu melulu:

> *"Proses dimulai ketika pengguna memilih menu Login. Setelah itu, halaman login akan ditampilkan. Pengguna kemudian memasukkan email dan password. Setelah itu, sistem akan melakukan validasi..."*  
> — pola ini bisa diulang **15× lebih** dengan beda nama menu doang.

**Aturannya:** 
- Kalau ada lebih dari 3 deskripsi diagram berurutan dengan struktur kalimat yang sama, **satukan jadi 1-2 paragraf saja** buat semua diagram.
- Contoh ringkas: *"Akses ke tiap fitur (login, CRUD pengguna, cetak laporan) dimulai dari menu terkait. Sistem akan menampilkan data, pengguna bisa menambah/mengedit/menghapus dengan konfirmasi, lalu sistem menyimpan dan memberi notifikasi."*
- **Nggak perlu menjelaskan tiap diagram dengan 3 paragraf penuh** — apalagi kalau strukturnya identik. Jadikan satu tabel perbandingan atau satu paragraf general.

### CRUD Narrative Repetition

Setiap sub-bab "Mengelola Data X" strukturnya selalu sama:

> **Untuk menambahkan:** Pengguna menekan tombol Tambah → form muncul → diisi → disimpan → notifikasi sukses/error.  
> **Untuk mengedit:** Pengguna menekan tombol Edit → form muncul → diubah → disimpan → notifikasi sukses/error.  
> **Untuk menghapus:** Pengguna menekan tombol Hapus → konfirmasi → ya/tidak → notifikasi.  
> **Penutup:** *"Fitur ini memastikan bahwa pengelolaan data X dapat dilakukan secara fleksibel dan efisien..."*

Ini diulang utuh untuk setiap entitas (pengguna, checkup, jadwal, program diet, dll) — bisa 10× dalam satu bab.

**Aturannya:** 
- Kalau CRUD-nya sama persis beda entitas, **tulis sekali saja secara general**. Misal: *"Seluruh data master (pengguna, pelanggan, jadwal, program diet) dikelola dengan pola yang sama: tambah, edit, dan hapus dengan konfirmasi."*
- Simpan deskripsi detail hanya untuk fitur yang **memang punya alur unik** (misal: prediksi diet yang butuh input data → panggil API → tampilkan hasil).
- **Penutup "Fitur ini memastikan/memungkinkan/mempermudah"** di setiap sub-bab itu template kosong. Cukup 1-2 kali di awal bab, setelah itu hapus.

### Akronim Opening Fatigue

Bab II (Landasan Teori) sering mulai dengan tumpukan definisi akronim yang sudah basi:

> *"Perkembangan Teknologi Informasi (TI) dan Artificial Intelligence (AI) di era Revolusi Industri 4.0 dan Society 5.0..."*

Atau definisi Machine Learning → Supervised Learning → Unsupervised Learning → Reinforcement Learning — padahal yang dipakai cuma Random Forest.

**Aturannya:** 
- Cukup definisikan **istilah yang benar-benar dipakai** di penelitian. Nggak usah definisikan semua varian.
- Kalau ada 3+ akronim umum berjajar di paragraf pertama (*AI, IoT, ML, DL, Big Data*), potong. Pembaca sudah muak.
- Tanya ke diri sendiri: *"Apa pembaca benar-benar perlu tahu definisi ini buat paham penelitian saya?"* Kalau nggak, hapus atau geser ke lampiran.

---

## Contoh Sebelum-Sesudah

**❌ Kaku:**
> Berdasarkan hasil pengujian yang telah dilakukan, dapat disimpulkan bahwa metode Random Forest mampu mengimplementasikan sistem prediksi program diet dengan akurat.

**✅ Naratif:**
> Hasil pengujian menunjukkan Random Forest memprediksi program diet dengan akurasi 93%. Artinya, dari 100 data yang diuji, 93 tepat sasarannya.

**❌ Kaku:**
> Penelitian ini menggunakan algoritma Isolation Forest yang dioptimasi dengan Algoritma Genetika untuk mendeteksi anomali pada mesin kompresor.

**✅ Naratif:**
> Penelitian ini pakai Isolation Forest — algoritma yang jago deteksi hal aneh/abnormal — yang dioptimasi dengan Algoritma Genetika biar makin akurat. Targetnya: mesin kompresor di industri.

**❌ Kaku:**
> Implementasi sistem ini diharapkan dapat menjadi solusi yang efektif bagi permasalahan gizi masyarakat.

**✅ Naratif:**
> Harapannya, sistem ini bisa jadi solusi praktis buat masalah cek gizi — tanpa harus antre konsultasi ke ahli gizi untuk hal-hal sederhana.

---

### Contoh Tambahan — Pola Baru

**❌ "Proses Dimulai Ketika" (15× identik):**
> Proses dimulai ketika pengguna memilih menu Login. Setelah itu, sistem akan menampilkan halaman login. Pengguna kemudian memasukkan email dan password. Setelah itu, sistem akan melakukan validasi...

**✅ Ringkas:**
> Seluruh fitur diakses dari menu utama dengan alur yang seragam: pilih menu → isi/kelola data → simpan dengan konfirmasi → notifikasi hasil.

---

**❌ CRUD Narrative (diulang 10×):**
> Untuk menambahkan data pengguna, pengguna menekan tombol Tambah... Untuk mengedit data pengguna... Untuk menghapus data pengguna... Fitur ini memastikan...

**✅ Ringkas:**
> Data pengguna bisa ditambah, diedit, dan dihapus langsung dari antarmuka — dengan konfirmasi sebelum penghapusan dan notifikasi di setiap langkah.

---

**❌ Akronim Opening Fatigue:**
> Perkembangan Teknologi Informasi (TI) dan Artificial Intelligence (AI) di era Revolusi Industri 4.0 dan Society 5.0 telah membawa dampak signifikan...

**✅ Langsung ke inti:**
> Penelitian ini menggunakan Random Forest untuk memprediksi program diet berdasarkan data komposisi tubuh. Kenapa Random Forest? Karena algoritma ini cocok buat data tabular dengan banyak fitur dan hasilnya mudah dijelaskan.

---

## Quick Check (Sebelum Final)

- Ada kata *sangat, cukup, agak, begitu*? Hapus.
- Ada *"hal ini"* lebih dari 1 kali per 3 paragraf? Ganti.
- Ada *"selain itu"* di awal paragraf? Variasikan.
- Ada kalimat >40 kata? Patahkan.
- Ada deskripsi diagram yang dimulai dengan *"Proses dimulai ketika"*? Gabungkan jadi 1-2 paragraf.
- Ada sub-bab CRUD yang cuma beda nama entitas tapi isinya sama? Tulis sekali secara general.
- Ada akronim umum (AI, IoT, ML) berjajar di paragraf pertama? Potong.
- Ada istilah asing yang baru pertama muncul tanpa penjelasan? Kasih padanan.
- Ada terjemahan yang dipaksakan? (*hutan acak* buat Random Forest? Jangan.)
- Kalau dibacakan ke teman non-IT, mereka paham? Kalau nggak, perbaiki.

## Lisensi

MIT — stop-slop
