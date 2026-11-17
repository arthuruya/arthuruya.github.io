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
sections:
  problem:
    - 'Technicians reached the station’s machines remotely through AnyDesk. Observation equipment at remote sites could not be reached by monitoring at all.'
  constraints:
    - 'The equipment sits at remote sites, far from the station.'
    - 'Two kinds of peer share one network: technicians, and observation equipment. They should not get the same reach.'
    - 'Without a panel, every peer change means someone logs in over SSH and edits the configuration by hand.'
  decision:
    - 'I replaced the dependence on AnyDesk with a self-hosted WireGuard hub, which also brings the remote equipment within reach of monitoring.'
    - 'Peers are split into classes. Observation equipment cannot reach the office LAN or any other site; nftables enforces that. SSH accepts keys only, and the configuration is backed up automatically to a local git repository.'
    # TODO(arya): why was WGDashboard dropped? One plain sentence, only what is true.
    - 'For adding, disabling and removing peers I evaluated WGDashboard, dropped it, and built wg-panel.'
    - 'The web app runs without root. The only thing that writes the configuration is a separate root CLI, called through a narrow sudo rule, so a bug in the web app cannot rewrite the VPN by itself. Every change goes through the same steps: validate, write atomically, apply, verify, roll back automatically if it fails, write the audit log, commit to git.'
    - "The panel accepts public keys only; each device makes its own private key. Login checks a scrypt hash plus a TOTP code, with lockout and session limits, and the panel is reachable only from inside the tunnel. It ships a strict content security policy (script-src 'self'), no CDN and no build step: Python, Flask, waitress, htmx, plain CSS and a little JavaScript, run by systemd."
    - 'The interface uses a theme named Pelampung (Indonesian for buoy): status colours follow sea navigation marks, the font is Atkinson Hyperlegible, and a status is always a dot plus text. This site is built on the same idea.'
  result:
    - 'Equipment at remote sites is now within reach of monitoring: the weather station loggers are read over the VPN (see the monitoring case study).'
    - 'Peers are added, disabled and removed from the panel without manual SSH, and every change leaves an audit log entry and a git commit.'
links:
  - label: Monitoring NOC + Aloptama
    href: '/work/monitoring-noc/'
---
