const express = require('express');
const { getClient } = require('../ejbcaClient');
const mockEEs = require('../mock/endentities');
const config = require('../config');

const router = express.Router();

// List end entities
router.get('/', async (req, res) => {
  if (config.useMock) {
    let results = [...mockEEs];
    if (req.query.status) {
      results = results.filter(e => e.status === req.query.status.toUpperCase());
    }
    if (req.query.ca_name) {
      results = results.filter(e => e.ca_name === req.query.ca_name);
    }
    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      results = results.filter(
        e => e.username.toLowerCase().includes(q) || e.subject_dn.toLowerCase().includes(q)
      );
    }
    return res.json({ end_entities: results, total: results.length, source: 'mock' });
  }
  try {
    const client = getClient();
    const response = await client.get('/ejbca/ejbca-rest-api/v1/endentity', {
      params: req.query,
    });
    res.json({ end_entities: response.data || [], source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Get single end entity
router.get('/:username', async (req, res) => {
  if (config.useMock) {
    const ee = mockEEs.find(e => e.username === req.params.username);
    if (!ee) return res.status(404).json({ error: 'End entity not found' });
    return res.json({ ...ee, source: 'mock' });
  }
  try {
    const client = getClient();
    const response = await client.get(
      `/ejbca/ejbca-rest-api/v1/endentity/${encodeURIComponent(req.params.username)}`
    );
    res.json({ ...response.data, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Create end entity
router.post('/', async (req, res) => {
  if (config.useMock) {
    const newEE = {
      ...req.body,
      status: 'NEW',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
    mockEEs.push(newEE);
    return res.status(201).json({ ...newEE, source: 'mock' });
  }
  try {
    const client = getClient();
    await client.post('/ejbca/ejbca-rest-api/v1/endentity', req.body);
    res.status(201).json({ username: req.body.username, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Update end entity
router.put('/:username', async (req, res) => {
  if (config.useMock) {
    const idx = mockEEs.findIndex(e => e.username === req.params.username);
    if (idx === -1) return res.status(404).json({ error: 'End entity not found' });
    mockEEs[idx] = { ...mockEEs[idx], ...req.body, modified: new Date().toISOString() };
    return res.json({ ...mockEEs[idx], source: 'mock' });
  }
  try {
    const client = getClient();
    await client.put(
      `/ejbca/ejbca-rest-api/v1/endentity/${encodeURIComponent(req.params.username)}`,
      req.body
    );
    res.json({ username: req.params.username, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Delete end entity
router.delete('/:username', async (req, res) => {
  if (config.useMock) {
    const idx = mockEEs.findIndex(e => e.username === req.params.username);
    if (idx === -1) return res.status(404).json({ error: 'End entity not found' });
    mockEEs.splice(idx, 1);
    return res.json({ deleted: true, username: req.params.username, source: 'mock' });
  }
  try {
    const client = getClient();
    await client.delete(
      `/ejbca/ejbca-rest-api/v1/endentity/${encodeURIComponent(req.params.username)}`
    );
    res.json({ deleted: true, username: req.params.username, source: 'ejbca' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
