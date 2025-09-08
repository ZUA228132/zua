<p align="center">
  <img src="telegram_logo.png" alt="Telegram Logo" width="120"/>
</p>

# 🔞 Age Verification Bot for Telegram  

[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)  
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)  
[![Issues](https://img.shields.io/github/issues/username/age-verification-bot.svg)](https://github.com/username/age-verification-bot/issues)  
[![Stars](https://img.shields.io/github/stars/username/age-verification-bot.svg)](https://github.com/username/age-verification-bot/stargazers)  

<p align="center">
  <b>🚀 Telegram-бот с видео- и паспортной верификацией пользователей</b><br>
  Безопасный доступ только для взрослых 🔒
</p>

---

## ℹ️ About  

⚠️ *Неофициальный проект, разработанный сообществом. Telegram Inc. не имеет отношения к этому репозиторию.*  

---

## ✨ Возможности  
- 🎥 Видео-верификация — пользователь подтверждает возраст с помощью короткого видео.  
- 🛂 Проверка паспорта через [Supabase](https://supabase.com/) (API-хранилище и валидация данных).  
- 📌 Автоматический доступ только для пользователей 18+.  
- ⚡ Быстрая интеграция в группы и каналы.  
- 🛠 Гибкая настройка под разные сценарии (каналы, сообщества, приватные чаты).  

---

## 🚀 Установка и запуск  

```bash
git clone https://github.com/username/age-verification-bot.git
cd age-verification-bot

pip install -r requirements.txt
python bot.py
```

---

## ⚙️ Настройка  

1. Создай бота через [@BotFather](https://t.me/BotFather).  
2. Получи `TELEGRAM_BOT_TOKEN`.  
3. Создай проект в [Supabase](https://supabase.com/) и получи `SUPABASE_URL` и `SUPABASE_KEY`.  
4. Заполни `.env`:  

```
TELEGRAM_BOT_TOKEN=your_token_here
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_secret_key
```

---

## 📚 Использование  

- Добавь бота в чат или канал.  
- Пользователь проходит верификацию:  
  - отправка **видео**;  
  - загрузка **паспорта** (данные проверяются в Supabase).  
- После успешной проверки — доступ открыт 🚀  

---

## 🧩 Технологии  

- [Python 3.x](https://www.python.org/)  
- [python-telegram-bot](https://python-telegram-bot.org/)  
- [Supabase](https://supabase.com/) (хранение и верификация документов)  
- (опционально) ML для автоматической видео-верификации  

---

## 🗺️ Roadmap  

- [x] Поддержка паспортной верификации через Supabase  
- [x] Видео-верификация  
- [ ] Интеграция распознавания лиц / liveness detection  
- [ ] Админ-панель для ручной проверки заявок  
- [ ] Уведомления админам при спорных кейсах  

---

## 🎥 Демонстрация  

<p align="center">
  <img src="demo_telegram.gif" alt="Demo" width="500"/>
</p>

---

## 🤝 Контрибьютинг  

Pull Request'ы и идеи приветствуются 💡  

---

## 📄 Лицензия  

MIT License © 2025  
