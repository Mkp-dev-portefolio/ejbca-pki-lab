module.exports = {
  port: process.env.PORT || 3001,
  ejbcaUrl: process.env.EJBCA_URL || 'https://localhost:8443',
  useMock: process.env.USE_MOCK !== 'false',
  // Path to PEM client cert + key for EJBCA TLS auth (optional)
  clientCert: process.env.EJBCA_CLIENT_CERT || null,
  clientKey: process.env.EJBCA_CLIENT_KEY || null,
  // Skip TLS verification for self-signed EJBCA certs in dev
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
};
