import type { Dictionary } from './shape.ts';

export const id: Dictionary = {
  skipLink: 'Langsung ke isi',
  theme: {
    toNight: 'Beralih ke peta malam',
    toDay: 'Beralih ke peta siang',
    night: 'Peta malam',
    day: 'Peta siang',
  },
  langSwitch: { label: 'English' },
  aria: { mainNav: 'Utama' },
  menu: 'Menu',
  hero: {
    chartLabel: 'Peta kawasan Selat Makassar dengan dua tempat bertanda: Selat Makassar dan Untia.',
    markerUntia: 'Untia',
    markerStrait: 'Selat Makassar',
    description:
      'Gambaran arus permukaan di sekitar Selat Makassar: garis-garis halus mengalir di atas peta laut dan pantai. Anda dapat menjatuhkan pelampung dan melihat arus membawanya, dengan mengetuk peta atau memakai dua tombol di bawahnya.',
    captionUntia: 'Tempat saya bekerja',
    captionStrait: 'Selat antara Kalimantan dan Sulawesi',
    dropAt: 'Jatuhkan pelampung di {place}',
    droppedAt: 'Pelampung dijatuhkan di {place}.',
    droppedHere: 'Pelampung dijatuhkan.',
    drifts: 'Pelampung hanyut ke arah {dir}.',
    onLand: 'Tempat itu daratan, jadi pelampung tidak bergerak.',
    compass: {
      north: 'utara',
      'north-east': 'timur laut',
      east: 'timur',
      'south-east': 'tenggara',
      south: 'selatan',
      'south-west': 'barat daya',
      west: 'barat',
      'north-west': 'barat laut',
    },
  },
  paper: {
    authors: 'Penulis',
    abstract: 'Abstrak',
    abstractSource:
      'Abstrak seperti diterbitkan EDP Sciences dengan lisensi CC BY 4.0. Bahasa Inggris.',
    doi: 'DOI',
  },
  skripsi: {
    author: 'Penulis',
    advisor: 'Pembimbing',
    pages: 'halaman',
    year: 'Tahun',
    library: 'Catatan perpustakaan',
  },
  caseStudy: {
    role: 'Peran',
    period: 'Periode',
    stack: 'Stack',
    facts: 'Fakta',
    read: 'Baca studi kasus',
    backHome: 'Kembali ke beranda',
    next: 'Studi kasus berikutnya',
  },
  backToTop: 'Kembali ke atas',
  notFound: {
    title: 'Halaman tidak ditemukan',
    body: 'Alamat ini tidak ada di situs ini.',
    toHome: 'Ke beranda',
  },
};
