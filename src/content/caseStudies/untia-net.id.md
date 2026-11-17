---
lang: id
slug: untia-net
order: 4
title: untia-net
dek: 'Portal web untuk mengelola internet pegawai, yang melakukan setiap perubahan lewat RADIUS dan tidak menyimpan kredensial router inti.'
role: Engineer, Stasiun Meteorologi Maritim
period: Okt–Nov 2026
stack: [Python, Flask, waitress, htmx, MariaDB, FreeRADIUS, MikroTik REST API]
facts:
  - { label: Operator teknisi, value: '5', source: '3.6' }
  - { label: API router, value: Hanya baca, source: '3.6' }
  - { label: Kredensial router inti yang disimpan, value: Tidak ada, source: '3.6' }
  - { label: Log pelanggaran disimpan, value: 14 hari, source: '3.6' }
sections:
  problem:
    - 'Pekerjaan harian mengelola internet pegawai dilakukan di daloRADIUS dan Winbox. untia-net menggantikannya dengan web yang dibuat untuk teknisi.'
  constraints:
    - 'Lima teknisi mengoperasikannya.'
    - 'Router inti tetap di tangan teknisi: aplikasi web tidak boleh memegang kredensialnya.'
    - 'Aktivitas internet pegawai bersifat pribadi. Log pelanggaran tidak boleh menunjukkan ke mana orang membuka.'
  decision:
    - 'Setiap perubahan lewat RADIUS. Portal memakai REST API router hanya untuk membaca.'
    - 'Portal tidak menyimpan kredensial router inti. Bila ada yang harus diubah di router itu sendiri, web menyusun perintah siap tempel, lalu teknisi mengonfirmasinya.'
    - 'Log pelanggaran tidak mencatat alamat tujuan dan menyimpan catatan selama 14 hari.'
    - 'Grafik berupa SVG yang dirender di server, jadi halamannya tidak butuh library grafik JavaScript.'
    - 'Saya sengaja tidak memakai PHP dan Node.js setelah menimbang risiko keamanan dan rantai pasoknya. Portal berjalan di Python, Flask, waitress, htmx dan MariaDB, bersama FreeRADIUS dan MikroTik REST API.'
  result:
    - 'Lima operator teknisi memakai untia-net, dan disertai panduan PDF.'
---
