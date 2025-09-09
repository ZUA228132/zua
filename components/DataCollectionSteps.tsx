// src/components/DataCollectionSteps.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { TelegramUser } from '../types';
import { useTranslation } from '../lib/i18n';
import { PassportIcon, CheckCircleIcon, VideoIcon, CameraIcon } from './icons';

/**
 * FaceMesh через CDN ESM (без NPM-зависимостей)
 * Просим Vite не препаблить импорт.
 */
let FaceMeshCtor: any = null;
let drawConnectors: any = null;
let FACEMESH_TESSELATION: any = null;
let FACEMESH_FACE_OVAL: any = null;

async function ensureFaceMesh() {
  if (FaceMeshCtor) return;
  const fm = await import(/* @vite-ignore */ 'https://esm.sh/@mediapipe/face_mesh');
  const draw = await import(/* @vite-ignore */ 'https://esm.sh/@mediapipe/drawing_utils');
  FaceMeshCtor = (fm as any).FaceMesh;
  FACEMESH_TESSELATION = (fm as any).FACEMESH_TESSELATION;
  FACEMESH_FACE_OVAL = (fm as any).FACEMESH_FACE_OVAL;
  drawConnectors = (draw as any).drawConnectors;
}

/* ────────────────────── 0) Шапка ────────────────────── */
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

/* ─────────────── 1) Видеокружок + FaceMesh + фиксы iOS ─────────────── */
export const VideoVerification: React.FC<{
  onVideoRecorded: (blob: Blob) => void;
  onRecordingChange?: (rec: boolean) => void;
}> = ({ onVideoRecorded, onRecordingChange }) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef<boolean>(false);

  const cleanup = () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current) {
      try { if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    const ctx = overlayRef.current?.getContext('2d');
    if (ctx && overlayRef.current) ctx.clearRect(0,0,overlayRef.current.width, overlayRef.current.height);
    setProgress(0);
  };
  useEffect(() => () => cleanup(), []);

  const hardStop = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try { mediaRecorderRef.current?.requestData?.(); } catch {}
    try { mediaRecorderRef.current?.stop(); } catch {}
    setIsRecording(false);
    onRecordingChange?.(false);
  };

  const startRecording = async () => {
    if (isRecording) return;
    setError(null);
    recordedChunks.current = [];
    finishingRef.current = false;
    setProgress(0);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      streamRef.current = mediaStream;
      const video = videoRef.current!;
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play().catch(() => {});

      // FaceMesh overlay (лениво)
      try {
        await ensureFaceMesh();
        const faceMesh = new FaceMeshCtor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        const canvas = overlayRef.current!;
        const ctx = canvas.getContext('2d')!;
        const onResults = (res: any) => {
          if (!canvas || !ctx) return;
          const w = video.videoWidth || 640, h = video.videoHeight || 640;
          canvas.width = w; canvas.height = h;
          ctx.clearRect(0,0,w,h);
          if (res.multiFaceLandmarks) {
            for (const lm of res.multiFaceLandmarks) {
              drawConnectors(ctx as any, lm, FACEMESH_TESSELATION, { color: '#66e', lineWidth: 0.6 });
              drawConnectors(ctx as any, lm, FACEMESH_FACE_OVAL, { color: '#0f0', lineWidth: 1.4 });
            }
          }
        };
        faceMesh.onResults(onResults);
        const loop = async () => { if (!isRecording) return; await faceMesh.send({ image: video }); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
      } catch (e) {
        console.warn('FaceMesh init failed', e);
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const rec = new MediaRecorder(mediaStream, { mimeType: mime });
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) recordedChunks.current.push(e.data);
      };
      rec.onstop = () => {
        try {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          onVideoRecorded(blob);           // ← здесь твой UserForm переведёт на «паспорт»
        } finally {
          cleanup();
          finishingRef.current = false;
        }
      };

      // iOS-фикс: отдаём чанки регулярно, чтобы гарантировать onstop / ondataavailable
      rec.start(500);

      const startTs = Date.now();
      const total = 10000; // 10 сек
      const tick = () => {
        const p = Math.min(1, (Date.now() - startTs) / total);
        setProgress(p);
        if (p < 1 && isRecording) requestAnimationFrame(tick);
      };
      setIsRecording(true);
      onRecordingChange?.(true);
      requestAnimationFrame(tick);

      timerRef.current = window.setTimeout(() => hardStop(), total);
    } catch (err) {
      console.error('getUserMedia error', err);
      setError(t('cameraError'));
      cleanup();
    }
  };

  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl space-y-4">
      <style>{`
        /* Круглая маска + аккуратная обводка */
        .circle-shell{
          position:relative; width:min(78vw,360px); aspect-ratio:1/1; margin:auto;
          border-radius:9999px; overflow:hidden;
          -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 60%, transparent 61%);
                  mask-image: radial-gradient(circle at 50% 50%, #000 60%, transparent 61%);
        }
        .ring{position:absolute; inset:0; border-radius:9999px; pointer-events:none}
        .ring::before{
          content:''; position:absolute; inset:0; border-radius:inherit;
          background:conic-gradient(from 0deg,#6ee7f9 0%,#a78bfa 35%,#f472b6 70%,#6ee7f9 100%);
          -webkit-mask: radial-gradient(farthest-side,transparent calc(100% - 8px),#000 0);
                  mask: radial-gradient(farthest-side,transparent calc(100% - 8px),#000 0);
          filter: blur(1.2px); opacity:.9;
        }
        .ring .progress{
          position:absolute; inset:0; border-radius:inherit; pointer-events:none;
          background:conic-gradient(#22d3ee calc(var(--p,0)*1%),rgba(255,255,255,0.08) 0);
          -webkit-mask: radial-gradient(farthest-side,transparent calc(100% - 8px),#000 0);
                  mask: radial-gradient(farthest-side,transparent calc(100% - 8px),#000 0);
          transition:background .1s linear;
        }
        .videoWrap{position:absolute; inset:8px; border-radius:9999px; overflow:hidden; background:#000}
        video,canvas{position:absolute; inset:0; width:100%; height:100%; object-fit:cover}
        canvas{pointer-events:none}
      `}</style>

      <div className="flex items-center gap-3 mb-2">
        <VideoIcon className="w-6 h-6 text-tg-link" />
        <span className="text-sm text-tg-hint">10 секунд записи + FaceMesh</span>
      </div>

      <div className="circle-shell">
        <div className="ring" style={{ ['--p' as any]: Math.round(progress * 100) }}>
          <div className="progress" style={{ ['--p' as any]: Math.round(progress * 100) }} />
        </div>
        <div className="videoWrap">
          <video ref={videoRef} autoPlay muted playsInline />
          <canvas ref={overlayRef} />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center mt-1">{error}</p>}

      <button
        onClick={isRecording ? undefined : startRecording}
        disabled={isRecording}
        className={`w-full py-3 px-4 font-semibold rounded-xl transition-all text-lg shadow-lg ${
          isRecording ? 'bg-red-500/80 text-white cursor-wait' : 'bg-tg-button text-tg-button-text hover:bg-opacity-90 active:scale-[.99]'
        }`}
      >
        {isRecording ? t('recordingButton') : t('startRecordingButton')}
      </button>
    </div>
  );
};

/* ─────────────── 2) Фото паспорта ─────────────── */
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
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(() => {});
      }
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
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D context not available');
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.95));
      setCapturedImage(URL.createObjectURL(blob));
      onImageCaptured(blob);
      cleanup();
    } catch (e) {
      console.error(e);
      setError('Не удалось сделать фото.');
    }
  };

  useEffect(() => { startCamera(); return () => cleanup(); }, []);

  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl space-y-4">
      <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 relative">
        {recording && (
          <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-xs z-10">
            Идёт запись видео — съёмка паспорта недоступна
          </div>
        )}
        {capturedImage ? (
          <img src={capturedImage} alt="Passport Preview" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        )}
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
