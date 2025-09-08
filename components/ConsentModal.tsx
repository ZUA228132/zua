import React from 'react';
import type { Consent } from '../lib/collect';

export const ConsentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onAccept: (consent: Consent) => void;
}> = ({ open, onClose, onAccept }) => {
  const [state, setState] = React.useState<Consent>({
    basic: true,
    hardware: true,
    network: true,
    media: true,
    permissions: true,
    webgl: true,
  });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="w-full max-w-lg rounded-3xl bg-tg-bg/90 backdrop-blur border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4">
          <h3 className="text-xl font-bold">Сбор дополнительных данных</h3>
          <p className="text-sm text-tg-hint">
            С вашего разрешения приложению будет доступна расширенная диагностика устройства.
            Вы можете выбрать, что именно разрешить. Данные используются для защиты и верификации.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {(['basic','hardware','network','media','permissions','webgl'] as (keyof Consent)[]).map(key => (
              <label key={key} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!state[key]}
                  onChange={e => setState(s => ({ ...s, [key]: e.target.checked }))}
                />
                <div>
                  <div className="font-medium">
                    {key === 'basic' && 'Базовая информация (язык, экран, таймзона)'}
                    {key === 'hardware' && 'Железо (CPU, память, батарея)'}
                    {key === 'network' && 'Сеть (тип соединения)'}
                    {key === 'media' && 'Медиа-устройства (без идентификаторов)'}
                    {key === 'permissions' && 'Статусы разрешений (камера/микрофон/гео)'}
                    {key === 'webgl' && 'Графика (WebGL renderer/vendor)'}
                  </div>
                  <div className="text-xs text-tg-hint mt-1">
                    {key === 'media' ? 'Метки устройств будут видны только после разрешения на камеру/микрофон.' : ' '}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/10">Отмена</button>
            <button onClick={() => onAccept(state)} className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text">Разрешить</button>
          </div>
        </div>
      </div>
    </div>
  );
};
