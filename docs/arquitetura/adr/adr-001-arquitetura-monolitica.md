# ADR-001: Arquitetura Monolítica vs Microserviços

## Status
**Status**: ✅ Aceito  
**Data**: 2024-01-15  
**Responsáveis**: Equipe de Desenvolvimento

## Contexto

A AviationStack App precisa de uma arquitetura que suporte consultas de dados de aviação através de uma API externa com limitações de rate limiting (1 req/min no plano gratuito). O sistema deve ser simples de desenvolver, deployar e manter, considerando que é um projeto de escopo limitado com uma pequena equipe.

### Requisitos Analisados
- Integração com API externa (AviationStack)
- Interface web para usuários finais
- API REST para consumo por terceiros
- Cache para dados estáticos
- Deployment simples e confiável
- Baixa complexidade operacional

### Alternativas Consideradas

#### Opção 1: Arquitetura Monolítica
- Uma única aplicação Node.js com Express
- Todos os componentes no mesmo processo
- Deploy como um único container

#### Opção 2: Microserviços
- Serviço separado para API gateway
- Serviço separado para cache
- Serviço separado para integração AviationStack
- Orquestração via Docker Compose ou Kubernetes

#### Opção 3: Serverless (Functions)
- Funções separadas para cada endpoint
- Managed cache (Redis Cloud)
- API Gateway para roteamento

## Decisão

**Escolhemos implementar uma arquitetura monolítica** com separação clara de responsabilidades através de módulos ES6.

### Estrutura Escolhida
```
AviationStack App (Monolito)
├── Express Server (index.js)
├── AviationStack Client (aviationstack.js)  
├── Cache Manager (cache-manager.js)
├── Frontend Assets (public/)
└── Build System (build.js)
```

## Alternativas Consideradas

### Por que não Microserviços?

❌ **Complexidade desnecessária**
- Overhead de comunicação entre serviços
- Complexidade de deployment e orquestração
- Necessidade de service discovery
- Monitoramento distribuído

❌ **Over-engineering para o escopo**
- Funcionalidades limitadas
- Equipe pequena
- Baixo volume de requisições esperado

❌ **Latência adicional**
- Network calls entre serviços
- Serialização/deserialização de dados
- Impacto negativo no rate limiting já restritivo

### Por que não Serverless?

❌ **Cold start latency**
- Impacto negativo na experiência do usuário
- Rate limiting da API externa agravaria o problema

❌ **Vendor lock-in**
- Dependência de plataforma cloud específica
- Migração mais complexa

❌ **Custo/benefício**
- Para baixo volume, serverless pode ser mais caro
- Gerenciamento de state mais complexo

## Consequências

### Positivas ✅

#### Desenvolvimento
- **Simplicidade**: Código em um só lugar, fácil de navegar
- **Debug**: Stack traces completos, debugging simples
- **Desenvolvimento local**: `npm run dev` e está funcionando
- **Hot reload**: Mudanças refletidas imediatamente

#### Deployment
- **Single artifact**: Uma imagem Docker, um deployment
- **Configuração simples**: Variáveis de ambiente básicas
- **Rollback rápido**: Deployment atômico
- **Resource efficiency**: Menos overhead de containers

#### Manutenção
- **Logs centralizados**: Todos os logs em um lugar
- **Monitoramento simples**: Um health check endpoint
- **Backup simples**: State em memória, fácil de recriar
- **Troubleshooting**: Menos moving parts

### Negativas ⚠️

#### Escalabilidade
- **Scaling vertical**: Apenas scale up, não scale out
- **Single point of failure**: Toda aplicação para se um componente falhar  
- **Resource sharing**: CPU/memória compartilhados entre componentes
- **Concurrent requests**: Limitado pela capacidade do processo único

#### Desenvolvimento
- **Acoplamento**: Mudanças podem afetar múltiplos componentes
- **Deploy coupling**: Deploy de qualquer mudança afeta toda aplicação
- **Technology diversity**: Harder to use different languages/frameworks
- **Team coordination**: Todos desenvolvedores no mesmo codebase

#### Futuro
- **Migration complexity**: Refactor para microserviços será complexo
- **Technology updates**: Atualizações afetam toda aplicação
- **Feature isolation**: Difficult to isolate features for testing

## Implementação

### Estrutura Implementada
```javascript
// index.js - Ponto central da aplicação
import express from 'express';
import AviationStackAPI from './aviationstack.js';      // Módulo API
import CacheManager from './cache-manager.js';          // Módulo Cache

const app = express();
const api = new AviationStackAPI();                     // Instância única
const cacheManager = new CacheManager();                // Instância única

// Todos os endpoints no mesmo processo
app.get('/api/flights', async (req, res) => { ... });
app.get('/api/airports', async (req, res) => { ... });
app.listen(port);                                       // Servidor único
```

### Separação de Responsabilidades
Apesar de monolítica, a aplicação mantém clara separação:

1. **index.js**: Orchestração e routing
2. **aviationstack.js**: Integração com API externa  
3. **cache-manager.js**: Gerenciamento de dados estáticos
4. **build.js**: Pipeline de build
5. **public/**: Frontend assets

### Deployment Configuration
```yaml
# docker-compose.yml - Deploy simplificado
services:
  aviationstack-app:
    build: .
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## Métricas de Validação

### Performance Targets Alcançados
- ✅ **Startup time**: < 5 segundos
- ✅ **Memory usage**: < 100MB em produção  
- ✅ **Response time**: < 2 segundos para dados cached
- ✅ **Build time**: < 30 segundos

### Operational Targets Alcançados
- ✅ **Zero-downtime deploy**: Via container replacement
- ✅ **Simple monitoring**: Single health check endpoint
- ✅ **Resource efficiency**: Single container footprint
- ✅ **Development velocity**: Fast iteration cycles

## Revisão e Evolução

### Triggers para Reavaliar esta Decisão

#### Performance Triggers
- Latência média > 5 segundos
- Memory usage > 500MB consistently
- CPU usage > 80% consistently
- Concurrent users > 1000

#### Business Triggers  
- Necessidade de múltiplas APIs externas
- Diferentes SLAs para diferentes funcionalidades
- Equipe crescendo para > 5 desenvolvedores
- Diferentes release cycles para componentes

#### Technical Triggers
- Rate limiting impossível de gerenciar
- Necessidade de diferentes languages/frameworks
- Compliance requirements conflitantes
- Data sovereignty requirements

### Migration Path (Se Necessário)

#### Fase 1: Modularização
```javascript
// Maior separação de módulos dentro do monolito
src/
├── api/           # API layer
├── business/      # Business logic
├── data/          # Data access
└── integration/   # External services
```

#### Fase 2: Service Extraction
```javascript
// Extrair serviços específicos
Cache Service (cache-manager.js) → Separate container
API Integration (aviationstack.js) → Separate container  
```

#### Fase 3: Microservices
```yaml
# Eventual target architecture
services:
  api-gateway:     # Routing
  cache-service:   # Data caching
  aviation-service: # AviationStack integration
  web-frontend:    # Static serving
```

## Lessons Learned

### O que funcionou bem
- **Rapid prototyping**: Monolito permitiu desenvolvimento rápido
- **Simple debugging**: Errors são fáceis de rastrear
- **Deployment simplicity**: Docker Compose funciona perfeitamente
- **Resource efficiency**: Footprint pequeno em produção

### O que seria diferente
- **Module boundaries**: Poderiam ser mais rígidas desde o início
- **Interface contracts**: Definir interfaces explícitas entre módulos
- **Configuration**: Externalize mais configurações
- **Testing**: Estrutura de testes poderia ser melhor

### Recomendações para Projetos Similares
1. **Start monolithic** para projetos pequenos/médios
2. **Plan for modularity** desde o início
3. **Define clear interfaces** entre componentes
4. **Monitor performance metrics** para identificar pontos de scale
5. **Document extraction points** para futuras refatorações

---
*Documentação gerada em: 2024-01-15*