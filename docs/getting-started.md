# Getting Started

## Prerequisites

- Docker Desktop ≥ 4.x (or Docker Engine + Docker Compose v2)
- `make` (pre-installed on Linux/macOS; Windows: use WSL2 or Git Bash)
- 4GB RAM minimum, 8GB recommended
- Ports 80, 443, 8080, 8443, 8442 available

## Step 1 — Clone and Configure

```bash
git clone https://github.com/YOUR_USERNAME/ejbca-pki-lab.git
cd ejbca-pki-lab

# Create your environment file
cp docker/.env.example docker/.env
```

Edit `docker/.env` and set at minimum:

```env
PKI_ORGANIZATION="Your Company"
PKI_COUNTRY="FR"
ROOT_CA_NAME="MyOrg-Root-CA"
POLICY_CA_NAME="MyOrg-Policy-CA"
ISSUING_TLS_CA_NAME="MyOrg-Issuing-TLS-CA"
DB_PASSWORD="a_strong_password_here"
DB_ROOT_PASSWORD="another_strong_password"
EJBCA_HOSTNAME=ejbca.lab.local
```

## Step 2 — Start the Stack

```bash
make up
```

Expected output: EJBCA starts, MariaDB initializes, containers become healthy. This takes 2–3 minutes on first run (EJBCA auto-initializes its internal database).

Check status at any time:
```bash
make status
make logs
```

## Step 3 — Initialize the PKI Hierarchy

```bash
make init
```

This runs four scripts in sequence:
1. `01-init-root-ca.sh` — Creates Root CA (self-signed), sets it offline
2. `02-init-policy-ca.sh` — Creates Policy CA, signed by Root CA
3. `03-init-issuing-cas.sh` — Creates Issuing CA(s) based on `.env` flags
4. `04-init-profiles.sh` — Imports certificate and end-entity profiles

CA certificates are exported to `pki/output/`.

## Step 4 — Access the Admin UI

EJBCA Admin UI requires a client certificate (SuperAdmin).

```bash
make superadmin-p12
```

Then in **Firefox** (recommended):
1. Open `Preferences → Privacy & Security → Certificates → View Certificates`
2. `Your Certificates → Import → superadmin.p12`
3. When prompted for password: check EJBCA startup logs (`make logs-ejbca | grep -i password`)
4. Navigate to: `https://localhost:8443/ejbca/adminweb`

Or use the **RA Web** (no client cert needed):
`https://localhost:8442/ejbca/ra`

## Step 5 — Issue Your First Certificate

Via RA Web:
1. Go to `https://localhost:8442/ejbca/ra`
2. Click **Make New Request**
3. Select Certificate Profile: `TLS-Server-2yr`
4. Select End Entity Profile: `EE-TLS-Server`
5. Select CA: `Issuing-TLS-CA`
6. Fill in CN and DNS SAN
7. Download PKCS#12 or PEM

Via REST API:
```bash
curl -sk -X POST \
  https://localhost:8443/ejbca/ejbca-rest-api/v1/certificate/enrollpkcs10 \
  -H "Content-Type: application/json" \
  -d '{
    "certificate_request": "<base64-encoded-csr>",
    "certificate_profile_name": "TLS-Server-2yr",
    "end_entity_profile_name": "EE-TLS-Server",
    "certificate_authority_name": "Issuing-TLS-CA",
    "username": "myservice",
    "password": "enrollment_password"
  }'
```

## Useful EJBCA CLI Commands

```bash
# List all CAs
make ca-list

# Open EJBCA CLI directly
make shell
/opt/keyfactor/bin/ejbca.sh ca list
/opt/keyfactor/bin/ejbca.sh ca info --caname MyOrg-Root-CA
/opt/keyfactor/bin/ejbca.sh ca createcrl --all

# Run any ejbca.sh command via make
make ejbca-cli CMD="ca getcacert --caname Issuing-TLS-CA -f /tmp/ca.pem"
```

## VPS Deployment

To deploy the same lab to a VPS for client demos:

```bash
# On your workstation: package everything
make export CLIENT=default

# Copy to VPS
scp backups/export_default_*.tar.gz user@YOUR_VPS_IP:~/

# On the VPS
ssh user@YOUR_VPS_IP
tar xzf export_default_*.tar.gz
cd docker
make up-vps
make init
```

The VPS mode uses `docker-compose.vps.yml` which does NOT expose EJBCA ports directly — only Nginx 80/443.

## Updating EJBCA

```bash
make pull      # Pull latest images
make restart   # Restart stack with new images
```

EJBCA CE auto-migrates its database on startup. Always backup first:

```bash
make backup
make pull
make restart
```
