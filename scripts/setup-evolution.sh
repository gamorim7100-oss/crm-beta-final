#!/bin/bash
set -e

echo "🚀 Iniciando Evolution API..."
cd "$(dirname "$0")/.."

# Remove container antigo se existir
docker compose down --remove-orphans 2>/dev/null || true

# Sobe PostgreSQL + Redis + Evolution
docker compose up -d

echo "⏳ Aguardando Evolution API iniciar..."
sleep 15

# Cria instância
echo "📱 Criando instância 'markello'..."
curl -s -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: markello-crm-key-2026" \
  -d '{
    "instanceName": "markello",
    "token": "markello-token",
    "qrcode": true,
    "webhook": {
      "url": "http://host.docker.internal:3000/api/webhooks/evolution",
      "enabled": true,
      "events": ["messages.upsert", "connection.update"]
    }
  }' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "✅ Evolution API rodando em http://localhost:8080"
echo "📸 QR Code para conectar WhatsApp:"
echo ""
echo "   Abra http://localhost:8080/instance/qrcode/markello?apikey=markello-crm-key-2026"
echo "   ou acesse http://localhost:8080, clique em 'markello' e veja o QR Code"
echo ""
echo "📱 No WhatsApp: Menu > Dispositivos conectados > Conectar dispositivo"

