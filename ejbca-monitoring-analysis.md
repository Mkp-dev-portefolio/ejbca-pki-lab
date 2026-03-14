# EJBCA Monitoring Interfaces Analysis

> Branch: `claude/ejbca-monitoring-analysis`
> Date: 2026-03-14

---

## TL;DR

EJBCA provides **comprehensive monitoring interfaces** covering CA health, certificate lifecycle, RA/VA status, audit logging, and external tool integrations. Most features are available in Community Edition; SNMP and advanced dashboards require Enterprise/Appliance.

---

## 1. Health Check Endpoints (Built-in)

### EJBCA Health Check
```
GET http://<host>:8080/ejbca/publicweb/healthcheck/ejbcahealth
GET https://<host>:8443/ejbca/publicweb/healthcheck/ejbcahealth
```
- Returns `OK` or an error string
- Primary integration point for load balancers and monitoring tools
- Fails if a CA's Crypto Token goes offline (intentional offline CAs do NOT trigger errors)
- IP whitelist via `healthcheck.authorizedips` in `conf/ejbca.properties`

### VA / OCSP Status
```
GET http://<host>:8080/ejbca/publicweb/healthcheck/vastatus
GET http://<host>:8080/ejbca/publicweb/healthcheck/vastatus?name=<publisher_name>
```
- Returns JSON with sync status of all Validation Authorities
- Example: `{ "error": false, "outOfSync": [{ "name": "VA Peer Publisher 2" }] }`
- If all VAs are out of sync, still returns HTTP 200 (prevents removing all OCSP responders at once)

---

## 2. REST API (Monitoring-relevant Endpoints)

Must be enabled: Admin UI > System Configuration > Protocol Configuration.
Authentication requires a client certificate.

| Endpoint | Purpose |
|----------|---------|
| `GET /ejbca/ejbca-rest-api/v1/certificate/status` | Certificate service health |
| `GET /ejbca/ejbca-rest-api/v1/ca/status` | CA status |
| `GET /ejbca/ejbca-rest-api/v1/certificate/{issuer_dn}/{serial_hex}/revocationstatus` | Certificate revocation status |
| `GET /ejbca/ejbca-rest-api/v1/certificate/search` | Certificate search |
| `GET /ejbca/ejbca-rest-api/v1/cryptotoken/` | Crypto token status |

OpenAPI/Swagger UI available at `https://<host>:8443/ejbca/swagger-ui` (dev mode only: `ejbca.productionmode=false`).

---

## 3. CA Monitoring

### Admin Web UI Dashboard
- CA online/offline status (red alert if CA or its Crypto Token is offline)
- CRL validity status (red alert if CRL has expired)
- Publisher queue depth (pending/failed publish events)
- Configurable via "My Preferences" in the Admin UI

### Relevant REST endpoints
- `GET /ejbca/ejbca-rest-api/v1/ca/` — list CAs and their certificates
- `GET /ejbca/ejbca-rest-api/v1/ca_management/` — CA activation/deactivation

---

## 4. RA (Registration Authority) Monitoring

EJBCA uses a **Peer Systems** protocol (mutual TLS) to connect CA ↔ RA ↔ VA instances.

- Admin UI > Peer Systems shows all peer connections with their status
- **Ping** button to test connectivity to any peer
- CA always initiates outgoing TLS to RA (firewall-friendly)
- Each peer has its own role/authorization scope

---

## 5. Certificate Lifecycle Monitoring

### Built-in Timer Services
| Service | Function |
|---------|----------|
| Certificate Expiration Check | Alerts (email) when certificates are within N days of expiry |
| CRL Updater | Auto-generates CRLs before expiry |
| Renew CA Service | Monitors and auto-renews CA certificates |
| Publisher Queue Process | Retries failed publishing operations |
| HSM Keepalive | Periodically tests Crypto Tokens to prevent timeouts |

### Revocation Status
```
GET /ejbca/ejbca-rest-api/v1/certificate/{issuer_dn}/{serial_hex}/revocationstatus
```

### Manual OCSP check
```bash
openssl ocsp -url http://<host>:8080/ejbca/publicweb/status/ocsp \
  -issuer issuer.cacert.pem -cert entity-cert.pem
```

---

## 6. Audit Logging

| Log Type | Storage | Purpose |
|----------|---------|---------|
| Security Audit Log | Database (integrity-protected, tamper-evident) | Compliance: Common Criteria, ETSI/CWA, WebTrust |
| System Log | Log files (Log4J) | Operational errors, monitoring |
| Transaction Log | Separate log | OCSP/WS billing/accounting |

- Audit log export: rotating files, Syslog, CLI export, XML/CMS from UI
- Key events logged: certificate issued, profile edited, admin access

---

## 7. External Monitoring Tool Integrations

| Tool | Integration Method | Notes |
|------|-------------------|-------|
| **Monit** | Health check servlet + WildFly process | Full guide in official docs |
| **Nagios / SolarWinds** | HTTP probe on `/ejbcahealth` | Standard HTTP check plugin |
| **Graylog / Splunk** | Syslog-TCP from WildFly `standalone.xml` | Structured PKI event parsing possible |
| **F5 Load Balancers** | Health check servlet for pool members | Native support |
| **Prometheus** | No native endpoint — use JMX Exporter (Java agent) + Blackbox Exporter | Community Edition |
| **Grafana** | Via Prometheus JMX Exporter or 3Key DMR (Enterprise add-on) | |
| **SNMP v2c/v3** | Native on Appliance deployments | `PK-SOFTWARE-APPLIANCE-V2.mib` |
| **JMX** | Native (JVM) — bridge to Prometheus via JMX Exporter | Standard WildFly/Java |

---

## 8. Feature Availability by Edition

| Capability | Community | Enterprise / Appliance |
|-----------|-----------|----------------------|
| Health check servlet (`/ejbcahealth`) | Yes | Yes |
| VA/OCSP status servlet (`/vastatus`) | Yes | Yes |
| REST API (CA, cert, revocation status) | Yes (needs enabling) | Yes |
| CA/CRL status in Admin UI | Yes | Yes |
| Certificate expiry email alerts | Yes | Yes |
| Audit log (integrity-protected) | Yes | Yes |
| Syslog / Graylog / Splunk | Yes (via WildFly) | Yes |
| SNMP (v2c, v3) | Appliance only | Yes |
| JMX | Yes (JVM native) | Yes |
| Prometheus native endpoint | No | No |
| 3Key DMR dashboards | No | Enterprise add-on |
| Keyfactor Command dashboard | No | Separate product |

---

## 9. Key Gaps / Recommendations

1. **No native Prometheus `/metrics` endpoint** — requires JMX Exporter agent or custom REST-based exporter.
2. **No native Grafana dashboard** — third-party 3Key DMR add-on fills this gap for Enterprise.
3. **SNMP only on Appliance** — bare-metal Community installs need JMX-to-SNMP bridge.
4. **Swagger UI disabled in production mode** — REST API exploration requires dev mode.
5. **RA Ping is manual** — no automated alerting on RA peer disconnection in Community Edition.

---

## Sources

- [Monitoring and Healthcheck](https://docs.keyfactor.com/ejbca/latest/monitoring-and-healthcheck)
- [EJBCA REST Interface](https://docs.keyfactor.com/ejbca/latest/ejbca-rest-interface)
- [Monitoring of VAs](https://docs.keyfactor.com/ejbca/latest/monitoring-of-vas)
- [Peer Systems](https://docs.keyfactor.com/ejbca/8.3.2/peer-systems)
- [Logging](https://docs.keyfactor.com/ejbca/latest/logging)
- [Integrating EJBCA with Graylog](https://docs.keyfactor.com/ejbca/9.0/integrating-ejbca-with-graylog)
- [Monitor EJBCA host using Monit](https://docs.keyfactor.com/ejbca/latest/monitor-ejbca-host-using-monit)
- [3Key DMR Add-on](https://docs.keyfactor.com/ejbca/9.0/3key-dashboarding-monitoring-and-reporting-add-on)
- [SNMP Settings (Appliance)](https://docs.keyfactor.com/hardwareappliance/latest/ejbca/simple-network-management-protocol-snmp-settings)
- [Certificate Expiration Check Service](https://doc.primekey.com/ejbca/ejbca-operations/ejbca-ca-concept-guide/services/certificate-expiration-check-service)
