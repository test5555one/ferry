FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm ci --production

COPY . .

RUN npm run prisma:generate

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
