const express = require('express');
const router = express.Router();
const config = require('../config');
const mockDevices = require('../mock/iotDevices');
const mockProtocols = require('../mock/iotProtocols');

// In-memory store for mock mutations
let devices = JSON.parse(JSON.stringify(mockDevices));

// ── Devices ────────────────────────────────────────────────────────────────

// GET /api/iot/devices
router.get('/devices', (req, res) => {
  let result = [...devices];
  const { status, protocol, type, ca_name, clm_policy_id } = req.query;
  if (status) result = result.filter(d => d.status === status);
  if (protocol) result = result.filter(d => d.protocol === protocol);
  if (type) result = result.filter(d => d.type === type);
  if (ca_name) result = result.filter(d => d.ca_name === ca_name);
  if (clm_policy_id) result = result.filter(d => d.clm_policy_id === clm_policy_id);
  res.json({ devices: result, total: result.length, source: 'mock' });
});

// GET /api/iot/devices/:device_id
router.get('/devices/:device_id', (req, res) => {
  const device = devices.find(d => d.device_id === req.params.device_id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ ...device, source: 'mock' });
});

// POST /api/iot/devices
router.post('/devices', (req, res) => {
  const body = req.body;
  if (!body.device_id || !body.name || !body.protocol) {
    return res.status(400).json({ error: 'device_id, name, and protocol are required' });
  }
  if (devices.find(d => d.device_id === body.device_id)) {
    return res.status(409).json({ error: 'Device ID already exists' });
  }
  const now = new Date().toISOString();
  const device = {
    status: 'PROVISIONING',
    cert_status: null,
    certificate_serial: null,
    cert_expiry: null,
    last_seen: now,
    hsm_backed: false,
    kms_key_id: null,
    tags: [],
    ...body,
  };
  devices.push(device);
  res.status(201).json({ ...device, source: 'mock' });
});

// PUT /api/iot/devices/:device_id
router.put('/devices/:device_id', (req, res) => {
  const idx = devices.findIndex(d => d.device_id === req.params.device_id);
  if (idx === -1) return res.status(404).json({ error: 'Device not found' });
  devices[idx] = { ...devices[idx], ...req.body };
  res.json({ ...devices[idx], source: 'mock' });
});

// DELETE /api/iot/devices/:device_id
router.delete('/devices/:device_id', (req, res) => {
  const idx = devices.findIndex(d => d.device_id === req.params.device_id);
  if (idx === -1) return res.status(404).json({ error: 'Device not found' });
  devices.splice(idx, 1);
  res.json({ deleted: true, device_id: req.params.device_id, source: 'mock' });
});

// ── Protocols ──────────────────────────────────────────────────────────────

// GET /api/iot/protocols
router.get('/protocols', (req, res) => {
  res.json({ protocols: mockProtocols, total: mockProtocols.length, source: 'mock' });
});

// GET /api/iot/protocols/:id
router.get('/protocols/:id', (req, res) => {
  const proto = mockProtocols.find(p => p.id === req.params.id);
  if (!proto) return res.status(404).json({ error: 'Protocol not found' });
  res.json({ ...proto, source: 'mock' });
});

module.exports = router;
