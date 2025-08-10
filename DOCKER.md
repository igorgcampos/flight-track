# Guia de Deploy Docker

## Início Rápido

### Construindo a Imagem

# Apenas Node.js
docker build -t aviationstack-app:latest --target app .

# Com Nginx (container único)
docker build -t aviationstack-app:nginx --target production .


### Executando com Docker Compose (Recomendado)

# Produção com proxy reverso Nginx
docker-compose up -d

# Desenvolvimento com hot reload
docker-compose --profile dev up aviationstack-app-dev


### Executando com Docker

# Produção
docker run -d --name aviationstack-app -p 3000:3000 --env-file .env aviationstack-app:latest

# Com porta customizada
docker run -d --name aviationstack-app -p 8080:3000 --env-file .env aviationstack-app:latest


## Variáveis de Ambiente

Crie um arquivo `.env` com:

AVIATIONSTACK_API_KEY=sua_chave_api_aqui
PORT=3000
NODE_ENV=production


## Health Checks

A aplicação inclui monitoramento de saúde:
- Endpoint de saúde: `GET /health`
- Health checks do Docker habilitados
- Probes de readiness/liveness do Kubernetes configurados

## Recursos de Segurança

- Execução com usuário não-root (uid: 1001)
- Sistema de arquivos raiz somente leitura
- Capabilities removidas
- Políticas de segurança aplicadas
- Superfície de ataque mínima com base Alpine

## Deploy Kubernetes


kubectl apply -f k8s-deployment.yaml


Atualize o host do Ingress em `k8s-deployment.yaml` antes de fazer o deploy.

## Integração Nginx

A aplicação usa Nginx como proxy reverso para:
- Servir arquivos estáticos com cache
- Rate limiting (10 req/s para API, 50 req/s geral)
- Headers de segurança (X-Frame-Options, CSP, etc.)
- Compressão Gzip
- Balanceamento de carga e pooling de conexões

Acesse via: http://localhost:8080 (ou porta 80 em produção)

## Otimização do Tamanho do Container

O build multi-estágio reduz o tamanho da imagem através de:
- Uso de imagens base Alpine Linux
- Inclusão apenas de dependências de produção
- Minificação de assets estáticos
- Exclusão de arquivos de desenvolvimento

## Monitoramento

Acessar logs da aplicação:

docker logs aviationstack-app


Monitorar saúde do container:

docker inspect --format='{{.State.Health.Status}}' aviationstack-app
