#!/bin/bash

# Script para configurar Kibana com dados de exemplo
cd "$(dirname "$0")/.."

echo "📊 Configurando Kibana para AviationStack Logs"
echo "============================================="

# Aguardar Elasticsearch estar pronto
echo "⏳ Aguardando Elasticsearch..."
until curl -s "http://localhost:9200/_cluster/health?wait_for_status=green&timeout=1s" > /dev/null; do
    sleep 2
done

echo "✅ Elasticsearch pronto!"

# Criar um índice de exemplo com logs simulados
echo "📝 Criando logs de exemplo..."

# Log de aplicação
curl -X POST "http://localhost:9200/aviationstack-logs-$(date +%Y.%m.%d)/_doc" \
-H 'Content-Type: application/json' \
-d '{
  "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
  "@log_name": "aviationstack.app",
  "service_name": "app",
  "environment": "production",
  "level": "info",
  "message": "🛩️ Servidor rodando em http://localhost:3000",
  "server_name": "aviationstack-app",
  "container": "aviationstack-app"
}'

# Log de API call
curl -X POST "http://localhost:9200/aviationstack-logs-$(date +%Y.%m.%d)/_doc" \
-H 'Content-Type: application/json' \
-d '{
  "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
  "@log_name": "aviationstack.app",
  "service_name": "app", 
  "environment": "production",
  "level": "error",
  "message": "❌ Erro na requisição: Request failed with status code 429",
  "error": {
    "code": "usage_limit_reached",
    "message": "Your monthly usage limit has been reached"
  },
  "server_name": "aviationstack-app",
  "container": "aviationstack-app"
}'

# Log de acesso Nginx
curl -X POST "http://localhost:9200/aviationstack-logs-$(date +%Y.%m.%d)/_doc" \
-H 'Content-Type: application/json' \
-d '{
  "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
  "@log_name": "aviationstack.nginx",
  "service_name": "nginx",
  "environment": "production",
  "message": "GET / HTTP/1.1",
  "remote_addr": "172.20.0.1",
  "status": 200,
  "body_bytes_sent": 9461,
  "request_time": 0.002,
  "user_agent": "curl/7.68.0",
  "server_name": "aviationstack-nginx",
  "container": "aviationstack-nginx"
}'

# Aguardar indexação
echo "⏳ Aguardando indexação..."
sleep 3

# Verificar se os dados foram criados
echo "🔍 Verificando dados criados..."
INDEX_COUNT=$(curl -s "http://localhost:9200/aviationstack-logs-*/_count" | grep -o '"count":[0-9]*' | cut -d: -f2)
echo "📊 Total de logs criados: $INDEX_COUNT"

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "🌐 Acesse o Kibana em: http://localhost:5601"
echo ""
echo "📋 Passos para configurar no Kibana:"
echo "1. Vá para Management > Stack Management"
echo "2. Clique em 'Data Views' (ou Index Patterns)"
echo "3. Clique 'Create data view'"
echo "4. Index pattern: aviationstack-logs-*"
echo "5. Time field: @timestamp"
echo "6. Clique 'Create data view'"
echo "7. Vá para Analytics > Discover para ver os logs"
echo ""
echo "🎯 Filtros úteis no Kibana:"
echo "- service_name:app (logs da aplicação)"
echo "- service_name:nginx (logs do Nginx)"
echo "- level:error (apenas erros)"