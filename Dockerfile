FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install app dependencies
RUN npm ci

# Copy app source
COPY . .

# Generate prisma client and build app
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# ---

FROM node:20-alpine

WORKDIR /app

# Copy built dependencies and dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.* ./

# Container Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Security: Run as non-root user
USER node

EXPOSE 3000

# Direct node execution for fast signal forwarding and graceful shutdown
CMD ["node", "dist/main.js"]
