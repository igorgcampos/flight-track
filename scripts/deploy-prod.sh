#!/bin/bash

# Navegar para a raiz do projeto (um nível acima de scripts/)
cd "$(dirname "$0")/.."

echo "🚀 Deploy para Produção"
echo "======================"
echo "📁 Diretório atual: $(pwd)"
echo ""

# Verificar se .env existe na raiz do projeto
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado na raiz do projeto!"
    echo "💡 Crie o arquivo .env com suas configurações"
    echo "📍 Localização esperada: $(pwd)/.env"
    exit 1
fi

echo "✅ Arquivo .env encontrado"
echo ""

# Escolher estratégia de logging
echo "📝 Escolha a estratégia de logging:"
echo "1) Simples - Volumes persistentes (recomendado para início)"
echo "2) ELK Stack - Elasticsearch + Kibana (produção avançada)"
read -p "Opção [1]: " LOGGING_OPTION
LOGGING_OPTION=${LOGGING_OPTION:-1}

if [ "$LOGGING_OPTION" = "2" ]; then
    echo "🔧 Deploy com ELK Stack..."
    
    # Verificar se fluentd está configurado
    if [ ! -f fluentd/fluent.conf ]; then
        echo "❌ Configuração do Fluentd não encontrada!"
        echo "📍 Localização esperada: $(pwd)/fluentd/fluent.conf"
        exit 1
    fi
    
    # Parar containers atuais se existirem
    echo "🛑 Parando containers atuais..."
    docker-compose down 2>/dev/null || true
    
    # Build e deploy com ELK
    echo "🔨 Construindo imagens..."
    docker-compose -f docker-compose.prod.yml build
    
    echo "🚀 Iniciando stack ELK..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "⏳ Aguardando Elasticsearch inicializar..."
    sleep 30
    
    echo "📊 Serviços disponíveis:"
    echo "- Aplicação: http://localhost:8080"
    echo "- Kibana (logs): http://localhost:5601"
    echo "- Elasticsearch: http://localhost:9200"
    
else
    echo "🔧 Deploy com volumes simples..."
    
    # Deploy padrão
    docker-compose up -d
    
    echo "📊 Serviços disponíveis:"
    echo "- Aplicação: http://localhost:8080"
fi

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📝 Comandos úteis:"
echo "- Ver logs: docker logs aviationstack-app -f"
echo "- Status: docker ps"
echo "- Monitorar: ./scripts/docker-monitor.sh"
echo "- Logs persistentes: docker volume inspect aviationstack-app_app-logs"