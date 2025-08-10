import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import AviationStackAPI from './aviationstack.js';
import CacheManager from './cache-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const api = new AviationStackAPI();
const cacheManager = new CacheManager();

app.use(compression());
app.use(express.json());
const staticPath = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
app.use(express.static(staticPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Página inicial com interface web moderna
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, staticPath, 'index.html'));
});

// API Routes
app.get('/api/flights', async (req, res) => {
  try {
    const params = req.query;
    const data = await api.getRealTimeFlights(params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/flights/airline/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const limit = req.query.limit || 10;
    const data = await api.searchFlightsByAirline(code, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/flights/route/:departure/:arrival', async (req, res) => {
  try {
    const { departure, arrival } = req.params;
    const limit = req.query.limit || 10;
    const data = await api.searchFlightsByRoute(departure, arrival, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/airports', async (req, res) => {
  try {
    const params = req.query;
    const data = await api.getAirports(params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/airports/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const data = await api.searchAirportByCode(code);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/airlines', async (req, res) => {
  try {
    const params = req.query;
    const data = await api.getAirlines(params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/routes', async (req, res) => {
  try {
    const params = req.query;
    const data = await api.getRoutes(params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/aircraft', async (req, res) => {
  try {
    const params = req.query;
    const data = await api.getAircraft(params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Autocomplete endpoints
app.get('/api/autocomplete/airports', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 10;
    
    if (query.length < 1) {
      return res.json({ data: [], message: 'Query muito curta' });
    }

    // Ensure airports are loaded in cache
    await cacheManager.getAirports();
    
    // Search in cache
    const results = cacheManager.searchAirports(query, limit);
    
    res.json({
      data: results,
      count: results.length,
      query: query,
      source: 'OpenFlights + Cache'
    });
    
  } catch (error) {
    console.error('Erro no autocomplete de aeroportos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/autocomplete/airlines', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 10;
    
    if (query.length < 1) {
      return res.json({ data: [], message: 'Query muito curta' });
    }

    // Ensure airlines are loaded in cache
    await cacheManager.getAirlines();
    
    // Search in cache
    const results = cacheManager.searchAirlines(query, limit);
    
    res.json({
      data: results,
      count: results.length,
      query: query,
      source: 'OpenFlights + Cache'
    });
    
  } catch (error) {
    console.error('Erro no autocomplete de companhias:', error);
    res.status(500).json({ error: error.message });
  }
});

// Preload cache on startup (optional - loads data in background)
app.get('/api/cache/preload', async (req, res) => {
  try {
    console.log('🚀 Iniciando preload do cache...');
    
    const [airports, airlines] = await Promise.all([
      cacheManager.getAirports(),
      cacheManager.getAirlines()
    ]);
    
    res.json({
      message: 'Cache precarregado com sucesso',
      airports_count: airports.length,
      airlines_count: airlines.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🛩️  Servidor rodando em http://localhost:${port}`);
  console.log(`📋 API endpoints disponíveis em http://localhost:${port}/api/*`);
  console.log(`⚠️  Certifique-se de configurar a API key no arquivo .env`);
});