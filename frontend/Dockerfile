FROM node:20-alpine

WORKDIR /app

COPY package.json ./

# Install dependencies, allowing peer resolutions if any version overlaps occur
RUN npm install --legacy-peer-deps

COPY . .

# Set dynamic URL variables if build time injection occurs
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
