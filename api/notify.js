// api/notify.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || null; // опционально
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).send('Missing TELEGRAM_BOT_TOKEN');

    const body = req.body || {};
    const {
      user_id,                 // кому слать (обязательно для user-уведомлений)
      language_code,           // язык юзера (ru/uk/en)
      status,                  // 'submitted' | 'partial' | ...
      text,                    // произвольный текст (если есть — приоритетнее)
      template,                // 'submitted' | 'pending' | 'custom'
      variables,               // {id: '123', name: '...'} для подстановок
      send_media,              // true => слать медиа админу в личку
      video_url,               // публичная ссылка на видео
      photo_url,               // публичная ссылка на фото
      admin_chat_id            // можно явно передать сюда chat_id админа
    } = body;

    const lang = (language_code || 'ru').toLowerCase();

    // ── 1) Словарь шаблонов
    const templates = {
      submitted: {
        ru: '✅ Ваша заявка успешно отправлена на обработку.',
        uk: '✅ Вашу заявку успішно відправлено на обробку.',
        en: '✅ Your application has been submitted for review.',
      },
      pending: {
        ru: 'ℹ️ Ваша заявка получена и ожидает завершения.',
        uk: 'ℹ️ Вашу заявку отримано, очікує завершення.',
        en: 'ℹ️ Your application is received, pending completion.',
      },
      custom: {
        ru: '{{text}}',
        uk: '{{text}}',
        en: '{{text}}',
      }
    };

    // ── 2) Выбор текста: text > template > status
    let chosenTemplateKey = template || (status === 'submitted' ? 'submitted' : 'pending');
    if (!templates[chosenTemplateKey]) chosenTemplateKey = 'pending';

    let templateText = templates[chosenTemplateKey][lang] || templates[chosenTemplateKey]['ru'];
    let finalText = text ? text : templateText;

    // ── 3) Простая подстановка переменных {{var}}
    const kv = { ...(variables || {}), text: text || '' };
    finalText = finalText.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (kv[k] != null ? String(kv[k]) : ''));

    // ── 4) Медиа админу (опционально)
    if (send_media) {
      const targetAdmin = admin_chat_id || ADMIN_CHAT_ID;
      if (!targetAdmin) return res.status(400).send('admin_chat_id or ADMIN_CHAT_ID required for send_media=true');

      // Сначала фото (если есть), потом видео (если есть). Каждому — подпись.
      const base = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
      if (photo_url) {
        const r = await fetch(`${base}/sendPhoto`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: targetAdmin, photo: photo_url, caption: finalText })
        });
        if (!r.ok) return res.status(500).send(await r.text());
      }
      if (video_url) {
        const r = await fetch(`${base}/sendVideo`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: targetAdmin, video: video_url, caption: finalText })
        });
        if (!r.ok) return res.status(500).send(await r.text());
      }
      return res.status(200).json({ ok: true, mode: 'media_to_admin' });
    }

    // ── 5) Обычное уведомление пользователю
    if (!user_id) return res.status(400).send('user_id required');
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const tgResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: user_id, text: finalText }),
    });
    if (!tgResp.ok) return res.status(500).send(await tgResp.text());

    return res.status(200).json({ ok: true, text: finalText });
  } catch (e) {
    return res.status(500).send(e?.message || 'error');
  }
}
