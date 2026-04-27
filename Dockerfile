FROM node:20-alpine

WORKDIR /app

# تثبيت الاعتماديات النظامية المطلوبة لـ Baileys و Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git \
    python3 \
    make \
    g++

# متغيرات البيئة لمكتبة Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# نسخ ملفات الاعتماديات
COPY package*.json ./
RUN npm ci --only=production

# نسخ باقي الملفات
COPY . .

# إنشاء المجلدات المطلوبة
RUN mkdir -p uploads backups logs src/sites

# فتح المنفذ
EXPOSE 3000

# تشغيل التطبيق
CMD ["node", "src/index.js"]