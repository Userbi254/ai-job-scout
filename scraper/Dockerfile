FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Install dependencies (including devDependencies for TypeScript/tsx)
RUN npm install

# Copy source files
COPY . .

# Build TypeScript (optional, but good for checking errors)
# RUN npm run build 

# Expose port
EXPOSE 3001

# Start server using the start script (tsx server.ts)
CMD ["npm", "start"]
