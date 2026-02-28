/**
 * server.js — NostrFlux API server
 *
 * This server is a Nostr CLIENT only.
 * It does not host, ingest, relay, or proxy any video streams.
 *
 * What it does:
 *  - Publishes NIP-53 kind:30311 events to Nostr relays
 *  - Fetches/discovers streams published on Nostr
 *  - Forwards real-time relay events (chat, zaps) to browsers via SSE
 *  - Serves NIP-05 identity verification at /.well-known/nostr.json
 *  - Handles NIP-57 zap invoice generation
 */
'use strict';

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { logger } = require('./utils/logger');
const { relayPool } = require('./nostr/relay-pool');
const fs         = require('fs');

// Ensure logs dir exists
fs.mkdirSync('logs', { recursive: true });

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error('CORS blocked'))),
  credentials: true,
}));

// ── Rate limit ────────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            parseInt(process.env.RATE_LIMIT || '300'),
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Too many requests. Please slow down.' },
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/streams', require('./routes/streams'));
app.use('/api/nostr',   require('./routes/nostr'));
app.use('/.well-known', require('./routes/nip05'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status:    'ok',
  relays:    relayPool.getConnectedCount(),
  pubkey:    relayPool.getPublicKey(),
  uptime:    Math.floor(process.uptime()),
  version:   '2.0.0',
  streaming: 'client-only — video hosted externally by users',
}));

// ── 404 / Error ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function main() {
  logger.info('NostrFlux starting — client-only mode (no video hosting)');

  await relayPool.connect();
  logger.info(`Relay pool ready: ${relayPool.getConnectedCount()} / ${relayPool.getRelayUrls().length} reachable`);

  app.listen(PORT, '127.0.0.1', () => {
    logger.info(`API listening on 127.0.0.1:${PORT}`);
    logger.info(`Domain: ${process.env.DOMAIN || 'localhost'}`);
    logger.info(`NIP-05: ${process.env.DOMAIN}/.well-known/nostr.json`);
  });
}

main().catch(err => { logger.error(err, 'Fatal error'); process.exit(1); });

module.exports = app;
