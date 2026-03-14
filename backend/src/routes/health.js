const express = require('express');
const { getClient } = require('../ejbcaClient');
const config = require('../config');

const router = express.Router();

router.get('/', async (req, res) => {
  if (config.useMock) {
    return res.json({ status: 'OK', source: 'mock', timestamp: new Date().toISOString() });
  }
  try {
    const client = getClient();
    const response = await client.get('/ejbca/publicweb/healthcheck/ejbcahealth');
    const statusText = response.data;
    res.json({
      status: statusText.trim() === 'OK' ? 'OK' : 'ERROR',
      detail: statusText,
      source: 'ejbca',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(502).json({
      status: 'UNREACHABLE',
      detail: err.message,
      source: 'ejbca',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/vas', async (req, res) => {
  if (config.useMock) {
    return res.json({
      source: 'mock',
      timestamp: new Date().toISOString(),
      vas: [
        { name: 'VA-1', sync: true, error: false },
        { name: 'VA-2', sync: true, error: false },
      ],
    });
  }
  try {
    const client = getClient();
    const response = await client.get('/ejbca/publicweb/healthcheck/vastatus');
    res.json({ ...response.data, source: 'ejbca', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ error: err.message, timestamp: new Date().toISOString() });
  }
});

module.exports = router;
