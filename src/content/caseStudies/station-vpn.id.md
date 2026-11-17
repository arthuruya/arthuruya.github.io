---
lang: id
slug: station-vpn
order: 3
title: Station VPN + wg-panel
dek: 'Hub WireGuard self-hosted untuk akses teknisi, dengan peralatan observasi dipisah ke kelas jaringan yang dibatasi.'
role: Engineer, Stasiun Meteorologi Maritim
# TODO(arya): periode pekerjaan ini tidak ada di dokumen sumber.
period: 'TODO(arya): periode pekerjaan ini'
stack: [WireGuard, AlmaLinux, nftables, git, Python, Flask, waitress, htmx, systemd]
facts:
  - { label: SSH, value: Hanya kunci, source: '3.3' }
  - { label: Penulis konfigurasi, value: Satu CLI root terpisah, source: '3.4' }
  - { label: Perubahan yang gagal, value: Di-rollback otomatis, source: '3.4' }
---
