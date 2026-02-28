# ⚡ NostrFlux

**Decentralized live streaming discovery on Nostr.**

NostrFlux is an open-source Nostr client for live streaming. It lets streamers publish [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) events pointing to their own streaming server (Owncast, nginx-rtmp, Cloudflare Stream, Peertube Live, etc.) and lets viewers discover and watch those streams — all without any central platform.

**NostrFlux does not host video.** Streamers bring their own server. NostrFlux only publishes and discovers Nostr events.

---

## Screenshots

> UI prototype — `frontend/index.html`

**Home / Discovery**
- Featured stream carousel with random discovery arrows
- Live Now grid, category filter strip, following sidebar

**Stream Page**
- Embedded video player (loads from streamer's own URL)
- Live chat (NIP-53 kind:1311), zap events (NIP-57 kind:9735)
- NIP-05 verified badges, hover actions on chat messages

**Profile Page**
- Twitter/Primal-style layout — banner, avatar, bio
- Feed / Videos / Gallery tabs
- Zap, Follow, Share, Report buttons

---

## Architecture

```
Your streaming server           NostrFlux                 Viewers
(Owncast / nginx-rtmp /  ──→  Publishes NIP-53  ──→  Discover & watch
 Cloudflare / Peertube)        kind:30311 event       stream directly
                                  on relays            from your URL
```

NostrFlux **never** ingests, stores, or proxies video.

---

## Repository structure

```
nostrflux/
├── frontend/
│   └── index.html          ← Full UI (single HTML file, no build step)
│
├── backend/
│   ├── src/
│   │   ├── server.js       ← Express API entry point
│   │   ├── nostr/
│   │   │   ├── relay-pool.js   ← WebSocket relay connection manager
│   │   │   ├── nip53.js        ← kind:30311 publish / fetch / parse
│   │   │   ├── nip57.js        ← Lightning zap invoices (NIP-57)
│   │   │   └── profiles.js     ← kind:0 profiles + NIP-05 verify
│   │   ├── routes/
│   │   │   ├── streams.js      ← /api/streams — publish, watch, zap
│   │   │   ├── nostr.js        ← /api/nostr  — profiles, feed, chat
│   │   │   └── nip05.js        ← /.well-known/nostr.json
│   │   └── utils/
│   │       ├── sse.js          ← Server-Sent Events broadcaster
│   │       └── logger.js       ← Winston structured logging
│   ├── config/
│   │   └── nginx.conf          ← Reverse proxy config (no RTMP)
│   ├── systemd/
│   │   └── nostrflux.service   ← systemd unit file
│   ├── scripts/
│   │   ├── setup.sh            ← One-command VPS installer
│   │   ├── generate-keys.js    ← Nostr keypair generator
│   │   └── test-relays.js      ← Relay connection tester
│   ├── package.json
│   ├── .env.example
│   └── README.md               ← Full backend + API docs
│
├── .gitignore
├── LICENSE
└── README.md                   ← This file
```

---

## Supported NIPs

| NIP | Kind | What it does |
|-----|------|---|
| [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | 0, 1 | Profiles and text notes |
| [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) | — | DNS identity verification (`you@yourdomain.com`) |
| [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) | — | Browser extension signing (Alby, nos2x, Amber) |
| [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md) | 7 | Reactions / likes |
| [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) | — | Remote signing / hardware signers |
| [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) | 30311, 1311 | Live streaming events + chat |
| [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) | 9734, 9735 | Lightning Zaps |
| [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) | 10002 | Relay list metadata |

---

## Streaming backends users can bring

| Software | Setup difficulty | Cost |
|---|---|---|
| [Owncast](https://owncast.online) | Easy — single binary | Free, self-hosted |
| nginx-rtmp | Medium — VPS config | ~$5/mo VPS |
| [Cloudflare Stream](https://developers.cloudflare.com/stream/) | Easy | Free tier available |
| [Peertube Live](https://joinpeertube.org) | Medium | Free, self-hosted |
| [Restreamer](https://datarhei.com/restreamer) | Easy | Free, self-hosted |

---

## Deploy the backend

See **[backend/README.md](backend/README.md)** for the full guide.

**Quick start on a VPS (Ubuntu 22.04/24.04):**

```bash
git clone https://github.com/YOUR_USERNAME/nostrflux
sudo bash nostrflux/backend/scripts/setup.sh stream.yourdomain.com you@email.com
```

That script installs Node.js 20, plain nginx, certbot (SSL), creates a system user, generates your Nostr keypair, and starts the service.

**No RTMP port is opened. No streaming server is installed.**

---

## Run locally (development)

```bash
# Backend
cd backend
cp .env.example .env        # fill in your keys + relays
npm install
npm run keys                # generate a Nostr keypair → paste into .env
npm run dev                 # starts on http://localhost:3000

# Frontend
# Open frontend/index.html in a browser — no build step needed.
# Point CORS_ORIGINS in .env to http://localhost:5500 or wherever you serve it.
```

---

## Contributing

Pull requests welcome. Please open an issue first for large changes.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-thing`
3. Commit your changes: `git commit -m 'feat: add my thing'`
4. Push: `git push origin feat/my-thing`
5. Open a pull request

---

## License

[MIT](LICENSE) — free to use, modify, and self-host.

---

*Built on [Nostr](https://nostr.com) — a simple, open protocol for censorship-resistant communication.*
