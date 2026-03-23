# ejbca-pki-lab

> A production-grade, 3-tier PKI lab built on EJBCA — because `openssl req` is not how enterprise PKI works.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-required-2496ED?logo=docker)](https://www.docker.com/)
[![EJBCA](https://img.shields.io/badge/EJBCA-Community-orange)](https://www.ejbca.org/)
[![PKI](https://img.shields.io/badge/PKI-Enterprise-green)]()

---

## Why This Exists

Most PKI labs on GitHub hand you a shell script that calls `openssl` a few times, produces a Root CA and a leaf cert, and calls it done.

That is not how enterprise PKI works.

In production environments — banks, automotive networks, critical infrastructure — a PKI is a layered architecture: offline Root CAs that never touch the network, Intermediate CAs that bridge policy domains, online Issuing CAs handling high-volume certificate requests, and dedicated OCSP/CRL responders that validators query at runtime. Getting any of it wrong is a compliance incident. Getting it very wrong is a breach.

This lab replicates that architecture using **EJBCA Community**, the same open-source engine that powers some of the largest PKIs in the world, so you can test, break, and understand enterprise certificate infrastructure without a commercial license and without touching production.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRUST HIERARCHY                              │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐    │
│   │                  ROOT CA (Offline)                        │    │
│   │         Self-signed · Air-gapped simulation               │    │
│   │         4096-bit RSA / P-384 ECDSA                        │    │
│   └──────────────────────────┬────────────────────────────────┘    │
│                              │ signs                               │
│   ┌──────────────────────────▼────────────────────────────────┐    │
│   │               INTERMEDIATE / POLICY CA                    │    │
│   │          Policy constraints · Name constraints             │    │
│   │          Certificate Policy OIDs                           │    │
│   └──────┬──────────────────────────────────────┬─────────────┘    │
│          │ signs                                │ signs            │
│   ┌──────▼──────────────┐          ┌────────────▼──────────────┐   │
│   │    ISSUING CA (TLS) │          │   ISSUING CA (Client/S&E) │   │
│   │  Online · EJBCA     │          │   Online · EJBCA          │   │
│   └──────┬──────────────┘          └────────────┬──────────────┘   │
│          │                                      │                  │
│   ┌──────▼──────────────────────────────────────▼──────────────┐   │
│   │             REVOCATION INFRASTRUCTURE                      │   │
│   │    OCSP Responder (delegated)  ·  CRL Distribution Points  │   │
│   │    OCSP Stapling support       ·  Delta CRL publishing      │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

All components run as Docker containers on a single host. The Root CA container is designed to be stopped after signing the Intermediate CA — simulating the offline/air-gapped posture required by most enterprise PKI policies and regulatory frameworks.

---

## Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| Docker | 20.10+ | Container runtime |
| Docker Compose | v2+ | Multi-container orchestration |
| Java (JDK) | 17+ | EJBCA CLI tooling |
| openssl | 3.x | Key generation and cert inspection |
| curl | any | OCSP query testing |
| ~8 GB disk space | — | EJBCA images + volumes |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Mkp-dev-portefolio/ejbca-pki-lab.git
cd ejbca-pki-lab

# Bring up the full PKI stack
docker compose up -d

# Wait for EJBCA to initialize (~60–90 seconds on first run)
docker compose logs -f ejbca | grep "EJBCA started successfully"

# Initialize the Root CA (offline simulation)
./scripts/init-root-ca.sh

# Sign the Intermediate CA certificate
./scripts/sign-intermediate-ca.sh

# Bring the Issuing CAs online
./scripts/init-issuing-cas.sh

# Start OCSP and CRL services
./scripts/init-revocation.sh

# Verify the full chain is healthy
./scripts/verify-chain.sh
```

> **First time?** See [`docs/SETUP.md`](docs/SETUP.md) for a step-by-step walkthrough with screenshots.

---

## Lab Components

### Containers

| Container | Role | Port |
|---|---|---|
| `ejbca-root` | Root CA (offline simulation) | 8080 (admin UI) |
| `ejbca-issuing` | Issuing CA — TLS + Client | 8443 (RA/admin UI) |
| `ejbca-ocsp` | OCSP Responder | 8080 |
| `ejbca-va` | Validation Authority | 8080 |
| `database` | Internal MariaDB | 3306 (internal only) |

### Certificate Profiles Included

- `TLS_SERVER` — TLS server certificates (SAN-enforced, 397-day max)
- `TLS_CLIENT` — Mutual TLS client authentication
- `CODE_SIGNING` — Software signing (EKU enforced)
- `EMAIL_SMIME` — S/MIME email signing and encryption
- `OCSP_SIGNER` — OCSP response signing (id-pkix-ocsp-nocheck)
- `CA_CROSS_CERT` — Cross-certification test profile

---

## What You Can Test Here

1. **Certificate lifecycle end-to-end** — Request, issue, renew, revoke, and verify certificates through the full EJBCA workflow, including RA-based enrollment and SCEP/EST/CMP protocol simulation.

2. **Revocation infrastructure behavior** — Publish CRLs on schedule, query OCSP in real time, and observe how relying parties respond to revoked certificates. Test delta CRLs and OCSP caching edge cases.

3. **Policy enforcement** — Configure certificate policies, name constraints, and EKU restrictions and observe EJBCA enforcing or rejecting requests that violate them.

4. **Chain building and path validation** — Build complex chains, introduce cross-certificates, and test how validators handle multiple trust paths to the same Root CA.

5. **Crypto-agility transitions** — Run a parallel RSA/ECDSA hierarchy and simulate a root rollover, including issuing transitional cross-certs and testing validator behavior during the overlap window.

6. **DORA-relevant scenarios** — Test the ICT risk management controls that directly touch PKI: certificate inventory/discovery, revocation SLAs, CA key ceremony procedures, and backup/restore of CA keys and configuration.

7. **Weak configuration detection** — Deliberately misconfigure key sizes, extensions, or revocation endpoints and verify that your scanning tooling (e.g., [`pki-pentest-toolkit`](https://github.com/ismailzemouri/pki-pentest-toolkit)) correctly identifies the issues.

8. **High-availability and failover** — Simulate CA downtime and observe how OCSP stapling, cached CRLs, and RA failover affect certificate validation in dependent services.

---

## Use Cases

### This lab is useful if you are…

**A PKI engineer** who wants a realistic sandbox to test configuration changes before promoting them to production — without the risk of touching live CAs or waiting for a change management window.

**A DORA compliance team** preparing for audit. The EU Digital Operational Resilience Act (DORA) has explicit requirements around ICT risk management and third-party dependencies. This lab lets you walk through certificate-related controls, generate evidence, and test your incident response procedures in a safe environment.

**A security architect** designing a new PKI for a financial institution, automotive network, or critical infrastructure deployment. Use this lab to validate your architecture decisions before committing to hardware HSMs and expensive CA licenses.

**A red team or penetration tester** who wants a live target for PKI-specific attack scenarios. Pair with [`pki-pentest-toolkit`](https://github.com/ismailzemouri/pki-pentest-toolkit) for a complete attack/defense environment.

**A student or security professional** pursuing CISSP, CEH, or vendor-specific PKI certifications who wants hands-on time with enterprise-grade CA software, not just textbook diagrams.

---

## DORA & Regulatory Alignment

The lab is structured to support testing against the following frameworks:

| Framework | Relevant Articles | Coverage |
|---|---|---|
| **DORA (EU 2022/2554)** | Art. 9 (ICT risk), Art. 10 (detection), Art. 11 (response/recovery) | Certificate lifecycle, revocation SLA, key backup |
| **NIS2 Directive** | Art. 21 (security measures) | CA availability, cryptographic hygiene |
| **ETSI EN 319 401** | General Policy Requirements for TSPs | Certificate policy, CP/CPS structure |
| **RFC 5280** | Internet X.509 PKI | Full chain validation, extension enforcement |
| **CAB Forum Baseline Requirements** | TLS certificate requirements | SAN enforcement, validity periods |

---

## Project Structure

```
ejbca-pki-lab/
├── docker-compose.yml          # Full stack definition
├── config/
│   ├── root-ca/                # Root CA profiles and policies
│   ├── intermediate-ca/        # Intermediate CA configuration
│   ├── issuing-ca/             # Issuing CA profiles (TLS, client, S/MIME)
│   └── revocation/             # OCSP and CRL publisher config
├── scripts/
│   ├── init-root-ca.sh
│   ├── sign-intermediate-ca.sh
│   ├── init-issuing-cas.sh
│   ├── init-revocation.sh
│   └── verify-chain.sh
├── tests/
│   ├── chain-validation/       # Chain building test cases
│   ├── revocation/             # OCSP and CRL test scenarios
│   └── policy-enforcement/     # Certificate profile violation tests
└── docs/
    ├── SETUP.md
    ├── ARCHITECTURE.md
    └── DORA-MAPPING.md
```

---

## Contributing

Contributions are welcome, especially:

- Additional certificate profiles (IoT/automotive, document signing, government eID)
- Automated test cases for specific compliance scenarios
- HSM simulation integration (SoftHSM2)
- EST/ACME protocol enrollment examples
- CI pipeline for automated chain validation

Please open an issue before submitting a large pull request so we can discuss the approach.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## About MYKEYPAIR

This lab is maintained by [Ismail Zemouri](https://github.com/ismailzemouri), CISSP and founder of **MYKEYPAIR** — a PKI consulting practice specializing in enterprise certificate infrastructure, regulatory compliance (DORA, NIS2, eIDAS), and automotive/smart city PKI architecture.

If you're building or auditing PKI for a financial institution, critical infrastructure operator, or automotive/smart city deployment and need hands-on expertise:

🌐 [mykeypair.be](https://mykeypair.be) · 📧 [contact@mykeypair.be](mailto:contact@mykeypair.be)
