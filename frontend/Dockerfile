# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public env vars (baked at build time)
ARG NEXT_PUBLIC_URL_SERVICE=http://localhost:8080
ARG NEXT_PUBLIC_ANALYTICS_SERVICE=http://localhost:8081
ARG NEXT_PUBLIC_SHORT_URL_DOMAIN=http://localhost:8080

# Set as environment variables for build
ENV NEXT_PUBLIC_URL_SERVICE=$NEXT_PUBLIC_URL_SERVICE
ENV NEXT_PUBLIC_ANALYTICS_SERVICE=$NEXT_PUBLIC_ANALYTICS_SERVICE
ENV NEXT_PUBLIC_SHORT_URL_DOMAIN=$NEXT_PUBLIC_SHORT_URL_DOMAIN

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application with env vars baked in
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files for production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Create public folder if it doesn't exist
RUN mkdir -p public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
