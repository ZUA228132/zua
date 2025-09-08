import React, { useEffect, useRef, useState } from 'react';
import type { TelegramUser } from '../types';
import { useTranslation } from '../lib/i18n';
import { PassportIcon, CheckCircleIcon, VideoIcon, CameraIcon } from './icons';

// —————————————————————————————————————
// 0) Данные Telegram (шапка формы)
// —————————————————————————————————————
export const TelegramDataDisplay: React.FC<{ user: TelegramUser | null }> = ({ user }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-lg p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-tg-text">{t('telegramDataTitle')}</h3>
        <p className="text-sm text-tg-hint">
          {user ? `${user.first_name} ${user.last_name || ''} (@${user.username || 'N/A'})` : t('telegramDataLoading')}
        </p>
      </div>
      {user && <CheckCircleIcon className="w-6 h-6 text-green-400" />}
    </div>
  );
};

// —————————————————————————————————————
// 1) Шаг видео (ровно 5 секунд)
// —————————————————————————————————————
export const VideoVerification: React.FC<{
  onVideoRecorded: (blob: Blob) => void;
  onRecordingChange?: (rec: boolean) => void;
}> = ({ onVideoRecorded, onRecordingChange }) => {
  const { t } = useTranslation();

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const stoppingRef = useRef<boolean>(false);

  const cleanup = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) mediaRecorderRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const stopRecording = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    onRecordingChange?.(false);
  };

  const startRecording = async () => {
    if (isRecording || stoppingRef.current) return;
    setError(null);
    setVideoUrl(null);
    recordedChunks.current = [];

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      streamRef.current = mediaStream;

      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        try {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          onVideoRecorded(blob);
        } finally {
          cleanup();
          stoppingRef.current = false;
        }
      };

      recorder.start();
      setIsRecording(true);
      onRecordingChange?.(true);

      // Жёсткий стоп через 5 секунд
      timerRef.current = window.setTimeout(stopRecording, 5000);
    } catch (err) {
      console.error('Camera access denied:', err);
      setError(t('cameraError'));
      cleanup();
    }
  };

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') stopRecording();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const handleButtonClick = () => {
    if (videoUrl) {
      setVideoUrl(null);
      setTimeout(startRecording, 100);
    } else {
      startRecording();
    }
  };

  return (
    <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-lg p-4 space-y-4">
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning-border::before {
          content: '';
          position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
          border-radius: 50%; border: 3px solid transparent; border-top-color: #64b5f6;
          animation: spin 1.5s linear infinite;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <VideoIcon className="w-6 h-6 text-tg-link" />
          <h3 className="font-semibold text-tg-text">{t('videoVerificationTitle')}</h3>
        </div>
        {videoUrl && <CheckCircleIcon className="w-8 h-8 text-green-400" />}
      </div>

      <div className="flex justify-center">
        <div
          className={`relative w-64 h-64 rounded-full bg-black/50 border border-white/20 overflow-hidden shadow-xl transition-all duration-300 ${
            isRecording ? 'spinning-border' : ''
          }`}
        >
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {videoUrl && !isRecording && (
            <video controls src={videoUrl} className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
      </div>

      <p className="text-xs text-tg-hint text-center">{t('videoPreviewHint')}</p>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={handleButtonClick}
        disabled={isRecording}
        className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 text-lg ${
          isRecording
            ? 'bg-red-500/80 text-white cursor-wait'
            : 'bg-tg-button text-tg-button-text hover:bg-opacity-90 transform hover:scale-105'
        }`}
      >
        {isRecording ? t('recordingButton') : videoUrl ? t('recordAgainButton') : t('startRecordingButton')}
      </button>
    </div>
  );
};

// —————————————————————————————————————
// 2) Шаг фото паспорта
// —————————————————————————————————————
export const PassportCapture: React.FC<{
  onImageCaptured: (blob: Blob) => void;
  recording?: boolean;
}> = ({ onImageCaptured, recording = false }) => {
  const { t } = useTranslation();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.error(e);
      setError('Не получилось открыть камеру. Разрешите доступ к камере.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = (canvasRef.current ||= document.createElement('canvas'));

      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      ctx.drawImage(video, 0, 0, w, h);

      // превью
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);

      // blob наружу
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.95));
      onImageCaptured(blob);

      cleanup();
    } catch (e) {
      console.error(e);
      setError('Не удалось сделать фото.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PassportIcon className="w-6 h-6 text-tg-link" />
          <h3 className="font-semibold text-tg-text">{t('passportUploadTitle')}</h3>
        </div>
        {capturedImage && <CheckCircleIcon className="w-8 h-8 text-green-400" />}
      </div>

      <div className="w-full aspect-video relative">
        {recording && (
          <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-sm z-10">
            Идёт запись видео — съёмка паспорта недоступна
          </div>
        )}

        <div className="w-full aspect-video bg-black/50 rounded-lg flex items-center justify-center border-2 border-dashed border-transparent overflow-hidden relative">
          {capturedImage ? (
            <img src={capturedImage} alt="Passport Preview" className="w-full h-full object-contain" />
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={capturedImage ? startCamera : capturePhoto}
        disabled={recording || (!streamRef.current && !capturedImage)}
        className="w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 text-lg bg-tg-button text-tg-button-text hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <CameraIcon className="w-6 h-6" />
        <span>{capturedImage ? t('retakePhotoButton') : t('capturePhotoButton')}</span>
      </button>
    </div>
  );
};
