# Deploy: Telegram Mini App + Vercel + Supabase

## Supabase (один раз)
1. Создай проект. Возьми **Project URL** и **anon key**.
2. Выполни `supabase-setup.sql` (таблица, бакеты, базовые RLS).
3. (Опц.) Выполни `supabase-alter-meta.sql` для добавления колонки `meta`.

## Настройки клиента
- Файл `lib/supabase.ts` уже содержит твои ключи.
- При желании можно перейти на ENV + `@supabase/supabase-js`.

## Локально
```
npm install
npm run dev
```

## Vercel
- Import → Vite → Build: `npm run build` → Output: `dist`

## Telegram Mini App
- @BotFather → Bot Settings → Menu Button → Set Web App → URL твоего деплоя