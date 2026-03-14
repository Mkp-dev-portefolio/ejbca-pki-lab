#!/usr/bin/env bash
# =============================================================================
# helpers.sh — Shared utilities for all PKI init scripts
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

EJBCA_CONTAINER="${EJBCA_CONTAINER:-ejbca-node1}"

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()    { echo -e "\n${CYAN}▶ $*${NC}"; }

# Execute EJBCA CLI command inside the container
ejbca_exec() {
    docker exec "${EJBCA_CONTAINER}" \
        /opt/keyfactor/bin/ejbca.sh "$@"
}

# Check if a CA already exists by name
ca_exists() {
    local ca_name="$1"
    ejbca_exec ca info --caname "${ca_name}" &>/dev/null
}

# Wait until EJBCA is fully initialized
wait_for_ejbca() {
    log_step "Waiting for EJBCA to become ready..."
    local max_wait=300
    local waited=0
    local interval=10

    until docker exec "${EJBCA_CONTAINER}" \
        curl -sk https://localhost:8443/ejbca/publicweb/healthcheck/ejbcaok \
        | grep -q "ALLOK" 2>/dev/null; do
        if [ $waited -ge $max_wait ]; then
            log_error "EJBCA did not start within ${max_wait}s. Check logs: docker logs ${EJBCA_CONTAINER}"
            exit 1
        fi
        echo -n "."
        sleep $interval
        waited=$((waited + interval))
    done
    echo ""
    log_success "EJBCA is ready."
}

# Export a CA certificate to local file
export_ca_cert() {
    local ca_name="$1"
    local output_file="$2"
    ejbca_exec ca getcacert --caname "${ca_name}" -f /tmp/ca_export.pem
    docker cp "${EJBCA_CONTAINER}:/tmp/ca_export.pem" "${output_file}"
    log_success "CA cert exported: ${output_file}"
}

# Import a certificate chain
import_ca_cert() {
    local ca_name="$1"
    local cert_file="$2"
    docker cp "${cert_file}" "${EJBCA_CONTAINER}:/tmp/ca_import.pem"
    ejbca_exec ca importcacert --caname "${ca_name}" -f /tmp/ca_import.pem
    log_success "CA cert imported for: ${ca_name}"
}

# Create a CRL for a CA
create_crl() {
    local ca_name="$1"
    ejbca_exec ca createcrl --caname "${ca_name}"
    log_success "CRL created for: ${ca_name}"
}

# Check required environment variables are set
require_env() {
    local missing=()
    for var in "$@"; do
        [[ -z "${!var:-}" ]] && missing+=("$var")
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing[*]}"
        log_error "Copy docker/.env.example to docker/.env and fill in values."
        exit 1
    fi
}

# Print a banner
print_banner() {
    echo -e "${CYAN}"
    echo "  ╔══════════════════════════════════════════════════╗"
    echo "  ║         EJBCA PKI Lab — Init Script              ║"
    echo "  ║  3-Tier PKI: Root CA → Policy CA → Issuing CAs  ║"
    echo "  ╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}
