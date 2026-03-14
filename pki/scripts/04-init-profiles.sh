#!/usr/bin/env bash
# =============================================================================
# 04-init-profiles.sh
# Import certificate profiles and end-entity profiles into EJBCA
#
# Profiles are stored as XML in pki/profiles/ and imported via REST API
# This script is idempotent — safe to run multiple times
#
# Usage: ./04-init-profiles.sh [profile_set]
#   profile_set: enterprise | iot | devops | all (default: value of CLIENT_PROFILE)
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

ENV_FILE="${SCRIPT_DIR}/../../docker/.env"
[[ -f "${ENV_FILE}" ]] && source "${ENV_FILE}" || true

PROFILE_SET="${1:-${CLIENT_PROFILE:-enterprise}}"
PROFILES_DIR="${SCRIPT_DIR}/../profiles"
EJBCA_BASE_URL="${EJBCA_BASE_URL:-https://localhost:8443}"

print_banner
log_step "Loading certificate profiles — set: ${PROFILE_SET}"
wait_for_ejbca

# =============================================================================
# Import via EJBCA REST API
# Endpoint: POST /ejbca/ejbca-rest-api/v1/certificate/importprofile
# =============================================================================
import_cert_profile() {
    local profile_name="$1"
    local profile_file="$2"

    if [[ ! -f "${profile_file}" ]]; then
        log_warn "Profile file not found: ${profile_file} — skipping"
        return
    fi

    log_info "Importing cert profile: ${profile_name}"

    # Copy profile XML into container and import via ejbca CLI
    docker cp "${profile_file}" "${EJBCA_CONTAINER}:/tmp/profile_import.xml"
    ejbca_exec profiles importcertprofile \
        -d /tmp/profile_import.xml \
        --name "${profile_name}" 2>/dev/null || \
        log_warn "Profile '${profile_name}' may already exist (OK if idempotent run)"
}

import_ee_profile() {
    local profile_name="$1"
    local profile_file="$2"

    if [[ ! -f "${profile_file}" ]]; then
        log_warn "EE profile file not found: ${profile_file} — skipping"
        return
    fi

    log_info "Importing end-entity profile: ${profile_name}"
    docker cp "${profile_file}" "${EJBCA_CONTAINER}:/tmp/ee_profile_import.xml"
    ejbca_exec profiles importeeprofile \
        -d /tmp/ee_profile_import.xml \
        --name "${profile_name}" 2>/dev/null || \
        log_warn "EE profile '${profile_name}' may already exist"
}

# =============================================================================
# Load profiles by segment
# =============================================================================
load_enterprise_profiles() {
    log_step "Loading Enterprise TLS/mTLS profiles..."
    import_cert_profile "TLS-Server-2yr"   "${PROFILES_DIR}/enterprise-tls/cert-profile-server.xml"
    import_cert_profile "TLS-Client-mTLS"  "${PROFILES_DIR}/enterprise-tls/cert-profile-client.xml"
    import_ee_profile   "EE-TLS-Server"    "${PROFILES_DIR}/enterprise-tls/ee-profile-server.xml"
    import_ee_profile   "EE-TLS-Client"    "${PROFILES_DIR}/enterprise-tls/ee-profile-client.xml"
    log_success "Enterprise profiles loaded."
}

load_iot_profiles() {
    log_step "Loading IoT Device Identity profiles..."
    import_cert_profile "IoT-Device-5yr"   "${PROFILES_DIR}/iot-device/cert-profile-device.xml"
    import_ee_profile   "EE-IoT-Device"    "${PROFILES_DIR}/iot-device/ee-profile-device.xml"
    log_success "IoT profiles loaded."
}

load_devops_profiles() {
    log_step "Loading DevOps short-lived profiles..."
    import_cert_profile "DevOps-ShortLived-1d"  "${PROFILES_DIR}/devops-short-lived/cert-profile-devops.xml"
    import_ee_profile   "EE-DevOps"             "${PROFILES_DIR}/devops-short-lived/ee-profile-devops.xml"
    log_success "DevOps profiles loaded."
}

# Route by profile set
case "${PROFILE_SET}" in
    enterprise) load_enterprise_profiles ;;
    iot)        load_iot_profiles ;;
    devops)     load_devops_profiles ;;
    all)
        load_enterprise_profiles
        load_iot_profiles
        load_devops_profiles
        ;;
    *)
        log_error "Unknown profile set: ${PROFILE_SET}. Use: enterprise | iot | devops | all"
        exit 1
        ;;
esac

log_success "=== Profile initialization complete ==="
