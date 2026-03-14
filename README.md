# EJBCA PKI Management UI

A modern, full-stack management dashboard for **EJBCA Community Edition** — built to showcase EJBCA's PKI capabilities through a clean, dark-themed web interface.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js / Express (API proxy) |
| PKI Engine | EJBCA Community Edition (Docker) |
| Infrastructure | Docker Compose |

---

## Features

| Page | Capability |
|------|-----------|
| **Dashboard** | Stats overview, CA status grid, certificate expiry, health strip |
| **Certificate Authorities** | List CAs, view details, download CRL, status badges |
| **Certificates** | Search/filter by status/CA/serial, view details, revoke with reason |
| **End Entities** | Full CRUD (create, view, edit, delete), filter by status/CA |
| **Enrollment** | PKCS#10 CSR enrollment form → displays issued PEM certificate |
| **CRL Management** | Per-CA CRL validity status, countdown timers, download |
| **Health Monitor** | Live-polling health checks, history log, latency display |

---

## Quick Start — Mock Mode (no EJBCA required)

The UI runs entirely on realistic mock data out of the box. Perfect for demos.

### Option A: Docker Compose (recommended)

```bash
git clone <this-repo>
cd ejbca-pki-lab

# Mock mode — no EJBCA container started
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Open **http://localhost:3000**

### Option B: Local development

```bash
# Terminal 1 — Backend
cd backend
npm install
USE_MOCK=true npm start        # runs on :3001

# Terminal 2 — Frontend
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev   # runs on :3000
```

---

## Full Stack — Live EJBCA Mode

### Prerequisites

- Docker Desktop or Docker Engine
- At least 4 GB RAM for EJBCA

### 1. Start the full stack

```bash
docker compose up --build
```

EJBCA takes **2–4 minutes** to initialize on first boot (generating the Management CA).

### 2. Enable REST API in EJBCA

Once EJBCA is ready, the REST API must be enabled manually:

1. Open **https://localhost:8443/ejbca/** in your browser
2. Accept the self-signed certificate warning
3. Navigate to **System Configuration → Protocol Configuration**
4. Enable the **REST Certificate Management** and **REST CA Management** protocols
5. Click Save

### 3. Configure authentication (optional for full functionality)

The backend proxy connects to EJBCA without a client certificate by default
(many read-only endpoints work without auth in dev mode). For write operations:

1. Export the SuperAdmin certificate from EJBCA (P12 → convert to PEM)
2. Set environment variables in `docker-compose.yml`:
   ```yaml
   backend:
     environment:
       - EJBCA_CLIENT_CERT=/certs/admin.pem
       - EJBCA_CLIENT_KEY=/certs/admin.key
   ```

### 4. Switch from mock to live data

In `docker-compose.yml`, set:
```yaml
backend:
  environment:
    - USE_MOCK=false
```

Then rebuild: `docker compose up --build`

---

## Backend API Reference

The Express backend runs on port `3001` and proxies requests to EJBCA.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | EJBCA health check (`/ejbcahealth`) |
| `/api/health/vas` | GET | VA/OCSP status (`/vastatus`) |
| `/api/cas` | GET | List all Certificate Authorities |
| `/api/cas/:name/crl` | GET | Get CRL info for a CA |
| `/api/certificates/search` | GET | Search certificates (params: status, ca_name, username, serial) |
| `/api/certificates/enroll` | POST | Enroll via PKCS#10 CSR |
| `/api/certificates/revoke` | PUT | Revoke a certificate |
| `/api/endentities` | GET | List end entities |
| `/api/endentities` | POST | Create end entity |
| `/api/endentities/:username` | PUT | Update end entity |
| `/api/endentities/:username` | DELETE | Delete end entity |

### Mock Mode

Set `USE_MOCK=true` (default) to use realistic mock data with no EJBCA connection.
The mock dataset includes:
- 4 CAs (3 active, 1 offline)
- 7 certificates (active, revoked, expiring-soon)
- 7 end entities in various states

---

## Environment Variables

### Backend (`./backend`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `EJBCA_URL` | `https://localhost:8443` | EJBCA base URL |
| `USE_MOCK` | `true` | Use mock data instead of live EJBCA |
| `EJBCA_CLIENT_CERT` | — | Path to PEM client certificate |
| `EJBCA_CLIENT_KEY` | — | Path to PEM private key |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | Set to `0` for self-signed certs |

### Frontend (`./frontend`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

---

## Project Structure

```
ejbca-pki-lab/
├── docker-compose.yml          Full stack: EJBCA + backend + frontend
├── docker-compose.dev.yml      Override for mock/dev mode
├── ejbca-monitoring-analysis.md  EJBCA monitoring reference
│
├── backend/                    Express API proxy
│   ├── src/
│   │   ├── index.js           Entry point
│   │   ├── config.js          Environment configuration
│   │   ├── ejbcaClient.js     Axios client with TLS cert support
│   │   ├── routes/            health, cas, certificates, endentities
│   │   └── mock/              Realistic mock data (cas, certificates, endentities)
│   └── Dockerfile
│
└── frontend/                   Next.js 14 App Router UI
    ├── src/
    │   ├── app/               Pages: /, /cas, /certificates, /endentities,
    │   │                             /enrollment, /crl, /health
    │   ├── components/        Sidebar, Header, UI primitives
    │   ├── lib/               API client, utilities
    │   └── types/             TypeScript interfaces for EJBCA data
    └── Dockerfile
```

---

## EJBCA REST API Reference

- [EJBCA REST Interface Docs](https://docs.keyfactor.com/ejbca/latest/ejbca-rest-interface)
- [Monitoring & Health Check](https://docs.keyfactor.com/ejbca/latest/monitoring-and-healthcheck)
- Swagger UI (when EJBCA running): `https://localhost:8443/ejbca/swagger-ui/`
