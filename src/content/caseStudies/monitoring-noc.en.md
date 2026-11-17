---
lang: en
slug: monitoring-noc
order: 2
title: Monitoring NOC + Aloptama
dek: "One monitoring platform for a station's network and observation instruments, so one fault raises one alarm."
role: Engineer, Maritime Meteorological Station
# TODO(arya): the period (start and end) of this work is not in the source document.
period: 'TODO(arya): period of this work'
stack:
  [Zabbix 7.0, SNMP, Zabbix agent 2, HTTP agent, AlmaLinux, VirtualBox, Telegram, Healthchecks.io]
facts:
  - { label: Devices and services monitored, value: '~35', source: '9' }
  - { label: Observation sites in one dashboard, value: '9', source: '9' }
  - { label: Dashboard pages, value: '3', source: '3.1' }
---
