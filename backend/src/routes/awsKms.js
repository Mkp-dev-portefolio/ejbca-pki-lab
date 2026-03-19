const express = require('express');
const router = express.Router();
const mockKms = require('../mock/awsKms');

// GET /api/aws/kms — full KMS/HSM config overview
router.get('/kms', (req, res) => {
  res.json({ ...mockKms, source: 'mock' });
});

// GET /api/aws/kms/keys — list KMS keys
router.get('/kms/keys', (req, res) => {
  let keys = mockKms.kms_keys;
  const { origin, key_usage } = req.query;
  if (origin) keys = keys.filter(k => k.origin === origin);
  if (key_usage) keys = keys.filter(k => k.key_usage === key_usage);
  res.json({ keys, total: keys.length, source: 'mock' });
});

// GET /api/aws/kms/keys/:key_id — single KMS key
router.get('/kms/keys/:key_id', (req, res) => {
  const key = mockKms.kms_keys.find(k => k.key_id === req.params.key_id);
  if (!key) return res.status(404).json({ error: 'Key not found' });
  res.json({ ...key, source: 'mock' });
});

// GET /api/aws/hsm — CloudHSM cluster info
router.get('/hsm', (req, res) => {
  res.json({
    clusters: mockKms.hsm_clusters,
    total: mockKms.hsm_clusters.length,
    source: 'mock',
  });
});

module.exports = router;
