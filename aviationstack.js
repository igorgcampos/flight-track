import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class AviationStackAPI {
  constructor() {
    this.baseUrl = 'https://api.aviationstack.com/v1';
    this.apiKey = process.env.AVIATIONSTACK_API_KEY;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 60000; // 1 minuto em ms
  }

  async makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
      throw new Error('API key não configurada. Configure AVIATIONSTACK_API_KEY no arquivo .env');
    }

    // Rate limiting - aguardar 1 minuto entre requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay && this.lastRequestTime > 0) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`Aguardando ${Math.ceil(waitTime / 1000)}s devido ao rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const requestParams = {
      access_key: this.apiKey,
      ...params
    };

    const url = `${this.baseUrl}/${endpoint}`;
    
    console.log(`🔄 Fazendo requisição para: ${url}`);
    console.log(`📝 Parâmetros:`, requestParams);
    
    try {
      this.lastRequestTime = Date.now();
      const response = await axios.get(url, { params: requestParams });
      
      console.log(`✅ Resposta HTTP ${response.status}:`, response.data);
      
      const data = response.data;
      
      if (data.error) {
        console.error(`❌ Erro da API:`, data.error);
        if (data.error.code === 'function_access_restricted') {
          throw new Error(`Esta função não está disponível no plano gratuito: ${data.error.message}`);
        }
        throw new Error(`Erro da API: ${data.error.message || 'Erro desconhecido'}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Erro na requisição:', error.message);
      if (error.response) {
        console.error(`❌ Status HTTP: ${error.response.status}`);
        console.error(`❌ Response data:`, error.response.data);
        console.error(`❌ Response headers:`, error.response.headers);
        
        // Tratar erro específico de função restrita
        if (error.response.data && error.response.data.error && error.response.data.error.code === 'function_access_restricted') {
          throw new Error(`Esta função não está disponível no plano gratuito: ${error.response.data.error.message}`);
        }
        
        throw new Error(`Erro HTTP: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  }

  async getRealTimeFlights(params = {}) {
    return await this.makeRequest('flights', params);
  }

  async getAirports(params = {}) {
    return await this.makeRequest('airports', params);
  }

  async getAirlines(params = {}) {
    return await this.makeRequest('airlines', params);
  }

  async getRoutes(params = {}) {
    return await this.makeRequest('routes', params);
  }

  async getAircraft(params = {}) {
    return await this.makeRequest('aircraft', params);
  }

  async searchFlightsByAirline(airlineCode, limit = 10) {
    return await this.getRealTimeFlights({
      airline_iata: airlineCode,
      limit: limit
    });
  }

  async searchFlightsByRoute(departure, arrival, limit = 10) {
    return await this.getRealTimeFlights({
      dep_iata: departure,
      arr_iata: arrival,
      limit: limit
    });
  }

  async searchAirportByCode(code) {
    return await this.getAirports({
      search: code
    });
  }
}

export default AviationStackAPI;