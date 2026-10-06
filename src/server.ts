import 'dotenv/config';
import { createServer } from 'node:http';
import { integrationStatus } from './config.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'GET' && request.url === '/health') {
    response.end(JSON.stringify({ status: 'ok', service: 'deliveryproof',
      integrationsConfigured: integrationStatus(process.env),
      note: 'Configuration presence only; no external connectivity checks.' }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: 'Not found' }));
});
server.listen(port, '0.0.0.0', () => console.log(`DeliveryProof service listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  server.close(() => process.exit(0));
});
