import axios from 'axios';

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.TTL = 24 * 60 * 60 * 1000; // 24 horas em ms
        this.openFlightsBaseUrl = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data';
    }

    isExpired(key) {
        const cached = this.cache.get(key);
        if (!cached) return true;
        
        const now = Date.now();
        return (now - cached.timestamp) > this.TTL;
    }

    setCacheData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    getCacheData(key) {
        const cached = this.cache.get(key);
        return cached ? cached.data : null;
    }

    async getAirports() {
        const cacheKey = 'airports';
        
        if (!this.isExpired(cacheKey)) {
            console.log('📋 Usando aeroportos do cache');
            return this.getCacheData(cacheKey);
        }

        console.log('🔄 Carregando aeroportos do OpenFlights...');
        
        try {
            // OpenFlights airports data
            const response = await axios.get(`${this.openFlightsBaseUrl}/airports.dat`, {
                timeout: 10000
            });
            
            const airports = this.parseAirportsData(response.data);
            this.setCacheData(cacheKey, airports);
            
            console.log(`✅ ${airports.length} aeroportos carregados e armazenados em cache`);
            return airports;
            
        } catch (error) {
            console.error('❌ Erro ao carregar aeroportos do OpenFlights:', error.message);
            
            // Fallback: tentar nossa própria API
            try {
                console.log('🔄 Tentando fallback para AviationStack...');
                const fallbackData = await this.getFallbackAirports();
                this.setCacheData(cacheKey, fallbackData);
                return fallbackData;
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError.message);
                return [];
            }
        }
    }

    async getAirlines() {
        const cacheKey = 'airlines';
        
        if (!this.isExpired(cacheKey)) {
            console.log('📋 Usando companhias do cache');
            return this.getCacheData(cacheKey);
        }

        console.log('🔄 Carregando companhias do OpenFlights...');
        
        try {
            const response = await axios.get(`${this.openFlightsBaseUrl}/airlines.dat`, {
                timeout: 10000
            });
            
            const airlines = this.parseAirlinesData(response.data);
            this.setCacheData(cacheKey, airlines);
            
            console.log(`✅ ${airlines.length} companhias carregadas e armazenadas em cache`);
            return airlines;
            
        } catch (error) {
            console.error('❌ Erro ao carregar companhias do OpenFlights:', error.message);
            
            try {
                console.log('🔄 Tentando fallback para AviationStack...');
                const fallbackData = await this.getFallbackAirlines();
                this.setCacheData(cacheKey, fallbackData);
                return fallbackData;
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError.message);
                return [];
            }
        }
    }

    parseAirportsData(csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        const airports = [];

        for (const line of lines) {
            try {
                // OpenFlights format: ID,Name,City,Country,IATA,ICAO,Latitude,Longitude,Altitude,Timezone,DST,Tz,Type,Source
                const fields = this.parseCSVLine(line);
                
                if (fields.length >= 14 && fields[4] && fields[4] !== '\\N') {
                    airports.push({
                        iata_code: fields[4],
                        icao_code: fields[5] !== '\\N' ? fields[5] : null,
                        airport_name: fields[1].replace(/"/g, ''),
                        city_name: fields[2].replace(/"/g, ''),
                        country_name: fields[3].replace(/"/g, ''),
                        timezone: fields[11] !== '\\N' ? fields[11] : null,
                        latitude: parseFloat(fields[6]) || null,
                        longitude: parseFloat(fields[7]) || null
                    });
                }
            } catch (error) {
                // Skip malformed lines
                continue;
            }
        }

        return airports.filter(airport => 
            airport.iata_code && 
            airport.iata_code.length === 3 &&
            airport.airport_name
        );
    }

    parseAirlinesData(csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        const airlines = [];

        for (const line of lines) {
            try {
                // OpenFlights format: ID,Name,Alias,IATA,ICAO,Callsign,Country,Active
                const fields = this.parseCSVLine(line);
                
                if (fields.length >= 8 && fields[3] && fields[3] !== '\\N' && fields[7] === 'Y') {
                    airlines.push({
                        iata_code: fields[3],
                        icao_code: fields[4] !== '\\N' ? fields[4] : null,
                        airline_name: fields[1].replace(/"/g, ''),
                        country_name: fields[6].replace(/"/g, ''),
                        callsign: fields[5] !== '\\N' ? fields[5] : null
                    });
                }
            } catch (error) {
                continue;
            }
        }

        return airlines.filter(airline => 
            airline.iata_code && 
            airline.iata_code.length >= 2 &&
            airline.airline_name
        );
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    async getFallbackAirports() {
        // Minimal static list as absolute fallback
        return [
            { iata_code: 'GRU', airport_name: 'Guarulhos International Airport', city_name: 'São Paulo', country_name: 'Brazil' },
            { iata_code: 'SDU', airport_name: 'Santos Dumont', city_name: 'Rio de Janeiro', country_name: 'Brazil' },
            { iata_code: 'CGH', airport_name: 'Congonhas', city_name: 'São Paulo', country_name: 'Brazil' },
            { iata_code: 'GIG', airport_name: 'Galeão', city_name: 'Rio de Janeiro', country_name: 'Brazil' },
            { iata_code: 'JFK', airport_name: 'John F. Kennedy International Airport', city_name: 'New York', country_name: 'United States' },
            { iata_code: 'LAX', airport_name: 'Los Angeles International Airport', city_name: 'Los Angeles', country_name: 'United States' }
        ];
    }

    async getFallbackAirlines() {
        return [
            { iata_code: 'G3', airline_name: 'GOL', country_name: 'Brazil' },
            { iata_code: 'JJ', airline_name: 'TAM', country_name: 'Brazil' },
            { iata_code: 'AD', airline_name: 'Azul', country_name: 'Brazil' },
            { iata_code: 'AA', airline_name: 'American Airlines', country_name: 'United States' },
            { iata_code: 'DL', airline_name: 'Delta Air Lines', country_name: 'United States' }
        ];
    }

    // Search methods for autocomplete
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

    searchAirlines(query, limit = 10) {
        const airlines = this.getCacheData('airlines') || [];
        const normalizedQuery = query.toLowerCase();
        
        return airlines
            .filter(airline => 
                airline.airline_name?.toLowerCase().includes(normalizedQuery) ||
                airline.iata_code?.toLowerCase().includes(normalizedQuery) ||
                airline.icao_code?.toLowerCase().includes(normalizedQuery)
            )
            .slice(0, limit);
    }
}

export default CacheManager;