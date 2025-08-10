#!/bin/bash

# Script de limpeza Docker - Executar periodicamente
echo "🧹 Iniciando limpeza Docker..."

# 1. Remover containers parados
echo "📦 Removendo containers parados..."
docker container prune -f

# 2. Remover imagens não utilizadas
echo "🖼️  Removendo imagens não utilizadas..."
docker image prune -f

# 3. Remover imagens órfãs (dangling)
echo "🗑️  Removendo imagens órfãs..."
docker image prune -a -f --filter "until=168h" # 7 dias

# 4. Remover volumes não utilizados
echo "💾 Removendo volumes não utilizados..."
docker volume prune -f

# 5. Remover redes não utilizadas
echo "🌐 Removendo redes não utilizadas..."
docker network prune -f

# 6. Limpeza geral (cuidado em produção!)
echo "🔄 Limpeza geral do sistema..."
docker system prune -f --volumes

# 7. Mostrar espaço liberado
echo "📊 Espaço atual do Docker:"
docker system df

echo "✅ Limpeza concluída!"