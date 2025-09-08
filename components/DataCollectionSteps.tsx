import React, { useState, useRef, useEffect } from 'react';
import type { TelegramUser } from '../types';
import { PassportIcon, CheckCircleIcon, VideoIcon, CameraIcon } from './icons';
import { useTranslation } from '../lib/i18n';

// Step 1: Display Telegram Data
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
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
        </div>
    );
};

// Step 2: Video Verification (Face ID style)
export const VideoVerification: React.FC<{ onVideoRecorded: (blob: Blob) => void; onRecordingChange?: (rec: boolean) => void }> = ({ onVideoRecorded, onRecordingChange }) => {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<number | null>(null);
    const stoppingRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const recordedChunks = useRef<Blob[]>([]);

    const cleanup = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current = null;
        }
    };

    useEffect(() => {
        return cleanup;
    }, [stream]);

    const startRecording = async () => {
        if (isRecording || stoppingRef.current) return;
        setError(null);
        setVideoUrl(null);
        recordedChunks.current = [];
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
            setStream(mediaStream);
            videoRef.current!.srcObject = mediaStream;

            const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp9,opus' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data && e.data.size > 0) recordedChunks.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                onVideoRecorded(blob);
                cleanup();
                stoppingRef.current = false;
            };

            recorder.start();
            setIsRecording(true); if (onRecordingChange) onRecordingChange(true);

            // hard stop after 5s
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => {
                stopRecording();
            }, 5000);

        } catch (err) {
            console.error("Camera access denied:", err);
            setError(t('cameraError'));
            cleanup();
        }
    };

    const stopRecording = () => {
        if (stoppingRef.current) return;
        stoppingRef.current = true;
        if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false); if (onRecordingChange) onRecordingChange(false);
    };

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') stopRecording();
    });
    
     () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false); if (onRecordingChange) onRecordingChange(false);
        }
    };

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
                    content: ''; position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
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
                <div className={`relative w-64 h-64 rounded-full bg-black overflow-hidden border-2 border-tg-hint/30 flex items-center justify-center transition-all duration-300 ${isRecording ? 'spinning-border' : ''}`}>
                    <video 
                        ref={videoRef} autoPlay muted playsInline
                        className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${stream || videoUrl ? 'opacity-100' : 'opacity-0'}`}
                        src={videoUrl || undefined}
                        controls={!!videoUrl}
                    />
                    {!stream && !videoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                            <p className="text-tg-hint text-sm">{t('videoPreviewHint')}</p>
                        </div>
                    )}
                </div>
            </div>
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
                {isRecording ? t('recordingButton') : (videoUrl ? t('recordAgainButton') : t('startRecordingButton'))}
            </button>
        </div>
    );
};


// Step 3: Passport Capture
const PassportOverlay = () => (
    <svg className="absolute inset-0 w-full h-full text-white/40" viewBox="0 0 200 125" preserveAspectRatio="xMidYMid meet" fill="none">
        <rect x="2" y="2" width="196" height="121" rx="10" stroke="currentColor" strokeWidth="4" strokeDasharray="10 5" />
        <rect x="15" y="15" width="40" height="50" rx="5" stroke="currentColor" strokeWidth="2" />
        <path d="M18 20 h 30 M 18 28 h 30 M 18 36 h 20 M 18 44 h 25 M 18 52 h 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M70 100 h 60 M70 108 h 80" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
);

export const PassportCapture: React.FC<{ onImageCaptured: (blob: Blob) => void; recording?: boolean }> = ({ onImageCaptured, recording = false }) => {
    const { t } = useTranslation();
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const cleanup = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };
    
    const startCamera = async () => {
        setError(null);
        setCapturedImage(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            setError(t('cameraError'));
            cleanup();
        }
    };

    useEffect(() => {
        startCamera();
        return cleanup;
    }, []);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    setCapturedImage(URL.createObjectURL(blob));
                    onImageCaptured(blob);
                    cleanup();
                }
            }, 'image/png');
        }
    };

    return (
        <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-lg p-4 space-y-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <PassportIcon className="w-6 h-6 text-tg-link" />
                    <h3 className="font-semibold text-tg-text">{t('passportUploadTitle')}</h3>
                </div>
                {capturedImage && <CheckCircleIcon className="w-8 h-8 text-green-400" />}
            </div>

            <div className="w-full aspect-video relative"
                >
                {recording && (
                  <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-sm z-10">Идёт запись видео — съёмка паспорта недоступна</div>
                )}
                <div className="w-full aspect-video bg-black/50 rounded-lg flex items-center justify-center border-2 border-dashed border-transparent overflow-hidden relative">
                {capturedImage ? (
                    <img src={capturedImage} alt="Passport Preview" className="w-full h-full object-contain" />
                ) : (
                    <>
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"></video>
                        <PassportOverlay />
                    </>
                )}
            </div>
            </div>
             <canvas ref={canvasRef} className="hidden"></canvas>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
                onClick={capturedImage ? startCamera : capturePhoto}
                disabled={recording || (!stream && !capturedImage)}
                className="w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 text-lg bg-tg-button text-tg-button-text hover:bg-opacity-90 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
                <CameraIcon className="w-6 h-6"/>
                <span>{capturedImage ? t('retakePhotoButton') : t('capturePhotoButton')}</span>
            </button>
        </div>
    );
};