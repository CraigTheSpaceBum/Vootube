# /etc/systemd/system/nostrflux.service
#
# sudo cp nostrflux.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl enable --now nostrflux
# sudo journalctl -u nostrflux -f

[Unit]
Description=NostrFlux — Nostr Live Stream Discovery Client
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=nostrflux
WorkingDirectory=/opt/nostrflux
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5s
EnvironmentFile=/opt/nostrflux/.env

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/opt/nostrflux/logs
ProtectHome=yes
LimitNOFILE=65536

StandardOutput=journal
StandardError=journal
SyslogIdentifier=nostrflux

[Install]
WantedBy=multi-user.target
