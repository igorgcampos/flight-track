# Documentação de Arquitetura - AviationStack App

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Contexto do Sistema](#contexto-do-sistema)
- [Arquitetura de Container](#arquitetura-de-container)
- [Componentes e Módulos](#componentes-e-módulos)
- [Arquitetura de Dados](#arquitetura-de-dados)
- [Decisões Arquiteturais (ADRs)](#decisões-arquiteturais-adrs)
- [Diagramas](#diagramas)

## 🎯 Visão Geral

A AviationStack App é uma aplicação web Node.js que fornece uma interface para consulta de dados de aviação em tempo real através da API da AviationStack. O sistema foi projetado para ser simples, eficiente e facilmente implantável em diferentes ambientes.

### Características Principais

- **Simplicidade**: Arquitetura monolítica simples com separação clara de responsabilidades
- **Performance**: Cache inteligente com fallback e compressão de dados
- **Escalabilidade**: Containerização com Docker e orquestração via Docker Compose
- **Resiliência**: Health checks, restart automático e gerenciamento de rate limiting
- **Usabilidade**: Interface web moderna e API REST bem documentada

### Stack Tecnológico

| Componente | Tecnologia | Versão | Propósito |
|------------|------------|--------|-----------|
| **Runtime** | Node.js | 20 LTS | Execução da aplicação |
| **Framework Web** | Express.js | 4.18.2 | Servidor HTTP e API REST |
| **Cliente HTTP** | Axios | 1.11.0 | Requisições para APIs externas |
| **Cache** | In-Memory Map | Nativo | Cache de dados estáticos |
| **Containerização** | Docker | Multi-stage | Isolamento e deployment |
| **Proxy** | Nginx | 1.25-alpine | Reverse proxy e load balancing |
| **Frontend** | Vanilla JS + Tailwind | CDN | Interface de usuário |

## 🌍 Contexto do Sistema

```mermaid
C4Context
    title Diagrama de Contexto - AviationStack App

    Person(user, "Usuário", "Consulta informações de voos e aeroportos")
    Person(api_consumer, "Consumidor da API", "Aplicações que consomem nossa API REST")
    
    System(aviationstack_app, "AviationStack App", "Aplicação web para consulta de dados de aviação")
    
    System_Ext(aviationstack_api, "AviationStack API", "API externa para dados de aviação em tempo real")
    System_Ext(openflights, "OpenFlights Database", "Base de dados pública de aeroportos e companhias")
    System_Ext(cdn, "CDN (Tailwind/Lucide)", "Recursos frontend via CDN")

    Rel(user, aviationstack_app, "Acessa via navegador", "HTTPS/HTTP")
    Rel(api_consumer, aviationstack_app, "Consome API REST", "HTTP/JSON")
    Rel(aviationstack_app, aviationstack_api, "Consulta dados de voos", "HTTPS/REST")
    Rel(aviationstack_app, openflights, "Cache de aeroportos/companhias", "HTTPS/CSV")
    Rel(aviationstack_app, cdn, "Carrega recursos estáticos", "HTTPS")
```

### Stakeholders

| Stakeholder | Interesse | Responsabilidades |
|-------------|-----------|-------------------|
| **Usuários Finais** | Consultar informações de voos de forma rápida e confiável | Fornecer feedback de usabilidade |
| **Desenvolvedores** | Manter e evoluir o sistema | Implementar funcionalidades e correções |
| **Operações/DevOps** | Garantir disponibilidade e performance | Monitoramento e deployment |
| **AviationStack** | Provedor de dados | Fornecer API confiável com SLA |

### Requisitos Não-Funcionais

| Atributo | Requisito | Implementação |
|----------|-----------|---------------|
| **Performance** | < 2s tempo de resposta | Cache local, compressão gzip |
| **Disponibilidade** | 99% uptime | Health checks, restart automático |
| **Escalabilidade** | Suporte a múltiplas instâncias | Containerização, proxy Nginx |
| **Segurança** | Proteção de API keys | Variáveis de ambiente, usuário não-root |
| **Usabilidade** | Interface responsiva | Design mobile-first |

## 🐳 Arquitetura de Container

```mermaid
C4Container
    title Diagrama de Container - AviationStack App

    Container_Boundary(c1, "AviationStack App") {
        Container(web_ui, "Interface Web", "HTML/CSS/JS", "Interface de usuário responsiva")
        Container(api_server, "Servidor API", "Node.js/Express", "API REST e servidor web")
        Container(cache_layer, "Camada de Cache", "In-Memory Map", "Cache de dados estáticos")
        Container(api_client, "Cliente AviationStack", "Axios", "Integração com API externa")
    }

    Container(nginx, "Nginx Proxy", "Nginx", "Reverse proxy e balanceamento")
    
    ContainerDb_Ext(aviationstack_api, "AviationStack API", "REST API", "Dados de voos em tempo real")
    ContainerDb_Ext(openflights_db, "OpenFlights DB", "CSV Files", "Dados estáticos de aeroportos")

    Rel(nginx, api_server, "Proxy reverso", "HTTP")
    Rel(web_ui, api_server, "Requisições AJAX", "HTTP/JSON")
    Rel(api_server, cache_layer, "Consulta/armazena", "In-Memory")
    Rel(api_server, api_client, "Solicita dados", "Function Call")
    Rel(api_client, aviationstack_api, "HTTP requests", "HTTPS/REST")
    Rel(cache_layer, openflights_db, "Carrega dados", "HTTPS/CSV")
```

### Estrutura de Deployment

```yaml
# docker-compose.yml - Estrutura de serviços
aviationstack-app:        # Container principal da aplicação
  ├── Node.js 20 Alpine    # Runtime otimizado
  ├── Express.js           # Framework web
  ├── Cache Manager        # Gerenciamento de cache
  └── Health Check         # Monitoramento de saúde

aviationstack-nginx:       # Proxy reverso
  ├── Nginx 1.25 Alpine    # Servidor web
  ├── Configuração custom  # Otimizações de performance
  └── Health Check         # Monitoramento de proxy

Networks:
  aviation-network:        # Rede interna isolada
    ├── Subnet: 172.20.0.0/16
    └── Driver: bridge
```

## 🧩 Componentes e Módulos

```mermaid
C4Component
    title Componentes da Aplicação Node.js

    Component(express_app, "Express Application", "Express.js", "Servidor web principal")
    Component(route_handlers, "Route Handlers", "Express Routes", "Manipuladores de rotas da API")
    Component(aviation_api, "AviationStackAPI", "Class", "Cliente para AviationStack API")
    Component(cache_manager, "CacheManager", "Class", "Gerenciamento de cache inteligente")
    Component(static_server, "Static File Server", "Express.static", "Servidor de arquivos estáticos")

    ComponentDb(memory_cache, "Memory Cache", "Map", "Cache em memória")
    ComponentDb_Ext(external_apis, "APIs Externas", "HTTP", "AviationStack + OpenFlights")

    Rel(express_app, route_handlers, "Registra rotas")
    Rel(express_app, static_server, "Serve arquivos")
    Rel(route_handlers, aviation_api, "Consulta dados")
    Rel(route_handlers, cache_manager, "Gerencia cache")
    Rel(aviation_api, external_apis, "HTTP requests")
    Rel(cache_manager, memory_cache, "Store/retrieve")
    Rel(cache_manager, external_apis, "Fallback data")
```

### Estrutura de Módulos

```
📁 teste-app/
├── 📄 index.js                 # Servidor principal (Express app)
├── 📄 aviationstack.js         # Cliente AviationStack API
├── 📄 cache-manager.js         # Gerenciamento de cache
├── 📄 build.js                 # Script de build para produção
├── 🐳 Dockerfile               # Multi-stage container build
├── 🐳 docker-compose.yml       # Orquestração de serviços
├── 📁 public/                  # Arquivos estáticos (desenvolvimento)
│   ├── 📄 index.html           # Interface principal
│   ├── 📁 css/styles.css       # Estilos customizados
│   └── 📁 js/
│       ├── 📄 app.js           # Lógica principal frontend
│       └── 📄 autocomplete.js  # Funcionalidade de autocomplete
├── 📁 dist/                    # Build otimizado (produção)
├── 📁 nginx/                   # Configuração do proxy
│   └── 📄 nginx.conf           # Config Nginx
└── 📄 k8s-deployment.yaml      # Deployment Kubernetes
```

### Responsabilidades dos Componentes

#### 1. Express Application (index.js:1-205)
- **Responsabilidade**: Orchestração geral da aplicação
- **Funcionalidades**:
  - Inicialização do servidor HTTP
  - Configuração de middlewares (compressão, JSON parsing)
  - Roteamento de requisições
  - Servir arquivos estáticos
  - Health check endpoint

#### 2. AviationStackAPI (aviationstack.js:6-116)
- **Responsabilidade**: Integração com API externa
- **Funcionalidades**:
  - Rate limiting automático (1 req/min)
  - Tratamento de erros da API
  - Métodos especializados para diferentes endpoints
  - Logging detalhado de requisições

#### 3. CacheManager (cache-manager.js:3-241)
- **Responsabilidade**: Otimização de performance via cache
- **Funcionalidades**:
  - Cache TTL de 24 horas
  - Fallback para OpenFlights database
  - Busca e autocomplete em dados cached
  - Parser CSV robusto para dados OpenFlights

## 📊 Arquitetura de Dados

### Fluxo de Dados

```mermaid
graph TD
    A[Cliente HTTP] --> B[Express Router]
    B --> C{Tipo de Dados}
    
    C -->|Dados em Tempo Real| D[AviationStackAPI]
    C -->|Dados Estáticos| E[CacheManager]
    
    D --> F[AviationStack API]
    E --> G{Cache Válido?}
    
    G -->|Sim| H[Memory Cache]
    G -->|Não| I[OpenFlights CSV]
    I --> J[Parse + Store Cache]
    J --> H
    
    F --> K[Rate Limit Check]
    K --> L[HTTP Response]
    H --> L
    
    L --> M[JSON Response]
    M --> A
```

### Estruturas de Dados

#### Aeroportos
```javascript
{
  iata_code: "GRU",           // Código IATA (3 chars)
  icao_code: "SBGR",          // Código ICAO (4 chars)
  airport_name: "Guarulhos...", // Nome completo
  city_name: "São Paulo",     // Cidade
  country_name: "Brazil",     // País
  timezone: "America/Sao_Paulo", // Fuso horário
  latitude: -23.432075,       // Coordenada geográfica
  longitude: -46.469511       // Coordenada geográfica
}
```

#### Companhias Aéreas
```javascript
{
  iata_code: "G3",           // Código IATA (2-3 chars)
  icao_code: "GLO",          // Código ICAO (3 chars)
  airline_name: "GOL",       // Nome da companhia
  country_name: "Brazil",    // País de origem
  callsign: "GOL"           // Callsign para comunicação
}
```

#### Voos (AviationStack API)
```javascript
{
  flight_date: "2024-01-15",
  flight_status: "active",
  departure: {
    airport: "GRU",
    timezone: "America/Sao_Paulo",
    iata: "GRU",
    scheduled: "2024-01-15T10:30:00+00:00"
  },
  arrival: {
    airport: "JFK", 
    timezone: "America/New_York",
    iata: "JFK",
    scheduled: "2024-01-15T18:45:00+00:00"
  },
  airline: { name: "American Airlines", iata: "AA" },
  flight: { number: "245", iata: "AA245" }
}
```

### Estratégias de Cache

| Tipo de Dados | TTL | Source Primário | Fallback | Estratégia |
|----------------|-----|-----------------|----------|------------|
| **Aeroportos** | 24h | OpenFlights CSV | Lista estática | Eager loading |
| **Companhias** | 24h | OpenFlights CSV | Lista estática | Eager loading |
| **Voos** | - | AviationStack API | Erro HTTP | Rate limited |

## 🏗️ Decisões Arquiteturais (ADRs)

### ADR-001: Arquitetura Monolítica
**Status**: Aceito  
**Data**: 2024-01-15

**Contexto**: Decisão entre arquitetura monolítica vs microserviços.

**Decisão**: Implementar como aplicação monolítica Node.js.

**Razões**:
- Simplicidade de desenvolvimento e deployment
- Baixa complexidade operacional
- Adequado para o escopo do projeto
- Facilita debugging e monitoramento

**Consequências**:
- ✅ Desenvolvimento mais rápido
- ✅ Menos overhead operacional
- ⚠️ Escalabilidade limitada
- ⚠️ Acoplamento entre componentes

### ADR-002: Cache In-Memory com Fallback
**Status**: Aceito  
**Data**: 2024-01-15

**Contexto**: Necessidade de otimizar consultas a dados estáticos.

**Decisão**: Implementar cache em memória com fallback para OpenFlights.

**Razões**:
- Reduzir dependência da API paga
- Melhorar performance de autocomplete
- Dados de aeroportos/companhias são relativamente estáticos

**Consequências**:
- ✅ Performance melhorada
- ✅ Menor uso da API paga
- ⚠️ Uso de memória adicional
- ⚠️ Cache não persistente entre restarts

### ADR-003: Rate Limiting Automático
**Status**: Aceito  
**Data**: 2024-01-15

**Contexto**: AviationStack API gratuita tem limite de 1 req/min.

**Decisão**: Implementar rate limiting automático no cliente.

**Razões**:
- Evitar erros 429 (Too Many Requests)
- Garantir funcionamento contínuo
- Melhor experiência do usuário

**Consequências**:
- ✅ Funcionamento confiável
- ✅ Evita bloqueios da API
- ⚠️ Latência adicional em múltiplas consultas

### ADR-004: Multi-stage Docker Build
**Status**: Aceito  
**Data**: 2024-01-15

**Contexto**: Necessidade de otimizar imagem Docker para produção.

**Decisão**: Implementar build multi-estágio com separação dev/prod.

**Razões**:
- Reduzir tamanho da imagem final
- Separar dependências de desenvolvimento
- Otimizar para diferentes ambientes

**Consequências**:
- ✅ Imagens menores e mais seguras
- ✅ Builds mais eficientes
- ⚠️ Maior complexidade no Dockerfile

## 📈 Diagramas de Arquitetura

### Diagrama de Sequência - Consulta de Voos

```mermaid
sequenceDiagram
    participant U as Usuário
    participant N as Nginx
    participant A as App Express
    participant C as AviationStackAPI
    participant E as API Externa

    U->>N: GET /api/flights/airline/AA
    N->>A: Proxy request
    A->>C: searchFlightsByAirline('AA', 10)
    C->>C: Rate limit check
    C->>E: GET /v1/flights?airline_iata=AA&limit=10
    E-->>C: Flight data JSON
    C-->>A: Processed data
    A-->>N: JSON response
    N-->>U: HTTP 200 + JSON
```

### Diagrama de Sequência - Cache de Aeroportos

```mermaid
sequenceDiagram
    participant U as Usuário
    participant A as App Express
    participant CM as CacheManager
    participant MC as Memory Cache
    participant OF as OpenFlights

    U->>A: GET /api/autocomplete/airports?q=gru
    A->>CM: getAirports()
    CM->>MC: Check cache validity
    
    alt Cache válido
        MC-->>CM: Return cached data
    else Cache expirado
        CM->>OF: Fetch airports.dat
        OF-->>CM: CSV data
        CM->>CM: Parse CSV + validate
        CM->>MC: Store in cache
        MC-->>CM: Cached data
    end
    
    CM->>CM: searchAirports('gru', 10)
    CM-->>A: Filtered results
    A-->>U: JSON response
```

### Diagrama de Deployment

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "Network: aviation-network"
            subgraph "aviationstack-nginx"
                N[Nginx 1.25-alpine<br/>Port: 8080:80]
            end
            
            subgraph "aviationstack-app"
                NA[Node.js 20 Alpine<br/>Port: 3000<br/>Health: /health]
                NA --> CM[CacheManager<br/>TTL: 24h]
                NA --> AS[AviationStackAPI<br/>Rate: 1/min]
            end
        end
    end
    
    subgraph "External Services"
        EXT1[AviationStack API<br/>aviationstack.com]
        EXT2[OpenFlights DB<br/>github.com/jpatokal]
    end
    
    U[Usuários] --> N
    N --> NA
    AS --> EXT1
    CM --> EXT2
```

## 🔒 Considerações de Segurança

### Implementações de Segurança

1. **Proteção de Credenciais**
   - API keys via variáveis de ambiente
   - Arquivo .env não commitado
   - Exemplo .env.example para setup

2. **Container Security**
   - Usuário não-root (aviationapp:1001)
   - Imagem Alpine (surface de ataque reduzida)
   - Multi-stage build (sem ferramentas dev em produção)

3. **Network Security**
   - Rede Docker isolada (aviation-network)
   - Nginx como proxy (não exposição direta da aplicação)
   - Health checks para monitoramento

4. **Input Validation**
   - Validação de parâmetros de entrada
   - Sanitização de queries de busca
   - Tratamento robusto de erros

## 📊 Monitoramento e Observabilidade

### Health Checks

```javascript
// Endpoint de health check
GET /health
Response: {
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123
}
```

### Logging Strategy

- **Console logging** com emojis para facilitar identificação
- **Request tracking** com URLs e parâmetros
- **Error handling** com stack traces em desenvolvimento
- **Rate limiting feedback** para debugging

### Métricas Disponíveis

| Métrica | Endpoint | Descrição |
|---------|----------|-----------|
| Saúde da aplicação | `/health` | Status, timestamp, uptime |
| Cache status | `/api/cache/preload` | Contadores de cache |
| Request logs | Console | Logs de requisições e respostas |

---

**Última atualização**: 2024-01-15  
**Versão da documentação**: 1.0.0  
**Responsável**: Equipe de Desenvolvimento