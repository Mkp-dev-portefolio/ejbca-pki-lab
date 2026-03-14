# Reseller & Client Delivery Guide

This guide covers how to package, deliver, and maintain PKI deployments for clients using this lab as your engineering foundation.

---

## Delivery Model

```
┌──────────────────────────────────────────────────────┐
│           Your Lab (GitHub, open-source)             │
│                                                      │
│  ejbca-pki-lab  ←  shared foundation                │
│       │                                              │
│       ├── clients/template-enterprise/               │
│       ├── clients/template-iot/                      │
│       └── clients/template-devops/                   │
│                    │                                 │
│                    ▼                                 │
│        Per-client configuration                      │
│       (NOT committed to public repo)                 │
│                    │                                 │
│                    ▼                                 │
│        Client VPS / on-premise                       │
└──────────────────────────────────────────────────────┘
```

**Rule:** The lab codebase is public. Client-specific `.env` files and certificate outputs are **private** — never committed to the public repo.

---

## Onboarding a New Client

### Step 1 — Information gathering

Collect from client:
- Organization legal name + country (for CA DN)
- PKI use case: TLS only? IoT? DevOps?
- Deployment target: their VPS, cloud, on-premise server?
- Domain name for EJBCA FQDN (e.g., `pki.client.com`)
- Desired CA names (some clients want branded names)

### Step 2 — Create client config

```bash
# Choose the right template
make client CLIENT=<client-id> TEMPLATE=enterprise
# or: TEMPLATE=iot | TEMPLATE=devops

# Edit the config
nano clients/<client-id>/.env
```

Key fields to customize:
```env
PKI_ORGANIZATION="Client Legal Name"
PKI_COUNTRY="XX"
ROOT_CA_NAME="ClientName-Root-CA"
POLICY_CA_NAME="ClientName-Policy-CA"
ISSUING_TLS_CA_NAME="ClientName-TLS-CA"
EJBCA_HOSTNAME=pki.client.com
DB_PASSWORD=<generate with: openssl rand -hex 32>
DB_ROOT_PASSWORD=<generate with: openssl rand -hex 32>
```

### Step 3 — Local PoC / validation

```bash
make deploy CLIENT=<client-id>
make status
make ca-list
```

Validate with client:
- Admin UI accessible: `https://localhost:8443/ejbca/adminweb`
- CA hierarchy correct in Admin UI → CA Functions
- Test certificate enrollment via RA Web

### Step 4 — Export and deliver

```bash
make export CLIENT=<client-id>
# Creates: backups/export_<client-id>_<timestamp>.tar.gz
```

This package contains:
- Full Docker Compose stack
- Client-specific `.env`
- PKI init scripts
- Certificate profiles

Transfer to client VPS:
```bash
scp backups/export_<client-id>_*.tar.gz user@client-vps:~/
```

### Step 5 — Deploy on client VPS

```bash
# On client VPS
tar xzf export_*.tar.gz && cd docker
make up-vps
make init
make superadmin-p12   # Give this to client admin
```

---

## Feature Reuse Strategy

This repo is designed for maximum reuse across clients. Here's how to manage it:

**What lives in the public repo (shared, versioned):**
- Docker Compose templates
- PKI init scripts
- Certificate profile XMLs
- Documentation
- Client environment templates (with example values)

**What stays private (per-client):**
- `clients/<client-id>/.env` (real org names, passwords)
- `pki/output/*.pem` (actual CA certificates)
- `backups/` (DB dumps)
- `docker/data/` (runtime data)

**Recommended git workflow:**
```bash
# Your public fork of ejbca-pki-lab
git remote add upstream https://github.com/YOUR_USERNAME/ejbca-pki-lab.git

# Private repo for client configs (one per client, or a private monorepo)
git init ejbca-clients-private
cd ejbca-clients-private
# Store clients/<client-id>/.env files here
```

---

## GitHub Tagging Strategy

Use GitHub releases to tag stable versions of the lab that you've tested and delivered:

```bash
git tag -a v1.0.0 -m "Initial release — 3-tier PKI, Enterprise/IoT/DevOps templates"
git tag -a v1.1.0 -m "Add ACME protocol support, cert-manager integration guide"
git push origin --tags
```

When building for a specific client, reference a pinned tag:
```bash
git checkout v1.0.0
make client CLIENT=acme-corp
```

---

## Pricing / Packaging Guidance

Suggested client tiers (adapt to your market):

| Tier | Included | What you deliver |
|---|---|---|
| **Starter** | Single Issuing CA, Enterprise TLS only | VPS deploy + 1yr support |
| **Professional** | 3-tier hierarchy, 2 Issuing CAs, profiles | VPS deploy + runbooks + training |
| **Enterprise** | Full lab, all segments, IaC (Terraform), CI/CD | Full handoff + 3yr maintenance |
| **Managed** | All of above + you operate and monitor the PKI | Monthly retainer |

---

## Ongoing Maintenance Tasks

Recurring tasks you can offer as a managed service:

- **CRL renewal** (weekly/monthly): `make crl-update` — automated or manual
- **CA certificate renewal** (years in advance): requires new subordinate CA creation
- **EJBCA updates**: `make backup && make pull && make restart`
- **Certificate expiry monitoring**: integrate with Prometheus `ejbca_exporter` or Datadog
- **Audit log review**: EJBCA writes full audit trail to DB — export for compliance

---

## Extending the Lab

New features you can build and commit back to the public repo:

- `pki/profiles/code-signing/` — Code signing certificate profiles
- `pki/profiles/email-smime/` — S/MIME email profiles
- `iac/terraform/hetzner/` — Terraform for Hetzner VPS provisioning
- `iac/ansible/` — Ansible playbook to configure fresh VPS
- `docker/docker-compose.vault.yml` — Add HashiCorp Vault as PKI middleware
- `.github/workflows/` — GitHub Actions for automated CRL update, backup, etc.
