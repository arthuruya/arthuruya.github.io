/**
 * Strings for the dev-only design page (src/pages/_design.astro). It never ships, so
 * its sample copy is not part of the content collections or the dictionaries.
 * Copy is verbatim from RENCANA section 13; numbers come from CONTEXT section 9.
 */

/** Sample content for the design page, verbatim from RENCANA section 13. */
export const sample = {
  name: 'Arya Bratasena Alhaq',
  tagline: {
    en: "Engineer at the BMKG Maritime Meteorological Station in Makassar. I came from software and now keep a station's networks and instruments running.",
    id: 'Engineer di Stasiun Meteorologi Maritim BMKG Makassar. Saya datang dari dunia software, dan kini menjaga jaringan dan alat observasi stasiun tetap berjalan.',
  },
  next: {
    en: 'Next: predicting where things drift. Surface-current forecasting from HF radar, for search and rescue (graduate study in Electrical Engineering, about 2028).',
    id: 'Berikutnya: memprediksi ke mana benda hanyut. Prakiraan arus permukaan dari HF radar untuk pencarian dan pertolongan (studi S2 Teknik Elektro, sekitar 2028).',
  },
  papersLead: {
    en: 'No first-author paper yet. Writing one is the point of the graduate degree.',
    id: 'Belum ada paper sebagai penulis pertama. Menulisnya adalah tujuan studi S2 saya.',
  },
  awasGuncang: {
    title:
      'Design and implementation of Awas Guncang: A mobile app for future dissemination of InaEEWS',
    authors: [
      'Hanif Kurniawan',
      'Abraham Frederik Mustamu',
      'Maulana Putra',
      'Nardi',
      'Arya Bratasena Alhaq',
      'Muhammad Reza July Utama',
      'Aurora Fajri Miftakhunnisa',
      'Benyamin Heryanto Rusanto',
    ],
    selfIndex: 4,
    venue: 'E3S Web of Conferences 677, 04001 (ICDMM 2025)',
    year: '2025',
    doi: '10.1051/e3sconf/202567704001',
    role: {
      en: 'Technical advisor. Consulted on technology choices, implementation approach and testing; provided Google Play distribution for pilot testing.',
      id: 'Penasihat teknis. Berkonsultasi soal pilihan teknologi, pendekatan implementasi dan pengujian; menyediakan distribusi Google Play untuk uji coba.',
    },
  },
  work: {
    en: { work: 'Work', otherBuilds: 'Other builds', earlier: 'Earlier' },
    id: { work: 'Karya', otherBuilds: 'Karya lainnya', earlier: 'Sebelumnya' },
  },
  earlierLine: {
    en: 'Earlier: an expert system for rain-sampler troubleshooting (Visual Basic), predictive maintenance for an air sampler (Arduino and Android), and machine-learning projects from Bangkit Academy 2021.',
    id: 'Sebelumnya: sistem pakar pemecahan masalah alat pengambil sampel air hujan (Visual Basic), prediksi perawatan alat pengambil sampel udara (Arduino dan Android), dan proyek machine learning di Bangkit Academy 2021.',
  },
  /** CONTEXT section 2.1: "Lead developer (Flutter), 2022-sekarang" */
  infoBmkg: {
    title: 'Info BMKG',
    role: { en: 'Lead developer (Flutter)', id: 'Lead developer (Flutter)' },
    period: { en: '2022–present', id: '2022–sekarang' },
    stack: ['Flutter', 'Dart', 'GetX', 'Firebase'],
  },
  /** CONTEXT section 9 */
  stats: [
    {
      value: '12M+',
      source: '9',
      label: { en: 'Info BMKG downloads', id: 'unduhan Info BMKG' },
    },
    {
      value: '~35',
      source: '9',
      label: { en: 'devices and services monitored', id: 'perangkat dan layanan dipantau' },
    },
    {
      value: '9',
      source: '9',
      label: {
        en: 'observation sites in one dashboard',
        id: 'site observasi dalam satu dashboard',
      },
    },
  ],
  /** Phase 5 status words, shown as dot + text */
  status: { ok: 'OK', alarm: 'ALARM' },
} as const;

/** Design-page chrome. English only: the page is a developer tool, never shipped. */
export const designPage = {
  title: 'Design system (dev only)',
  description: 'Chart Language design system: tokens, type, spacing and components.',
  heading: 'Chart Language',
  intro:
    'Development-only page. It is served by astro dev and never built for release. Every component is shown below in English and Indonesian; switch the chart to see both themes.',
  sections: {
    colour: 'Colour tokens',
    contrast: 'Contrast, both themes',
    type: 'Type scale',
    spacing: 'Spacing scale',
    components: 'Components',
  },
  verdict: { pass: 'pass', fail: 'FAIL' },
  contrastHead: { theme: 'Theme', pair: 'Pair', ratio: 'Ratio', min: 'Min', use: 'Use' },
  panel: { en: 'English', id: 'Bahasa Indonesia' },
  skipNote: 'SkipLink, shown as when focused (press Tab on a real page):',
  figure: {
    label: { en: 'Fig. 1', id: 'Gbr. 1' },
    caption: {
      en: 'Placeholder contours: a synthetic field, not geography. Phase 4 replaces them with Natural Earth bathymetry.',
      id: 'Kontur sementara: medan sintetis, bukan geografi. Fase 4 menggantinya dengan batimetri Natural Earth.',
    },
  },
  typeSamples: {
    h2: 'Other builds',
    h3: 'Info BMKG',
    mono: '10.1051/e3sconf/202567704001 · -5.07, 119.47 · 2025-12-12',
  },
} as const;
