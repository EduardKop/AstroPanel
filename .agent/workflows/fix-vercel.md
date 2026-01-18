---
description: Fix Vercel deployment MIME type or 404 errors
---

# Vercel Deployment Fix

## Симптомы
- `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`
- `GET /assets/index-*.js net::ERR_ABORTED 404 (Not Found)`

## Причина
Файл `vercel.json` с неправильными rewrites перенаправляет запросы к `/assets/*` на `index.html`.

## Решение

### Шаг 1: Убедиться что НЕТ vercel.json
```bash
rm -f vercel.json
git add -A && git commit -m "Remove vercel.json" && git push
```

**ВАЖНО:** Для Vite проектов `vercel.json` НЕ НУЖЕН. Vercel автоматически определит Vite и настроит всё правильно.

### Шаг 2: Проверить настройки в Vercel Dashboard
1. Зайти в Project Settings → Build and Deployment
2. Убедиться что:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Шаг 3: Сделать Redeploy без кеша
Если настройки были изменены, нужен свежий деплой:
```bash
git commit --allow-empty -m "Trigger fresh deploy" && git push
```

### Шаг 4: Очистить кеш браузера
Если старые хеши файлов (`index-XXXXX.js`) не совпадают с новыми:
- Mac: `Cmd + Shift + R`
- Или открыть в режиме инкогнито

## Правило на будущее
**НИКОГДА не создавать `vercel.json`** для этого проекта. Vercel автоматически обрабатывает Vite проекты.
