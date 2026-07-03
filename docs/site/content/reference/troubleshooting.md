---
title: Troubleshooting
description: Common issues and solutions
updated: 2026-07-03
---

# Troubleshooting

## Overview

Halaman ini membantu kamu mengatasi masalah umum yang sering terjadi saat menggunakan aplikasi.

## Tidak Bisa Login

| Masalah | Solusi |
|---------|--------|
| Password salah | Klik **Forgot Password** untuk reset |
| Akun belum terverifikasi | Cek email untuk link verifikasi |
| Akun terkunci | Hubungi workspace owner |

## Scan Tidak Mulai

| Masalah | Solusi |
|---------|--------|
| Scanner tidak tersedia | Hubungi admin untuk memeriksa instalasi scanner |
| Antrian penuh | Tunggu beberapa saat lalu coba lagi |
| Tidak ada repository | Tambah repository dulu di Repositories |

## Findings Terlihat Salah

| Masalah | Solusi |
|---------|--------|
| Terlalu banyak false positive | Dismiss — AI akan belajar dari keputusan kamu |
| AI verdict "Pending" | Tunggu beberapa menit untuk verifikasi AI |
| Temuan tidak lengkap | Periksa apakah scanner yang dipilih sudah terinstal |

## CI/CD Tidak Berfungsi

| Masalah | Solusi |
|---------|--------|
| Scan tidak terpicu | Periksa `SAST_API_URL` dan `SAST_API_KEY` di repo secrets |
| Upload gagal | Pastikan API key memiliki permission `scan:upload` |
| Hasil tidak muncul | Periksa log CI/CD untuk error |

## Laporan Tidak Bisa Dibuat

| Masalah | Solusi |
|---------|--------|
| Generate gagal | Coba rentang waktu atau filter yang lebih sempit |
| Download tidak berfungsi | Periksa pengaturan download browser kamu |

## Masalah Source Control

| Masalah | Solusi |
|---------|--------|
| OAuth gagal | Hubungkan ulang provider di Source Control |
| Repo tidak sinkron | Klik **Sync** pada koneksi provider |
| PR comments tidak muncul | Pastikan koneksi SCM aktif |

## Tips Umum

1. **Refresh halaman** — banyak masalah teratasi dengan memuat ulang
2. **Periksa role kamu** — beberapa aksi memerlukan role Manager atau Owner
3. **Hubungi admin** — jika masalah berlanjut, minta bantuan workspace owner

## Langkah Selanjutnya

- [Glossary](glossary.md) untuk memahami istilah
- [Knowledge Base](../features/knowledge-base.md) untuk referensi CWE
- [Dashboard](../features/dashboard.md) untuk kembali ke halaman utama
