# Diagramas de Arquitetura - AviationStack App

## 📊 Visão Geral dos Diagramas

Esta documentação contém todos os diagramas arquiteturais da AviationStack App, organizados por diferentes níveis de abstração e perspectivas. Os diagramas seguem a notação do modelo C4 (Context, Containers, Components, Code) e utilizam Mermaid para visualização.

## 🌍 Nível 1: Diagrama de Contexto do Sistema

### Context Diagram - Visão Stakeholder
```mermaid
C4Context
    title Diagrama de Contexto - AviationStack App

    Person(end_user, "Usuário Final", "Consulta informações de voos<br/>através da interface web")
    Person(api_consumer, "Consumidor da API", "Aplicações que integram<br/>via API REST")
    Person(developer, "Desenvolvedor", "Mantém e evolui<br/>a aplicação")
    
    System(aviationstack_app, "AviationStack App", "Sistema web para consulta<br/>de dados de aviação")
    
    System_Ext(aviationstack_api, "AviationStack API", "API comercial para dados<br/>de voos em tempo real")
    System_Ext(openflights_db, "OpenFlights Database", "Base de dados aberta<br/>de aeroportos e companhias")
    System_Ext(github_cdn, "GitHub CDN", "Hospedagem de dados<br/>OpenFlights via CDN")
    System_Ext(tailwind_cdn, "Tailwind CDN", "Framework CSS<br/>via CDN")

    Rel(end_user, aviationstack_app, "Acessa interface web", "HTTPS")
    Rel(api_consumer, aviationstack_app, "Consome API REST", "HTTP/JSON")
    Rel(developer, aviationstack_app, "Deploy e mantém", "Docker/Git")
    
    Rel(aviationstack_app, aviationstack_api, "Consulta voos", "HTTPS/REST<br/>1 req/min")
    Rel(aviationstack_app, github_cdn, "Download dados estáticos", "HTTPS/CSV<br/>1x/dia")
    Rel(openflights_db, github_cdn, "Hospeda dados", "Git Push")
    Rel(aviationstack_app, tailwind_cdn, "Carrega CSS framework", "HTTPS")
```

### Stakeholders e Interações

| Stakeholder | Necessidades | Interações | Frequência |
|-------------|--------------|------------|------------|
| **Usuário Final** | Interface responsiva, dados atualizados | Web browser → App | Contínua |
| **Consumidor API** | Endpoints confiáveis, documentação | HTTP requests → API | Sob demanda |
| **Desenvolvedor** | Deploy simples, debugging fácil | Git/Docker → Infra | Diária |
| **AviationStack** | Respeitar rate limits, uso adequado | App → API | 1x/minuto |
| **OpenFlights** | Attribution, uso responsável | App → GitHub CDN | 1x/dia |

## 🏗️ Nível 2: Diagrama de Containers

### Container Architecture - Deployment View
```mermaid
C4Container
    title Diagrama de Containers - AviationStack App

    Person(user, "Usuário")
    
    Container_Boundary(c1, "AviationStack Platform") {
        Container(nginx_proxy, "Nginx Proxy", "Nginx 1.25-alpine", "Reverse proxy, load balancing<br/>e serving de assets estáticos")
        Container(node_app, "Node.js Application", "Node.js 20 + Express", "API REST, business logic<br/>e integração com APIs externas")
        Container(memory_cache, "Memory Cache", "JavaScript Map", "Cache in-memory para<br/>dados estáticos (TTL: 24h)")
    }
    
    ContainerDb_Ext(aviationstack_api, "AviationStack API", "REST API", "Dados de voos em tempo real<br/>Rate limit: 1 req/min")
    ContainerDb_Ext(openflights_data, "OpenFlights Data", "CSV Files", "Aeroportos e companhias<br/>~14MB de dados públicos")
    ContainerDb_Ext(cdn_services, "CDN Services", "Static Assets", "Tailwind CSS, Lucide Icons")

    Rel(user, nginx_proxy, "HTTP requests", "Port 8080")
    Rel(nginx_proxy, node_app, "Proxy pass", "Port 3000")
    Rel(node_app, memory_cache, "Cache operations", "In-process")
    Rel(node_app, aviationstack_api, "Flight data requests", "HTTPS/REST")
    Rel(memory_cache, openflights_data, "Data refresh", "HTTPS/CSV")
    Rel(user, cdn_services, "Static resources", "HTTPS")
```

### Container Specifications

#### aviationstack-nginx
```yaml
Image: nginx:1.25-alpine
Memory: ~10MB
CPU: ~0.1 cores
Ports: 8080:80
Config: ./nginx/nginx.conf
Health: GET /health
Restart: unless-stopped
```

#### aviationstack-app  
```yaml
Image: node:20-alpine (custom)
Memory: ~80MB
CPU: ~0.2 cores
Ports: 3000 (internal)
Environment: NODE_ENV=production
Health: GET /health
Restart: unless-stopped
```

### Network Communication
```mermaid
graph LR
    subgraph "External Network"
        U[User Browser]
        CDN[CDN Services]
    end
    
    subgraph "aviation-network (172.20.0.0/16)"
        N[Nginx :80]
        A[Node App :3000]
    end
    
    subgraph "External APIs"
        AS[AviationStack API]
        OF[OpenFlights GitHub]
    end
    
    U -->|:8080| N
    U -->|HTTPS| CDN
    N -->|proxy_pass| A
    A -->|HTTPS| AS
    A -->|HTTPS| OF
```

## 🧩 Nível 3: Diagrama de Componentes

### Component Architecture - Code Organization
```mermaid
C4Component
    title Componentes da Aplicação Node.js

    Container_Boundary(c1, "Node.js Application") {
        Component(express_server, "Express Server", "Express.js", "HTTP server, routing,<br/>middleware pipeline")
        Component(route_handlers, "API Route Handlers", "Express Routes", "REST endpoints,<br/>request/response handling")
        Component(aviation_client, "AviationStack Client", "Axios + Custom Logic", "API integration,<br/>rate limiting, error handling")
        Component(cache_manager, "Cache Manager", "Map + File Processing", "Data caching, CSV parsing,<br/>search functionality")
        Component(static_server, "Static File Server", "Express.static", "Frontend assets serving")
        Component(build_system, "Build System", "Terser + html-minifier", "Asset optimization,<br/>minification pipeline")
    }

    ComponentDb(memory_store, "Memory Store", "JavaScript Map", "In-memory data storage<br/>com TTL management")
    ComponentDb_Ext(external_apis, "External APIs", "HTTP/REST", "AviationStack + OpenFlights")

    Rel(express_server, route_handlers, "Route registration", "Function calls")
    Rel(express_server, static_server, "Static middleware", "Express middleware")
    Rel(route_handlers, aviation_client, "API calls", "Async/await")
    Rel(route_handlers, cache_manager, "Cache operations", "Method calls")
    Rel(aviation_client, external_apis, "HTTP requests", "Axios")
    Rel(cache_manager, memory_store, "Data storage", "Map operations")
    Rel(cache_manager, external_apis, "Data fetching", "HTTP requests")
    Rel(build_system, static_server, "Optimized assets", "File system")
```

### Component Interactions Detail

#### Request Flow - Real-time Flight Data
```mermaid
sequenceDiagram
    participant UI as Frontend
    participant ES as Express Server
    participant RH as Route Handlers
    participant AC as Aviation Client
    participant API as AviationStack API

    UI->>ES: GET /api/flights/airline/AA
    ES->>RH: route('/api/flights/airline/:code')
    RH->>AC: searchFlightsByAirline('AA', 10)
    AC->>AC: checkRateLimit()
    
    alt Rate limit OK
        AC->>API: GET /v1/flights?airline_iata=AA&limit=10
        API-->>AC: Flight data JSON
    else Rate limit exceeded
        AC->>AC: setTimeout(waitTime)
        AC->>API: GET /v1/flights (after wait)
        API-->>AC: Flight data JSON
    end
    
    AC-->>RH: Processed flight data
    RH-->>ES: JSON response
    ES-->>UI: HTTP 200 + flight data
```

#### Request Flow - Cached Data (Autocomplete)
```mermaid
sequenceDiagram
    participant UI as Frontend
    participant ES as Express Server 
    participant RH as Route Handlers
    participant CM as Cache Manager
    participant MS as Memory Store
    participant OF as OpenFlights

    UI->>ES: GET /api/autocomplete/airports?q=gru
    ES->>RH: route('/api/autocomplete/airports')
    RH->>CM: getAirports()
    CM->>MS: getCacheData('airports')
    
    alt Cache hit (válido)
        MS-->>CM: Cached airport data
    else Cache miss/expired
        CM->>OF: GET airports.dat
        OF-->>CM: CSV data
        CM->>CM: parseAirportsData()
        CM->>MS: setCacheData('airports', parsed)
        MS-->>CM: Stored data
    end
    
    CM->>CM: searchAirports('gru', 10)
    CM-->>RH: Filtered results
    RH-->>ES: JSON response
    ES-->>UI: Autocomplete data
```

## 🔧 Nível 4: Diagramas de Código

### Class Diagram - Core Classes
```mermaid
classDiagram
    class ExpressApp {
        +express: Express
        +port: number
        +api: AviationStackAPI
        +cacheManager: CacheManager
        +setupMiddlewares()
        +setupRoutes()
        +start()
    }

    class AviationStackAPI {
        -baseUrl: string
        -apiKey: string
        -lastRequestTime: number
        -rateLimitDelay: number
        +makeRequest(endpoint, params) Promise~any~
        +getRealTimeFlights(params) Promise~FlightData[]~
        +getAirports(params) Promise~AirportData[]~
        +getAirlines(params) Promise~AirlineData[]~
        +searchFlightsByAirline(code, limit) Promise~FlightData[]~
        +searchFlightsByRoute(dep, arr, limit) Promise~FlightData[]~
    }

    class CacheManager {
        -cache: Map
        -TTL: number
        -openFlightsBaseUrl: string
        +isExpired(key) boolean
        +setCacheData(key, data) void
        +getCacheData(key) any
        +getAirports() Promise~AirportData[]~
        +getAirlines() Promise~AirlineData[]~
        +searchAirports(query, limit) AirportData[]
        +searchAirlines(query, limit) AirlineData[]
        +parseCSVLine(line) string[]
        +parseAirportsData(csvData) AirportData[]
    }

    class BuildSystem {
        +minifyJS(input, output) Promise~void~
        +minifyCSS(input, output) Promise~void~
        +minifyHTML(input, output) Promise~void~
        +copyAssets() Promise~void~
        +build() Promise~void~
    }

    ExpressApp --> AviationStackAPI : uses
    ExpressApp --> CacheManager : uses
    ExpressApp --> BuildSystem : build-time
    CacheManager --> "Map~string,CacheEntry~" : stores
    AviationStackAPI --> "axios" : http-client
```

### Data Models
```mermaid
erDiagram
    AirportData {
        string iata_code PK
        string icao_code
        string airport_name
        string city_name
        string country_name
        string timezone
        number latitude
        number longitude
    }

    AirlineData {
        string iata_code PK
        string icao_code
        string airline_name
        string country_name
        string callsign
    }

    FlightData {
        string flight_date
        string flight_status
        object departure
        object arrival
        object airline
        object flight
        object aircraft
        object live
    }

    CacheEntry {
        any data
        number timestamp
        number ttl
    }

    AirportData ||--o{ CacheEntry : cached_in
    AirlineData ||--o{ CacheEntry : cached_in
```

## 📊 Diagramas de Fluxo de Dados

### Data Flow Overview - Sistema Completo
```mermaid
graph TD
    subgraph "External Data Sources"
        AS[AviationStack API<br/>📊 Real-time flights]
        OF[OpenFlights CSV<br/>📋 Static airports/airlines]
    end
    
    subgraph "Application Layer"
        subgraph "Data Access"
            AC[Aviation Client<br/>🛩️ Rate limited requests]
            CM[Cache Manager<br/>💾 24h TTL cache]
        end
        
        subgraph "Business Logic"
            RH[Route Handlers<br/>🛤️ API endpoints]
            SS[Search Service<br/>🔍 Multi-field search]
        end
        
        subgraph "Presentation"
            API[REST API<br/>📡 JSON responses]
            WEB[Web Interface<br/>🌐 HTML/CSS/JS]
        end
    end
    
    subgraph "Users"
        U1[Web Users<br/>👥 Interactive queries]
        U2[API Consumers<br/>🔌 Programmatic access]
    end

    AS -->|Rate limited<br/>1 req/min| AC
    OF -->|Daily download<br/>CSV parsing| CM
    
    AC --> RH
    CM --> RH
    CM --> SS
    
    RH --> API
    SS --> API
    RH --> WEB
    
    API --> U2
    WEB --> U1
```

### Cache Data Flow - Detailed
```mermaid
graph TD
    A[Application Start] --> B{Cache Check}
    B -->|Empty| C[First Load]
    B -->|Exists| D{TTL Valid?}
    
    D -->|Valid| E[Use Cache]
    D -->|Expired| F[Refresh Needed]
    
    C --> G[Download OpenFlights]
    F --> G
    
    G --> H{Download Success?}
    H -->|Yes| I[Parse CSV Data]
    H -->|No| J[Use Static Fallback]
    
    I --> K[Validate Data]
    K --> L[Filter Invalid Records]
    L --> M[Store in Memory Cache]
    
    J --> M
    M --> N[Ready for Queries]
    E --> N
    
    N --> O[Search Operations]
    O --> P[Return Results]
    
    Q[24h Timer] --> R[Mark Cache Stale]
    R --> D
```

### API Request Flow - Rate Limiting
```mermaid
graph TD
    A[API Request] --> B[Rate Limiter Check]
    B --> C{Last Request > 60s ago?}
    
    C -->|Yes| D[Execute Immediately]
    C -->|No| E[Calculate Wait Time]
    
    E --> F[Log Wait Message]
    F --> G[setTimeout(waitTime)]
    G --> H[Execute After Wait]
    
    D --> I[HTTP Request to AviationStack]
    H --> I
    
    I --> J{Response Status}
    J -->|200| K[Parse JSON Response]
    J -->|4xx/5xx| L[Handle HTTP Error]
    
    K --> M{API Error Field?}
    M -->|No| N[Return Data]
    M -->|Yes| O[Handle API Error]
    
    L --> P[Throw HTTP Exception]
    O --> Q[Throw API Exception]
    
    N --> R[Update Last Request Time]
    P --> S[Error Response]
    Q --> S
    R --> T[Success Response]
```

## 🐳 Diagramas de Infrastructure

### Docker Architecture - Multi-stage Build
```mermaid
graph TD
    subgraph "Build Pipeline"
        S1[Stage 1: dependencies<br/>📦 npm ci --only=production]
        S2[Stage 2: build<br/>🔨 npm ci + npm run build]
        S3[Stage 3: app<br/>🚀 Production runtime]
        S4[Stage 4: production<br/>🌐 Nginx + Node.js]
    end
    
    subgraph "Source Files"
        SRC[Source Code<br/>📁 *.js, *.html, *.css]
        PKG[package.json<br/>📋 Dependencies]
    end
    
    subgraph "Outputs"
        PROD[Production Image<br/>🐳 ~150MB]
        DEV[Development Image<br/>🛠️ ~200MB]
    end
    
    SRC --> S2
    PKG --> S1
    PKG --> S2
    
    S1 --> S3
    S2 --> S3
    S2 --> S4
    S1 --> S4
    
    S3 --> PROD
    S2 --> DEV
```

### Deployment Architecture - Docker Compose
```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "aviation-network (172.20.0.0/16)"
            subgraph "aviationstack-nginx"
                N[Nginx Container<br/>Port: 8080→80<br/>Health: /health]
            end
            
            subgraph "aviationstack-app"
                A[Node.js Container<br/>Port: 3000<br/>Health: /health<br/>User: aviationapp]
                
                subgraph "Application Components"
                    AC[Aviation Client]
                    CM[Cache Manager] 
                    MC[Memory Cache]
                end
            end
        end
        
        V1[Volume: nginx.conf]
        V2[Volume: .env file]
    end
    
    subgraph "External Services"
        EXT1[AviationStack API<br/>api.aviationstack.com]
        EXT2[OpenFlights Data<br/>raw.githubusercontent.com]
    end
    
    U[Users :8080] --> N
    N --> A
    A --> AC
    A --> CM
    CM --> MC
    
    V1 -.-> N
    V2 -.-> A
    
    AC --> EXT1
    CM --> EXT2
```

## 🔄 Diagramas de Estado

### Application Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Initializing: App Start
    
    Initializing --> Loading_Cache: Load dependencies
    Loading_Cache --> Cache_Loading: Download OpenFlights
    Loading_Cache --> Cache_Ready: Cache hit (valid)
    
    Cache_Loading --> Cache_Ready: CSV parsed successfully
    Cache_Loading --> Cache_Fallback: Download failed
    Cache_Fallback --> Cache_Ready: Static data loaded
    
    Cache_Ready --> Running: Server listening
    
    Running --> API_Request: User request
    API_Request --> Rate_Check: Check rate limit
    
    Rate_Check --> Processing: Rate limit OK
    Rate_Check --> Waiting: Rate limit exceeded
    Waiting --> Processing: Wait complete
    
    Processing --> Running: Response sent
    Processing --> Error_State: Request failed
    Error_State --> Running: Error handled
    
    Running --> Cache_Refresh: TTL expired
    Cache_Refresh --> Cache_Loading: Refresh data
    
    Running --> Shutdown: SIGTERM/SIGINT
    Shutdown --> [*]: Graceful exit
```

### Cache State Machine
```mermaid
stateDiagram-v2
    [*] --> Empty: Cache initialized
    
    Empty --> Loading: First data request
    Loading --> Fresh: Data loaded successfully
    Loading --> Error: Download/parse failed
    
    Error --> Fallback: Use static data
    Fallback --> Fresh: Retry successful
    
    Fresh --> Serving: Cache available
    Serving --> Fresh: Within TTL
    Serving --> Stale: TTL expired
    
    Stale --> Loading: Background refresh
    Stale --> Serving: Continue serving stale
    
    Fresh --> [*]: App shutdown
    Serving --> [*]: App shutdown
    Stale --> [*]: App shutdown
```

## 📱 Diagramas de Interface

### Frontend Component Structure
```mermaid
graph TD
    subgraph "HTML Structure"
        H[index.html<br/>📄 Main page structure]
        H --> NAV[Navigation Tabs<br/>🗂️ flights | airlines | airports | routes]
        H --> MAIN[Main Content<br/>📋 Tab-based sections]
        H --> FOOTER[API Info Footer<br/>ℹ️ Documentation]
    end
    
    subgraph "JavaScript Components"
        APP[app.js<br/>⚡ Main application logic]
        AUTO[autocomplete.js<br/>🔍 Search functionality]
        
        APP --> TAB[Tab Management]
        APP --> FORM[Form Handling]
        APP --> API_CALLS[API Communication]
        
        AUTO --> DEBOUNCE[Debounced Search]
        AUTO --> RESULTS[Results Rendering]
    end
    
    subgraph "Styling"
        TW[Tailwind CSS<br/>🎨 Via CDN]
        CUSTOM[styles.css<br/>✨ Custom styles]
    end
    
    subgraph "Icons & Assets"
        LUCIDE[Lucide Icons<br/>🎯 Via CDN]
    end
    
    H --> APP
    H --> AUTO
    H --> TW
    H --> CUSTOM
    H --> LUCIDE
```

### User Interaction Flow
```mermaid
graph TD
    A[User Opens App] --> B[Load HTML Page]
    B --> C[Initialize JavaScript]
    C --> D[Setup Event Listeners]
    D --> E[App Ready]
    
    E --> F{User Action}
    
    F -->|Tab Click| G[Switch Tab]
    F -->|Search Form| H[Validate Input]
    F -->|Autocomplete| I[Debounced Search]
    
    G --> J[Update UI State]
    H --> K{Valid Input?}
    I --> L[API Call]
    
    K -->|Yes| M[API Call]
    K -->|No| N[Show Validation Error]
    
    L --> O[Display Results]
    M --> O
    O --> E
    
    N --> E
    J --> E
```

## 🚀 Performance Flow Diagrams

### Request Performance - Hot Path
```mermaid
gantt
    title Request Performance Timeline
    dateFormat X
    axisFormat %Lms

    section Cached Data Request
    DNS Resolution     :0, 5
    TCP Handshake     :5, 10  
    HTTP Request      :10, 15
    Route Handling    :15, 17
    Cache Lookup      :17, 20
    Search Execution  :20, 25
    JSON Serialization :25, 28
    HTTP Response     :28, 35

    section API Request (No Rate Limit)
    DNS Resolution     :0, 5
    TCP Handshake     :5, 10
    HTTP Request      :10, 15
    Route Handling    :15, 17
    External API Call :17, 2000
    Response Processing :2000, 2010
    JSON Serialization :2010, 2015
    HTTP Response     :2015, 2020

    section API Request (Rate Limited)
    DNS Resolution     :0, 5
    TCP Handshake     :5, 10
    HTTP Request      :10, 15
    Route Handling    :15, 17
    Rate Limit Wait   :17, 60017
    External API Call :60017, 62017
    Response Processing :62017, 62027
    JSON Serialization :62027, 62032
    HTTP Response     :62032, 62037
```

### Memory Usage Over Time
```mermaid
xychart-beta
    title "Memory Usage Pattern"
    x-axis ["App Start", "Cache Load", "Normal Operation", "Cache Refresh", "Peak Usage"]
    y-axis "Memory (MB)" 0 --> 120
    line [25, 85, 80, 95, 110]
```

## 🔍 Monitoring Dashboards

### System Health Overview
```mermaid
pie title System Health Status
    "Healthy" : 85
    "Warning" : 10
    "Error" : 5
```

### API Usage Breakdown
```mermaid
pie title Request Distribution
    "Cached Data (airports/airlines)" : 70
    "Real-time Flights" : 25
    "Health Checks" : 5
```

### Cache Performance
```mermaid
xychart-beta
    title "Cache Hit Ratio Over Time"
    x-axis ["Hour 1", "Hour 6", "Hour 12", "Hour 18", "Hour 24"]
    y-axis "Hit Ratio %" 0 --> 100
    line [60, 85, 95, 97, 95]
```

## 🎯 Diagramas de Deploy

### CI/CD Pipeline (Recomendado)
```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Build Multi-stage Image]
    C --> D[Run Tests]
    D --> E[Security Scan]
    E --> F[Push to Registry]
    F --> G[Deploy to Staging]
    G --> H[Integration Tests]
    H --> I[Deploy to Production]
    
    C --> C1[Stage 1: Dependencies]
    C --> C2[Stage 2: Build]
    C --> C3[Stage 3: App]
    C --> C4[Stage 4: Production]
    
    C1 --> D
    C2 --> D
    C3 --> D
    C4 --> D
```

### Kubernetes Deployment (k8s-deployment.yaml)
```mermaid
graph TD
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: aviationstack"
            subgraph "Deployment"
                POD1[Pod 1<br/>aviationstack-app]
                POD2[Pod 2<br/>aviationstack-app]
            end
            
            SVC[Service<br/>Load Balancer]
            ING[Ingress<br/>External Access]
            
            subgraph "ConfigMaps"
                CM1[nginx-config]
                CM2[app-config]
            end
            
            subgraph "Secrets"
                SEC1[aviationstack-api-key]
            end
        end
    end
    
    EXT[External Traffic] --> ING
    ING --> SVC
    SVC --> POD1
    SVC --> POD2
    
    POD1 --> CM1
    POD1 --> CM2
    POD1 --> SEC1
    POD2 --> CM1
    POD2 --> CM2
    POD2 --> SEC1
```

## 🎨 Frontend Architecture Diagrams

### Component Hierarchy - Frontend
```mermaid
graph TD
    subgraph "Document Structure"
        HTML[index.html]
        
        HTML --> HEADER[Header Component<br/>🎯 Branding + Title]
        HTML --> NAV[Navigation Component<br/>🗂️ Tab System]
        HTML --> MAIN[Main Content<br/>📋 Tab Panels]
        HTML --> FOOTER[Footer Component<br/>ℹ️ API Documentation]
    end
    
    subgraph "JavaScript Modules"
        APP[app.js<br/>⚡ Core Logic]
        AUTO[autocomplete.js<br/>🔍 Search Logic]
        
        APP --> TAB_MGR[Tab Manager]
        APP --> FORM_MGR[Form Manager] 
        APP --> API_CLIENT[API Client]
        APP --> RESULT_RENDERER[Result Renderer]
        
        AUTO --> DEBOUNCER[Input Debouncer]
        AUTO --> SEARCHER[Search Handler]
        AUTO --> SUGGESTER[Suggestion Renderer]
    end
    
    subgraph "External Dependencies"
        TAILWIND[Tailwind CSS<br/>🎨 CDN]
        LUCIDE[Lucide Icons<br/>🎯 CDN]
    end
    
    HTML --> APP
    HTML --> AUTO
    HTML --> TAILWIND
    HTML --> LUCIDE
```

### User Journey Flow
```mermaid
journey
    title User Journey - Flight Search
    section Arrival
      Open App: 5: User
      Load Interface: 4: System
      Display Options: 5: User
    section Search Setup  
      Select Tab: 5: User
      Enter Airline Code: 4: User
      Autocomplete Suggestion: 5: System
    section Data Retrieval
      Submit Search: 5: User
      Rate Limit Check: 3: System
      Wait for API: 2: User
      Display Results: 5: User
    section Exploration
      View Flight Details: 5: User
      Search Another Route: 4: User
      Compare Airlines: 4: User
```

## 📊 Architecture Decision Flow

### Decision Impact Map
```mermaid
mindmap
  root((AviationStack App<br/>Architecture))
    
    Data Strategy
      OpenFlights Source
        Free & Comprehensive
        Static Fallback
        CSV Processing
      Memory Cache
        24h TTL
        Instant Search
        No External Deps
      Rate Limiting
        1 req/min compliance
        Automatic waiting
        User feedback
    
    Container Strategy
      Multi-stage Build
        Size Optimization
        Security Hardening
        Environment Separation
      Docker Compose
        Development Profile
        Production Profile
        Network Isolation
      Nginx Proxy
        Load Balancing
        Static Serving
        Health Monitoring
    
    Technology Choices
      Node.js + Express
        Rapid Development
        Rich Ecosystem
        Container Friendly
      Vanilla Frontend
        No Build Complexity
        CDN Dependencies
        Progressive Enhancement
      Alpine Linux
        Small Base Image
        Security Updates
        Performance
```

## 🎯 Future Architecture Evolution

### Microservices Migration Path
```mermaid
graph TD
    subgraph "Current: Monolith"
        M[Single Node.js App<br/>All components together]
    end
    
    subgraph "Phase 1: Service Extraction"
        API[API Gateway]
        CACHE[Cache Service]
        AVIATION[Aviation Service]
        WEB[Web Frontend]
        
        API --> CACHE
        API --> AVIATION
        API --> WEB
    end
    
    subgraph "Phase 2: Data Layer"
        REDIS[Redis Cache]
        POSTGRES[PostgreSQL]
        KAFKA[Event Streaming]
        
        CACHE --> REDIS
        AVIATION --> POSTGRES
        AVIATION --> KAFKA
    end
    
    subgraph "Phase 3: Cloud Native"
        K8S[Kubernetes]
        ISTIO[Service Mesh]
        MONITORING[Observability Stack]
        
        K8S --> ISTIO
        K8S --> MONITORING
    end
    
    M --> API
    API --> REDIS
    REDIS --> K8S
```

### Scalability Evolution
```mermaid
graph LR
    subgraph "Current Capacity"
        C1[Single Instance<br/>~100 concurrent users<br/>Memory cache only]
    end
    
    subgraph "Horizontal Scale"
        C2[Multiple Instances<br/>~1000 concurrent users<br/>Shared Redis cache]
    end
    
    subgraph "Distributed Scale"  
        C3[Microservices<br/>~10K concurrent users<br/>Database + Event streaming]
    end
    
    subgraph "Global Scale"
        C4[Multi-region<br/>~100K concurrent users<br/>CDN + Edge computing]
    end
    
    C1 -->|Load increases| C2
    C2 -->|Complexity increases| C3  
    C3 -->|Global users| C4
```

---
*Documentação gerada em: 2024-01-15*