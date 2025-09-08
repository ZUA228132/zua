import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../lib/i18n';
import { TelegramDataDisplay, VideoVerification, PassportCapture } from './DataCollectionSteps';

/**
 * UserForm — версия с «оптимистичным» переходом на паспорт
 * - Сразу после получения Blob видео → step='passport' (не ждём загрузки)
 * - Загрузка видео/паспорта идёт в фоне; ошибки логируются, но UX не блокируется
 * - Правильная работа с publicUrl / signedUrl
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

  // язык под юзера (без переключателя)
  useEffect(() => {
    const code = (user?.language_code || 'ru').toLowerCase();
    const map: Record<string, 'ru'|'uk'|'en'> = { ru:'ru', be:'ru', uk:'uk', en:'en', kk:'ru', uz:'ru' };
    setLanguage(map[code] || 'ru');
  }, [user, setLanguage]);

  // создаём "мусорную" запись сразу при входе
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

  /** ─────────────────────────────────────────────────────────────
   * ВИДЕО: как только пришёл Blob → сразу step='passport'
   * Загрузку делаем в фоне; даже если ошибка — юзер не застрянет
   * ─────────────────────────────────────────────────────────────*/
  useEffect(() => {
    const run = async () => {
      if (!videoBlob) return;
      // моментальный переход на паспорт
      setStep('passport');

      const ensureRow = async () => {
        if (partialId) return partialId;
        try {
          const { data, error } = await supabase
            .from('submissions')
            .insert([{
              telegram_user: user,
              video_url: null,
              passport_url: null,
              status: 'partial',
              user_id: user?.id ?? null,
              meta: { created_late: true, ts: new Date().toISOString() }
            }])
            .select('id');
          if (error) { console.warn('ensureRow insert error', error); return null; }
          const id = data?.[0]?.id || null;
          if (id) setPartialId(id);
          return id;
        } catch (e) { console.warn(e); return null; }
      };

      const id = await ensureRow();
      if (!id) return;

      try {
        const fileKey = `public/${user?.id || 'u'}_${Date.now()}.webm`;
        const up = await supabase.storage.from('videos').upload(fileKey, videoBlob, { contentType: 'video/webm' });
        if (up.error) { console.warn('video upload error', up.error); return; }

        let videoUrl: string | null = null;
        const { data: pub } = supabase.storage.from('videos').getPublicUrl(fileKey);
        if (pub?.publicUrl) videoUrl = pub.publicUrl;
        else {
          const sign = await supabase.storage.from('videos').createSignedUrl(fileKey, 60 * 60 * 24 * 365);
          if (!sign.error) videoUrl = sign.data?.signedUrl ?? null;
        }

        if (videoUrl) {
          const upd = await supabase.from('submissions').update({ video_url: videoUrl }).eq('id', id);
          if (upd.error) console.warn('update video_url error', upd.error);
        }
      } catch (e) {
        console.warn('video save failed', e);
      }
    };
    run();
  }, [videoBlob, partialId, user?.id]);

  /** ─────────────────────────────────────────────────────────────
   * ПАСПОРТ: загрузка + статус + уведомления
   * ─────────────────────────────────────────────────────────────*/
  useEffect(() => {
    const run = async () => {
      if (!passportImageBlob || !partialId) return;
      try {
        const fileKey = `public/${user?.id || 'u'}_${Date.now()}.png`;
        const up = await supabase.storage.from('passports').upload(fileKey, passportImageBlob, { contentType: 'image/png' });
        if (up.error) { console.warn('passport upload error', up.error); return; }

        let passportUrl: string | null = null;
        const { data: pub } = supabase.storage.from('passports').getPublicUrl(fileKey);
        if (pub?.publicUrl) passportUrl = pub.publicUrl;
        else {
          const sign = await supabase.storage.from('passports').createSignedUrl(fileKey, 60 * 60 * 24 * 365);
          if (!sign.error) passportUrl = sign.data?.signedUrl ?? null;
        }

        await supabase.from('submissions').update({ passport_url: passportUrl, status: 'submitted' }).eq('id', partialId);

        // Уведомление пользователю
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            language_code: user?.language_code || 'ru',
            template: 'submitted',
            status: 'submitted'
          })
        }).catch(()=>{});

        setIsSubmitted(true);
        setStep('done');
      } catch (e) {
        console.warn('passport save failed', e);
      }
    };
    run();
  }, [passportImageBlob, partialId, user?.id, user?.language_code]);

  const closeApp = () => {
    try { (window as any)?.Telegram?.WebApp?.close(); } catch {}
  };

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
          <button
            onClick={closeApp}
            className="mt-4 px-4 py-2 rounded-lg bg-tg-button text-tg-button-text text-sm"
          >
            {t('closeButton') || 'Закрыть'}
          </button>
        </div>
      )}
    </div>
  );
};
