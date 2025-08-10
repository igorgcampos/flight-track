# Multi-stage build for Node.js aviation app
FROM node:20-alpine AS dependencies

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Node.js application stage
FROM node:20-alpine AS app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aviationapp -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=aviationapp:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=aviationapp:nodejs /app/dist ./dist
COPY --from=build --chown=aviationapp:nodejs /app/index.js ./
COPY --from=build --chown=aviationapp:nodejs /app/aviationstack.js ./
COPY --from=build --chown=aviationapp:nodejs /app/cache-manager.js ./
COPY --from=build --chown=aviationapp:nodejs /app/package.json ./

# Switch to non-root user
USER aviationapp

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]

# Production stage with Nginx + Node.js
FROM nginx:1.25-alpine AS production

# Install Node.js and npm
RUN apk add --no-cache nodejs npm supervisor curl

# Create application user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aviationapp -u 1001 -G nodejs

# Copy Nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create app directory and copy Node.js application
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/index.js ./
COPY --from=build /app/aviationstack.js ./
COPY --from=build /app/cache-manager.js ./
COPY --from=build /app/package.json ./

# Set ownership
RUN chown -R aviationapp:nodejs /app

# Create supervisor configuration
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo 'user=root' >> /etc/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'user=nginx' >> /etc/supervisord.conf && \
    echo '[program:node]' >> /etc/supervisord.conf && \
    echo 'command=node index.js' >> /etc/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'user=aviationapp' >> /etc/supervisord.conf && \
    echo 'environment=NODE_ENV=production' >> /etc/supervisord.conf

# Expose ports
EXPOSE 80 3000

# Add health check via Nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Set environment to production
ENV NODE_ENV=production

# Start both services with supervisor
CMD ["supervisord", "-c", "/etc/supervisord.conf"]