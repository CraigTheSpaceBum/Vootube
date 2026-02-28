#!/usr/bin/env node
/**
 * scripts/test-relays.js
 * Tests relay connections and does a round-trip publish + query.
 * Run: npm run test:relays
 */
'use strict';

require('dotenv').config();
const { WebSocket } = require('ws');
global.WebSocket = WebSocket;

const { relayPool } = require('../src/nostr/relay-pool');

async function main() {
  console.log('\n⚡ NostrFlux — Relay Connection Test\n');
  console.log('Relays configured:');
  const urls = (process.env.NOSTR_RELAYS || '').split(',').map(s => s.trim());
  urls.forEach(u => console.log(`  ${u}`));
  console.log();

  const count = await relayPool.connect();
  console.log(`✓ Reachable: ${count} / ${urls.length}\n`);

  if (!process.env.NOSTR_PRIVATE_KEY || process.env.NOSTR_PRIVATE_KEY === 'your_hex_private_key_here') {
    console.log('⚠  No private key configured — skipping publish test.');
    console.log('   Run: npm run keys   then add the keys to .env\n');
    process.exit(0);
  }

  console.log('Publishing test kind:1 note...');
  const { event, ok, err } = await relayPool.publish({
    kind:    1,
    content: `NostrFlux relay test — ${new Date().toISOString()} ⚡ #nostrflux`,
    tags:    [['t', 'nostrflux']],
  });
  console.log(`✓ Published to ${ok} relay(s) — ${err} failed`);
  console.log(`  Event ID: ${event.id}\n`);

  console.log('Querying event back...');
  const found = await relayPool.query({ ids: [event.id] }, 5000);
  if (found.length) {
    console.log(`✓ Found on ${found.length} relay(s) — full round-trip OK\n`);
  } else {
    console.log('⚠  Not found yet — relay propagation may be slow. Try again in a moment.\n');
  }

  process.exit(0);
}

main().catch(err => { console.error('✗ Error:', err.message); process.exit(1); });
