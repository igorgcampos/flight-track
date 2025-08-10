#!/bin/bash

# Script de monitoramento Docker
echo "📊 Status do Docker - $(date)"
echo "================================="

# 1. Uso de espaço
echo "💾 Uso de espaço Docker:"
docker system df
echo ""

# 2. Tamanho das imagens
echo "🖼️  Top 10 maiores imagens:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -11
echo ""

# 3. Containers em execução
echo "📦 Containers ativos:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

# 4. Logs grandes
echo "📝 Logs que ocupam mais espaço:"
docker ps -q | xargs -I {} sh -c 'echo "Container: $(docker inspect --format="{{.Name}}" {})" && docker logs {} 2>&1 | wc -c | numfmt --to=iec'
echo ""

# 5. Alertas
echo "⚠️  Alertas:"
DISK_USAGE=$(docker system df -v | grep -E "^Local Volumes" | awk '{print $4}' | sed 's/[^0-9.]//g')
if (( $(echo "$DISK_USAGE > 1000" | bc -l) )); then
    echo "🔴 Alto uso de volumes Docker: ${DISK_USAGE}MB"
else
    echo "🟢 Uso de volumes OK: ${DISK_USAGE}MB"
fi

# 6. Health checks
echo ""
echo "🏥 Status de saúde:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(healthy|unhealthy)"

echo ""
echo "💡 Para limpar: ./scripts/cleanup-docker.sh"