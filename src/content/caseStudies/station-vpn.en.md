---
lang: en
slug: station-vpn
order: 3
title: Station VPN + wg-panel
dek: 'A self-hosted WireGuard hub for technician access, with observation equipment kept in a separate, restricted class.'
role: Engineer, Maritime Meteorological Station
period: Oct 2026
stack: [WireGuard, AlmaLinux, nftables, git, Python, Flask, waitress, htmx, systemd]
facts:
  - { label: SSH, value: Key-only, source: '3.3' }
  - { label: Configuration writer, value: One separate root CLI, source: '3.4' }
  - { label: A failed change, value: Rolled back automatically, source: '3.4' }
---
