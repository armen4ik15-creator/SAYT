# ── Mobitrend — Node.js + Express для Timeweb Cloud Apps ──
FROM node:20-alpine

WORKDIR /app

# Зависимости (sharp требует libvips, есть в node:20-alpine)
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Копируем приложение
COPY . .

# Папки для пользовательских данных (будут создаваться при старте, но на всякий случай)
RUN mkdir -p /app/data /app/public/uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
