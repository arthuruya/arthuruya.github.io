---
lang: id
slug: station-vpn
order: 3
title: Station VPN + wg-panel
dek: 'Hub WireGuard self-hosted untuk akses teknisi, dengan peralatan observasi dipisah ke kelas jaringan yang dibatasi.'
role: Engineer, Stasiun Meteorologi Maritim
period: Okt 2026
stack: [WireGuard, AlmaLinux, nftables, git, Python, Flask, waitress, htmx, systemd]
facts:
  - { label: SSH, value: Hanya kunci, source: '3.3' }
  - { label: Penulis konfigurasi, value: Satu CLI root terpisah, source: '3.4' }
  - { label: Perubahan yang gagal, value: Di-rollback otomatis, source: '3.4' }
sections:
  problem:
    - 'Teknisi mengakses komputer stasiun dari jauh lewat AnyDesk. Peralatan observasi di lokasi terpencil sama sekali tidak terjangkau monitoring.'
  constraints:
    - 'Peralatan berada di lokasi terpencil, jauh dari stasiun.'
    - 'Dua jenis peer berbagi satu jaringan: teknisi dan peralatan observasi. Jangkauan keduanya tidak boleh sama.'
    - 'Tanpa panel, setiap perubahan peer berarti seseorang masuk lewat SSH dan mengedit konfigurasi dengan tangan.'
  decision:
    - 'Ketergantungan pada AnyDesk saya ganti dengan hub WireGuard self-hosted, yang sekaligus membuat peralatan di lokasi terpencil terjangkau monitoring.'
    - 'Peer dibagi ke dalam kelas. Peralatan observasi tidak bisa menjangkau LAN kantor maupun site lain; nftables yang menegakkannya. SSH hanya menerima kunci, dan konfigurasi dicadangkan otomatis ke repo git lokal.'
    # TODO(arya): kenapa WGDashboard dibatalkan? Satu kalimat, hanya yang benar.
    - 'Untuk menambah, menonaktifkan dan menghapus peer, saya sempat mengevaluasi WGDashboard, membatalkannya, lalu membangun wg-panel.'
    - 'Aplikasi web berjalan tanpa hak root. Satu-satunya yang menulis konfigurasi adalah CLI root terpisah yang dipanggil lewat aturan sudo yang sempit, jadi bug di aplikasi web tidak bisa mengubah VPN sendirian. Setiap perubahan melewati langkah yang sama: validasi, tulis atomik, terapkan, verifikasi, rollback otomatis bila gagal, catat di audit log, commit ke git.'
    - "Panel hanya menerima public key; kunci privat dibuat di perangkat masing-masing. Login memakai sandi scrypt dan TOTP, dengan lockout dan batas sesi, dan panel hanya bisa dibuka dari dalam tunnel. Panel memakai content security policy yang ketat (script-src 'self'), tanpa CDN dan tanpa build step: Python, Flask, waitress, htmx, CSS biasa dan sedikit JavaScript, dijalankan systemd."
    - 'Tampilannya memakai tema bernama Pelampung: warna status mengikuti tanda navigasi laut, hurufnya Atkinson Hyperlegible, dan status selalu berupa titik ditambah teks. Situs ini dibangun dengan gagasan yang sama.'
  result:
    - 'Peralatan di lokasi terpencil kini terjangkau monitoring: logger AWS dibaca lewat VPN (lihat studi kasus monitoring).'
    - 'Peer ditambah, dinonaktifkan dan dihapus dari panel tanpa SSH manual, dan setiap perubahan meninggalkan catatan audit log dan commit git.'
links:
  - label: Monitoring NOC + Aloptama
    href: '/id/work/monitoring-noc/'
---
