FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install curl for container health check
RUN apk add --no-cache curl

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (production-first)
RUN npm install --only=production

# Copy source code
COPY . .

# Expose backend port
EXPOSE 5000

# Change ownership to non-root user
RUN chown -R node:node /usr/src/app

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Hardening: Run container as non-root user
USER node

# Start the application
CMD ["npm", "start"]
