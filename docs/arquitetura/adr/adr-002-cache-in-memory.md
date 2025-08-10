# ADR-002: Cache In-Memory com Fallback

## Status
**Status**: ✅ Aceito  
**Data**: 2024-01-15  
**Responsáveis**: Equipe de Desenvolvimento  
**Relacionado**: ADR-001 (Arquitetura Monolítica), ADR-005 (OpenFlights Data Source)

## Contexto

A AviationStack API no plano gratuito possui limitações significativas que impactam a experiência do usuário:
- **Rate limiting**: 1 requisição por minuto
- **Funcionalidades limitadas**: Alguns endpoints são pagos
- **Autocomplete**: Não disponível no plano gratuito

Para fornecer uma experiência de usuário fluida com funcionalidades de autocomplete e busca rápida, precisamos de uma estratégia de cache que:
1. Reduza dependência da API paga
2. Forneça dados para autocomplete instantâneo
3. Mantenha dados atualizados
4. Tenha fallback para alta disponibilidade

### Dados que Precisam de Cache
- **Aeroportos**: ~7,700 registros, dados relativamente estáticos
- **Companhias aéreas**: ~6,100 registros, mudanças pouco frequentes
- **Autocomplete**: Necessário para UX responsiva

## Decisão

**Implementar cache in-memory usando JavaScript Map** com estratégia de fallback hierárquica e TTL de 24 horas.

### Arquitetura Escolhida
```javascript
// cache-manager.js - Implementação
class CacheManager {
  constructor() {
    this.cache = new Map();                    // Primary cache
    this.TTL = 24 * 60 * 60 * 1000;          // 24 horas
    this.openFlightsBaseUrl = '...';           // Fallback source
  }
  
  // Cache-aside pattern
  async getData(key) {
    if (!this.isExpired(key)) return this.getCacheData(key);
    
    try {
      const data = await this.fetchFromExternalSource();
      this.setCacheData(key, data);
      return data;
    } catch (error) {
      return this.getFallbackData();           // Static fallback
    }
  }
}
```

### Estratégia de Fallback
1. **Memory Cache** (primeiro) - Dados em memória com TTL
2. **OpenFlights CSV** (segundo) - Download de dados públicos  
3. **Static Fallback** (último) - Lista hardcoded de dados críticos

## Alternativas Consideradas

### Opção 1: Redis Cache (Rejeitada)
```javascript
// Cache distribuído com Redis
class RedisCacheManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
}
```

**Por que rejeitada**:
- ❌ **Complexity**: Adiciona dependência externa
- ❌ **Infrastructure**: Precisa de Redis server
- ❌ **Overkill**: Projeto não precisa de cache distribuído
- ❌ **Cost**: Adiciona custo de infraestrutura

### Opção 2: File System Cache (Rejeitada)
```javascript
// Cache em arquivos JSON no filesystem
class FileCacheManager {
  async setCacheData(key, data) {
    await fs.writeFile(`./cache/${key}.json`, JSON.stringify(data));
  }
}
```

**Por que rejeitada**:
- ❌ **Performance**: I/O disk mais lento que memória
- ❌ **Complexity**: Gerenciamento de arquivos e locks
- ❌ **Container concerns**: Volumes para persistência

### Opção 3: Database Cache (Rejeitada)
```javascript
// Cache em SQLite/PostgreSQL
class DatabaseCacheManager {
  async setCacheData(key, data) {
    await this.db.query('INSERT OR REPLACE INTO cache ...');
  }
}
```

**Por que rejeitada**:
- ❌ **Overkill**: Database para dados temporários
- ❌ **Infrastructure**: Adiciona banco de dados
- ❌ **Complexity**: Schema management, migrations

### Opção 4: No Cache (Rejeitada)
```javascript
// Sempre consultar APIs externas
class NoCache {
  async getData() {
    return await this.apiClient.fetch();
  }
}
```

**Por que rejeitada**:
- ❌ **Rate limiting**: Impossível fornecer autocomplete
- ❌ **Performance**: Latência alta para dados estáticos
- ❌ **Availability**: Dependência total de APIs externas
- ❌ **User Experience**: Sem busca instantânea

## Consequências

### Positivas ✅

#### Performance
- **Sub-10ms search**: Busca instantânea em dados cached
- **Zero API calls**: Para dados estáticos (aeroportos/companhias)
- **Autocomplete responsivo**: Typing experience fluida
- **Bandwidth saving**: Download único vs múltiplas API calls

#### Availability  
- **Offline capable**: Funciona mesmo se OpenFlights estiver down
- **Graceful degradation**: Fallback para dados estáticos essenciais
- **Independent from AviationStack**: Cache não depende da API paga

#### User Experience
- **Instant search**: Autocomplete sem latência
- **Broader dataset**: OpenFlights tem mais dados que API gratuita
- **Predictable performance**: Sem espera por rate limits

#### Development
- **Simple implementation**: JavaScript Map é nativo
- **No external dependencies**: Sem Redis, databases, etc.
- **Easy debugging**: Cache state inspecionável

### Negativas ⚠️

#### Memory Usage
- **RAM consumption**: ~3MB para datasets completos
- **Container sizing**: Precisa considerar memória para cache
- **Memory leaks**: Risk se cache crescer indefinidamente

#### Scalability
- **Single instance limitation**: Cache não compartilhado entre instâncias
- **Horizontal scaling**: Cada instância precisa carregar próprio cache
- **Memory constraints**: Limitado pela RAM disponível

#### Persistence
- **Cache loss on restart**: Dados perdidos em deploy/restart
- **Cold start**: Primeira requisição após restart é lenta (cache miss)
- **No durability**: Crash = perda de cache

#### Data Freshness
- **24h TTL**: Dados podem estar desatualizados por até 24h
- **No real-time updates**: Mudanças em aeroportos/companhias demoram para aparecer
- **Manual refresh**: Sem trigger automático para refresh

## Implementação

### Cache Structure
```javascript
// cache-manager.js:5-6 - Storage configuration
this.cache = new Map();                    // Native JavaScript Map
this.TTL = 24 * 60 * 60 * 1000;          // 24 hour TTL

// Entrada no cache:
this.cache.set('airports', {
  data: [/* array de aeroportos */],
  timestamp: Date.now()
});
```

### TTL Management
```javascript
// cache-manager.js:10-16 - Expiration check
isExpired(key) {
  const cached = this.cache.get(key);
  if (!cached) return true;                 // Cache miss
  
  const age = Date.now() - cached.timestamp;
  return age > this.TTL;                    // Expired if > 24h
}
```

### Fallback Implementation
```javascript
// cache-manager.js:190-210 - Static fallback data
async getFallbackAirports() {
  return [
    { iata_code: 'GRU', airport_name: 'Guarulhos International Airport', ... },
    { iata_code: 'SDU', airport_name: 'Santos Dumont', ... },
    { iata_code: 'JFK', airport_name: 'John F. Kennedy International Airport', ... },
    // Aeroportos críticos para funcionalidade mínima
  ];
}
```

### Search Implementation
```javascript
// cache-manager.js:213-225 - Multi-field search
searchAirports(query, limit = 10) {
  const airports = this.getCacheData('airports') || [];
  const normalizedQuery = query.toLowerCase();
  
  return airports
    .filter(airport => 
      airport.airport_name?.toLowerCase().includes(normalizedQuery) ||
      airport.city_name?.toLowerCase().includes(normalizedQuery) ||
      airport.iata_code?.toLowerCase().includes(normalizedQuery) ||
      airport.icao_code?.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}
```

## Monitoramento e Métricas

### Cache Performance Metrics
```javascript
// Métricas implementadas via /api/cache/preload:
{
  message: 'Cache precarregado com sucesso',
  airports_count: 7700,
  airlines_count: 6100,
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

### Recommended Additional Metrics
```javascript
// Métricas recomendadas para implementação futura:
const CACHE_METRICS = {
  hit_ratio: 0.95,              // Cache hit percentage
  miss_penalty: '2-5s',         // Time to load on miss
  memory_usage: '3MB',          // Current memory footprint
  search_latency: '<10ms',      // Average search time
  refresh_frequency: '1/day'    // Actual refresh rate
};
```

## Plano de Evolução

### Short-term (1-3 meses)
- ✅ **Implementado**: Cache básico funcional
- 🔄 **Próximo**: Métricas de performance
- 📋 **Planejado**: Cache preloading no startup

### Medium-term (3-6 meses)
- **Cache warming**: Background refresh antes da expiração
- **Memory optimization**: Compact data structures
- **Cache analytics**: Detailed usage metrics

### Long-term (6+ meses)
- **Redis migration**: Se escalabilidade for necessária
- **Cache partitioning**: Por região geográfica
- **Real-time updates**: WebSocket para mudanças críticas

## Riscos e Mitigações

### Risk: Memory Exhaustion
**Probabilidade**: Baixa  
**Impacto**: Alto  
**Mitigação**: 
- Monitoring de memory usage
- Container memory limits
- Graceful degradation para fallback

### Risk: Cache Staleness
**Probabilidade**: Média  
**Impacto**: Baixo  
**Mitigação**:
- TTL de 24h (dados de aeroportos mudam raramente)
- Manual refresh endpoint disponível
- Logs para tracking de refresh

### Risk: OpenFlights Unavailability
**Probabilidade**: Baixa  
**Impacto**: Baixo  
**Mitigação**:
- Static fallback implementado
- Cache persiste dados existentes
- GitHub tem alta disponibilidade

## Validação da Decisão

### Critérios de Sucesso ✅
1. **Performance**: Autocomplete < 10ms ✅
2. **Availability**: Funciona offline ✅  
3. **Simplicity**: Single dependency (axios) ✅
4. **Memory**: < 10MB usage ✅
5. **UX**: Busca instantânea ✅

### Métricas de Monitoramento
- **Cache hit ratio**: Target > 90%
- **Search performance**: Target < 10ms
- **Memory growth**: Monitor for leaks
- **Refresh success**: Monitor OpenFlights availability

---
*ADR documentado em: 2024-01-15*