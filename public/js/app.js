// Modern Aviation Stack App JavaScript

class AviationApp {
    constructor() {
        this.currentTab = 'flights';
        this.init();
    }

    init() {
        this.initializeIcons();
        this.setupEventListeners();
        this.showTab('flights');
    }

    initializeIcons() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    formatTimeWithGMT(dateString) {
        if (!dateString) return 'Não informado';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Não informado';
        
        // Format time in Brazilian timezone (GMT-3)
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        };
        
        const formattedTime = date.toLocaleString('pt-BR', options);
        return `${formattedTime} <span class="timezone-info">(GMT-3)</span>`;
    }

    formatAirportName(airportName) {
        if (!airportName) return 'Não informado';
        
        // Capitalize and make names more elegant
        const formatted = airportName
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();
            
        return formatted;
    }

    analyzeFlightStatus(flight) {
        const status = flight.flight_status;
        const departure = flight.departure || {};
        const arrival = flight.arrival || {};
        
        // Get current time in Brazil (GMT-3)
        const now = new Date();
        const scheduledDeparture = departure.scheduled ? new Date(departure.scheduled) : null;
        const scheduledArrival = arrival.scheduled ? new Date(arrival.scheduled) : null;
        
        switch(status) {
            case 'cancelled':
                return { class: 'status-cancelled', text: 'Cancelado' };
                
            case 'active':
                return { class: 'status-active', text: 'Em Voo' };
                
            case 'landed':
                return { class: 'status-on-time', text: 'Aterrissou' };
                
            case 'delayed':
                return { class: 'status-delayed', text: 'Atrasado' };
                
            case 'incident':
                return { class: 'status-cancelled', text: 'Incidente' };
                
            case 'diverted':
                return { class: 'status-delayed', text: 'Desviado' };
                
            case 'scheduled':
                // Analyze if flight should still be "scheduled"
                if (scheduledDeparture) {
                    const timeDiff = now - scheduledDeparture;
                    const hoursDiff = timeDiff / (1000 * 60 * 60);
                    
                    if (hoursDiff > 2) {
                        // Flight was scheduled more than 2 hours ago
                        return { 
                            class: 'status-delayed', 
                            text: 'Status Desatualizado',
                            warning: true
                        };
                    } else if (hoursDiff > 0) {
                        // Flight time has passed but within 2 hours
                        return { 
                            class: 'status-delayed', 
                            text: 'Possivelmente em Voo' 
                        };
                    } else {
                        // Future flight
                        return { class: 'status-on-time', text: 'Programado' };
                    }
                }
                return { class: 'status-on-time', text: 'Programado' };
                
            default:
                return { class: 'status-active', text: status || 'Status Desconhecido' };
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.showTab('flights');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showTab('airlines');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showTab('airports');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showTab('routes');
                        break;
                }
            }
        });
    }

    showTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
    }

    showLoading(message = 'Carregando dados...') {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="results-container slide-in">
                <div class="loading">
                    <div class="loading-spinner mr-3"></div>
                    <span class="text-gray-600">${message}</span>
                </div>
            </div>
        `;
    }

    showError(error, title = 'Erro') {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="results-container slide-in">
                <div class="error-container">
                    <i data-lucide="alert-circle" class="error-icon"></i>
                    <div class="error-content">
                        <div class="error-title">${title}</div>
                        <div class="error-message">${error}</div>
                    </div>
                </div>
            </div>
        `;
        this.initializeIcons();
    }

    showSuccess(data, title, formatter = null) {
        const resultsDiv = document.getElementById('results');
        
        let content;
        if (formatter) {
            content = formatter(data);
        } else {
            content = this.formatGenericData(data);
        }

        resultsDiv.innerHTML = `
            <div class="results-container slide-in">
                <div class="results-header">
                    <h3 class="results-title">${title}</h3>
                    ${data.data ? `<span class="results-count">${data.data.length} resultado(s)</span>` : ''}
                </div>
                ${content}
            </div>
        `;
        this.initializeIcons();
    }

    formatGenericData(data) {
        if (!data || !data.data) {
            return '<p class="text-gray-500 text-center py-8">Nenhum dado encontrado</p>';
        }

        return `
            <div class="json-viewer">
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
    }

    formatFlightsData(data) {
        if (!data || !data.data || data.data.length === 0) {
            return '<p class="text-gray-500 text-center py-8">Nenhum voo encontrado</p>';
        }

        const flights = data.data.map(flight => {
            const departure = flight.departure || {};
            const arrival = flight.arrival || {};
            const airline = flight.airline || {};
            const aircraft = flight.aircraft || {};
            
            // Format times with GMT -3
            const departureTime = departure.scheduled ? 
                this.formatTimeWithGMT(departure.scheduled) : 'Não informado';
            const arrivalTime = arrival.scheduled ? 
                this.formatTimeWithGMT(arrival.scheduled) : 'Não informado';
            
            // Analyze flight status with time awareness
            const statusInfo = this.analyzeFlightStatus(flight);
            let statusClass = statusInfo.class;
            let statusText = statusInfo.text;

            return `
                <div class="flight-card">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-bold text-lg text-gray-800">
                                ${airline.name || 'Companhia não informada'}
                            </h4>
                            <p class="text-sm text-gray-600">
                                Voo ${flight.flight?.iata || flight.flight?.icao || 'N/A'}
                            </p>
                        </div>
                        <span class="${statusClass}">${statusText}</span>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="plane-takeoff" class="w-4 h-4 mr-1"></i>
                                Origem
                            </span>
                            <span class="data-value airport-name">
                                ${this.formatAirportName(departure.airport) || departure.iata || 'Não informado'}
                            </span>
                        </div>
                        
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="plane-landing" class="w-4 h-4 mr-1"></i>
                                Destino
                            </span>
                            <span class="data-value airport-name">
                                ${this.formatAirportName(arrival.airport) || arrival.iata || 'Não informado'}
                            </span>
                        </div>
                        
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="clock" class="w-4 h-4 mr-1"></i>
                                Partida
                            </span>
                            <span class="data-value time-display">${departureTime}</span>
                        </div>
                        
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="clock" class="w-4 h-4 mr-1"></i>
                                Chegada
                            </span>
                            <span class="data-value time-display">${arrivalTime}</span>
                        </div>
                        
                        ${departure.gate ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="door-open" class="w-4 h-4 mr-1"></i>
                                Portão
                            </span>
                            <span class="data-value">${departure.gate}</span>
                        </div>
                        ` : ''}
                        
                        ${arrival.terminal ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="building-2" class="w-4 h-4 mr-1"></i>
                                Terminal
                            </span>
                            <span class="data-value">${arrival.terminal}</span>
                        </div>
                        ` : ''}
                        
                        ${aircraft && aircraft.registration ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="settings" class="w-4 h-4 mr-1"></i>
                                Aeronave
                            </span>
                            <span class="data-value">${aircraft.registration}</span>
                        </div>
                        ` : ''}
                        
                        ${departure.delay ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="clock" class="w-4 h-4 mr-1 text-yellow-500"></i>
                                Atraso
                            </span>
                            <span class="data-value text-yellow-600">${departure.delay} min</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="results-grid">${flights}</div>`;
    }

    formatAirlinesData(data) {
        if (!data || !data.data || data.data.length === 0) {
            return '<p class="text-gray-500 text-center py-8">Nenhuma companhia encontrada</p>';
        }

        const airlines = data.data.map(airline => {
            return `
                <div class="airline-card">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-gray-800 mb-1 airport-name">
                                ${this.formatAirportName(airline.airline_name) || 'Nome não informado'}
                            </h4>
                            <div class="flex items-center space-x-2 text-sm text-gray-600">
                                ${airline.iata_code ? `<span class="bg-gray-200 px-2 py-1 rounded font-mono">${airline.iata_code}</span>` : ''}
                                ${airline.icao_code ? `<span class="bg-gray-200 px-2 py-1 rounded font-mono">${airline.icao_code}</span>` : ''}
                            </div>
                        </div>
                        ${airline.country_name ? `
                        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            ${airline.country_name}
                        </span>
                        ` : ''}
                    </div>
                    
                    <div class="space-y-1 text-sm">
                        ${airline.fleet_size ? `
                        <div class="data-row">
                            <span class="data-label">Frota</span>
                            <span class="data-value">${airline.fleet_size} aeronaves</span>
                        </div>
                        ` : ''}
                        
                        ${airline.hub_code ? `
                        <div class="data-row">
                            <span class="data-label">Hub</span>
                            <span class="data-value">${airline.hub_code}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="results-grid">${airlines}</div>`;
    }

    formatAirportsData(data) {
        if (!data || !data.data || data.data.length === 0) {
            return '<p class="text-gray-500 text-center py-8">Nenhum aeroporto encontrado</p>';
        }

        const airports = data.data.map(airport => {
            return `
                <div class="airport-card">
                    <div class="mb-3">
                        <h4 class="font-bold text-lg text-gray-800 mb-1 airport-name">
                            ${this.formatAirportName(airport.airport_name) || 'Nome não informado'}
                        </h4>
                        <div class="flex items-center space-x-2 text-sm text-gray-600">
                            ${airport.iata_code ? `<span class="bg-gray-200 px-2 py-1 rounded font-mono">${airport.iata_code}</span>` : ''}
                            ${airport.icao_code ? `<span class="bg-gray-200 px-2 py-1 rounded font-mono">${airport.icao_code}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="space-y-1 text-sm">
                        ${airport.city_name ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="map-pin" class="w-4 h-4 mr-1"></i>
                                Cidade
                            </span>
                            <span class="data-value airport-name">${this.formatAirportName(airport.city_name)}</span>
                        </div>
                        ` : ''}
                        
                        ${airport.country_name ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="flag" class="w-4 h-4 mr-1"></i>
                                País
                            </span>
                            <span class="data-value airport-name">${this.formatAirportName(airport.country_name)}</span>
                        </div>
                        ` : ''}
                        
                        ${airport.timezone ? `
                        <div class="data-row">
                            <span class="data-label flex items-center">
                                <i data-lucide="clock" class="w-4 h-4 mr-1"></i>
                                Timezone
                            </span>
                            <span class="data-value">${airport.timezone}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="results-grid">${airports}</div>`;
    }

    async makeApiCall(url, errorMessage) {
        try {
            this.showLoading();
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            this.showError(error.message || errorMessage);
            throw error;
        }
    }
}

// Initialize the app
const app = new AviationApp();

// API Functions (keeping compatibility with existing HTML)
async function getAllFlights() {
    const limit = document.getElementById('allFlightsLimit').value;
    
    try {
        const data = await app.makeApiCall(`/api/flights?limit=${limit}`, 'Erro ao buscar voos');
        app.showSuccess(data, `Todos os Voos em Tempo Real (${limit} resultados)`, app.formatFlightsData.bind(app));
    } catch (error) {
        // Error already handled in makeApiCall
    }
}

async function searchFlightsByAirline() {
    const airline = document.getElementById('airline').value;
    const limit = document.getElementById('flightLimit').value;
    
    if (!airline) {
        app.showError('Por favor, informe o código IATA da companhia aérea');
        return;
    }

    try {
        const data = await app.makeApiCall(`/api/flights/airline/${airline}?limit=${limit}`, 'Erro ao buscar voos');
        
        if (data.data && data.data.length === 0) {
            app.showError(`Nenhum voo encontrado para a companhia ${airline}. Verifique se o código está correto (ex: AA, DL, UA, G3, JJ).`);
        } else {
            app.showSuccess(data, `Voos da Companhia ${airline}`, app.formatFlightsData.bind(app));
        }
    } catch (error) {
        // Error already handled in makeApiCall
    }
}

async function searchFlightsByRoute() {
    const departure = document.getElementById('departure').value;
    const arrival = document.getElementById('arrival').value;
    const limit = document.getElementById('routeLimit').value;
    
    if (!departure || !arrival) {
        app.showError('Por favor, informe os códigos IATA de origem e destino');
        return;
    }

    try {
        const data = await app.makeApiCall(`/api/flights/route/${departure}/${arrival}?limit=${limit}`, 'Erro ao buscar rota');
        
        if (data.data && data.data.length === 0) {
            app.showError(`Nenhum voo encontrado para a rota ${departure} → ${arrival}. Verifique se os códigos estão corretos.`);
        } else {
            app.showSuccess(data, `Voos ${departure} → ${arrival}`, app.formatFlightsData.bind(app));
        }
    } catch (error) {
        // Error already handled in makeApiCall
    }
}

async function searchAirports() {
    const limit = document.getElementById('airportsLimit').value;
    
    try {
        const data = await app.makeApiCall(`/api/airports?limit=${limit}`, 'Erro ao buscar aeroportos');
        app.showSuccess(data, `Lista de Aeroportos (${limit} resultados)`, app.formatAirportsData.bind(app));
    } catch (error) {
        // Error already handled in makeApiCall
    }
}

async function searchAirlines() {
    const limit = document.getElementById('airlinesLimit').value;
    
    try {
        const data = await app.makeApiCall(`/api/airlines?limit=${limit}`, 'Erro ao buscar companhias');
        app.showSuccess(data, `Lista de Companhias Aéreas (${limit} resultados)`, app.formatAirlinesData.bind(app));
    } catch (error) {
        // Error already handled in makeApiCall
    }
}