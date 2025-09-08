import React from 'react';
import { supabase } from '../lib/supabase';
import type { CollectedData, TelegramUser } from '../types';
import { UserIcon, VideoIcon, PassportIcon } from './icons';

/** =========================
 *  ВСПОМОГАТЕЛЬНЫЕ UI
 *  ========================= */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-tg-bg/30 overflow-hidden">
    <div className="px-4 py-2 bg-tg-bg/40 text-sm font-semibold text-tg-hint border-b border-white/10">{title}</div>
    <div className="p-4">{children}</div>
  </div>
);

const PrettyKV: React.FC<{ obj: Record<string, any> | null | undefined; pick?: string[] }> = ({ obj, pick }) => {
  if (!obj) return <div className="text-tg-hint">—</div>;
  const keys = (pick ?? Object.keys(obj)).filter((k) => obj[k] !== undefined && obj[k] !== null);
  if (keys.length === 0) return <div className="text-tg-hint">—</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {keys.map((k) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <span className="text-tg-hint">{k}</span>
          <span className="font-mono break-all text-tg-text/90">{typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k])}</span>
        </div>
      ))}
    </div>
  );
};

const PrettyJSON: React.FC<{ data: any }> = ({ data }) => (
  <pre className="text-xs bg-black/20 rounded-xl p-3 overflow-auto max-h-80 border border-white/10">{JSON.stringify(data, null, 2)}</pre>
);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <span className="text-tg-hint">{k}</span>
          <span className="font-mono break-all text-tg-text/90">{String(v)}</span>
        </div>
      ))}
    </div>
  );
};

/** =========================
 *  НОРМАЛИЗАЦИЯ СТРОК
 *  ========================= */
type Row = CollectedData & {
  status?: string;
  session_id?: string;
  meta?: any;
  video_url?: string | null;
  videoUrl?: string | null;
  passport_url?: string | null;
  passportUrl?: string | null;
  user_id?: string | number | null;
};

function normalizeRow(r: Row) {
  const video =
    r.video_url ??
    (r as any).videoUrl ??
    r.meta?.video_url ??
    null;

  const passport =
    r.passport_url ??
    (r as any).passportUrl ??
    r.meta?.passport_url ??
    null;

  const uid =
    (r.telegram_user as any)?.id ??
    r.user_id ??
    r.meta?.user_id ??
    null;

  const status = (r as any).status ?? r.meta?.status ?? 'partial';

  return {
    ...r,
    _video: video,
    _passport: passport,
    _uid: uid ? String(uid) : 'unknown',
    _status: status,
  };
}

/** =========================
 *  КНОПКА УВЕДОМЛЕНИЙ
 *  ========================= */
const NotifyUserButton: React.FC<{ data: any }> = ({ data }) => {
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
          user_id: data.telegram_user?.id || data._uid,
          status: data._status || 'partial',
          language_code: (data.telegram_user as any)?.language_code || 'ru',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatusMsg('Уведомление отправлено');
    } catch (e) {
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
        className="px-3 py-2 rounded-lg bg-tg-button text-tg-button-text text-sm disabled:opacity-50"
      >
        {sending ? 'Отправка…' : 'Уведомить пользователя'}
      </button>
      {statusMsg && <span className="text-xs text-tg-hint">{statusMsg}</span>}
    </div>
  );
};

/** =========================
 *  КАРТОЧКА ЗАЯВКИ
 *  ========================= */
const AdminCard: React.FC<{ data: any }> = ({ data }) => {
  const meta: any = data.meta ?? {};
  const tu: TelegramUser | undefined = data.telegram_user;

  return (
    <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
      <div className="p-4 bg-tg-bg/30 border-b border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-tg-link" />
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-xl text-tg-text truncate">
              {tu?.first_name} {tu?.last_name || ''}
            </h3>
            <p className="text-xs sm:text-sm text-tg-hint truncate">
              @{tu?.username || 'N/A'} (ID: {tu?.id})
            </p>
          </div>
          <div className="ml-auto text-xs text-tg-hint">
            Статус:{' '}
            <span className={data._status === 'submitted' ? 'text-green-400' : 'text-yellow-300'}>
              {data._status}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Section title="Медиа">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-tg-hint mb-1 flex items-center gap-2">
                <VideoIcon className="w-4 h-4" /> Видео-верификация
              </div>
              {data._video ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10">
                  <video controls preload="metadata" src={data._video} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="text-tg-hint text-sm">Нет видео.</div>
              )}
            </div>
            <div>
              <div className="text-xs text-tg-hint mb-1 flex items-center gap-2">
                <PassportIcon className="w-4 h-4" /> Фото паспорта/ID
              </div>
              {data._passport ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                  <img src={data._passport} alt="Passport" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="text-tg-hint text-sm">Нет изображения.</div>
              )}
            </div>
          </div>
        </Section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Section title="Профиль Telegram">
            <PrettyKV obj={tu as any} pick={['id', 'username', 'first_name', 'last_name', 'language_code', 'is_premium']} />
          </Section>
          <Section title="Заявка">
            <PrettyKV
              obj={{
                id: data.id,
                статус: data._status || 'partial',
                дата: data.submission_date,
                video_url: data._video || null,
                passport_url: data._passport || null,
              }}
            />
          </Section>
        </div>

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

/** =========================
 *  ОСНОВНАЯ АДМИН-ПАНЕЛЬ
 *  ========================= */
export const AdminPanel: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

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
        const normalized = (data ?? []).map(normalizeRow);
        setRows(normalized);
      }
      setLoading(false);
    };
    fetchSubmissions();
  }, []);

  // группировка по _uid
  const grouped = React.useMemo(() => {
    const acc: Record<string, any[]> = {};
    for (const item of rows) {
      (acc[item._uid] = acc[item._uid] || []).push(item);
    }
    return acc;
  }, [rows]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-3 sm:px-0">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-tg-text drop-shadow-lg">Админ-панель — Заявки</h2>

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
              const tu: TelegramUser | undefined = head.telegram_user;
              return (
                <div key={uid} className="space-y-4">
                  {/* шапка группы */}
                  <div className="sticky top-0 z-10 backdrop-blur bg-tg-secondary-bg/60 border border-white/10 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserIcon className="w-6 h-6 text-tg-link flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-tg-text font-semibold truncate">
                          {tu?.first_name} {tu?.last_name || ''}{' '}
                          <span className="text-tg-hint">@{tu?.username || 'N/A'}</span>
                        </div>
                        <div className="text-tg-hint text-sm truncate">
                          ID: <span className="font-mono">{uid}</span> • заявок: {items.length}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <NotifyUserButton data={head} />
                    </div>
                  </div>

                  {/* список карточек */}
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
