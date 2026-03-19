const express = require('express');
const router = express.Router();
const mockDevices = require('../mock/iotDevices');
const mockPolicies = require('../mock/clmPolicies');
const mockCAs = require('../mock/cas');

// ── CLM Policies ───────────────────────────────────────────────────────────

// GET /api/clm/policies
router.get('/policies', (req, res) => {
  res.json({ policies: mockPolicies, total: mockPolicies.length, source: 'mock' });
});

// GET /api/clm/policies/:id
router.get('/policies/:id', (req, res) => {
  const policy = mockPolicies.find(p => p.id === req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json({ ...policy, source: 'mock' });
});

// ── CLM Status Overview ────────────────────────────────────────────────────
// Computes per-device cert health based on CRL/OCSP state and CLM policy

function computeClmStatus(device) {
  const now = Date.now();
  const policy = mockPolicies.find(p => p.id === device.clm_policy_id);

  // No cert yet (provisioning)
  if (!device.certificate_serial) {
    return { action_needed: 'ENROLL', priority: 'HIGH', reason: 'Device not yet enrolled' };
  }

  // Expired cert
  if (device.cert_status === 'EXPIRED') {
    return {
      action_needed: 'RENEW',
      priority: 'CRITICAL',
      reason: 'Certificate expired',
      crl_checked: true,
      ocsp_checked: policy?.revocation_check !== 'CRL',
    };
  }

  // Revoked cert
  if (device.cert_status === 'REVOKED') {
    return {
      action_needed: 'REISSUE',
      priority: 'CRITICAL',
      reason: 'Certificate revoked',
      crl_checked: true,
      ocsp_checked: policy?.revocation_check !== 'CRL',
    };
  }

  // Offline device handling
  if (device.status === 'OFFLINE' && policy) {
    const offlineDays = Math.floor((now - new Date(device.last_seen).getTime()) / 86400000);
    if (offlineDays > policy.offline_tolerance_days) {
      return {
        action_needed: policy.offline_action,
        priority: 'HIGH',
        reason: `Device offline for ${offlineDays}d (tolerance: ${policy.offline_tolerance_days}d)`,
        offline_days: offlineDays,
        crl_checked: false,
        ocsp_checked: false,
      };
    }
    if (device.cert_status === 'EXPIRING_SOON') {
      return {
        action_needed: 'QUEUE_RENEWAL',
        priority: 'MEDIUM',
        reason: 'Cert expiring soon but device offline — queued for renewal on reconnect',
        offline_days: offlineDays,
        crl_checked: false,
        ocsp_checked: false,
      };
    }
    return {
      action_needed: 'MONITOR',
      priority: 'LOW',
      reason: `Device offline ${offlineDays}d — within tolerance`,
      offline_days: offlineDays,
      crl_checked: false,
      ocsp_checked: false,
    };
  }

  // Expiring soon
  if (device.cert_status === 'EXPIRING_SOON') {
    return {
      action_needed: policy?.auto_renew ? 'AUTO_RENEW' : 'RENEW',
      priority: 'MEDIUM',
      reason: `Certificate expiring soon — auto-renew via ${policy?.renewal_protocol || 'EST'}`,
      crl_checked: true,
      ocsp_checked: policy?.revocation_check !== 'CRL',
    };
  }

  return {
    action_needed: 'NONE',
    priority: 'OK',
    reason: 'Certificate valid, revocation checks passed',
    crl_checked: policy?.revocation_check !== 'OCSP',
    ocsp_checked: policy?.revocation_check !== 'CRL',
  };
}

// GET /api/clm/status — full CLM status for all devices
router.get('/status', (req, res) => {
  const statuses = mockDevices.map(device => ({
    device_id: device.device_id,
    name: device.name,
    type: device.type,
    status: device.status,
    cert_status: device.cert_status,
    cert_expiry: device.cert_expiry,
    ca_name: device.ca_name,
    clm_policy_id: device.clm_policy_id,
    hsm_backed: device.hsm_backed,
    last_seen: device.last_seen,
    clm: computeClmStatus(device),
  }));

  const summary = {
    total: statuses.length,
    ok: statuses.filter(s => s.clm.priority === 'OK').length,
    critical: statuses.filter(s => s.clm.priority === 'CRITICAL').length,
    high: statuses.filter(s => s.clm.priority === 'HIGH').length,
    medium: statuses.filter(s => s.clm.priority === 'MEDIUM').length,
    low: statuses.filter(s => s.clm.priority === 'LOW').length,
    pending_renewal: statuses.filter(s =>
      ['AUTO_RENEW', 'RENEW', 'QUEUE_RENEWAL'].includes(s.clm.action_needed)
    ).length,
    offline_devices: statuses.filter(s => s.status === 'OFFLINE').length,
  };

  res.json({ summary, statuses, source: 'mock', checked_at: new Date().toISOString() });
});

// GET /api/clm/status/:device_id — CLM status for a single device
router.get('/status/:device_id', (req, res) => {
  const device = mockDevices.find(d => d.device_id === req.params.device_id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({
    device_id: device.device_id,
    clm: computeClmStatus(device),
    source: 'mock',
    checked_at: new Date().toISOString(),
  });
});

// POST /api/clm/renew/:device_id — trigger manual renewal
router.post('/renew/:device_id', (req, res) => {
  const device = mockDevices.find(d => d.device_id === req.params.device_id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({
    queued: true,
    device_id: device.device_id,
    renewal_protocol: mockPolicies.find(p => p.id === device.clm_policy_id)?.renewal_protocol || 'EST',
    estimated_completion: new Date(Date.now() + 60000).toISOString(),
    source: 'mock',
  });
});

module.exports = router;
