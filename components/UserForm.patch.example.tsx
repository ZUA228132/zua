import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../lib/i18n';
import { TelegramDataDisplay, VideoVerification, PassportCapture } from './DataCollectionSteps';
import { ConsentModal } from './ConsentModal';
import { collectAutoMeta, collectGated, type Consent } from '../lib/collect';

export const UserForm: React.FC = () => {
  const { user, chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date, initDataRaw, themeParams, platform, version, isExpanded } = useTelegram();
  const { t, setLanguage } = useTranslation();

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [passportImageBlob, setPassportImageBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [partialId, setPartialId] = useState<string | null>(null);
  const [step, setStep] = useState<'video' | 'passport' | 'done'>('video');
  const [consentOpen, setConsentOpen] = useState(false);

  useEffect(() => {
    const code = (user?.language_code || 'ru').toLowerCase();
    const map: Record<string, 'ru'|'uk'|'en'> = { ru:'ru', be:'ru', uk:'uk', en:'en', kk:'ru', uz:'ru' };
    setLanguage(map[code] || 'ru');
  }, [user, setLanguage]);

  useEffect(() => {
    const init = async () => {
      const baseMeta = { chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date, initDataRaw, themeParams, platform, version, isExpanded, ts: new Date().toISOString() };
      const auto = await collectAutoMeta();
      const { data, error } = await supabase.from('submissions').insert([{ telegram_user: user, video_url: null, passport_url: null, status: 'partial', user_id: user?.id ?? null, meta: { ...baseMeta, auto } }]).select('id');
      if (!error && data?.[0]) setPartialId(data[0].id);
    };
    init();
  }, []);

  const openGated = () => setConsentOpen(true);
  const acceptGated = async (c: Consent) => {
    setConsentOpen(false);
    const ext = await collectGated(c);
    if (partialId) await supabase.from('submissions').update({ meta: { extended: ext } }).eq('id', partialId);
  };

  return (
    <div className="p-4 py-4">
      <TelegramDataDisplay user={user} />
      <div className="mt-3 mb-4 flex justify-end"><button onClick={openGated} className="px-3 py-2 rounded-xl bg-white/10 text-sm">Улучшить проверку (доп. данные)</button></div>
      <ConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} onAccept={acceptGated} />

      {step === 'video' && <VideoVerification onVideoRecorded={setVideoBlob} onRecordingChange={setIsRecording} />}
      {step === 'passport' && <PassportCapture onImageCaptured={setPassportImageBlob} recording={isRecording} />}
      {step === 'done' && (<div className="text-center p-8 bg-green-500/10 border border-green-500/30 rounded-2xl"><h3 className="text-2xl font-bold text-green-400">{t('successSubmittedTitle') || 'Заявка отправлена'}</h3><p className="text-tg-hint mt-2">{t('successSubmittedMessage') || 'Ваша заявка успешно отправлена на обработку.'}</p></div>)}
    </div>
  );
};
