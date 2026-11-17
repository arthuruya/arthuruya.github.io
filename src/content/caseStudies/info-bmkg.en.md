---
lang: en
slug: info-bmkg
order: 1
title: Info BMKG
dek: "BMKG's official mobile app for weather, earthquake and early-warning information, on Android and iOS."
role: Lead developer (Flutter)
period: 2022–present
stack: [Flutter, Dart, GetX, Dio, Hive, Firebase, flutter_map, Syncfusion Charts, FVM]
facts:
  - { label: Downloads, value: 12M+, source: '2.1' }
  - { label: Platforms, value: Android and iOS, source: '2.1' }
  - { label: Languages, value: Indonesian and English, source: '2.1' }
sections:
  problem:
    - "Info BMKG puts BMKG's public information on a phone: forecasts down to sub-district and village level, earthquakes and tsunami warnings as they happen, radar and satellite animation, aviation and maritime weather, air quality, and early warnings of extreme weather."
    - 'When I started on it in 2022, the app was an older version built with Ionic, and its design and user experience felt old-fashioned.'
  constraints:
    - 'Two platforms, Android and iOS.'
    - 'Two languages, Indonesian and English, and a light and a dark theme.'
    - 'Earthquake and weather notifications go out automatically. Nobody presses a button to send them.'
    - 'Some people search by voice or listen through text-to-speech instead of reading the screen.'
  decision:
    - 'I rebuilt the app in Flutter instead of staying on Ionic. Flutter is the framework I build in, and the team agreed to it. One codebase serves Android and iOS, and Google backs it, which lets us develop quickly.'
    - 'The design became fresher and more modern, and the app now reaches both Android and iOS users.'
    - 'State lives in GetX, network calls go through Dio, and Hive keeps data on the phone. Firebase carries push messages, analytics, remote configuration and Firestore. Maps use flutter_map and Google Maps, charts use Syncfusion, and FVM pins the Flutter version so every build uses the same one.'
    - 'Every release is tagged and versioned. The app is at version 3.5 now.'
  result:
    - 'Info BMKG has more than 12 million downloads.'
    - 'Three smaller pieces sit around the app. A Data Feed API in Laravel and MySQL serves Indonesian regions, forecasts by coordinate and hazard endpoints. The App Health and Public Survey dashboard is one of the other builds on the home page. The landing page is a single static file, bilingual, with no framework and no build step.'
links:
  - label: Info BMKG on Google Play
    href: 'https://play.google.com/store/apps/details?id=com.Info_BMKG'
  - label: Info BMKG on the App Store
    href: 'https://apps.apple.com/id/app/info-bmkg/id1114372539'
  - label: App Health and Public Survey dashboard, under Other builds
    href: '/#builds-h'
---
