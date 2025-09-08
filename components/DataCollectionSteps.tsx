import React, { useEffect, useRef, useState } from 'react';
import type { TelegramUser } from '../types';
import { useTranslation } from '../lib/i18n';
import { useTelegram } from '../hooks/useTelegram';
import { PassportIcon, CheckCircleIcon, VideoIcon, CameraIcon } from './icons';

/** ─── 0. Хедер с данными Telegram ─── */
export const TelegramDataDisplay: React.FC<{ user: TelegramUser | null }> = ({ user }) => {
  const { t } = useTranslation();
  return (
    <div className="relative rounded-3xl p-4 overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-xl">
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-tg-text">{t('telegramDataTitle')}</h3>
          <p className="text-sm text-tg-hint">
            {user ? `${user.first_name} ${user.last_name || ''} (@${user.username || 'N/A'})` : t('telegramDataLoading')}
          </p>
        </div>
        {user && <CheckCircleIcon className="w-6 h-6 text-green-400" />}
      </div>
    </div>
  );
};

/** ─── 1. Видеокружок: 10s запись, 3D UI, без WebRTC ─── */
export const VideoVerification: React.FC<{
  onVideoRecorded: (blob: Blob) => void;
  onRecordingChange?: (rec: boolean) => void;
}> = ({ onVideoRecorded, onRecordingChange }) => {
  const { t } = useTranslation();

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef<boolean>(false);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const cleanup = () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current) { try { if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch {} mediaRecorderRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setProgress(0);
  };

  useEffect(() => () => cleanup(), []);

  const hardStop = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try { mediaRecorderRef.current?.stop(); } catch {}
    setIsRecording(false);
    onRecordingChange?.(false);
  };

  const startRecording = async () => {
    if (isRecording) return;
    setError(null);
    setVideoUrl(null);
    recordedChunks.current = [];
    finishingRef.current = false;
    setProgress(0);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
      const recorder = new MediaRecorder(mediaStream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) recordedChunks.current.push(e.data); };
      recorder.onstop = () => {
        try {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          onVideoRecorded(blob);
        } finally {
          cleanup();
          finishingRef.current = false;
        }
      };

      // 10 сек таймер + плавный прогресс
      const started = Date.now();
      const total = 10000;
      const tick = () => {
        const elapsed = Date.now() - started;
        const p = Math.min(1, elapsed / total);
        setProgress(p);
        if (p < 1 && isRecording) requestAnimationFrame(tick);
      };

      recorder.start();
      setIsRecording(true);
      onRecordingChange?.(true);
      requestAnimationFrame(tick);

      timerRef.current = window.setTimeout(() => hardStop(), total);
    } catch (err) {
      console.error('Camera error:', err);
      setError(t('cameraError'));
      cleanup();
    }
  };

  // 3D-поворот при наклоне/движении
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const onMove = (e: any) => {
      const rect = el.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      const rx = ((y / rect.height) - 0.5) * -10;
      const ry = ((x / rect.width) - 0.5) * 10;
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const reset = () => { el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', reset);
    el.addEventListener('touchmove', onMove);
    el.addEventListener('touchend', reset);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', reset);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', reset);
    };
  }, []);

  const handleButtonClick = () => {
    if (videoUrl) {
      setVideoUrl(null);
      setTimeout(() => startRecording(), 50);
    } else {
      startRecording();
    }
  };

  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl space-y-4">
      <style>{`
        .ring {
          position: relative;
          width: 280px; height: 280px;
          border-radius: 9999px;
          background: radial-gradient(closest-side, rgba(0,0,0,0.6), rgba(0,0,0,0.2));
          box-shadow: inset 0 10px 30px rgba(255,255,255,0.06), 0 30px 60px rgba(0,0,0,0.4);
          transition: transform .15s ease;
        }
        .ring::before { /* светящийся ободок */
          content: '';
          position: absolute; inset: -3px;
          border-radius: inherit;
          background: conic-gradient(from 0deg, #6ee7f9 0%, #a78bfa 35%, #f472b6 70%, #6ee7f9 100%);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0);
                  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0);
          filter: blur(2px);
        }
        .ring .progress {
          position: absolute; inset: -3px;
          border-radius: inherit;
          background: conic-gradient(#22d3ee calc(var(--p)*1%), rgba(255,255,255,0.1) 0);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0);
                  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0);
          transition: background .1s linear;
        }
        .glass {
          backdrop-filter: blur(6px);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VideoIcon className="w-6 h-6 text-tg-link" />
          <span className="text-sm text-tg-hint">10 секунд записи</span>
        </div>
        {videoUrl && <CheckCircleIcon className="w-8 h-8 text-green-400" />}
      </div>

      <div className="w-full flex justify-center">
        <div ref={ringRef} className="ring" style={{ ['--p' as any]: Math.round(progress * 100) }}>
          <div className="progress" style={{ ['--p' as any]: Math.round(progress * 100) }} />
          <div className="absolute inset-3 rounded-full overflow-hidden glass flex items-center justify-center">
            {videoUrl && !isRecording ? (
              <video controls src={videoUrl} className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-tg-hint text-center">{t('videoPreviewHint')}</p>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={handleButtonClick}
        disabled={isRecording}
        className={`w-full py-3 px-4 font-semibold rounded-xl transition-all text-lg shadow-lg ${
          isRecording
            ? 'bg-red-500/80 text-white cursor-wait'
            : 'bg-tg-button text-tg-button-text hover:bg-opacity-90 active:scale-[.99]'
        }`}
      >
        {isRecording ? t('recordingButton') : videoUrl ? t('recordAgainButton') : t('startRecordingButton')}
      </button>
    </div>
  );
};

/** ─── 2. Фото паспорта (без изменений логики) ─── */
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
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
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
      const w = video.videoWidth || 1280; const h = video.videoHeight || 720;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D context not available');
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/png'); setCapturedImage(dataUrl);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.95));
      onImageCaptured(blob);
      cleanup();
    } catch (e) {
      console.error(e); setError('Не удалось сделать фото.');
    }
  };

  useEffect(() => { startCamera(); return () => cleanup(); }, []);

  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PassportIcon className="w-6 h-6 text-tg-link" />
        </div>
        {capturedImage && <CheckCircleIcon className="w-8 h-8 text-green-400" />}
      </div>

      <div className="w-full aspect-video relative">
        {recording && (
          <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-sm z-10">
            Идёт запись видео — съёмка паспорта недоступна
          </div>
        )}

        <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40">
          {capturedImage ? (
            <img src={capturedImage} alt="Passport Preview" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={capturedImage ? startCamera : capturePhoto}
        disabled={recording}
        className="w-full py-3 px-4 font-semibold rounded-xl transition-all text-lg bg-tg-button text-tg-button-text hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <CameraIcon className="w-6 h-6" />
        <span>{capturedImage ? t('retakePhotoButton') : t('capturePhotoButton')}</span>
      </button>
    </div>
  );
};
