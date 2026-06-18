---
name: stop-slop-akademik
description: Perbaiki kualitas penulisan akademik Bahasa Indonesia — skripsi S1, skripsi S2/thesis, jurnal. Hilangkan pola AI, padding, dan kelemahan dengan pendekatan per-jenjang.
metadata:
  trigger: Menulis atau mereview karya ilmiah Bahasa Indonesia: skripsi S1, skripsi S2 (thesis), tesis, disertasi, jurnal, paper akademik
  author: Adaptasi stop-slop untuk konteks akademik Indonesia
---

# Stop Slop — Akademik

Versi khusus untuk penulisan ilmiah Bahasa Indonesia (S1, S2, S3, jurnal, paper). Skill ini **membedakan pendekatan antara jenjang S1 dan S2** — karena karakteristik bahasa, kedalaman analisis, dan ekspektasi akademiknya berbeda.

**📌 Catatan:** Dua PDF template yang digunakan untuk menyusun skill ini adalah skripsi **S1 (D4) Teknik Informatika, Politeknik Negeri Malang**. Pola-pola yang diidentifikasi berasal dari sana.

## 🎓 Mode Utama: S1

Skill ini **dioptimalkan untuk S1 (D4/Sarjana)** — target utama yang paling membutuhkan perbaikan pola. Mode S2, S3, dan Jurnal tersedia sebagai perluasan, tapi default dan terkaya adalah S1.

| Mode | Untuk | Karakteristik Bahasa |
|------|-------|---------------------|
| **→ S1** (default) | Skripsi S1/D4 | Formal-templated, pasif dominan, meta-komentar navigasi berulang, deskriptif-reportif |
| **S2** | Thesis / Tesis S2 | Semi-formal analitis, lebih aktif, lebih sedikit template, harus berargumen |
| **Jurnal** | Artikel jurnal ilmiah | Padat ekstrim, langsung ke inti, minim meta-komentar, data-driven |

---

## Prinsip Dasar (Berlaku untuk Semua Mode)

1. **Hormati konvensi S1.** Skripsi S1 boleh formal, templated, dan reportif. Jangan audit S1 pakai standar jurnal internasional — tapi jangan biarkan template jadi alasan untuk malas menulis.

2. **Padat itu ilmiah.** Makin panjang kalimat tanpa informasi tambahan, makin lemah tulisannya.

3. **Spesifik itu kredibel.** Bilang "signifikan" tanpa angka itu opini. Bilang "akurasi 93%" itu sains.

4. **Variasi itu dewasa.** Template institusi bukan alasan untuk kalimat seragam sepanjang 200 halaman.

5. **Pasif formal itu wajar** — di S1 sangat wajar. Tapi jangan sampai menghindari tanggung jawab penjelasan (*"kesalahan terjadi"* → siapa? kenapa?).

---

## 🟢 S1 — Aturan Khusus

S1 adalah **jenjang pembuktian kompetensi teknis**. Bahasanya cenderung **reportif**: melaporkan apa yang dilakukan. Template institusi sangat dominan. Ini yang boleh dan tidak.

### ✅ Diizinkan di S1

- **Kalimat pasif dominan** — *Data dianalisis, Sistem dikembangkan, Pengujian dilakukan* — WAJAR. Ini konvensi laporan teknis S1.
- **Meta-komentar navigasi berulang** — *"Pada bab ini akan dibahas", "Seperti yang telah dijelaskan pada bab sebelumnya", "Gambar X menunjukkan"* — WAJAR untuk dokumen 100-200 halaman dengan pembaca dosen penguji yang lompat-lompat.
- **Template institusi** — Struktur bab fixed (BAB I Pendahuluan, BAB II Tinjauan Pustaka, dst) — tidak perlu diperbaiki.
- **Deskripsi teknis prosedural** — *"Peneliti memasukkan data ke dalam format CSV, kemudian melakukan normalisasi dengan metode Min-Max"* — SAH untuk S1 yang menekankan proses.
- **Daftar parameter teknis** — Enumerasi parameter (*n_estimators, max_depth, contamination*) — SAH, ini completeness.
- **"Dengan ini saya menyatakan bahwa"** — di halaman pernyataan, SAH seratus persen.
- **Kata pengantar normatif** — *"Puji syukur ke hadirat Tuhan Yang Maha Esa"* — SAH, ini bagian dari format institusi, jangan disentuh.

### ❌ Diperbaiki di S1

- **Filler dan intensifier** — *sangat, cukup, agak, begitu* — hapus. S1 yang baik tetap padat.
- **Pernyataan kabur** — *"Hal ini menunjukkan bahwa"* — ganti dengan data spesifik.
- **Redundansi khas S1** — *"metode penelitian yang digunakan dalam penelitian ini adalah metode"*.
- **Kata sambung berantai** — *"sehingga dengan demikian maka dapat..."*.
- **Paragraf >5 kalimat tanpa jeda** — S1 suka kalimat panjang tak berujung. Patahkan.
- **"Dapat dijadikan acuan", "bermanfaat bagi pembaca"** — ini template kosong.
- **Latar belakang piramida terbalik terlalu panjang** — mulai terlalu luas (*era globalisasi*) baru ke topik di paragraf 4.
- **Abstrak yang cuma ngulang judul** — abstrak S1 yang baik > sekadar "penelitian ini bertujuan untuk..."

---

## 🔵 S2 — Aturan Khusus

S2 adalah **jenjang pembuktian kemampuan analitis dan sintesis**. Bahasanya harus lebih **argumentatif**: tidak cukup melaporkan, harus **mengambil posisi dan membela argumen**. Standar lebih tinggi dari S1.

### ✅ Diizinkan di S2 (tapi lebih ketat dari S1)

- **Kalimat pasif** — masih wajar, tapi proporsi aktif harus lebih tinggi dari S1.
- **Meta-komentar** — boleh, tapi lebih sedikit dari S1. Satu meta-kalimat per bab sudah cukup.
- **Kata serapan teknis** — SAH, tapi jangan berlebihan.
- **Penanda kohesif** — SAH, tapi variasikan. Jangan semua paragraf mulai dengan "Berdasarkan".

### ⚠️ Di S2, Ini HARUS DIHAPUS (tapi masih wajar di S1)

| ❌ S2 — Tidak Boleh | ✅ S1 — Masih Wajar |
|---------------------|-------------------|
| *"Penelitian ini bertujuan untuk..."* (pengulangan judul) | Sering ada di abstrak S1 |
| *"Dengan ini penulis menyadari bahwa masih banyak kekurangan..."* | Wajar di kata pengantar S1 |
| *"Akhir kata, penulis ucapkan terima kasih"* | Wajar di kata pengantar S1 |
| *"Gambar X menunjukkan..."* (tanpa interpretasi) | Wajar di S1 untuk laporan teknis |
| *"Tabel di bawah ini menyajikan..."* (deskripsi tanpa insight) | Wajar di S1 |
| Pelaporan langkah teknis prosedural tanpa analisis | S1 masih dimaklumi |
| Abstrak cuma deskripsi, tidak menyebut temuan spesifik | Sering di S1 |
| Parafrase definisi dari buku teks tanpa kritik | S1 masih dimaklumi |
| Kesimpulan hanya mengulang hasil | S1 masih dianggap cukup |

**🔑 Pembeda utama S2:** Setiap bagian harus ada **analisis, interpretasi, atau sintesis** — bukan sekadar laporan.

### ❌ Dilarang di S2

- **Semua yang dilarang di S1** tetap dilarang.
- **Tidak punya posisi/argumen** — S2 harus berargumen, bukan cuma melapor.
- **Latar belakang yang luas tanpa fokus** — S2 langsung ke masalah spesifik di paragraf 1.
- **Tinjauan pustaka yang cuma ringkasan buku** — harus ada sintesis, perbandingan, dan identifikasi gap.
- **"Penelitian ini menggunakan metode X" tanpa alasan** — *kenapa* X? bukan Y?
- **Kesimpulan yang cuma mengulang bab hasil** — harus ada insight baru, implikasi, atau refleksi.
- **Tidak ada kaitannya dengan penelitian sebelumnya** — S2 harus position diri dalam literatur.
- **Klise penutup yang generik** — *"perlu diteliti lebih lanjut"* tanpa arah spesifik — ini sangat memalukan di S2.
- **Kata pengantar terlalu panjang** — S2 cukup 1-2 paragraf, jangan kayak S1 yang 2 halaman.
- **Halaman persembahan / dedikasi berlebihan** — kalau ada, singkat.

---

### 📊 Perbandingan S1 vs S2 — Matriks Cepat

| Aspek | S1 (Skripsi) | S2 (Thesis) |
|-------|-------------|-------------|
| Fungsi | Bukti kompetensi teknis | Bukti kemampuan riset |
| Gaya bahasa | Reportif, prosedural | Argumentatif, analitis |
| Dominasi pasif | Tinggi (70-80%) | Sedang (50-60%) |
| Meta-komentar | Banyak, eksplisit | Minimal |
| Template institusi | Sangat kental | Lebih longgar |
| Kata pengantar | 1-2 halaman formal | 1 paragraf singkat |
| Tinjauan pustaka | Ringkasan teori | Sintesis + identifikasi gap |
| Kesimpulan | Ulang hasil | Insight baru + implikasi |
| Klise akademik | Masih dimaklumi | Tidak boleh |
| Target pembaca | Dosen penguji (tahu template) | Reviewer (ingat riset, bukan template) |

---

## Aturan Global (Berlaku untuk S1 dan S2)

### ❌ DILARANG di SEMUA JENJANG

- **Filler dan intensifier** — *sangat, cukup, agak, begitu, sangatlah* — tidak ilmiah di jenjang mana pun.
- **Pernyataan kabur** — *"Hal ini menunjukkan bahwa", "Dari sini dapat disimpulkan"* — langsung sebut spesifiknya.
- **Klise akademik kosong** — *"dapat dijadikan acuan bagi peneliti selanjutnya"* (tanpa arah).
- **Pembuka kosong** — *"Perlu diingat bahwa", "Tidak dapat dipungkiri bahwa", "Pada era globalisasi ini"*.
- **Kontras biner yang dipaksakan** — *"tidak hanya X tetapi juga Y"* — tulis langsung Y.
- **Redundansi** — *"metode penelitian yang digunakan dalam penelitian ini adalah metode"*.
- **Kata sambung berantai** — *"sehingga dengan demikian maka dapat..."*.
- **Janji tanpa bukti** — kalimat yang bilang sesuatu penting/kompleks tanpa data.
- **Frasa berbunga-bunga** — *"mengukir prestasi", "menorehkan sejarah", "buah pemikiran"*.
- **Akronim tidak didefinisikan** pertama kali muncul.
- **Daftar pustaka tanpa DOI/ratusan website** — kredibilitas rendah.

---

## Quick Check Sebelum Submit

### Untuk S1:
- Ada *sangat, cukup, agak, begitu, sangatlah*? Hapus.
- Ada kalimat >40 kata tanpa jeda? Patahkan.
- Ada *"tidak hanya... tetapi juga"*? Bisa diganti langsung?
- Ada paragraf isinya cuma basa-basi? (*"diharapkan dapat memberikan manfaat"*)
- Ada frasa *"hal ini"* yang merujuk ke sesuatu dari 3 kalimat lalu? Perjelas.
- Ada kesimpulan yang cuma mengulang hasil? Tambahkan insight.
- Ada judul subbab yang terlalu umum? (*Analisis Data →* apa yang dianalisis?)
- Mulai latar belakang dengan *"era globalisasi"*? Potong ke topik spesifik.
- Abstrak menyebut angka/nilai hasil penelitian?

### Untuk S2 (semua S1 + berikut):
- Setiap bab mengandung analisis, bukan sekadar laporan?
- Ada posisi/argumen yang diambil? Atau cuma deskripsi netral?
- Tinjauan pustaka menyintesis dan membandingkan — bukan cuma meringkas satu-satu?
- *Kenapa* memilih metode X, bukan Y?
- Kesimpulan mengandung insight baru di luar hasil bab sebelumnya?
- Saran bersifat spesifik (metode, dataset, parameter) — bukan template?
- Kata pengantar singkat (≤1 paragraf)? Atau masih kayak S1?
- Bahasa lebih aktif proporsional? Atau masih 80% pasif?

---

## Skoring

### Skoring S1
| Dimensi | Pertanyaan |
|---------|-----------|
| Ketajaman | Setiap kalimat informatif atau basa-basi? |
| Spesifisitas | Ada data konkret atau cuma generalisasi? |
| Struktur | Mengikuti template baik? Atau ada bab hilang? |
| Efisiensi | Bisa dipotong tanpa kehilangan makna? |
| Formalitas | Formal konsisten? Tidak campur bahasa santai? |

### Skoring S2 (standar lebih tinggi)
| Dimensi | Pertanyaan |
|---------|-----------|
| Ketajaman Analitis | Setiap klaim didukung argumen? Atau cuma asumsi? |
| Posisi Ilmiah | Berani ambil posisi? Atau deskriptif netral? |
| Sintesis | Menghubungkan berbagai sumber? Atau ringkasan per-buku? |
| Efisiensi | Setiap kata bernas? Ada padding? |
| Orisinalitas | Ada kontribusi/sudut pandang baru? Atau cuma aplikasi? |

**S1:** Di bawah 30/50 — revisi. **S2:** Di bawah 35/50 — revisi substansial.

## Lisensi

MIT — Adaptasi untuk akademik dari [stop-slop](https://github.com/hardikpandya/stop-slop)
