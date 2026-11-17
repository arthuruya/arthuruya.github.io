---
lang: id
slug: monitoring-noc
order: 2
title: Monitoring NOC + Aloptama
dek: 'Satu platform pemantauan untuk jaringan dan alat observasi stasiun, sehingga satu gangguan memicu satu alarm.'
role: Engineer, Stasiun Meteorologi Maritim
period: Sep 2026–sekarang
stack:
  [Zabbix 7.0, SNMP, Zabbix agent 2, HTTP agent, AlmaLinux, VirtualBox, Telegram, Healthchecks.io]
facts:
  - { label: Perangkat dan layanan dipantau, value: '~35', source: '9' }
  - { label: Site observasi dalam satu dashboard, value: '9', source: '9' }
  - { label: Halaman dashboard, value: '3', source: '3.1' }
sections:
  problem:
    - 'Stasiun punya beberapa switch, belasan access point, router, server dan peralatan observasi yang tersebar di banyak lokasi. Tidak ada satu layar pun yang menunjukkan apakah semuanya berjalan.'
    - 'Peralatan observasi (Aloptama) menambah AWS, MAWS dan layar informasi cuaca di pelabuhan. Peringatan lewat email juga kurang membantu, karena teknisi jarang membuka email.'
  constraints:
    - 'Produk berbayar tidak bisa dipakai.'
    - 'MAWS mengisi indeks Elasticsearch milik unit pusat, dan jalur vendornya tidak boleh diganggu.'
    - 'Layar di pelabuhan memakai koneksi seluler yang bisa putus.'
    - 'Server monitoring juga bisa mati, dan server yang mati tidak bisa melaporkan dirinya sendiri.'
  decision:
    - 'Saya membandingkan LibreNMS, Cacti, NetXMS, Icinga2 dan PRTG, lalu memilih Zabbix sebagai satu platform untuk semuanya. PRTG saya tolak karena berbayar. Satu platform, bukan beberapa, karena saya lebih suka mendalami satu alat sebelum menambah alat baru. Versinya saya naikkan dari 6.0 ke 7.0 LTS.'
    - 'Switch, wireless controller dan router dibaca lewat SNMP. Access point ditemukan otomatis, dan server memakai Zabbix agent. Untuk peralatan observasi saya menulis template Zabbix sendiri dalam YAML.'
    - 'Inti rancangannya adalah trigger dependency: setiap pemeriksaan tahu ia bergantung pada apa. Saat uplink putus, semua yang ada di belakangnya diam dan hanya satu alarm yang menyebut penyebabnya. Untuk AWS, rantainya dari jalur ke modem ke logger ke data. Lapisan itulah yang membuat saya bisa membedakan masalah sensor atau logger dari masalah jaringan.'
    - 'Data AWS diambil langsung dari Web API logger lewat VPN: status, umur data, tegangan aki, selisih jam, dan status kiriman ke pusat. MAWS masuk lewat HTTP agent yang membaca indeks pusat, jadi tidak perlu VPN dan jalur vendor tetap utuh. Untuk layar di pelabuhan saya merancang WireGuard dengan Zabbix agent aktif, enkripsi PSK dan persistent buffer, supaya data tetap tercatat saat koneksi putus.'
    - 'Peringatan dikirim ke satu grup Telegram, bukan email, dengan jeda untuk severity sedang. Heartbeat eksternal di Healthchecks.io membunyikan alarm bila server monitoring sendiri diam. Dashboard tiga halaman (Ringkasan, Jaringan, Aloptama) dengan tampilan honeycomb, peta dan grafik baterai tampil sebagai kiosk di TV ruang teknisi.'
  result:
    - 'Sekitar 35 perangkat dan layanan dipantau. Sembilan site observasi, yaitu AWS, MAWS dan layar informasi, ada dalam satu dashboard, dan HF radar direncanakan menyusul.'
    - 'Satu gangguan memicu satu alarm, di tempat yang memang dilihat teknisi. Diagram di bawah menunjukkan caranya.'
---
