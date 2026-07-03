/**
 * Auto-generated search index from markdown files.
 * Run: node scripts/generate-search-index.js
 *
 * Last generated: 2026-07-03T11:07:08.077Z
 */

export interface SearchEntry {
  headings: string[];
  content: string;
}

export const SEARCH_INDEX: Record<string, SearchEntry> = {
  "features/ai-models": {
    "headings": [
      "AI Models",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Cara Kerja AI Verification",
      "Provider yang Didukung",
      "Tambah Model",
      "Test Model",
      "Fallback Chain",
      "Prompt Presets",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: AI Models description: Configure LLM providers for AI verification updated: 2026-07-03 AI Models memungkinkan kamu mengkonfigurasi model AI yang digunakan untuk memverifikasi temuan keamanan. AI menentukan apakah temuan adalah True Positive (masalah nyata) atau False Positive (salah deteksi). 1. Buka **AI Models** di sidebar 2. Klik **Add Model** - **Name** — nama deskriptif - **Provider** — Ollama, OpenAI, dll - **Base URL** — endpoint API - **API Key** — kunci API kamu - **Model** — nama model (contoh: gpt-4, llama3) 4. Klik **Create** 1. Buka **AI Models** 2. Klik **Test** pada model 3. Tunggu respons 4. Lihat status (berhasil/gagal) dan waktu respons Jika model utama gagal, sistem mencoba model berikutnya:"
  },
  "features/dashboard": {
    "headings": [
      "Dashboard",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Yang Ditampilkan",
      "Cara Membaca Metrik",
      "Tips",
      "Langkah Selanjutnya"
    ],
    "content": "title: Dashboard description: Workspace overview and key metrics updated: 2026-07-03 Dashboard adalah halaman utama yang memberikan ringkasan kesehatan keamanan workspace kamu. Dari sini, kamu bisa melihat tren temuan, scan terakhir, dan status proyek — tanpa harus membuka menu satu per satu. Semua peran bisa melihat dashboard. Ini adalah titik awal sebelum melakukan aktivitas lain: Dari dashboard, kamu bisa:"
  },
  "features/findings": {
    "headings": [
      "Findings",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Lifecycle Temuan",
      "Tinjau Temuan",
      "Detail Temuan",
      "Triage",
      "AI Verdicts",
      "Severity",
      "Bulk Actions",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Findings description: Review and triage security findings updated: 2026-07-03 Findings adalah masalah keamanan yang terdeteksi oleh scanner. Setiap finding dilengkapi dengan verifikasi AI, klasifikasi CWE, dan saran perbaikan. 1. Buka **Findings** di sidebar 2. Filter berdasarkan: - **Severity** — Critical / High / Medium / Low / Info - **Status** — Open / Dismissed / Resolved - **Scanner** — Semgrep / Gitleaks / dll - **Repository** — Filter per repo 3. Klik temuan untuk melihat detail Pilih beberapa temuan sekaligus: 1. Centang checkbox di samping temuan 2. Klik **Bulk Actions** 3. Pilih: **Dismiss All** / **Resolve All** / **Assign All**"
  },
  "features/knowledge-base": {
    "headings": [
      "Knowledge Base",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Apa Isinya?",
      "Cara Kerja",
      "Field Knowledge Entry",
      "Melihat Entri",
      "Mute Entri",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Knowledge Base description: CWE & NVD reference for security findings updated: 2026-07-03 Knowledge Base menyediakan konteks keamanan dari NVD (National Vulnerability Database) dan CWE (Common Weakness Enumeration) untuk membantu AI memverifikasi temuan dengan lebih akurat. Saat temuan terdeteksi, sistem mencari entri CWE yang relevan dan menyertakannya dalam prompt verifikasi AI. Ini memberikan AI konteks yang lebih baik untuk menentukan apakah temuan tersebut nyata. 1. Buka **Knowledge Base** di sidebar 2. Jelajahi atau cari berdasarkan CWE ID atau kata kunci 3. Klik entri untuk melihat detail lengkap Kamu bisa mengecualikan entri dari konteks AI: 1. Buka entri knowledge 2. Klik **Mute** 3. Entri tersebut tidak lagi digunakan dalam verifikasi AI"
  },
  "features/members": {
    "headings": [
      "Members",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Halaman Members",
      "Tab Members",
      "Tab Invitations",
      "Undang Anggota",
      "Ubah Role Anggota",
      "Hapus Anggota",
      "Batalkan Undangan",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Members description: Invite and manage team members updated: 2026-07-03 Members adalah pengelolaan siapa yang memiliki akses ke workspace. kamu bisa mengundang anggota baru, mengubah role, atau menghapus anggota. Halaman ini memiliki dua tab: **Members** dan **Invitations**. Menampilkan semua anggota workspace saat ini. Menampilkan undangan yang belum diterima. 1. Buka **Members** di sidebar 2. Klik **Invite Member** 3. Masukkan **email** orang tersebut 4. Pilih **role** (Owner / Manager / Reviewer / Member) 5. Klik **Send Invitation** Orang tersebut akan menerima email dengan link untuk bergabung. 1. Buka **Members** 2. Cari anggota 3. Klik **Change Role** 4. Pilih role baru 5. Konfirmasi 1. Buka **Members** 2. Cari anggota 3. Klik **Remove** 4. Konfirmasi Anggota akan kehilangan akses secara langsung. 1. Buka **Members** → tab **Invitations** 2. Cari undangan yang pending 3. Klik **Revoke** Link undangan akan berhenti berfungsi."
  },
  "features/profile": {
    "headings": [
      "Profile",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Tab Profile",
      "Ubah Avatar",
      "Ubah Info",
      "Tab Security",
      "Ganti Password",
      "Revoke Sesi",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Profile description: Manage your account settings updated: 2026-07-03 Profile adalah halaman pengaturan akun pribadi. Di sini kamu bisa mengubah informasi profil, mengganti password, dan mengelola sesi login. Semua pengguna. Ini adalah halaman yang harus dikunjungi setelah pertama kali login. 1. Buka **Profile** di sidebar 2. Klik area avatar 3. Unggah gambar baru, atau hapus yang sekarang 1. Buka **Profile** 2. Edit field yang diinginkan 3. Klik **Save** Kelola password dan sesi aktif. 1. Klik tab **Security** 2. Masukkan **password saat ini** 3. Masukkan **password baru** 4. Konfirmasi password baru 5. Klik **Save** Semua sesi lain akan logout saat kamu mengganti password. Kamu bisa melihat semua sesi aktif dan revoke yang tidak dikenal. 1. Klik tab **Security** 2. Cari sesi di daftar 3. Klik **Revoke**"
  },
  "features/projects": {
    "headings": [
      "Projects",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Buat Proyek",
      "Detail Proyek",
      "Tambah Repository ke Proyek",
      "Tambah Anggota ke Proyek",
      "Tambah Tim ke Proyek",
      "API Tokens (untuk CI/CD)",
      "Buat Token",
      "Revoke Token",
      "Hapus Proyek",
      "Cara Kerja Projects",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Projects description: Group repositories and manage access updated: 2026-07-03 Projects mengelompokkan repositori bersamaan dan mengontrol siapa yang bisa mengaksesnya. Setiap proyek bisa memiliki anggota, tim, dan API token tersendiri. 1. Buka **Projects** di sidebar 2. Klik **New Project** 3. Isi **nama** dan **deskripsi** 4. Klik **Create` Setiap proyek memiliki tab untuk mengelola berbagai aspek: 1. Buka proyek 2. Buka bagian **Repositories** 3. Klik **Add Repository** 4. Pilih repository 5. Klik **Save** 1. Buka proyek 2. Buka bagian **Members** 3. Klik **Add Member** 4. Pilih anggota dan role 5. Klik **Save** 1. Buka proyek 2. Buka bagian **Teams** 3. Klik **Add Team** 4. Pilih tim dan role 5. Klik **Save** Setiap proyek bisa memiliki API token sendiri untuk pipeline CI/CD. 1. Buka proyek 2. Klik tab **API Tokens** 3. Klik **Create Token** 4. Beri nama (contoh: \"CI Pipeline — main branch\") 5. Klik **Create** 6. **Copy token segera** — token tidak akan ditampilkan lagi 1. Buka proyek → tab **API Tokens** 2. Cari token 3. Klik **Revoke** 1. Buka proyek 2. Buka tab **General** 3. Klik **Delete Project** 4. Konfirmasi Repository tidak dihapus — hanya pengelompokan proyek yang dihapus."
  },
  "features/reports": {
    "headings": [
      "Reports",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Format Laporan",
      "Buat Laporan",
      "Isi Laporan",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Reports description: Generate and export security reports updated: 2026-07-03 Reports memungkinkan kamu mengekspor hasil pemindaian keamanan dalam format PDF, XLSX, atau CSV. Laporan ini berguna untuk komunikasi dengan stakeholder, audit, atau analisis data. 1. Buka **Reports** di sidebar 2. Klik **Generate Report** 3. Pilih filter: - **Project** — proyek tertentu atau semua - **Date Range** — rentang waktu - **Severity** — filter berdasarkan tingkat keparahan 4. Pilih format (PDF / XLSX / CSV) 5. Klik **Generate** 6. Tunggu beberapa detik 7. Klik **Download**"
  },
  "features/repositories": {
    "headings": [
      "Repositories",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Dua Cara Menambah Repository",
      "Tambah Repository (Manual)",
      "Impor dari SCM",
      "Auto-Scan",
      "Setelah Menambah Repository",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Repositories description: Import and manage code repositories updated: 2026-07-03 Repository adalah kode sumber yang akan dipindai oleh platform. kamu bisa mengimpor dari GitHub, GitLab, atau Gitea, atau menambahkan secara manual. 1. Buka **Repositories** di sidebar 2. Klik **Add Repository** - **Name** — nama repositori kamu - **URL** — URL repositori - **Default Branch** — branch utama (biasanya main atau master) 4. Klik **Create** 1. Buka **Source Control** di sidebar 2. Hubungkan provider kamu (GitHub / GitLab / Gitea) 3. Buka **Repositories** → klik **Import** 4. Pilih repositori yang ingin diimpor 5. Tentukan proyek untuk setiap repo Jika terhubung via SCM, kamu bisa mengaktifkan auto-scan. Setiap push akan memicu scan secara otomatis. Setelah repo ditambahkan, kamu bisa: 1. **Jalankan scan** — Buka Scans → New Scan 2. **Atur CI/CD** — Buka Scans → CI/CD Setup 3. **Lihat temuan** — Buka Findings setelah scan selesai"
  },
  "features/scans": {
    "headings": [
      "Scans",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Dua Cara Scan",
      "Jalankan Scan Manual",
      "Monitor Progress",
      "Jenis Scan",
      "CI/CD Setup",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Scans description: Run and monitor security scans updated: 2026-07-03 Scan adalah proses memindai kode sumber untuk menemukan celah keamanan. kamu bisa menjalankan scan secara manual dari UI atau mengotomasikannya melalui CI/CD. 1. Buka **Scans** di sidebar 2. Klik **New Scan** 3. Pilih **repository** dan **branch** 4. Pilih scanner: 5. Klik **Start Scan` Klik scan di daftar untuk melihat timeline: Untuk otomatisasi scan setiap push: 1. Buka **Scans** → klik **CI/CD Setup** 2. Pilih platform (GitHub / GitLab / Gitea) 3. Klik **Copy YAML** 4. Paste file workflow ke repo kamu 5. Tambahkan secrets (SAST_API_URL, SAST_API_KEY) di pengaturan repo 6. Push kode — scan berjalan otomatis Setelah scan selesai:"
  },
  "features/source-control": {
    "headings": [
      "Source Control",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Provider yang Didukung",
      "Hubungkan Provider",
      "GitHub Setup",
      "GitHub App (Direkomendasikan)",
      "OAuth App",
      "Personal Access Token",
      "GitLab Setup",
      "OAuth Application (Direkomendasikan)",
      "Personal Access Token",
      "Gitea Setup",
      "OAuth Application (Direkomendasikan)",
      "Access Token",
      "Setelah Terhubung",
      "Putuskan Koneksi",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Source Control description: Connect GitHub, GitLab, and Gitea updated: 2026-07-03 Source control integration memungkinkan kamu mengimpor repositori dan mengaktifkan pemindaian otomatis. Setelah terhubung, setiap push akan memicu scan secara otomatis. 1. Buka **Source Control** di sidebar 2. Klik **Connect** pada provider 3. Panduan setup akan muncul dengan langkah-langkah 4. Pilih mode koneksi 5. Ikuti langkah-langkah dan centang setiap langkah selesai 6. Klik **Connect** saat semua langkah selesai GitHub memiliki 3 mode koneksi: 1. Buka **Source Control** 2. Klik **Disconnect** pada provider 3. Repository terputus (data tetap tersimpan)"
  },
  "features/teams": {
    "headings": [
      "Teams",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Buat Tim",
      "Tambah Anggota ke Tim",
      "Tugaskan Tim ke Proyek",
      "Cara Kerja Teams",
      "Edit Tim",
      "Hapus Tim",
      "Tips",
      "Kesalahan Umum",
      "Permissions",
      "Langkah Selanjutnya"
    ],
    "content": "title: Teams description: Organize members into teams for access control updated: 2026-07-03 Teams memungkinkan kamu mengelompokkan anggota untuk pengelolaan akses yang lebih mudah. Daripada menambahkan anggota satu per satu ke proyek, kamu bisa menugaskan seluruh tim sekaligus. 1. Buka **Teams** di sidebar 2. Klik **New Team** 3. Isi **nama** dan **deskripsi** 4. Klik **Create** 1. Buka tim 2. Klik **Add Members** 3. Pilih anggota dari daftar 4. Klik **Save** 1. Buka **Projects** → buka proyek 2. Klik tab **Teams** 3. Klik **Add Team** 4. Pilih tim 5. Pilih role (Admin / Member) 6. Klik **Save** Semua anggota tim sekarang memiliki akses ke proyek tersebut. 1. Buka **Teams** 2. Klik **Edit** pada tim 3. Ubah nama atau deskripsi 4. Klik **Save** 1. Buka **Teams** 2. Klik **Delete** pada tim 3. Konfirmasi Anggota tidak dihapus dari workspace — hanya pengelompokan tim yang dihapus."
  },
  "getting-started/authentication": {
    "headings": [
      "Authentication",
      "Overview",
      "Siapa yang Butuh Ini?",
      "Cara Kerja Autentikasi",
      "Sign In",
      "Sign Up",
      "Forgot Password",
      "Security Features",
      "Tips",
      "Kesalahan Umum",
      "Langkah Selanjutnya"
    ],
    "content": "title: Authentication description: Sign in, sign up, and manage your account updated: 2026-07-03 Sistem autentikasi mengelola login, registrasi, dan keamanan akun kamu. Setelah login, kamu akan diarahkan ke workspace yang sesuai dengan peran kamu. Semua pengguna harus memahami halaman ini. Khususnya: 1. Buka halaman login 2. Masukkan **email** dan **password** kamu 3. Klik **Sign In** Kamu tetap login selama 7 hari. Sistem memperbarui sesi secara otomatis. 1. Klik **Sign Up** di halaman login 2. Isi **nama**, **email**, dan **password** 3. Klik **Create Account** 4. Buka email dan klik **link verifikasi** 5. Setelah terverifikasi, kamu bisa login 1. Di halaman login, klik **Forgot Password** 2. Masukkan email kamu 3. Buka email dan klik **link reset** 4. Masukkan password baru 5. Login dengan password baru > **Catatan:** Semua sesi lain akan logout saat kamu reset password. Setelah berhasil login, kamu akan melihat Dashboard. Dari sana, mulai dengan:"
  },
  "reference/glossary": {
    "headings": [
      "Glossary",
      "General",
      "Scanning",
      "Findings",
      "AI Verification",
      "Access Control",
      "Source Control",
      "Reports",
      "Infrastructure",
      "Langkah Selanjutnya"
    ],
    "content": "title: Glossary description: Terms and definitions used in the platform updated: 2026-07-03"
  },
  "reference/troubleshooting": {
    "headings": [
      "Troubleshooting",
      "Overview",
      "Tidak Bisa Login",
      "Scan Tidak Mulai",
      "Findings Terlihat Salah",
      "CI/CD Tidak Berfungsi",
      "Laporan Tidak Bisa Dibuat",
      "Masalah Source Control",
      "Tips Umum",
      "Langkah Selanjutnya"
    ],
    "content": "title: Troubleshooting description: Common issues and solutions updated: 2026-07-03 Halaman ini membantu kamu mengatasi masalah umum yang sering terjadi saat menggunakan aplikasi. 1. **Refresh halaman** — banyak masalah teratasi dengan memuat ulang 2. **Periksa role kamu** — beberapa aksi memerlukan role Manager atau Owner 3. **Hubungi admin** — jika masalah berlanjut, minta bantuan workspace owner"
  },
  "welcome": {
    "headings": [
      "Welcome to SAST Integration",
      "Apa Ini Aplikasi?",
      "Masalah yang Dipecahkan",
      "Alur Lengkap Penggunaan",
      "Langkah 1: Masuk ke Aplikasi",
      "Pemahaman Role",
      "Langkah 2: Hubungkan Source Control (Disarankan Duluan)",
      "Langkah 3: Tambah Anggota (Members)",
      "Langkah 4: Buat Tim (Teams)",
      "Langkah 5: Buat Proyek (Projects)",
      "Langkah 6: Impor Repository",
      "Langkah 7: Jalankan Scan Pertama",
      "Langkah 8: Tinjau Temuan (Findings)",
      "Langkah 9: Buat Laporan (Reports)",
      "Langkah 10: Konfigurasi AI Models",
      "Ringkasan Fitur",
      "Istilah Penting"
    ],
    "content": "title: Welcome description: Complete guide from first login to daily usage updated: 2026-07-03 SAST Integration adalah platform keamanan kode yang membantu tim development menemukan celah keamanan di kode sumber sebelum aplikasi dipublikasikan. Platform ini memindai kode menggunakan 6 pemindai keamanan sekaligus, lalu memverifikasi setiap temuan menggunakan AI untuk menentukan apakah itu masalah nyata atau salah deteksi. Di dunia nyata, banyak tim development menghadapi: 1. **Terlalu banyak false positive** — Pemindai konvensional sering salah menandai kode aman sebagai berbahaya. Developer jadi mengabaikan semua alert. 2. **Belum terintegrasi** — Tim menjalankan banyak pemindai secara terpisah, hasilnya tersebar. 3. **Sulit berkolaborasi** — Tidak ada cara terstruktur untuk meninjau, menugaskan, dan melacak temuan keamanan. 4. **Laporan manual** — Butuh waktu lama membuat laporan untuk stakeholder atau audit. Platform ini mengatasi semua masalah tersebut dalam satu tempat. > **Catatan:** Proyek ini dikembangkan sebagai skripsi sarjana. Fokus thesis mencakup 9 fitur utama dengan 32 tabel database. Berikut panduan lengkap dari awal hingga penggunaan sehari-hari. Ada dua cara masuk ke aplikasi, tergantung peran kamu: 1. Klik **Sign Up** 2. Isi **nama lengkap**, **email**, dan **password** 3. Klik **Create Account** 4. Buka email, klik **link verifikasi** 5. Login → kamu otomatis menjadi **Owner** dari workspace baru > **Penting:** Hanya user pertama yang membuat workspace yang mendapat role **Owner**. User lain diundang oleh Owner/Manager. 1. Klik link di email → masuk ke halaman /invite 2. Isi **nama lengkap** dan **password** 3. Klik **Accept & Join** 4. Redirect ke halaman **Login** 5. Login → otomatis masuk workspace 1. Klik link di email → masuk ke halaman /invite 2. Jika sudah login → otomatis diterima → pilih workspace 3. Jika belum login → klik **Sign in** → login → otomatis diterima → pilih workspace > **Role ditentukan oleh yang mengundang.** Kamu tidak memilih role sendiri. Owner/Manager menentukan role saat mengirim undangan. > **Baru pakai?** Jika kamu Owner atau Manager, mulai dari Langkah 2 (Source Control). Jika kamu Reviewer atau Member, langsung ke Scans untuk melihat scan yang sudah ada dan Findings untuk mulai analisa temuan. 1. Buka **Source Control** di sidebar 2. Klik **Connect Provider** 3. Pilih provider (GitHub / GitLab / Gitea) 4. Ikuti panduan setup yang muncul (setiap provider berbeda) 5. Paste credentials 6. Koneksi berhasil 1. Buka **Members** di sidebar 2. Klik **Invite Member** 3. Masukkan **email** anggota 4. Pilih **role** (Owner / Manager / Reviewer / Member) 5. Klik **Send Invitation** → email terkirim > **Apa yang terjadi setelah email terkirim?** Lihat Langkah 1: Masuk ke Aplikasi — bagian \"Jika Kamu Diundang\". 1. Buka **Teams** di sidebar 2. Klik **New Team** 3. Isi **Team Name** (wajib) 4. Tambah **Member** (opsional, bisa ditambah nanti) 5. Klik **Create** 1. Buka **Projects** di sidebar 2. Klik **New Project** 3. Isi **nama** dan **deskripsi** 4. Klik **Create** 5. Buka proyek yang baru dibuat 1. Buka proyek 2. Di bagian **Repositories** → klik **Add Repository** 3. Di bagian **Teams** → klik **Add Team** 4. Di bagian **Members** → klik **Add Member** 1. Buka proyek → tab **API Tokens** 2. Klik **Create Token** 3. Beri nama (contoh: \"CI Pipeline — main branch\") 4. Klik **Create** 5. **Copy token segera** — hanya ditampilkan sekali 1. Buka **Repositories** di sidebar 2. Klik **Import** pada repo yang ingin diimpor 3. Pilih proyek tujuan 4. Klik **Import** 1. Buka **Repositories** di sidebar 2. Klik **Add Repository** 3. Isi nama, URL, dan default branch 4. Klik **Create** 1. Buka **Scans** di sidebar 2. Klik **New Scan` 3. Pilih **repository** dan **branch** 4. Pilih scanner: 5. Klik **Start Scan** 1. Buka **Findings** di sidebar 2. Filter berdasarkan **Severity** (Critical/High/Medium/Low) atau **Status** 3. Klik temuan untuk melihat detail 4. Perhatikan **AI Verdict**: - **True Positive** — masalah nyata, perlu diperbaiki - **False Positive** — salah deteksi, bisa di-dismiss 5. Ambil tindakan: **Resolve**, **Dismiss**, atau **Assign** 1. Buka **Reports** di sidebar 2. Klik **Generate Report** 3. Pilih filter (proyek, rentang waktu, severity) 4. Pilih format (PDF / XLSX / CSV) 5. Klik **Generate` 6. **Download** setelah selesai 1. Buka **AI Models** di sidebar 2. Klik **Add Model` 3. Pilih provider (Ollama / OpenAI / Anthropic / Groq / Custom) 4. Isi Base URL, API Key, dan nama model 5. Klik **Create` 6. Klik **Test** untuk memverifikasi"
  }
};
