#!/bin/bash

# Script para configurar manutenção automática
echo "🔧 Configurando manutenção automática do Docker..."

# Criar diretório para scripts se não existir
mkdir -p /home/telespazio/flight-track/scripts

# Adicionar cron job (executar limpeza toda terça-feira às 02:00)
SCRIPT_PATH="/home/telespazio/flight-track/scripts/cleanup-docker.sh"
CRON_JOB="0 2 * * 2 $SCRIPT_PATH >> /var/log/docker-cleanup.log 2>&1"

# Verificar se o cron job já existe
if ! crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
    # Adicionar ao crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job adicionado: limpeza toda terça às 02:00"
else
    echo "ℹ️  Cron job já existe"
fi

# Mostrar crontab atual
echo "📅 Cron jobs atuais:"
crontab -l

echo "🎯 Configuração concluída!"
echo "💡 Para executar manualmente: ./scripts/cleanup-docker.sh"