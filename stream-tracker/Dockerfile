FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Start the application
CMD ["node", "server.js"] 