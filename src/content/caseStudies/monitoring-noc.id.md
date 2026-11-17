---
lang: id
slug: monitoring-noc
order: 2
title: Monitoring NOC + Aloptama
dek: 'Satu platform pemantauan untuk jaringan dan alat observasi stasiun, sehingga satu gangguan memicu satu alarm.'
role: Engineer, Stasiun Meteorologi Maritim
# TODO(arya): periode pekerjaan ini tidak ada di dokumen sumber.
period: 'TODO(arya): periode pekerjaan ini'
stack:
  [Zabbix 7.0, SNMP, Zabbix agent 2, HTTP agent, AlmaLinux, VirtualBox, Telegram, Healthchecks.io]
facts:
  - { label: Perangkat dan layanan dipantau, value: '~35', source: '9' }
  - { label: Site observasi dalam satu dashboard, value: '9', source: '9' }
  - { label: Halaman dashboard, value: '3', source: '3.1' }
---
