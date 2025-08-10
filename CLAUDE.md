# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral do Projeto

A AviationStack App é uma aplicação web Node.js que fornece consulta de dados de voo em tempo real usando a API da AviationStack. Possui interface web e API REST para rastreamento de voos, buscas de aeroportos/companhias aéreas e consultas de rotas.

## Comandos de Desenvolvimento

### Comandos Principais
- `npm install` - Instalar dependências
- `npm start` - Iniciar servidor de produção
- `npm run dev` - Iniciar servidor de desenvolvimento com auto-reload
- `npm run build` - Gerar assets otimizados para produção
- `npm run start:prod` - Iniciar servidor em modo produção

### Comandos Docker
- `docker-compose up -d` - Executar com proxy reverso Nginx (produção)
- `docker-compose --profile dev up aviationstack-app-dev` - Desenvolvimento com hot reload
- `docker build -t aviationstack-app:latest --target app .` - Build apenas Node.js
- `docker build -t aviationstack-app:nginx --target production .` - Build com Nginx

### Verificação de Saúde
- `curl http://localhost:3000/health` - Verificar saúde da aplicação

## Arquitetura

### Componentes Principais
- **index.js:1-205** - Servidor Express.js com rotas da API e servir arquivos estáticos
- **aviationstack.js:6-116** - Cliente da API AviationStack com rate limiting (1 req/min)
- **cache-manager.js:3-241** - Cache em memória para aeroportos/companhias com fallback OpenFlights
- **build.js** - Script de build para produção com minificação de assets

### Funcionalidades Principais
- **Rate Limiting**: Throttling automático de 1 req/min para API AviationStack
- **Cache Inteligente**: Cache TTL de 24 horas com fallback CSV OpenFlights para dados estáticos
- **Docker Multi-stage**: Builds otimizados para produção com proxy reverso Nginx
- **Monitoramento de Saúde**: Endpoint `/health` com tracking de uptime

### Fluxo de Dados
1. Dados estáticos (aeroportos/companhias) servidos do cache em memória com fallback OpenFlights
2. Dados de voos em tempo real buscados da API AviationStack com rate limiting
3. Todas as respostas da API usam formato JSON consistente
4. Frontend usa vanilla JS com Tailwind CSS (CDN)

## Configuração

### Variáveis de Ambiente
Necessárias no arquivo `.env`:
- `AVIATIONSTACK_API_KEY` - Chave da API do aviationstack.com (obrigatória)
- `PORT=3000` - Porta do servidor (opcional, padrão 3000)
- `NODE_ENV=production` - Configuração do ambiente (opcional)

### Endpoints da API
- `/api/flights` - Voos em tempo real
- `/api/flights/airline/:code` - Voos por companhia aérea
- `/api/flights/route/:dep/:arr` - Voos por rota
- `/api/airports` - Lista de aeroportos com busca
- `/api/airlines` - Lista de companhias aéreas com busca
- `/api/autocomplete/airports` - Autocomplete de aeroportos
- `/api/autocomplete/airlines` - Autocomplete de companhias aéreas

## Deploy

### Configuração de Produção
1. Definir variáveis de ambiente no `.env`
2. Executar `npm run build` para criar assets otimizados
3. Usar Docker Compose para deploy de produção com Nginx
4. Acessar via porta 8080 (Nginx) ou 3000 (Node.js direto)

### Arquitetura de Containers
- **aviationstack-app**: Node.js 20 Alpine com servidor Express
- **aviationstack-nginx**: Nginx 1.25 Alpine proxy reverso
- **Network**: Rede Docker isolada (aviation-network)

### Kubernetes
- Usar `k8s-deployment.yaml` para deploy Kubernetes
- Inclui configurações de ingress, deployment e service
- Atualizar host do ingress antes de fazer deploy

## Observações Importantes

- Tier gratuito da AviationStack limitado a 1 requisição por minuto
- Cache manager fornece fallback OpenFlights para dados estáticos
- Todos os builds usam Docker multi-stage para otimização de produção
- Frontend é servido de `public/` (dev) ou `dist/` (prod)
- Health checks disponíveis no endpoint `/health` para monitoramento