---
lang: en
slug: untia-net
order: 4
title: untia-net
dek: 'A web portal for managing staff internet that makes every change through RADIUS and keeps the core router’s credentials out of the web app.'
role: Engineer, Maritime Meteorological Station
period: Oct–Nov 2026
stack: [Python, Flask, waitress, htmx, MariaDB, FreeRADIUS, MikroTik REST API]
facts:
  - { label: Technician operators, value: '5', source: '3.6' }
  - { label: Router API, value: Read-only, source: '3.6' }
  - { label: Core-router credentials stored, value: None, source: '3.6' }
  - { label: Violation log kept for, value: 14 days, source: '3.6' }
sections:
  problem:
    - 'The daily work of managing staff internet was done in daloRADIUS and Winbox. untia-net replaces that with a web app made for technicians.'
  constraints:
    - 'Five technicians operate it.'
    - 'The core router stays in the technicians’ hands: the web app may not hold its credentials.'
    - 'What staff do online is private. A log of policy violations may not show where people were going.'
  decision:
    - 'Every change goes through RADIUS. The portal uses the router’s REST API only to read.'
    - 'The portal stores no credentials for the core router. When something has to change on the router itself, the web app composes a command ready to paste, and a technician confirms it.'
    - 'The violation log leaves out destination addresses and keeps entries for 14 days.'
    - 'Charts are SVG, rendered on the server, so the page needs no JavaScript chart library.'
    - 'I chose not to use PHP or Node.js, after weighing their security and supply-chain risk. The portal runs on Python, Flask, waitress, htmx and MariaDB, with FreeRADIUS and the MikroTik REST API.'
  result:
    - 'Five technician operators use untia-net, and it comes with a PDF guide.'
---
