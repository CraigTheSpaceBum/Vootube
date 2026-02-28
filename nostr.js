#!/usr/bin/env node
/**
 * scripts/generate-keys.js
 * Generates a fresh Nostr keypair. Run: npm run keys
 */
'use strict';

require('dotenv').config();
const { WebSocket } = require('ws');
global.WebSocket = WebSocket;

const { generateSecretKey, getPublicKey } = require('nostr-tools');
const { bytesToHex } = require('@noble/hashes/utils');
const nip19 = (() => {
  try { return require('nostr-tools/nip19'); }
  catch { return require('nostr-tools').nip19; }
})();

const privBytes = generateSecretKey();
const privHex   = bytesToHex(privBytes);
const pubHex    = getPublicKey(privBytes);
const nsec      = nip19.nsecEncode(privBytes);
const npub      = nip19.npubEncode(pubHex);

console.log(`
╔══════════════════════════════════════════════════════╗
║         NostrFlux — New Keypair Generated            ║
╚══════════════════════════════════════════════════════╝

Paste these into your .env file:

  NOSTR_PRIVATE_KEY=${privHex}
  NOSTR_PUBLIC_KEY=${pubHex}

Human-readable (for wallets and other clients):
  nsec: ${nsec}
  npub: ${npub}

⚠  Keep your private key secret.
   Never commit it to git or share it with anyone.
`);
