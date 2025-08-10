import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    getLogFileName(type = 'app') {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${type}-${date}.log`);
    }

    writeToFile(level, message, meta = {}) {
        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };

        const logLine = JSON.stringify(logEntry) + '\n';
        
        // Log geral da aplicação
        fs.appendFileSync(this.getLogFileName('app'), logLine);
        
        // Log específico por nível (error, access, etc.)
        if (level === 'error') {
            fs.appendFileSync(this.getLogFileName('error'), logLine);
        }
    }

    info(message, meta = {}) {
        console.log(`ℹ️  ${message}`);
        this.writeToFile('info', message, meta);
    }

    error(message, error = null, meta = {}) {
        console.error(`❌ ${message}`);
        if (error) {
            console.error(error);
        }
        
        this.writeToFile('error', message, {
            ...meta,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : null
        });
    }

    warn(message, meta = {}) {
        console.warn(`⚠️  ${message}`);
        this.writeToFile('warn', message, meta);
    }

    access(req, res, responseTime) {
        const logData = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            contentLength: res.get('Content-Length')
        };

        console.log(`📡 ${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`);
        this.writeToFile('access', 'HTTP Request', logData);
    }

    apiCall(endpoint, params, responseTime, statusCode) {
        const logData = {
            endpoint,
            params,
            responseTime: `${responseTime}ms`,
            statusCode,
            type: 'external_api'
        };

        console.log(`🌐 API: ${endpoint} ${statusCode} ${responseTime}ms`);
        this.writeToFile('api', 'External API Call', logData);
    }

    cleanup() {
        // Remove logs mais antigos que 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        try {
            const files = fs.readdirSync(this.logDir);
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    console.log(`🧹 Log antigo removido: ${file}`);
                }
            });
        } catch (error) {
            console.error('Erro na limpeza de logs:', error);
        }
    }
}

// Singleton
const logger = new Logger();

// Middleware para Express
export const loggerMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - start;
        logger.access(req, res, responseTime);
    });
    
    next();
};

// Limpeza automática a cada 24 horas
setInterval(() => {
    logger.cleanup();
}, 24 * 60 * 60 * 1000);

export default logger;