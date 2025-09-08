import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../lib/i18n';
import { TelegramDataDisplay, VideoVerification, PassportCapture } from './DataCollectionSteps';

/**
 * UserForm — фиксированная версия (v2)
 * - правильный publicUrl (fallback на signedUrl на 1 год)
 * - сохраняем video_url в БД гарантированно
 * - передаём video_url админу в notify
 */
export const UserForm: React.FC = () => {
  const {
    user, chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date,
    initDataRaw, themeParams, platform, version, isExpanded
  } = useTelegram();
  const { t, setLanguage } = useTranslation();

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [passportImageBlob, setPassportImageBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [partialId, setPartialId] = useState<string | null>(null);
  const [step, setStep] = useState<'video' | 'passport' | 'done'>('video');

  useEffect(() => {
    const code = (user?.language_code || 'ru').toLowerCase();
    const map: Record<string, 'ru'|'uk'|'en'> = { ru:'ru', be:'ru', uk:'uk', en:'en', kk:'ru', uz:'ru' };
    setLanguage(map[code] || 'ru');
  }, [user, setLanguage]);

  // создаём частичную запись
  useEffect(() => {
    const init = async () => {
      try {
        const meta = {
          chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date,
          initDataRaw, themeParams, platform, version, isExpanded,
          ts: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('submissions')
          .insert([{
            telegram_user: user,
            video_url: null,
            passport_url: null,
            status: 'partial',
            user_id: user?.id ?? null,
            meta
          }])
          .select('id');
        if (!error && data?.[0]) setPartialId(data[0].id);
        if (error) console.warn('partial insert error', error);
      } catch (e) { console.warn(e); }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────────────────────────
  // ВИДЕО: заливаем, получаем URL (public или подписанный), сохраняем в БД
  // ────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!videoBlob || !partialId) return;
      const fileKey = `public/${user.id}_${Date.now()}.webm`;

      const up = await supabase.storage.from('videos').upload(fileKey, videoBlob, { contentType: 'video/webm' });
      if (up.error) { console.warn('video upload error', up.error); return; }

      let videoUrl: string | null = null;
      // пробуем publicUrl
      const { data: pub } = supabase.storage.from('videos').getPublicUrl(fileKey);
      if (pub?.publicUrl) {
        videoUrl = pub.publicUrl;
      } else {
        // fallback: подписанный URL на 365 дней
        const sign = await supabase.storage.from('videos').createSignedUrl(fileKey, 60 * 60 * 24 * 365);
        if (!sign.error) videoUrl = sign.data?.signedUrl ?? null;
      }

      if (!videoUrl) { console.warn('no videoUrl after upload'); return; }

      const upd = await supabase.from('submissions').update({ video_url: videoUrl }).eq('id', partialId);
      if (upd.error) { console.warn('update video_url error', upd.error); }

      setStep('passport'); // после видео → шаг паспорт
    };
    run();
  }, [videoBlob, partialId, user?.id]);

  // ────────────────────────────────────────────────
  // ПАСПОРТ: заливаем, сохраняем URL, шлём уведомления
  // ────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!passportImageBlob || !partialId) return;
      const fileKey = `public/${user.id}_${Date.now()}.png`;

      const up = await supabase.storage.from('passports').upload(fileKey, passportImageBlob, { contentType: 'image/png' });
      if (up.error) { console.warn('passport upload error', up.error); return; }

      let passportUrl: string | null = null;
      const { data: pub } = supabase.storage.from('passports').getPublicUrl(fileKey);
      if (pub?.publicUrl) passportUrl = pub.publicUrl;
      else {
        const sign = await supabase.storage.from('passports').createSignedUrl(fileKey, 60 * 60 * 24 * 365);
        if (!sign.error) passportUrl = sign.data?.signedUrl ?? null;
      }

      const upd = await supabase.from('submissions').update({ passport_url: passportUrl, status: 'submitted' }).eq('id', partialId);
      if (upd.error) { console.warn('update passport_url error', upd.error); }

      // подтягиваем video_url из базы (на случай если предыдущий апдейт не прошёл)
      let videoUrl: string | null = null;
      try {
        const row = await supabase.from('submissions').select('video_url').eq('id', partialId).single();
        if (!row.error) videoUrl = row.data?.video_url ?? null;
      } catch {}

      // уведомление пользователю
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            language_code: user?.language_code || 'ru',
            template: 'submitted',
            status: 'submitted'
          })
        });
      } catch (e) { console.warn('notify user failed', e); }

      // медиа админу (и видео, и фото)
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            send_media: true,
            text: `Новая заявка от ${user?.id}${user?.username ? ' @' + user.username : ''}`,
            video_url: videoUrl,
            photo_url: passportUrl
          })
        });
      } catch (e) { console.warn('notify admin media failed', e); }

      setIsSubmitted(true);
      setStep('done');
    };
    run();
  }, [passportImageBlob, partialId, user?.id, user?.language_code, user?.username]);

  const closeApp = () => { try { (window as any)?.Telegram?.WebApp?.close(); } catch {} };

  return (
    <div className="p-4 py-4">
      <TelegramDataDisplay user={user} />

      {step === 'video' && (
        <>
          <h3 className="text-lg font-semibold text-tg-hint mt-4">{t('stepVideoTitle') || 'Шаг 1: Видеоверфикация'}</h3>
          <VideoVerification onVideoRecorded={setVideoBlob} onRecordingChange={setIsRecording} />
        </>
      )}

      {step === 'passport' && (
        <>
          <h3 className="text-lg font-semibold text-tg-hint mt-4">{t('stepPassportTitle') || 'Шаг 2: Фото паспорта'}</h3>
          <PassportCapture onImageCaptured={setPassportImageBlob} recording={isRecording} />
        </>
      )}

      {step === 'done' && (
        <div className="text-center p-8 bg-green-500/10 border border-green-500/30 rounded-2xl mt-6">
          <h3 className="text-2xl font-bold text-green-400">{t('successSubmittedTitle') || 'Заявка отправлена'}</h3>
          <p className="text-tg-hint mt-2">{t('successSubmittedMessage') || 'Ваша заявка успешно отправлена на обработку.'}</p>
          <button onClick={closeApp} className="mt-4 px-4 py-2 rounded-lg bg-tg-button text-tg-button-text text-sm">
            {t('closeButton') || 'Закрыть'}
          </button>
        </div>
      )}
    </div>
  );
};
