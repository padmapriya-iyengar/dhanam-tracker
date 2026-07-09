#!/bin/bash
set -euo pipefail

SERVER_IP="84.235.253.142"
SERVER_USER="ubuntu"
KEY_FILE="C:\Users\jkira\Downloads\ssh-key-2026-06-05 (2).key"

ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" <<'REMOTE'
set -euo pipefail

echo "Connected to Oracle VM"

cd ~/dhanam-tracker

echo "Pulling latest code..."
git pull

echo "Running deployment..."
~/deploy-dhanam.sh

echo "Reloading systemd units if nginx service files changed..."
sudo systemctl daemon-reload

echo "Testing nginx configuration..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Deployment completed"
REMOTE
