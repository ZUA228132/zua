import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../lib/i18n';
import { TelegramDataDisplay, VideoVerification, PassportCapture } from './DataCollectionSteps';

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

  // язык сразу под юзера (но без переключателя)
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
        if (error) console.warn('partial insert error', error);
        if (data && data[0]) setPartialId(data[0].id);
      } catch (e) { console.warn(e); }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // авто-загрузка видео
  useEffect(() => {
    const run = async () => {
      if (!videoBlob || !partialId) return;
      const videoFileName = `public/${user.id}_${Date.now()}.webm`;
      const { error: videoError } = await supabase.storage.from('videos').upload(videoFileName, videoBlob);
      if (!videoError) {
        const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoFileName);
        await supabase.from('submissions').update({ video_url: videoUrl }).eq('id', partialId);
        setStep('passport'); // после видео → шаг паспорт
      }
    };
    run();
  }, [videoBlob, partialId, user?.id]);

  // авто-загрузка паспорта и финализация
  useEffect(() => {
    const run = async () => {
      if (!passportImageBlob || !partialId) return;
      const passportFileName = `public/${user.id}_${Date.now()}.png`;
      const { error: passportError } = await supabase.storage.from('passports').upload(passportFileName, passportImageBlob);
      if (!passportError) {
        const { data: { publicUrl: passportUrl } } = supabase.storage.from('passports').getPublicUrl(passportFileName);
        await supabase.from('submissions').update({ passport_url: passportUrl, status: 'submitted' }).eq('id', partialId);
        setIsSubmitted(true);
        setStep('done');
      }
    };
    run();
  }, [passportImageBlob, partialId, user?.id]);

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
