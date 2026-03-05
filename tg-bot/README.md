# AstroPanel Telegram Analytics Bot

AI-аналитика продаж и трафика прямо в Telegram. Читает БД **только на чтение**, анализирует данные через OpenRouter AI.

## Быстрый старт

### 1. Настройка

```bash
cd tg-bot
cp .env.example .env
npm install
```

Заполни `.env`:
```
BOT_TOKEN=          # от @BotFather в Telegram
DATABASE_URL=       # из .env основного проекта (та же строка DATABASE_URL)
OPENROUTER_API_KEY= # с https://openrouter.ai/keys
```

### 2. Запуск

```bash
npm start
```

Или в режиме разработки (авто-рестарт):
```bash
npm run dev
```

## Команды в боте

| Команда | Описание |
|---------|---------|
| `/start` | Главное меню |
| `/menu` | Открыть меню |
| `/model` | Сменить AI модель |

## Возможности

**📊 Анализ по менеджерам:**
- Продажи каждого менеджера за выбранный день
- Разбивка по источнику (direct / comments)
- Повторные продажи
- Сравнение с историей 7 дней по ГЕО
- AI вывод с эмодзи-оценкой каждого

**🌍 Анализ по ГЕО:**
- Продажи/трафик по каждой стране
- Конверсия direct и comments раздельно
- Тренд vs 7 дней
- Рекомендации

**🤖 Доступные AI модели:**
- Claude 3.5 Sonnet
- GPT-4o
- Gemini 2.0 Flash
- DeepSeek Chat
- Mistral Large

## Структура

```
tg-bot/
├── src/
│   ├── bot.js         # Главный файл бота
│   ├── db.js          # Read-only PostgreSQL
│   ├── queries.js     # SQL запросы
│   ├── openrouter.js  # AI клиент
│   └── prompts.js     # Промпты и форматтеры
├── .env.example
├── package.json
└── README.md
```

## Ограничение доступа

Чтобы бот работал только для определённых пользователей, добавь в `.env`:
```
ALLOWED_USER_IDS=123456789,987654321
```

Telegram ID можно узнать через @userinfobot.
