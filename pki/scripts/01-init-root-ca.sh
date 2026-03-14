#!/usr/bin/env bash
# =============================================================================
# 01-init-root-ca.sh
# Bootstraps the offline Root CA (Tier 1)
#
# Design intent:
#   - Root CA is created ONLINE in EJBCA for initial signing of Policy CA
#   - After signing, the Root CA status is set to "offline" (no auto-renewal)
#   - Root CA key is RSA-4096 or EC P-384 (configurable)
#   - Root CA certificate validity: 20 years
#
# Usage: ./01-init-root-ca.sh
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

# Load environment
ENV_FILE="${SCRIPT_DIR}/../../docker/.env"
[[ -f "${ENV_FILE}" ]] && source "${ENV_FILE}" || true

# --- Validate required vars ---
require_env \
    ROOT_CA_NAME \
    PKI_ORGANIZATION \
    PKI_COUNTRY \
    ROOT_CA_VALIDITY_DAYS

print_banner

# --- Defaults ---
ROOT_CA_DN="CN=${ROOT_CA_NAME},O=${PKI_ORGANIZATION},C=${PKI_COUNTRY}"
ROOT_CA_KEY_ALGO="${ROOT_CA_KEY_ALGO:-RSA}"
ROOT_CA_KEY_SIZE="${ROOT_CA_KEY_SIZE:-4096}"
ROOT_CA_SIGN_ALGO="${ROOT_CA_SIGN_ALGO:-SHA256WithRSA}"

log_step "TIER 1 — Initializing Root CA"
log_info "Name:      ${ROOT_CA_NAME}"
log_info "DN:        ${ROOT_CA_DN}"
log_info "Key:       ${ROOT_CA_KEY_ALGO} ${ROOT_CA_KEY_SIZE}"
log_info "Validity:  ${ROOT_CA_VALIDITY_DAYS} days"

wait_for_ejbca

# --- Check if Root CA already exists ---
if ca_exists "${ROOT_CA_NAME}"; then
    log_warn "Root CA '${ROOT_CA_NAME}' already exists — skipping creation."
else
    log_step "Creating Root CA..."
    ejbca_exec ca init \
        --caname        "${ROOT_CA_NAME}" \
        --dn            "${ROOT_CA_DN}" \
        --tokentype     soft \
        --keytype       "${ROOT_CA_KEY_ALGO}" \
        --keyspec       "${ROOT_CA_KEY_SIZE}" \
        --signalg       "${ROOT_CA_SIGN_ALGO}" \
        --validity      "${ROOT_CA_VALIDITY_DAYS}" \
        --policy        "null" \
        -certprofile    ROOTCA \
        -superadmincn   "SuperAdmin"

    log_success "Root CA '${ROOT_CA_NAME}' created."
fi

# --- Export Root CA certificate ---
CERT_OUT_DIR="${SCRIPT_DIR}/../../pki/output"
mkdir -p "${CERT_OUT_DIR}"
export_ca_cert "${ROOT_CA_NAME}" "${CERT_OUT_DIR}/root-ca.pem"
log_info "Root CA certificate saved to: pki/output/root-ca.pem"

# --- Generate initial CRL ---
create_crl "${ROOT_CA_NAME}"

# --- Set Root CA to offline (revocation-only after signing sub-CAs) ---
# NOTE: We keep it ACTIVE until Policy CA is signed (done in script 02)
log_warn "Root CA will be set OFFLINE after Policy CA is signed (run 02-init-policy-ca.sh next)."

log_success "=== Root CA initialization complete ==="
