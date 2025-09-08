import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../lib/i18n';
import { TelegramDataDisplay } from './TelegramDataDisplay';
import { VideoVerification, PassportCapture } from './DataCollectionSteps';

export const UserForm: React.FC = () => {
  const { user, chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date, initDataRaw, themeParams, platform, version, isExpanded } = useTelegram();
  const { t } = useTranslation();

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [passportImageBlob, setPassportImageBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [partialId, setPartialId] = useState<string | null>(null);
  const [step, setStep] = useState<'video' | 'passport' | 'done'>('video');

  // создаём "мусорную" запись сразу при входе
  useEffect(() => {
    const init = async () => {
      try {
        const meta = {
          chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date,
          initDataRaw, themeParams, platform, version, isExpanded,
          ts: new Date().toISOString(),
        };
        const { data, error } = await supabase.from('submissions').insert([{
          telegram_user: user,
          video_url: null,
          passport_url: null,
          status: 'partial',
          user_id: user?.id ?? null,
          meta
        }]).select('id');
        if (error) console.warn('partial insert error', error);
        if (data && data[0]) {
          setPartialId(data[0].id);
        }
      } catch (e) { console.warn(e); }
    };
    init();
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
  }, [videoBlob, partialId]);

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
  }, [passportImageBlob, partialId]);

  return (
    <div className="p-4 space-y-4">
      <TelegramDataDisplay user={user} />
      {step === 'video' && (
        <>
          <h3 className="text-lg font-semibold text-tg-hint">{t('stepVideoTitle')}</h3>
          <VideoVerification onVideoRecorded={setVideoBlob} onRecordingChange={setIsRecording} />
        </>
      )}
      {step === 'passport' && (
        <>
          <h3 className="text-lg font-semibold text-tg-hint">{t('stepPassportTitle')}</h3>
          <PassportCapture onImageCaptured={setPassportImageBlob} recording={isRecording} />
        </>
      )}
      {step === 'done' && (
        <div className="text-center p-8 bg-green-500/10 border border-green-500/30 rounded-2xl">
          <h3 className="text-2xl font-bold text-green-400">{t('successSubmittedTitle')}</h3>
          <p className="text-tg-hint mt-2">{t('successSubmittedMessage')}</p>
        </div>
      )}
    </div>
  );
};
