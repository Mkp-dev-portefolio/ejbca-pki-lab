const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

const healthRoutes = require('./routes/health');
const casRoutes = require('./routes/cas');
const certRoutes = require('./routes/certificates');
const eeRoutes = require('./routes/endentities');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/cas', casRoutes);
app.use('/api/certificates', certRoutes);
app.use('/api/endentities', eeRoutes);

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'EJBCA PKI Management UI — Backend Proxy',
    version: '1.0.0',
    mock_mode: config.useMock,
    ejbca_url: config.useMock ? null : config.ejbcaUrl,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(config.port, () => {
  console.log(`EJBCA UI Backend running on port ${config.port}`);
  console.log(`Mode: ${config.useMock ? 'MOCK' : 'LIVE'}`);
  if (!config.useMock) console.log(`EJBCA URL: ${config.ejbcaUrl}`);
});
