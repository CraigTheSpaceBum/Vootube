/**
 * utils/sse.js — Server-Sent Events
 *
 * Bridges Nostr relay subscriptions to browser EventSource connections.
 * When a viewer opens /api/streams/:d/events, we subscribe on their behalf
 * to the relevant Nostr relay filters and forward events as SSE.
 *
 * This means the Node server acts as a relay proxy — browsers that can't
 * maintain persistent WebSocket connections to relays (e.g. behind strict
 * firewalls) still get live events through a plain HTTPS connection.
 */
'use strict';

const { logger } = require('./logger');

// streamId → Set<res>
const clients = new Map();

function sseConnect(req, res, streamId) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Heartbeat keeps the connection alive through proxies / load balancers
  const hb = setInterval(() => res.write(': ping\n\n'), 25_000);

  if (!clients.has(streamId)) clients.set(streamId, new Set());
  clients.get(streamId).add(res);
  logger.debug({ streamId, viewers: clients.get(streamId).size }, 'SSE connected');

  req.on('close', () => {
    clearInterval(hb);
    clients.get(streamId)?.delete(res);
    if (!clients.get(streamId)?.size) clients.delete(streamId);
    logger.debug({ streamId }, 'SSE disconnected');
  });
}

function sseBroadcast(streamId, type, data) {
  const group = clients.get(streamId);
  if (!group?.size) return;
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  group.forEach(res => { try { res.write(payload); } catch (_) {} });
}

function sseViewerCount(streamId) {
  return clients.get(streamId)?.size ?? 0;
}

module.exports = { sseConnect, sseBroadcast, sseViewerCount };
