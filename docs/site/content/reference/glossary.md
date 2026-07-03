---
title: Glossary
description: Terms and definitions used in the platform
updated: 2026-07-03
---

# Glossary

## General

| Istilah | Definisi |
|---------|---------|
| **SAST** | Static Application Security Testing — menganalisis kode sumber untuk vulnerability tanpa menjalankan program |
| **Workspace** | Lingkungan kerja terisolasi untuk satu tim. Semua data (proyek, scan, temuan) terbatas dalam workspace |
| **Dashboard** | Layar utama yang menampilkan ringkasan kesehatan workspace |
| **Finding** | Masalah keamanan yang terdeteksi oleh scanner |
| **Triage** | Proses meninjau temuan dan memutuskan tindakan (resolve, dismiss, assign) |

## Scanning

| Istilah | Definisi |
|---------|---------|
| **Scan** | Pemindaian kode menggunakan satu atau lebih scanner engine |
| **Scanner Engine** | Alat yang menganalisis kode (contoh: Semgrep, Gitleaks, Cppcheck) |
| **Managed Scan** | Scan yang dipicu dari web UI |
| **External Scan** | Scan yang hasilnya diunggah dari CI/CD |
| **Scheduled Scan** | Scan yang berjalan otomatis sesuai jadwal |
| **CI/CD** | Continuous Integration / Deployment — pipeline otomatis untuk build dan deploy |

## Findings

| Istilah | Definisi |
|---------|---------|
| **True Positive (TP)** | Masalah keamanan yang dikonfirmasi — perlu diperbaiki |
| **False Positive (FP)** | Sesuatu yang ditandai sebagai berbahaya tapi sebenarnya aman |
| **Severity** | Tingkat keparahan: Critical, High, Medium, Low, atau Info |
| **CWE** | Common Weakness Enumeration — daftar standar jenis kelemahan software |
| **CVE** | Common Vulnerabilities and Exposures — vulnerability spesifik yang sudah diketahui |
| **Remediation** | Saran perbaikan untuk suatu temuan |
| **Confidence Score** | Seberapa yakin AI tentang verdict-nya (0-100%) |
| **Fingerprint** | Hash unik untuk mengidentifikasi temuan duplikat di berbagai scan |

## AI Verification

| Istilah | Definisi |
|---------|---------|
| **AI Verification** | Menggunakan model LLM untuk memeriksa apakah temuan adalah true atau false positive |
| **Primary Model** | Model AI pertama yang dicoba untuk verifikasi |
| **Fallback Model** | Model AI cadangan yang digunakan jika model utama gagal |
| **Prompt Preset** | Pengaturan predefined untuk cara AI mengevaluasi temuan (strict, balanced, aggressive) |
| **Knowledge Base** | Data NVD/CWE yang digunakan untuk memberikan konteks lebih baik pada AI |

## Access Control

| Istilah | Definisi |
|---------|---------|
| **RBAC** | Role-Based Access Control — berdasarkan role |
| **Owner** | Level 4 — kontrol penuh atas workspace |
| **Manager** | Level 3 — mengelola semua resource dan anggota |
| **Reviewer** | Level 2 — melihat, menjalankan scan, meninjau temuan |
| **Member** | Level 1 — hanya melihat |
| **Permission** | Aksi spesifik yang diizinkan (contoh: `scan:run`, `finding:triage`) |

## Source Control

| Istilah | Definisi |
|---------|---------|
| **SCM** | Source Code Management — GitHub, GitLab, atau Gitea |
| **OAuth** | Cara menghubungkan akun SCM tanpa membagikan password |
| **Webhook** | Notifikasi otomatis dari SCM saat ada perubahan (push, PR) |
| **PR** | Pull Request — usulan perubahan kode |
| **Commit Status** | Indikator pass/fail yang ditampilkan pada commit |

## Reports

| Istilah | Definisi |
|---------|---------|
| **PDF Report** | Dokumen terformat untuk dibagikan ke stakeholder |
| **XLSX Report** | Spreadsheet untuk analisis data |
| **CSV Report** | Format teks plain untuk integrasi tools |

## Infrastructure

| Istilah | Definisi |
|---------|---------|
| **pg-boss** | Sistem antrian job yang memproses scan di background |
| **JWT** | JSON Web Token — digunakan untuk autentikasi yang aman |
| **PAT** | Personal Access Token — API key untuk tools eksternal |
| **Feature Flag** | Pengaturan yang mengaktifkan atau menonaktifkan fitur |
| **Docker** | Platform container untuk menjalankan aplikasi |

## Langkah Selanjutnya

- [Troubleshooting](troubleshooting.md) untuk masalah umum
- [Knowledge Base](../features/knowledge-base.md) untuk CWE lengkap
- [Dashboard](../features/dashboard.md) untuk mulai menggunakan aplikasi
