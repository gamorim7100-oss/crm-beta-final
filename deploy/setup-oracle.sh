#!/bin/bash
set -e

echo "========================================"
echo "  CRM - Evolution API Setup (Oracle)"
echo "========================================"

# Update system
echo "[1/5] Atualizando sistema..."
sudo apt update -y && sudo apt upgrade -y

# Install Docker
echo "[2/5] Instalando Docker..."
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

# Create directory for Evolution
echo "[3/5] Criando diretório..."
mkdir -p ~/evolution
cd ~/evolution

# Download files
echo "[4/5] Baixando configurações..."
curl -O https://raw.githubusercontent.com/gamorim7100-oss/crm-beta/main/deploy/docker-compose.yml
curl -O https://raw.githubusercontent.com/gamorim7100-oss/crm-beta/main/deploy/evolution.env

# Start services
echo "[5/5] Iniciando Evolution API + PostgreSQL + Redis..."
docker compose up -d

echo ""
echo "========================================"
echo "  ✅ Instalação concluída!"
echo "========================================"
echo ""
echo "  Evolution API: http://$(curl -s ifconfig.me):8080"
echo ""
echo "  Próximo passo:"
echo "  1. Criar instância:"
echo "     curl -X POST http://localhost:8080/instance/create \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -H 'apikey: markello-crm-key-2026' \\"
echo "       -d '{\"instanceName\":\"markello\",\"token\":\"markello-token\",\"qrcode\":true,\"webhook\":{\"url\":\"https://SEU-VERCEL.vercel.app/api/webhooks/evolution\",\"enabled\":true,\"events\":[\"messages.upsert\",\"connection.update\"]}}'"
echo ""
echo "  2. Ver QR Code:"
echo "     http://SEU_IP:8080/instance/qrcode/markello?apikey=markello-crm-key-2026"
echo ""
echo "  3. Liberar porta 8080 no firewall da Oracle!"
echo ""

