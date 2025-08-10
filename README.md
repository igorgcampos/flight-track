# AviationStack API - Aplicação de Consulta de Voos

Uma aplicação Node.js para consultar dados de voos em tempo real usando a API da AviationStack.

## 🚀 Funcionalidades

- ✈️ Consulta de voos em tempo real
- 🏢 Busca de aeroportos por código ou nome
- 🏪 Consulta de companhias aéreas
- 🛫 Busca de voos por rota (origem → destino)
- 📊 Interface web interativa
- 🔄 Rate limiting automático (respeitando limite de 1 req/min da API)
- ⚡ API REST para integração com outras aplicações

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- Chave de API da AviationStack (gratuita em https://aviationstack.com/)

## 🛠️ Instalação

1. Clone ou baixe o projeto
2. Instale as dependências:
```bash
npm install
```

3. Configure sua API key:
```bash
cp .env.example .env
# Edite o arquivo .env e adicione sua API key:
# AVIATIONSTACK_API_KEY=sua_chave_aqui
```

## 🏃‍♂️ Como Usar

### Iniciar o servidor:
```bash
npm start
```

### Para desenvolvimento (auto-reload):
```bash
npm run dev
```

Acesse http://localhost:3000 para usar a interface web.

## 🔌 Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/flights` | GET | Voos em tempo real |
| `/api/flights/airline/:code` | GET | Voos por companhia |
| `/api/flights/route/:dep/:arr` | GET | Voos por rota |
| `/api/airports` | GET | Lista de aeroportos |
| `/api/airports/:code` | GET | Aeroporto específico |
| `/api/airlines` | GET | Lista de companhias |
| `/api/routes` | GET | Rotas disponíveis |
| `/api/aircraft` | GET | Informações de aeronaves |

### Exemplos de uso:

```bash
# Buscar voos da American Airlines
curl "http://localhost:3000/api/flights/airline/AA?limit=5"

# Buscar voos GRU → JFK
curl "http://localhost:3000/api/flights/route/GRU/JFK?limit=10"

# Buscar aeroporto Guarulhos
curl "http://localhost:3000/api/airports/GRU"
```

## ⚠️ Limitações

- A conta gratuita da AviationStack tem limite de 1 requisição por minuto
- A aplicação implementa controle automático de rate limiting
- HTTPS não está disponível na conta gratuita (apenas HTTP)

## 📁 Estrutura do Projeto

```
teste-app/
├── index.js           # Servidor principal com interface web
├── aviationstack.js   # Classe para interação com a API
├── package.json       # Dependências do projeto
├── .env.example       # Exemplo de configuração
└── README.md          # Este arquivo
```

## 🔧 Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **node-fetch** - Cliente HTTP para Node.js
- **dotenv** - Gerenciamento de variáveis de ambiente

## 📞 Suporte

Para obter sua chave de API gratuita, visite: https://aviationstack.com/
Para dúvidas sobre a API, consulte: https://aviationstack.com/documentation