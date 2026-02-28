{
  "name": "nostrflux-backend",
  "version": "2.0.0",
  "description": "NostrFlux — Nostr-native live stream discovery client. No hosting. Just Nostr.",
  "main": "src/server.js",
  "scripts": {
    "start":        "node src/server.js",
    "dev":          "nodemon src/server.js",
    "keys":         "node scripts/generate-keys.js",
    "test:relays":  "node scripts/test-relays.js"
  },
  "dependencies": {
    "nostr-tools":          "^2.7.0",
    "ws":                   "^8.16.0",
    "express":              "^4.18.2",
    "cors":                 "^2.8.5",
    "helmet":               "^7.1.0",
    "express-rate-limit":   "^7.1.5",
    "dotenv":               "^16.3.1",
    "axios":                "^1.6.7",
    "winston":              "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  },
  "engines": { "node": ">=18.0.0" }
}
