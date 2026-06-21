#!/bin/bash

SERVER_IP="84.235.253.142"
SERVER_USER="ubuntu"
KEY_FILE="C:\Users\jkira\Downloads\ssh-key-2026-06-05 (2).key"

ssh -i ssh -i "C:\Users\jkira\Downloads\ssh-key-2026-06-05 (2).key" ubuntu@84.235.253.142

echo "Connected to Oracle VM"

cd ~/dhanam-tracker || exit 1

echo "Pulling latest code..."
git pull

echo "Running deployment..."
~/deploy-dhanam.sh

echo "Deployment completed"

EOF