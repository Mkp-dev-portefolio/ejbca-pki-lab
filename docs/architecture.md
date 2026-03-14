# Architecture — EJBCA PKI Lab

## PKI Hierarchy — 3-Tier Design

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1 — ROOT CA (Offline after initial signing)                │
│                                                                  │
│  CN=Root-CA, O=<Org>, C=<Country>                               │
│  Key: RSA-4096  |  Sig: SHA256WithRSA  |  Validity: 20 years    │
│  Status: OFFLINE after Policy CA is signed                       │
│  Profile: ROOTCA (built-in EJBCA)                                │
└──────────────────────┬───────────────────────────────────────────┘
                       │  Signs
┌──────────────────────▼───────────────────────────────────────────┐
│  TIER 2 — POLICY CA (Online, policy enforcement)                 │
│                                                                  │
│  CN=Policy-CA, O=<Org>, C=<Country>                             │
│  Key: RSA-4096  |  Sig: SHA256WithRSA  |  Validity: 10 years    │
│  Issues: Only Sub-CAs (no end-entity certs directly)            │
│  Profile: SUBCA (built-in EJBCA)                                 │
└──────────┬────────────────────────────┬──────────────────────────┘
           │  Signs                     │  Signs
┌──────────▼──────────┐    ┌────────────▼──────────┐    ┌──────────▼──────────┐
│  Issuing-TLS-CA     │    │  Issuing-IoT-CA        │    │  Issuing-DevOps-CA  │
│                     │    │                        │    │                     │
│  RSA-4096           │    │  RSA-2048 / ECDSA P-256│    │  ECDSA P-256        │
│  Validity: 5 years  │    │  Validity: 10 years    │    │  Validity: 5 years  │
│                     │    │                        │    │                     │
│  Issues:            │    │  Issues:               │    │  Issues:            │
│  TLS Server (2yr)   │    │  Device ID (5yr)       │    │  Service ID (1day)  │
│  mTLS Client (1yr)  │    │  via EST/CMP/SCEP      │    │  via ACME/Vault     │
└─────────────────────┘    └────────────────────────┘    └─────────────────────┘
```

## Container Stack

```
┌────────────────────────────────────────────────────────────────┐
│  External                                                      │
│  ┌──────┐  443/80                                              │
│  │  Browser / Client                                          │
│  └──────┘                                                      │
│      │                                                         │
│  ┌───▼──────────────────────────────────────────────────────┐  │
│  │  Nginx (Reverse Proxy)                                   │  │
│  │  - TLS termination (external-facing)                     │  │
│  │  - Routes: /ejbca/adminweb → 8443 (mutual TLS)          │  │
│  │            /ejbca/ra       → 8442 (no mutual TLS)       │  │
│  │            /ejbca/publicweb → 8080 (CRL/OCSP)           │  │
│  └───────────────────┬──────────────────────────────────────┘  │
│                      │  ejbca-public network                   │
│  ┌───────────────────▼──────────────────────────────────────┐  │
│  │  EJBCA CE (keyfactor/ejbca-ce:latest)                    │  │
│  │  WildFly application server                              │  │
│  │  - Admin UI:  :8443 (client cert required)              │  │
│  │  - RA Web:    :8442                                      │  │
│  │  - REST API:  :8443/ejbca/ejbca-rest-api/v1             │  │
│  │  - OCSP:      :8080/ejbca/publicweb/status/ocsp         │  │
│  │  - CRL:       :8080/ejbca/publicweb/crls/               │  │
│  │  - EST:       :8442/.well-known/est/                    │  │
│  │  - ACME:      :8442/ejbca/acme/directory                │  │
│  └───────────────────┬──────────────────────────────────────┘  │
│                      │  ejbca-internal network                  │
│  ┌───────────────────▼──────────────────────────────────────┐  │
│  │  MariaDB 10.11                                           │  │
│  │  - ejbca database (all CA state, certs, audit log)      │  │
│  │  - Volume: persistent across restarts                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Network Security

Two Docker networks are used deliberately:

- **ejbca-internal**: MariaDB + EJBCA only. No external access. Database is unreachable from outside.
- **ejbca-public**: EJBCA + Nginx. Nginx is the only entry point for external traffic.

In VPS mode (`docker-compose.vps.yml`), EJBCA ports are NOT exposed on the host — only Nginx ports 80/443 are.

## Certificate Profiles Summary

| Profile Name | Validity | Key Usage | EKU | SAN | CRL/OCSP |
|---|---|---|---|---|---|
| TLS-Server-2yr | 730d | digitalSig + keyEncipher | serverAuth | DNS required | Yes |
| TLS-Client-mTLS | 365d | digitalSig | clientAuth | DNS/email | Yes |
| IoT-Device-5yr | 1825d | digitalSig + keyEncipher | clientAuth | URI (device URN) | Yes |
| DevOps-ShortLived-1d | 1d | digitalSig | serverAuth + clientAuth | DNS/IP | No (TTL < revocation lag) |

## EJBCA REST API

EJBCA CE exposes a REST API at `/ejbca/ejbca-rest-api/v1/`. Key endpoints used by this lab:

- `GET /v1/ca` — list CAs
- `POST /v1/certificate/enrollkeystore` — enroll with server-side key gen
- `POST /v1/certificate/enrollpkcs10` — enroll with CSR
- `PUT /v1/certificate/{issuer_dn}/{certificate_serial_number}/revoke` — revoke
- `GET /v1/certificate/status` — cert status
- `POST /v1/cryptotoken` — manage crypto tokens

Full Swagger: `https://<host>:8443/ejbca/ejbca-rest-api/swagger-ui/index.html`

## Data Persistence

All persistent data lives in `docker/data/`:

```
docker/data/
├── ejbca/       → EJBCA keystores, configuration, logs
├── mariadb/     → MariaDB data files
└── nginx/
    ├── certs/   → Nginx TLS certificates
    └── logs/    → Access and error logs
```

These directories are bind-mounted into containers, so data survives container restarts and upgrades.
