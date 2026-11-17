---
lang: en
slug: monitoring-noc
order: 2
title: Monitoring NOC + Aloptama
dek: "One monitoring platform for a station's network and observation instruments, so one fault raises one alarm."
role: Engineer, Maritime Meteorological Station
period: Sep 2026–present
stack:
  [Zabbix 7.0, SNMP, Zabbix agent 2, HTTP agent, AlmaLinux, VirtualBox, Telegram, Healthchecks.io]
facts:
  - { label: Devices and services monitored, value: '~35', source: '9' }
  - { label: Observation sites in one dashboard, value: '9', source: '9' }
  - { label: Dashboard pages, value: '3', source: '3.1' }
sections:
  problem:
    - 'The station runs several switches, between ten and twenty access points, routers, servers and observation equipment, spread over many locations. There was no single screen that showed whether all of it was working.'
    - 'The observation equipment (Aloptama) adds automatic weather stations, a maritime weather station and a weather display at the port. Alerts by email did not help much, because the technicians rarely read their email.'
  constraints:
    - 'A paid product was out.'
    - 'The maritime weather station feeds an Elasticsearch index run by a central unit, and its vendor path had to stay untouched.'
    - 'The port display sits on a cellular link that can drop.'
    - 'The monitoring server can fail too, and a dead server cannot report its own death.'
  decision:
    - 'I looked at LibreNMS, Cacti, NetXMS, Icinga2 and PRTG, and chose Zabbix as the one platform for everything. PRTG was rejected because it is paid. One platform, not several, because I would rather go deep in one tool before adding another. I upgraded it from 6.0 to 7.0 LTS.'
    - 'Switches, the wireless controller and routers are read over SNMP. Access points are discovered automatically, and servers run the Zabbix agent. For the observation equipment I wrote my own Zabbix templates in YAML.'
    - 'The core of the design is trigger dependency: each check knows what it depends on. When an uplink fails, everything behind it stays quiet and one alarm names the cause. For an automatic weather station the chain runs from link to modem to logger to data. That layering is how I tell a sensor or logger fault from a network fault.'
    - 'Weather station data is read straight from the logger’s web API over the VPN: status, data age, battery voltage, clock offset and whether the last delivery to the centre went through. The maritime station joins through an HTTP agent that reads the central index, so it needs no VPN and the vendor path stays as it is. For the port display I designed WireGuard plus an active Zabbix agent with PSK encryption and a persistent buffer, so readings are kept while the link is down.'
    - 'Alerts go to one Telegram group instead of email, with a delay for medium severity. An external heartbeat on Healthchecks.io raises the alarm when the monitoring server itself goes quiet. Three dashboard pages (Summary, Network, Aloptama) with a honeycomb view, a map and battery graphs run as a kiosk on the TV in the technicians’ room.'
  result:
    - 'About 35 devices and services are monitored. Nine observation sites, the weather stations, the maritime station and the displays, are on one dashboard, and the HF radar is planned to join them.'
    - 'One fault raises one alarm, in a place the technicians already look. The diagram below shows the idea.'
---
