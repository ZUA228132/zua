import React from 'react';
import { supabase } from '../lib/supabase';
import type { CollectedData, TelegramUser } from '../types';
import { UserIcon, VideoIcon, PassportIcon } from './icons';

/** ─────────── helpers: normalize rows ─────────── */
type Row = CollectedData & {
  status?: string; session_id?: string; meta?: any;
  video_url?: string | null; videoUrl?: string | null;
  passport_url?: string | null; passportUrl?: string | null;
  user_id?: string | number | null;
};
function norm(r: Row) {
  const _video = r.video_url ?? (r as any).videoUrl ?? r.meta?.video_url ?? null;
  const _passport = r.passport_url ?? (r as any).passportUrl ?? r.meta?.passport_url ?? null;
  const _uid = (r.telegram_user as any)?.id ?? r.user_id ?? r.meta?.user_id ?? null;
  const _status = (r as any).status ?? r.meta?.status ?? 'partial';
  return { ...r, _video, _passport, _uid: _uid ? String(_uid) : 'unknown', _status };
}

/** ─────────── UI: small atoms ─────────── */
const Pill: React.FC<{ color?: 'green'|'yellow'|'gray'; children: React.ReactNode }> = ({ color='gray', children }) => {
  const cls = color==='green' ? 'bg-green-500/15 text-green-300 border-green-500/30'
    : color==='yellow' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    : 'bg-white/10 text-white/80 border-white/20';
  return <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>{children}</span>;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-tg-bg/30 overflow-hidden">
    <div className="px-4 py-2 bg-tg-bg/40 text-sm font-semibold text-tg-hint border-b border-white/10">{title}</div>
    <div className="p-4">{children}</div>
  </div>
);

const PrettyJSON: React.FC<{ data: any }> = ({ data }) => (
  <pre className="text-xs bg-black/20 rounded-xl p-3 overflow-auto max-h-72 border border-white/10">{JSON.stringify(data, null, 2)}</pre>
);

/** ─────────── Notifications bar ─────────── */
const NotifyBar: React.FC<{ head: any }> = ({ head }) => {
  const [msg, setMsg] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const fire = async (payload: any) => {
    setSending(true); setResult(null);
    try {
      const r = await fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      setResult('ok');
    } catch (e) { setResult('err'); }
    finally { setSending(false); setTimeout(()=>setResult(null), 3000); }
  };

  const notifyUser = (templ?: 'submitted'|'pending') => fire({
    user_id: head.telegram_user?.id || head._uid,
    language_code: head.telegram_user?.language_code || 'ru',
    template: templ || (msg ? 'custom' : 'pending'),
    text: msg || undefined,
    status: head._status || 'partial'
  });

  const mediaToAdmin = () => fire({
    send_media: true,
    // здесь можно явно указать айди админа:
    admin_user_id: /* ВПИШИ ID АДМИНА ИЛИ ПОДКИНЬ В .env */ undefined,
    text: `Медиа пользователя ${head.telegram_user?.id || head._uid}${head.telegram_user?.username ? ' @'+head.telegram_user.username : ''}`,
    photo_url: head._passport || null,
    video_url: head._video || null
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <input
        value={msg}
        onChange={(e)=>setMsg(e.target.value)}
        placeholder="Произвольное сообщение пользователю…"
        className="w-full px-3 py-2 rounded-xl bg-tg-secondary-bg text-sm border border-white/10"
      />
      <div className="flex gap-2">
        <button onClick={()=>notifyUser('submitted')} disabled={sending} className="px-3 py-2 rounded-xl bg-green-600/80 text-white text-sm disabled:opacity-50">Шаблон: отправлена</button>
        <button onClick={()=>notifyUser('pending')} disabled={sending} className="px-3 py-2 rounded-xl bg-yellow-600/80 text-white text-sm disabled:opacity-50">Шаблон: ожидает</button>
        <button onClick={()=>notifyUser()} disabled={sending || !msg} className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm disabled:opacity-50">Отправить текст</button>
        <button onClick={mediaToAdmin} disabled={sending} className="px-3 py-2 rounded-xl bg-blue-600/80 text-white text-sm disabled:opacity-50">Медиа админу</button>
      </div>
      {result==='ok' && <span className="text-xs text-green-400">OK</span>}
      {result==='err' && <span className="text-xs text-red-400">Ошибка</span>}
    </div>
  );
};

/** ─────────── One submission item ─────────── */
const SubmissionItem: React.FC<{ data: any }> = ({ data }) => {
  const meta: any = data.meta ?? {};
  return (
    <div className="bg-tg-secondary-bg/30 border border-white/10 rounded-2xl p-3 space-y-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section title="Заявка">
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-tg-hint">ID</span><span className="font-mono">{data.id}</span></div>
            <div className="flex justify-between"><span className="text-tg-hint">Статус</span><span>{data._status}</span></div>
            <div className="flex justify-between"><span className="text-tg-hint">Дата</span><span>{data.submission_date}</span></div>
          </div>
        </Section>
        <Section title="Meta (кратко)">
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-tg-hint">Платформа</span><span>{meta?.platform ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-tg-hint">Версия</span><span>{meta?.version ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-tg-hint">Тип чата</span><span>{meta?.chat_type ?? '—'}</span></div>
          </div>
        </Section>
      </div>
      <Section title="Meta (полный JSON)">
        <PrettyJSON data={meta} />
      </Section>
    </div>
  );
};

/** ─────────── User card (collapsible) ─────────── */
const UserCard: React.FC<{ uid: string; items: any[] }> = ({ uid, items }) => {
  const [open, setOpen] = React.useState(false);
  const head = items[0];
  const tu: TelegramUser | undefined = head.telegram_user;

  const lastStatus = items.find(i => i._status === 'submitted') ? 'submitted' : items[0]._status;
  return (
    <div className="rounded-3xl border border-white/10 bg-tg-secondary-bg/50 shadow-xl overflow-hidden">
      {/* header */}
      <button
        className="w-full text-left p-4 flex items-center gap-3"
        onClick={() => setOpen((v)=>!v)}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold">
          {tu?.first_name?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-tg-text truncate">
              {tu?.first_name} {tu?.last_name || ''}
            </div>
            <Pill color={lastStatus === 'submitted' ? 'green' : 'yellow'}>
              {lastStatus}
            </Pill>
          </div>
          <div className="text-sm text-tg-hint truncate">
            @{tu?.username || 'N/A'} • ID: <span className="font-mono">{uid}</span> • заявок: {items.length}
          </div>
        </div>
        <div className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</div>
      </button>

      {/* actions */}
      <div className="px-4 pb-3">
        <NotifyBar head={head} />
      </div>

      {/* body */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {items.map((it) => <SubmissionItem key={it.id} data={it} />)}
        </div>
      )}
    </div>
  );
};

/** ─────────── Admin root ─────────── */
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
    const acc: Record<string, any[]> = {};
    for (const it of rows) (acc[it._uid] = acc[it._uid] || []).push(it);
    return acc;
  }, [rows]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-3 sm:px-0">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-tg-text drop-shadow-lg">Админ-панель — Пользователи</h2>

      {loading && <div className="text-center p-12 text-tg-hint text-lg">Загрузка…</div>}
      {error && <div className="text-center p-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">Ошибка: {error}</div>}

      {!loading && !error && (
        Object.keys(grouped).length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {Object.entries(grouped).map(([uid, items]) => (
              <UserCard key={uid} uid={uid} items={items as any[]} />
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
