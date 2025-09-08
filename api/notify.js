// api/notify.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ENV_ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || null; // опционально
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).send('Missing TELEGRAM_BOT_TOKEN');

    const body = req.body || {};
    const {
      // уведомление пользователю:
      user_id,                  // ID пользователя (для 1:1 == chat_id)
      language_code,            // ru/uk/en

      // текст/шаблоны:
      text,                     // произвольный текст (имеет приоритет)
      template,                 // 'submitted' | 'pending' | 'custom'
      status,                   // 'submitted' | 'partial' | ...
      variables,                // {ticket: '123'} — подстановки {{ticket}}

      // медиа админу:
      send_media,               // true — включить отправку медиа админу
      video_url,                // публичный URL видео
      photo_url,                // публичный URL фото
      admin_user_id,            // вот ЭТО — id админа (при 1:1 = chat_id)
      admin_chat_id             // если хочешь явно указать chat_id (не обязательно)
    } = body;

    // ── язык
    const lang = (language_code || 'ru').toLowerCase();

    // ── шаблоны
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

    // ── выбор текста: text > template > status
    let key = template || (status === 'submitted' ? 'submitted' : 'pending');
    if (!templates[key]) key = 'pending';
    let tpl = templates[key][lang] || templates[key]['ru'];
    let finalText = text ? text : tpl;

    // ── подстановки {{var}}
    const kv = { ...(variables || {}), text: text || '' };
    finalText = finalText.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (kv[k] != null ? String(kv[k]) : ''));

    const base = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // ── медиа админу (пришлём в личку админу)
    if (send_media) {
      // для 1:1 чата chat_id = user_id. Можно передать admin_user_id — мы используем его как chat_id.
      const target = admin_chat_id || admin_user_id || ENV_ADMIN_CHAT_ID;
      if (!target) return res.status(400).send('admin_user_id (или ADMIN_CHAT_ID) обязателен для send_media=true');

      if (photo_url) {
        const r = await fetch(`${base}/sendPhoto`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: target, photo: photo_url, caption: finalText })
        });
        if (!r.ok) return res.status(500).send(await r.text());
      }
      if (video_url) {
        const r = await fetch(`${base}/sendVideo`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ chat_id: target, video: video_url, caption: finalText })
        });
        if (!r.ok) return res.status(500).send(await r.text());
      }
      return res.status(200).json({ ok: true, mode: 'media_to_admin' });
    }

    // ── обычное уведомление пользователю
    if (!user_id) return res.status(400).send('user_id required');
    const r = await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: user_id, text: finalText })
    });
    if (!r.ok) return res.status(500).send(await r.text());

    return res.status(200).json({ ok: true, text: finalText });
  } catch (e) {
    return res.status(500).send(e?.message || 'error');
  }
}
