#!/usr/bin/env bash
# =============================================================================
# 03-init-issuing-cas.sh
# Bootstraps Tier-3 Issuing CAs — signed by Policy CA
#
# Enabled via .env:
#   ISSUING_TLS_CA_ENABLED=true    → Enterprise TLS/mTLS Issuing CA
#   ISSUING_IOT_CA_ENABLED=true    → IoT Device Identity Issuing CA
#   ISSUING_DEVOPS_CA_ENABLED=true → DevOps / Short-lived Issuing CA
#
# Usage: ./03-init-issuing-cas.sh
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

ENV_FILE="${SCRIPT_DIR}/../../docker/.env"
[[ -f "${ENV_FILE}" ]] && source "${ENV_FILE}" || true

require_env POLICY_CA_NAME PKI_ORGANIZATION PKI_COUNTRY ISSUING_CA_VALIDITY_DAYS

print_banner
log_step "TIER 3 — Initializing Issuing CAs (signed by ${POLICY_CA_NAME})"
wait_for_ejbca

CERT_OUT_DIR="${SCRIPT_DIR}/../../pki/output"
mkdir -p "${CERT_OUT_DIR}"

# =============================================================================
# Helper: Create a single Issuing CA
# =============================================================================
create_issuing_ca() {
    local ca_name="$1"
    local ca_label="$2"
    local key_size="${3:-4096}"

    local ca_dn="CN=${ca_name},OU=${ca_label},O=${PKI_ORGANIZATION},C=${PKI_COUNTRY}"

    log_step "Creating Issuing CA: ${ca_name}"
    log_info "DN:       ${ca_dn}"
    log_info "SignedBy: ${POLICY_CA_NAME}"

    if ca_exists "${ca_name}"; then
        log_warn "Issuing CA '${ca_name}' already exists — skipping."
        return 0
    fi

    ejbca_exec ca init \
        --caname     "${ca_name}" \
        --dn         "${ca_dn}" \
        --tokentype  soft \
        --keytype    RSA \
        --keyspec    "${key_size}" \
        --signalg    SHA256WithRSA \
        --validity   "${ISSUING_CA_VALIDITY_DAYS}" \
        --policy     "null" \
        -certprofile SUBCA \
        --signedby   "${POLICY_CA_NAME}"

    log_success "Issuing CA '${ca_name}' created."

    # Export cert
    export_ca_cert "${ca_name}" "${CERT_OUT_DIR}/${ca_name,,}.pem"

    # Build chain: IssuingCA → PolicyCA → RootCA
    cat "${CERT_OUT_DIR}/${ca_name,,}.pem" \
        "${CERT_OUT_DIR}/policy-ca.pem" \
        "${CERT_OUT_DIR}/root-ca.pem" \
        > "${CERT_OUT_DIR}/chain-${ca_name,,}-full.pem"
    log_info "Full chain saved: pki/output/chain-${ca_name,,}-full.pem"

    # Initial CRL
    create_crl "${ca_name}"
}

# =============================================================================
# Enterprise TLS/mTLS Issuing CA
# Issues: TLS server certs, client auth certs (mTLS)
# =============================================================================
if [[ "${ISSUING_TLS_CA_ENABLED:-true}" == "true" ]]; then
    create_issuing_ca \
        "${ISSUING_TLS_CA_NAME:-Issuing-TLS-CA}" \
        "Enterprise TLS" \
        "4096"
else
    log_info "TLS Issuing CA disabled (ISSUING_TLS_CA_ENABLED=false)"
fi

# =============================================================================
# IoT Device Identity Issuing CA
# Issues: device certificates for EST/CMP enrollment
# =============================================================================
if [[ "${ISSUING_IOT_CA_ENABLED:-false}" == "true" ]]; then
    create_issuing_ca \
        "${ISSUING_IOT_CA_NAME:-Issuing-IoT-CA}" \
        "IoT Device Identity" \
        "2048"
else
    log_info "IoT Issuing CA disabled (set ISSUING_IOT_CA_ENABLED=true to enable)"
fi

# =============================================================================
# DevOps Short-lived Issuing CA
# Issues: 1-day certificates (ACME, Vault, CI/CD pipelines)
# =============================================================================
if [[ "${ISSUING_DEVOPS_CA_ENABLED:-false}" == "true" ]]; then
    create_issuing_ca \
        "${ISSUING_DEVOPS_CA_NAME:-Issuing-DevOps-CA}" \
        "DevOps Short-lived" \
        "2048"
else
    log_info "DevOps Issuing CA disabled (set ISSUING_DEVOPS_CA_ENABLED=true to enable)"
fi

log_success "=== Issuing CA initialization complete ==="
log_info "Output certificates: pki/output/"
log_info "Next step: run 04-init-profiles.sh to load certificate profiles"
