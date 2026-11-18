---
lang: id
slug: info-bmkg
order: 1
title: Info BMKG
dek: 'Aplikasi seluler resmi BMKG untuk informasi cuaca, gempa dan peringatan dini, di Android dan iOS.'
role: Mobile & Web Developer (Flutter)
period: 2022–sekarang
stack: [Flutter, Dart, GetX, Dio, Hive, Firebase, flutter_map, Syncfusion Charts, FVM]
facts:
  - { label: Unduhan, value: 12M+, source: '2.1' }
  - { label: Platform, value: Android dan iOS, source: '2.1' }
  - { label: Bahasa, value: Indonesia dan Inggris, source: '2.1' }
  - { label: Versi saat ini, value: '3.5', source: '2.1' }
sections:
  problem:
    - 'Info BMKG membawa informasi publik BMKG ke ponsel: prakiraan cuaca sampai tingkat kecamatan dan kelurahan, gempa dan peringatan tsunami saat itu juga, animasi radar dan satelit, cuaca penerbangan dan maritim, kualitas udara, serta peringatan dini cuaca ekstrem.'
    - 'Saat saya mulai menanganinya pada 2022, aplikasi ini masih versi lama berbasis Ionic, dengan tampilan dan pengalaman pengguna yang terasa kuno.'
  constraints:
    - 'Dua platform, Android dan iOS.'
    - 'Dua bahasa, Indonesia dan Inggris, dengan tema terang dan gelap.'
    - 'Notifikasi gempa dan cuaca terkirim otomatis. Tidak ada orang yang menekan tombol untuk mengirimnya.'
    - 'Sebagian pengguna mencari dengan suara atau mendengarkan lewat text-to-speech, bukan membaca layar.'
  decision:
    - 'Saya membangun ulang aplikasi dengan Flutter, bukan tetap di Ionic. Flutter adalah framework yang saya kuasai, dan tim setuju. Satu codebase melayani Android dan iOS, dan Google mendukungnya, sehingga pengembangan bisa cepat.'
    - 'Tampilannya jadi lebih segar dan modern, dan aplikasi kini menjangkau pengguna Android dan iOS.'
    - 'State diatur GetX, panggilan jaringan lewat Dio, dan Hive menyimpan data di ponsel. Firebase menangani push notification, analitik, remote config dan Firestore. Peta memakai flutter_map dan Google Maps, grafik memakai Syncfusion, dan FVM mengunci versi Flutter supaya setiap build memakai versi yang sama.'
    - 'Setiap rilis diberi tag dan nomor versi. Sekarang aplikasi ada di versi 3.5.'
  result:
    - 'Info BMKG sudah diunduh lebih dari 12 juta kali.'
    - 'Ada tiga bagian kecil di sekitar aplikasi. Data Feed API berbasis Laravel dan MySQL menyediakan data wilayah Indonesia, prakiraan berdasarkan koordinat, dan endpoint bahaya. Dashboard App Health dan Survei Publik ada di Karya lainnya di halaman utama. Landing page-nya satu file statis, dwibahasa, tanpa framework dan tanpa build.'
links:
  - label: Info BMKG di Google Play
    href: 'https://play.google.com/store/apps/details?id=com.Info_BMKG'
  - label: Info BMKG di App Store
    href: 'https://apps.apple.com/id/app/info-bmkg/id1114372539'
  - label: Dashboard App Health dan Survei Publik, di Karya lainnya
    href: '/id/#builds-h'
---
