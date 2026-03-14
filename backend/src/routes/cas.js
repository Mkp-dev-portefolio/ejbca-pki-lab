const express = require('express');
const { getClient } = require('../ejbcaClient');
const mockCAs = require('../mock/cas');
const config = require('../config');

const router = express.Router();

router.get('/', async (req, res) => {
  if (config.useMock) {
    return res.json({ cas: mockCAs, source: 'mock' });
  }
  try {
    const client = getClient();
    const response = await client.get('/ejbca/ejbca-rest-api/v1/ca');
    res.json({ cas: response.data.certificate_authorities || [], source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/:name/crl', async (req, res) => {
  if (config.useMock) {
    const ca = mockCAs.find(c => c.name === req.params.name);
    if (!ca) return res.status(404).json({ error: 'CA not found' });
    // Return mock CRL metadata (not real DER bytes in mock mode)
    return res.json({
      ca_name: ca.name,
      crl_last_update: ca.crl_last_update,
      crl_next_update: ca.crl_next_update,
      source: 'mock',
    });
  }
  try {
    const client = getClient();
    const response = await client.get(
      `/ejbca/ejbca-rest-api/v1/ca/${encodeURIComponent(req.params.name)}/getcrl`,
      { params: { deltacrl: false, crlpartitionindex: 0 } }
    );
    res.json({ ...response.data, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
