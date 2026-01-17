# Проверка в DevTools

## Что нужно сделать:

1. Откройте **DevTools** (F12 или Cmd+Option+I)
2. Нажмите **Elements** tab
3. Найдите первый блок "Ключевые метрики" (правый клик → Inspect)
4. В правой панели Styles посмотрите какой `grid-column` применяется

## Что вы должны увидеть:

```css
.col-span-12 {
    grid-column: span 12 / span 12;  /* Базовый */
}

@media (min-width: 1024px) {
    .lg\:col-span-5 {
        grid-column: span 5 / span 5;  /* Должен применяться! */
    }
}
```

## Если видите только `span 12`, то:

- Проверьте что файл действительно перезагрузился
- Посмотрите Network tab → найдите `DashboardPage.jsx` → проверьте timestamp
- Или сделайте **Empty Cache and Hard Reload**: 
  - DevTools открыт → Right-click на Refresh → "Empty Cache and Hard Reload"

## Скриншот что искать:

В DevTools Elements → правая панель Styles → должно быть активно:
```
.lg\:col-span-5 (если ширина ≥1024px)
grid-column: span 5 / span 5
```

А НЕ:
```
.col-span-12
grid-column: span 12 / span 12
```
