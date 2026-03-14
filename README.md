# EJBCA PKI Lab

**Open-source, fully containerized PKI lab built on EJBCA Community Edition.**
Designed for PKI engineers to spin up, customize, and deliver enterprise-grade PKI to any client — from a single `make` command.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![EJBCA CE](https://img.shields.io/badge/EJBCA-Community%20Edition-orange)](https://hub.docker.com/r/keyfactor/ejbca-ce)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   EJBCA PKI Lab                     │
│                                                     │
│  Tier 1: Root CA          (offline after init)      │
│      │                                              │
│  Tier 2: Policy CA        (online, policy control)  │
│      │                                              │
│  Tier 3: Issuing CA(s)    (online, issues certs)    │
│      ├── Issuing-TLS-CA   (Enterprise TLS/mTLS)     │
│      ├── Issuing-IoT-CA   (Device Identity)         │
│      └── Issuing-DevOps-CA (Short-lived / ACME)     │
│                                                     │
│  Stack: EJBCA CE  +  MariaDB  +  Nginx              │
└─────────────────────────────────────────────────────┘
```

Full architecture details: [docs/architecture.md](docs/architecture.md)

---

## Quick Start (5 minutes)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose), `make`, `git`

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ejbca-pki-lab.git
cd ejbca-pki-lab

# 2. Configure environment
cp docker/.env.example docker/.env
# Edit docker/.env with your organization details

# 3. Start the stack
make up

# 4. Initialize 3-tier PKI hierarchy
make init

# 5. Get SuperAdmin credentials
make superadmin-p12
# Import superadmin.p12 into Firefox to access Admin UI

# 6. Access EJBCA Admin UI
# https://localhost:8443/ejbca/adminweb
```

Full guide: [docs/getting-started.md](docs/getting-started.md)

---

## Client Deployment

Each client gets an isolated PKI configuration:

```bash
# Create a new enterprise client
make client CLIENT=acme-corp TEMPLATE=enterprise

# Edit client config
nano clients/acme-corp/.env

# Deploy
make deploy CLIENT=acme-corp

# Export for VPS delivery
make export CLIENT=acme-corp
```

Available templates: `enterprise` | `iot` | `devops`

Full guide: [docs/client-customization.md](docs/client-customization.md)

---

## Available Commands

| Command | Description |
|---|---|
| `make up` | Start the lab (dev mode) |
| `make up-vps` | Start in VPS/production mode |
| `make init` | Bootstrap 3-tier PKI hierarchy |
| `make client CLIENT=x` | Create a new client environment |
| `make deploy CLIENT=x` | Deploy a client config |
| `make export CLIENT=x` | Package for VPS delivery |
| `make backup` | Backup all PKI data |
| `make shell` | Shell into EJBCA container |
| `make ca-list` | List all CAs |
| `make crl-update` | Update all CRLs |
| `make status` | Container health status |
| `make logs` | Tail all logs |

---

## Client Segments

| Segment | Issuing CA | Profiles | Protocols |
|---|---|---|---|
| **Enterprise TLS/mTLS** | Issuing-TLS-CA | TLS Server 2yr, mTLS Client 1yr | HTTPS, REST API |
| **IoT Device Identity** | Issuing-IoT-CA | Device 5yr | EST (RFC 7030), CMP, SCEP |
| **DevOps / Cloud-Native** | Issuing-DevOps-CA | Short-lived 1d | ACME, Vault, cert-manager |

---

## Repository Structure

```
ejbca-pki-lab/
├── Makefile                     # All lab commands
├── docker/
│   ├── docker-compose.yml       # Main stack
│   ├── docker-compose.vps.yml   # VPS overrides
│   ├── .env.example             # Environment template
│   └── nginx/                   # Reverse proxy config
├── pki/
│   ├── scripts/                 # CA init scripts (01→04)
│   └── profiles/                # Certificate profiles (XML)
│       ├── enterprise-tls/
│       ├── iot-device/
│       └── devops-short-lived/
├── clients/                     # Per-client configurations
│   ├── template-enterprise/
│   ├── template-iot/
│   └── template-devops/
└── docs/                        # Full documentation
```

---

## License

MIT — free to use, modify, and build client solutions on top of.

EJBCA Community Edition is licensed under [LGPL v2.1](https://github.com/Keyfactor/ejbca-ce/blob/main/LICENSE).

---

*Built by [@YOUR_USERNAME](https://github.com/YOUR_USERNAME) — open-source PKI lab for professionals.*
