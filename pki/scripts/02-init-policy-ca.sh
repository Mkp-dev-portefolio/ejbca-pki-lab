#!/usr/bin/env bash
# =============================================================================
# 02-init-policy-ca.sh
# Bootstraps the Policy CA (Tier 2) — signed by Root CA
#
# Design intent:
#   - Policy CA enforces CA/B Forum and internal policy constraints
#   - Signed by Root CA
#   - Root CA is set to offline/non-issuing after this step
#   - Key: RSA-4096 or EC P-384
#   - Validity: 10 years
#
# Usage: ./02-init-policy-ca.sh
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

ENV_FILE="${SCRIPT_DIR}/../../docker/.env"
[[ -f "${ENV_FILE}" ]] && source "${ENV_FILE}" || true

require_env \
    ROOT_CA_NAME \
    POLICY_CA_NAME \
    PKI_ORGANIZATION \
    PKI_COUNTRY \
    POLICY_CA_VALIDITY_DAYS

POLICY_CA_DN="CN=${POLICY_CA_NAME},O=${PKI_ORGANIZATION},C=${PKI_COUNTRY}"
POLICY_CA_KEY_ALGO="${POLICY_CA_KEY_ALGO:-RSA}"
POLICY_CA_KEY_SIZE="${POLICY_CA_KEY_SIZE:-4096}"
POLICY_CA_SIGN_ALGO="${POLICY_CA_SIGN_ALGO:-SHA256WithRSA}"

print_banner

log_step "TIER 2 — Initializing Policy CA"
log_info "Name:          ${POLICY_CA_NAME}"
log_info "DN:            ${POLICY_CA_DN}"
log_info "Signed by:     ${ROOT_CA_NAME}"
log_info "Key:           ${POLICY_CA_KEY_ALGO} ${POLICY_CA_KEY_SIZE}"
log_info "Validity:      ${POLICY_CA_VALIDITY_DAYS} days"

wait_for_ejbca

# --- Verify Root CA exists ---
if ! ca_exists "${ROOT_CA_NAME}"; then
    log_error "Root CA '${ROOT_CA_NAME}' does not exist. Run 01-init-root-ca.sh first."
    exit 1
fi

# --- Create Policy CA if it doesn't exist ---
if ca_exists "${POLICY_CA_NAME}"; then
    log_warn "Policy CA '${POLICY_CA_NAME}' already exists — skipping creation."
else
    log_step "Creating Policy CA (signed by ${ROOT_CA_NAME})..."
    ejbca_exec ca init \
        --caname        "${POLICY_CA_NAME}" \
        --dn            "${POLICY_CA_DN}" \
        --tokentype     soft \
        --keytype       "${POLICY_CA_KEY_ALGO}" \
        --keyspec       "${POLICY_CA_KEY_SIZE}" \
        --signalg       "${POLICY_CA_SIGN_ALGO}" \
        --validity      "${POLICY_CA_VALIDITY_DAYS}" \
        --policy        "null" \
        -certprofile    SUBCA \
        --signedby      "${ROOT_CA_NAME}"

    log_success "Policy CA '${POLICY_CA_NAME}' created and signed by '${ROOT_CA_NAME}'."
fi

# --- Export Policy CA certificate ---
CERT_OUT_DIR="${SCRIPT_DIR}/../../pki/output"
mkdir -p "${CERT_OUT_DIR}"
export_ca_cert "${POLICY_CA_NAME}" "${CERT_OUT_DIR}/policy-ca.pem"
log_info "Policy CA certificate saved to: pki/output/policy-ca.pem"

# --- Build certificate chain ---
cat "${CERT_OUT_DIR}/policy-ca.pem" "${CERT_OUT_DIR}/root-ca.pem" \
    > "${CERT_OUT_DIR}/chain-policy-to-root.pem"
log_info "Chain saved to: pki/output/chain-policy-to-root.pem"

# --- Generate initial CRL for Policy CA ---
create_crl "${POLICY_CA_NAME}"

# --- Set Root CA offline ---
log_step "Setting Root CA '${ROOT_CA_NAME}' to OFFLINE (no longer issues certs directly)..."
ejbca_exec ca editca \
    --caname "${ROOT_CA_NAME}" \
    --field  "status" \
    --value  "STATUS_OFFLINE" 2>/dev/null || \
    log_warn "Could not set Root CA offline via CLI — do this manually in Admin UI → CA Functions."

log_success "=== Policy CA initialization complete ==="
log_info "Next step: run 03-init-issuing-cas.sh"
