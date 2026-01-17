FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files from scraper directory
COPY scraper/package*.json ./

# Install dependencies (including devDependencies for TypeScript/tsx)
RUN npm install

# Copy source files from scraper directory
COPY scraper/ .

# Expose port (Render sets PORT env var, often 10000)
EXPOSE 10000

# Start server using the start script (tsx server.ts)
CMD ["npm", "start"]
