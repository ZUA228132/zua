import React from 'react';
import { supabase } from '../lib/supabase';
import type { CollectedData, TelegramUser } from '../types';
import { UserIcon, VideoIcon, PassportIcon } from './icons';

/** ───────────────── UI ───────────────── */
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
    ['Платформа', meta?.platform], ['Версия клиента', meta?.version], ['Тема', meta?.colorScheme],
    ['Расширен экран', meta?.isExpanded ? 'да' : 'нет'], ['Высота вьюпорта', meta?.viewportHeight], ['Стабильная высота', meta?.viewportStableHeight],
    ['Тип чата', meta?.chat_type], ['Инстанс чата', meta?.chat_instance], ['Стартовый параметр', meta?.start_param],
    ['Query ID', meta?.query_id], ['Auth date', meta?.auth_date],
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

/** ───────────── Normalization ───────────── */
type Row = CollectedData & {
  status?: string; session_id?: string; meta?: any;
  video_url?: string | null; videoUrl?: string | null;
  passport_url?: string | null; passportUrl?: string | null;
  user_id?: string | number | null;
};
function norm(r: Row) {
  const video = r.video_url ?? (r as any).videoUrl ?? r.meta?.video_url ?? null;
  const passp = r.passport_url ?? (r as any).passportUrl ?? r.meta?.passport_url ?? null;
  const uid = (r.telegram_user as any)?.id ?? r.user_id ?? r.meta?.user_id ?? null;
  const status = (r as any).status ?? r.meta?.status ?? 'partial';
  return { ...r, _video: video, _passport: passp, _uid: uid ? String(uid) : 'unknown', _status: status };
}

/** ───────────── Уведомления ───────────── */
const NotifyUserBar: React.FC<{ head: any }> = ({ head }) => {
  const [sending, setSending] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [ok, setOk] = React.useState<string | null>(null);
  const send = async (templ?: 'submitted'|'pending') => {
    setSending(true); setOk(null);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          user_id: head.telegram_user?.id || head._uid,
          language_code: head.telegram_user?.language_code || 'ru',
          template: templ || (msg ? 'custom' : 'pending'),
          text: msg || undefined,
          status: head._status || 'partial'
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setOk('ok'); setMsg('');
    } catch (e) { setOk('err'); } finally { setSending(false); setTimeout(() => setOk(null), 4000); }
  };
  const sendMediaToAdmin = async () => {
    setSending(true); setOk(null);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          send_media: true,
          video_url: head._video || null,
          photo_url: head._passport || null,
          text: `Медиа по пользователю ${head.telegram_user?.id || head._uid} (${head.telegram_user?.username || 'N/A'})`,
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setOk('ok');
    } catch (e) { setOk('err'); } finally { setSending(false); setTimeout(() => setOk(null), 4000); }
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
      <input
        type="text"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Сообщение пользователю (необязательно)"
        className="flex-1 px-3 py-2 rounded-lg bg-tg-secondary-bg text-sm border border-white/10"
      />
      <div className="flex gap-2">
        <button onClick={() => send('submitted')} disabled={sending} className="px-3 py-2 rounded-lg bg-green-600/80 text-white text-sm disabled:opacity-50">Шаблон: отправлена</button>
        <button onClick={() => send('pending')} disabled={sending} className="px-3 py-2 rounded-lg bg-yellow-600/80 text-white text-sm disabled:opacity-50">Шаблон: ожидает</button>
        <button onClick={() => send()} disabled={sending || !msg} className="px-3 py-2 rounded-lg bg-tg-button text-tg-button-text text-sm disabled:opacity-50">Отправить текст</button>
        <button onClick={sendMediaToAdmin} disabled={sending} className="px-3 py-2 rounded-lg bg-blue-600/80 text-white text-sm disabled:opacity-50">Медиа админу</button>
      </div>
      {ok === 'ok' && <span className="text-xs text-green-400">OK</span>}
      {ok === 'err' && <span className="text-xs text-red-400">Ошибка</span>}
    </div>
  );
};

/** ───────────── Карточка заявки ───────────── */
const SubmissionCard: React.FC<{ data: any }> = ({ data }) => {
  const meta: any = data.meta ?? {};
  return (
    <div className="bg-tg-secondary-bg/30 border border-white/10 rounded-xl p-3 space-y-3">
      <Section title="Медиа">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-tg-hint mb-1 flex items-center gap-2"><VideoIcon className="w-4 h-4" /> Видео</div>
            {data._video ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10">
                <video controls preload="metadata" src={data._video} className="w-full h-full object-contain" />
              </div>
            ) : <div className="text-tg-hint text-sm">Нет видео</div>}
          </div>
          <div>
            <div className="text-xs text-tg-hint mb-1 flex items-center gap-2"><PassportIcon className="w-4 h-4" /> Паспорт</div>
            {data._passport ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                <img src={data._passport} alt="Passport" className="w-full h-full object-contain" />
              </div>
            ) : <div className="text-tg-hint text-sm">Нет изображения</div>}
          </div>
        </div>
      </Section>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section title="Заявка">
          <PrettyKV obj={{
            id: data.id,
            статус: data._status,
            дата: data.submission_date,
            video_url: data._video || null,
            passport_url: data._passport || null,
          }} />
        </Section>
        <Section title="Meta (коротко)">
          <PrettyKV obj={meta} pick={['platform','version','colorScheme','chat_type','start_param','query_id']} />
        </Section>
      </div>
      <Section title="Meta (полный JSON)">
        <PrettyJSON data={meta} />
      </Section>
    </div>
  );
};

/** ───────────── Карточка пользователя (группа) ───────────── */
const UserGroupCard: React.FC<{ uid: string; items: any[] }> = ({ uid, items }) => {
  const head = items[0];
  const tu: TelegramUser | undefined = head.telegram_user;
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 backdrop-blur bg-tg-secondary-bg/60 border border-white/10 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserIcon className="w-6 h-6 text-tg-link flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-tg-text font-semibold truncate">
              {tu?.first_name} {tu?.last_name || ''} <span className="text-tg-hint">@{tu?.username || 'N/A'}</span>
            </div>
            <div className="text-tg-hint text-sm truncate">ID: <span className="font-mono">{uid}</span> • заявок: {items.length}</div>
          </div>
        </div>
      </div>

      <NotifyUserBar head={head} />

      <div className="space-y-4">
        {items.map((it) => <SubmissionCard key={it.id} data={it} />)}
      </div>
    </div>
  );
};

/** ───────────── Основная админка ───────────── */
export const AdminPanel: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('submissions').select('*').order('submission_date', { ascending: false });
      if (error) { setError(error.message); setLoading(false); return; }
      setRows((data ?? []).map(norm));
      setLoading(false);
    };
    fetchSubmissions();
  }, []);

  const grouped = React.useMemo(() => {
    const acc = {};
    for (const it of rows) {
      (acc[it._uid] = acc[it._uid] || []).push(it);
    }
    return acc;
  }, [rows]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-3 sm:px-0">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-tg-text drop-shadow-lg">Админ-панель — Пользователи</h2>

      {loading && <div className="text-center p-12 text-tg-hint text-lg">Загрузка…</div>}
      {error && <div className="text-center p-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">Ошибка: {error}</div>}

      {!loading && !error && (
        Object.keys(grouped).length > 0 ? (
          <div className="space-y-10">
            {Object.entries(grouped).map(([uid, items]) => (
              <UserGroupCard key={uid} uid={uid} items={items as any[]} />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-tg-secondary-bg/50 border border-white/10 rounded-2xl">
            <p className="text-tg-hint text-lg">Пока нет данных.</p>
          </div>
        )
      )}
    </div>
  );
};

export default AdminPanel;
