const express = require('express');
const { getClient } = require('../ejbcaClient');
const mockCerts = require('../mock/certificates');
const config = require('../config');

const router = express.Router();

// Search certificates
router.get('/search', async (req, res) => {
  if (config.useMock) {
    let results = [...mockCerts];
    const { status, ca_name, username, serial } = req.query;
    if (status) results = results.filter(c => c.status === status.toUpperCase());
    if (ca_name) results = results.filter(c => c.ca_name === ca_name);
    if (username) results = results.filter(c => c.username.includes(username));
    if (serial) results = results.filter(c => c.serial_number.includes(serial.toUpperCase()));
    return res.json({ certificates: results, total: results.length, source: 'mock' });
  }
  try {
    const client = getClient();
    const response = await client.post('/ejbca/ejbca-rest-api/v2/certificate/search', {
      pagination: { page_size: 50 },
      criteria: buildSearchCriteria(req.query),
    });
    res.json({ certificates: response.data.certificates || [], source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Enroll certificate via PKCS#10 CSR
router.post('/enroll', async (req, res) => {
  const { csr, ca_name, certificate_profile, end_entity_profile, username, password } = req.body;
  if (config.useMock) {
    return res.json({
      serial_number: Math.random().toString(16).slice(2, 18).toUpperCase(),
      ca_name,
      certificate:
        '-----BEGIN CERTIFICATE-----\nMIICmTCCAYECFBvK...MOCK_CERT...AQsFAAAwETEP\n-----END CERTIFICATE-----',
      certificate_chain: [],
      source: 'mock',
    });
  }
  try {
    const client = getClient();
    const response = await client.post('/ejbca/ejbca-rest-api/v1/certificate/pkcs10enroll', {
      certificate_request: csr,
      certificate_profile_name: certificate_profile,
      end_entity_profile_name: end_entity_profile,
      certificate_authority_name: ca_name,
      username,
      password,
      include_chain: true,
    });
    res.json({ ...response.data, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Revoke certificate
router.put('/revoke', async (req, res) => {
  const { issuer_dn, serial_number, reason, date } = req.body;
  if (config.useMock) {
    const cert = mockCerts.find(c => c.serial_number === serial_number);
    if (cert) {
      cert.status = 'REVOKED';
      cert.revocation_date = new Date().toISOString();
      cert.revocation_reason = reason;
    }
    return res.json({ revoked: true, serial_number, reason, source: 'mock' });
  }
  try {
    const client = getClient();
    const issuerEncoded = encodeURIComponent(issuer_dn);
    await client.put(
      `/ejbca/ejbca-rest-api/v1/certificate/${issuerEncoded}/${serial_number}/revoke`,
      null,
      { params: { reason, date: date || new Date().toISOString() } }
    );
    res.json({ revoked: true, serial_number, reason, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Revocation status for a single certificate
router.get('/:issuer_dn/:serial/revocationstatus', async (req, res) => {
  if (config.useMock) {
    const cert = mockCerts.find(c => c.serial_number === req.params.serial);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    return res.json({
      serial_number: cert.serial_number,
      status: cert.status,
      revocation_reason: cert.revocation_reason,
      revocation_date: cert.revocation_date,
      source: 'mock',
    });
  }
  try {
    const client = getClient();
    const response = await client.get(
      `/ejbca/ejbca-rest-api/v1/certificate/${encodeURIComponent(req.params.issuer_dn)}/${req.params.serial}/revocationstatus`
    );
    res.json({ ...response.data, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

function buildSearchCriteria(query) {
  const criteria = [];
  if (query.status) criteria.push({ property: 'STATUS', value: query.status, operation: 'EQUAL' });
  if (query.username) criteria.push({ property: 'USERNAME', value: query.username, operation: 'LIKE' });
  return criteria;
}

module.exports = router;
