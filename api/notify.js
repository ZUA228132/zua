// api/notify.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).send('Missing TELEGRAM_BOT_TOKEN');

    const { user_id, status, language_code } = req.body || {};
    if (!user_id) return res.status(400).send('user_id required');

    const textByLang = {
      ru: status === 'submitted'
        ? '✅ Ваша заявка успешно отправлена на обработку.'
        : 'ℹ️ Ваша заявка получена и ожидает завершения.',
      uk: status === 'submitted'
        ? '✅ Вашу заявку успішно відправлено на обробку.'
        : 'ℹ️ Вашу заявку отримано, очікує завершення.',
      en: status === 'submitted'
        ? '✅ Your application has been submitted for review.'
        : 'ℹ️ Your application is received and pending completion.',
    };

    const lang = (language_code || 'ru').toLowerCase();
    const text = textByLang[lang] || textByLang.ru;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const tgResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: user_id, text }),
    });

    if (!tgResp.ok) {
      const t = await tgResp.text();
      return res.status(500).send(t);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).send(e?.message || 'error');
  }
}
