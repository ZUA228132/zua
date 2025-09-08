import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import type { CollectedData } from '../types';
import { TelegramDataDisplay, VideoVerification, PassportCapture } from './DataCollectionSteps';
import { useTranslation } from '../lib/i18n';
import { CheckCircleIcon } from './icons';
import { supabase } from '../lib/supabase';


export const UserForm: React.FC = () => {
  const { user, chat, receiver, chat_type, chat_instance, start_param, query_id, auth_date, initDataRaw, themeParams, platform, version, isExpanded, viewportHeight, viewportStableHeight, colorScheme } = useTelegram();
  const { t } = useTranslation();
  React.useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        // create partial row ASAP
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
        }]).select('id, session_id');
        if (!cancelled) {
          if (error) console.warn('partial insert error', error);
          if (data && data[0]) {
            setPartialId(data[0].id);
            setSessionId(data[0].session_id || null);
          }
        }
      } catch(e) { console.warn(e); }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partialId, setPartialId] = useState<string | null>(null);
  const [passportImageBlob, setPassportImageBlob] = useState<Blob | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // auto-upload video on capture
  React.useEffect(() => {
    const run = async () => {
      if (!videoBlob || !partialId) return;
      const videoFileName = `public/${user.id}_${Date.now()}.webm`;
      const { error: videoError } = await supabase.storage.from('videos').upload(videoFileName, videoBlob);
      if (!videoError) {
        const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoFileName);
        await supabase.from('submissions').update({ video_url: videoUrl }).eq('id', partialId);
      }
    };
    run();
  }, [videoBlob, partialId]);

  // auto-upload passport on capture
  React.useEffect(() => {
    const run = async () => {
      if (!passportImageBlob || !partialId) return;
      const passportFileName = `public/${user.id}_${Date.now()}.png`;
      const { error: passportError } = await supabase.storage.from('passports').upload(passportFileName, passportImageBlob);
      if (!passportError) {
        const { data: { publicUrl: passportUrl } } = supabase.storage.from('passports').getPublicUrl(passportFileName);
        await supabase.from('submissions').update({ passport_url: passportUrl }).eq('id', partialId);
      }
    };
    run();
  }, [passportImageBlob, partialId]);

  const [error, setError] = useState<string | null>(null);

  const isFormComplete = user && videoBlob && passportImageBlob;

  const handleSubmit = async () => {
    if (!isFormComplete || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
        const videoFileName = `public/${user.id}_${Date.now()}.webm`;
        const { error: videoError } = await supabase.storage.from('videos').upload(videoFileName, videoBlob);
        if (videoError) throw new Error(`Video upload failed: ${videoError.message}`);
        const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoFileName);

        const passportFileName = `public/${user.id}_${Date.now()}.png`;
        const { error: passportError } = await supabase.storage.from('passports').upload(passportFileName, passportImageBlob);
        if (passportError) throw new Error(`Passport upload failed: ${passportError.message}`);
        const { data: { publicUrl: passportUrl } } = supabase.storage.from('passports').getPublicUrl(passportFileName);
            
        const submissionData = {
            telegram_user: user,
            video_url: videoUrl,
            passport_url: passportUrl,
            submission_date: new Date().toISOString(),
            user_id: user.id
        };
        const { error: insertError } = await supabase.from('submissions').insert([submissionData]);
        if (insertError) throw new Error(`Database insert failed: ${insertError.message}`);
        
        setIsSubmitted(true);
        if (partialId) { await supabase.from('submissions').update({ status: 'submitted' }).eq('id', partialId); }
        
    } catch (err: any) {
        console.error("Error submitting data:", err);
        setError(err.message || "An unknown error occurred during submission.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
        <div className="text-center p-8 bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-lg flex flex-col items-center justify-center space-y-4">
            <CheckCircleIcon className="w-20 h-20 text-green-400" />
            <h2 className="text-2xl font-bold text-green-400">{t('submitSuccessTitle')}</h2>
            <p className="text-tg-hint">{t('submitSuccessMessage')}</p>
        </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-center text-tg-text drop-shadow-lg">{t('formTitle')}</h2>
      
      <TelegramDataDisplay user={user} />
      <VideoVerification onVideoRecorded={setVideoBlob} onRecordingChange={setIsRecording} />
      <PassportCapture onImageCaptured={setPassportImageBlob} recording={isRecording} />

      {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!isFormComplete || isSubmitting}
        className={`w-full py-4 mt-4 text-xl font-bold rounded-lg transition-all duration-300 transform hover:scale-105 flex justify-center items-center ${
          isFormComplete && !isSubmitting
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
        }`}
      >
        {isSubmitting ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ) : null}
        {isSubmitting ? t('submittingButton') : t('submitButton')}
      </button>
      <p className="text-xs text-tg-hint text-center pt-2">
        {t('officialNote')}
      </p>
    </div>
  );
};