import React from 'react';
import { supabase } from '../lib/supabase';
import type { CollectedData, TelegramUser } from '../types';
import { UserIcon, VideoIcon, PassportIcon } from './icons';

// —————————————————————————————————————
// Вспомогательные UI-компоненты (только русский)
// —————————————————————————————————————

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-tg-bg/30 overflow-hidden">
    <div className="px-4 py-2 bg-tg-bg/40 text-sm font-semibold text-tg-hint border-b border-white/10">{title}</div>
    <div className="p-4">{children}</div>
  </div>
);

const PrettyKV: React.FC<{ obj: Record<string, any>; pick?: string[] }> = ({ obj, pick }) => {
  if (!obj) return <div className="text-tg-hint">—</div>;
  const keys = (pick ?? Object.keys(obj)).filter((k) => obj[k] !== undefined && obj[k] !== null);
  if (keys.length === 0) return <div className="text-tg-hint">—</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {keys.map((k) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <span className="text-tg-hint">{k}</span>
          <span className="font-mono break-all text-tg-text/90">
            {typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k])}
          </span>
        </div>
      ))}
    </div>
  );
};

const PrettyJSON: React.FC<{ data: any }> = ({ data }) => (
  <pre className="text-xs bg-black/20 rounded-xl p-3 overflow-auto max-h-80 border border-white/10">
    {JSON.stringify(data, null, 2)}
  </pre>
);

// Читаемое представление ключевых метаполей
const MetaList: React.FC<{ meta: any }> = ({ meta }) => {
  if (!meta) return <div className="text-tg-hint">—</div>;
  const rows: Array<[string, any]> = [
    ['Платформа', meta?.platform],
    ['Версия клиента', meta?.version],
    ['Тема', meta?.colorScheme],
    ['Расширен экран', meta?.isExpanded ? 'да' : 'нет'],
    ['Высота вьюпорта', meta?.viewportHeight],
    ['Стабильная высота', meta?.viewportStableHeight],
    ['Тип чата', meta?.chat_type],
    ['Инстанс чата', meta?.chat_instance],
    ['Стартовый параметр', meta?.start_param],
    ['Query ID', meta?.query_id],
    ['Auth date', meta?.auth_date],
  ].filter(([, v]) => v !== undefined && v !== null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <span className="text-tg-hint">{k}</span>
          <span className="font-mono break-all text-tg-text/90">{String(v)}</span>
        </div>
      ))}
    </div>
  );
};

// —————————————————————————————————————
// Кнопка уведомления пользователя (через /api/notify)
// —————————————————————————————————————

const NotifyUserButton: React.FC<{ data: CollectedData }> = ({ data }) => {
  const [sending, setSending] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.telegram_user?.id,
          status: (data as any).status || 'partial',
          language_code: (data.telegram_user as any)?.language_code || 'ru',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatusMsg('Уведомление отправлено');
    } catch (e: any) {
      console.error(e);
      setStatusMsg('Не удалось отправить уведомление');
    } finally {
      setSending(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={send}
        disabled={sending}
        className="px-3 py-1 rounded-lg bg-tg-button text-tg-button-text text-sm disabled:opacity-50"
      >
        {sending ? 'Отправка…' : 'Уведомить пользователя'}
      </button>
      {statusMsg && <span className="text-xs text-tg-hint">{statusMsg}</span>}
    </div>
  );
};

// —————————————————————————————————————
// Карточка одной заявки
// —————————————————————————————————————

const AdminCard: React.FC<{ data: CollectedData }> = ({ data }) => {
  const meta: any = (data as any).meta ?? {};
  const tu: TelegramUser | undefined = data.telegram_user;

  return (
    <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 bg-tg-bg/30 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <UserIcon className="w-10 h-10 text-tg-link" />
          <div>
            <h3 className="font-bold text-xl text-tg-text">
              {tu?.first_name} {tu?.last_name || ''}
            </h3>
            <p className="text-sm text-tg-hint">
              @{tu?.username || 'N/A'} (ID: {tu?.id})
            </p>
          </div>
          <div className="ml-auto text-xs text-tg-hint">
            Статус:{' '}
            <span
              className={
                (data as any).status === 'submitted'
                  ? 'text-green-400'
                  : 'text-yellow-300'
              }
            >
              {(data as any).status || 'partial'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Блок медиа */}
        <Section title="Медиа">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-tg-hint mb-1 flex items-center gap-2">
                <VideoIcon className="w-4 h-4" /> Видео-верификация
              </div>
              {data.video_url ? (
                <video
                  controls
                  src={data.video_url}
                  className="w-full rounded-lg border border-white/10"
                />
              ) : (
                <div className="text-tg-hint text-sm">Нет видео.</div>
              )}
            </div>
            <div>
              <div className="text-xs text-tg-hint mb-1 flex items-center gap-2">
                <PassportIcon className="w-4 h-4" /> Фото паспорта/ID
              </div>
              {data.passport_url ? (
                <img
                  src={data.passport_url}
                  alt="Passport"
                  className="w-full rounded-lg border border-white/10 object-contain"
                />
              ) : (
                <div className="text-tg-hint text-sm">Нет изображения.</div>
              )}
            </div>
          </div>
        </Section>

        {/* Профиль и заявка */}
        <div className="grid md:grid-cols-2 gap-4">
          <Section title="Профиль Telegram">
            <PrettyKV
              obj={tu as any}
              pick={['id', 'username', 'first_name', 'last_name', 'language_code', 'is_premium']}
            />
          </Section>
          <Section title="Заявка">
            <PrettyKV
              obj={{
                id: data.id,
                статус: (data as any).status || 'partial',
                дата: data.submission_date,
                video_url: data.video_url,
                passport_url: data.passport_url,
              }}
            />
          </Section>
        </div>

        {/* Метаданные */}
        <Section title="Окружение Telegram">
          <MetaList meta={meta} />
        </Section>
        <Section title="Полный Meta (JSON)">
          <PrettyJSON data={meta} />
        </Section>
      </div>
    </div>
  );
};

// —————————————————————————————————————
// Основная админ-панель
// —————————————————————————————————————

export const AdminPanel: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [allUserData, setAllUserData] = React.useState<CollectedData[]>([]);

  React.useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('submission_date', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        setError(error.message);
      } else {
        setAllUserData((data || []) as CollectedData[]);
      }
      setLoading(false);
    };
    fetchSubmissions();
  }, []);

  // Группировка по пользователю
  const grouped = React.useMemo(() => {
    const acc: Record<string, CollectedData[]> = {};
    for (const item of allUserData) {
      const uid = item.telegram_user?.id ? String(item.telegram_user.id) : 'unknown';
      (acc[uid] = acc[uid] || []).push(item);
    }
    return acc;
  }, [allUserData]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-center text-tg-text drop-shadow-lg">Админ-панель — Заявки</h2>

      {loading && <div className="text-center p-12 text-tg-hint text-lg">Загрузка заявок…</div>}
      {error && (
        <div className="text-center p-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">
          Ошибка загрузки: {error}
        </div>
      )}

      {!loading && !error && (
        Object.keys(grouped).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(grouped).map(([uid, items]) => {
              const head = items[0];
              const tu = head.telegram_user;
              return (
                <div key={uid} className="space-y-4">
                  {/* Шапка группы */}
                  <div className="sticky top-0 z-10 backdrop-blur bg-tg-secondary-bg/60 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserIcon className="w-6 h-6 text-tg-link" />
                      <div className="text-sm">
                        <div className="text-tg-text font-semibold">
                          {tu?.first_name} {tu?.last_name || ''}{' '}
                          <span className="text-tg-hint">@{tu?.username || 'N/A'}</span>
                        </div>
                        <div className="text-tg-hint">ID: <span className="font-mono">{uid}</span> • заявок: {items.length}</div>
                      </div>
                    </div>
                    <NotifyUserButton data={head} />
                  </div>

                  {/* Список карточек заявок пользователя */}
                  <div className="space-y-6">
                    {items.map((it) => (
                      <AdminCard key={it.id} data={it} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-12 bg-tg-secondary-bg/50 border border-white/10 rounded-2xl">
            <p className="text-tg-hint text-lg">Пока нет отправленных данных от пользователей.</p>
          </div>
        )
      )}
    </div>
  );
};

export default AdminPanel;
