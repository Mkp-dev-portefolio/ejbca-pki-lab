const axios = require('axios');
const https = require('https');
const fs = require('fs');
const config = require('./config');

let ejbcaClient = null;

function getClient() {
  if (ejbcaClient) return ejbcaClient;

  const httpsAgent = new https.Agent({
    rejectUnauthorized: config.rejectUnauthorized,
    ...(config.clientCert && {
      cert: fs.readFileSync(config.clientCert),
      key: fs.readFileSync(config.clientKey),
    }),
  });

  ejbcaClient = axios.create({
    baseURL: config.ejbcaUrl,
    httpsAgent,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  return ejbcaClient;
}

module.exports = { getClient };
