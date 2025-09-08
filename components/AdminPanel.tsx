import React, { useState, useEffect } from 'react';
import type { CollectedData } from '../types';
import { UserIcon } from './icons';
import { useTranslation } from '../lib/i18n';
import { supabase } from '../lib/supabase';

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-tg-bg/30 overflow-hidden">
    <div className="px-4 py-2 bg-tg-bg/40 text-sm font-semibold text-tg-hint border-b border-white/10">{title}</div>
    <div className="p-4">{children}</div>
  </div>
);

const MetaList: React.FC<{ meta: any }> = ({ meta }) => {
  if (!meta) return <div className="text-tg-hint">—</div>;
  const rows = [
    ['Платформа', meta.platform],
    ['Версия клиента', meta.version],
    ['Тема', meta.colorScheme],
    ['Расширение', meta.isExpanded ? 'да' : 'нет'],
    ['Высота вьюпорта', meta.viewportHeight],
    ['Стабильная высота', meta.viewportStableHeight],
    ['Тип чата', meta.chat_type],
    ['Инстанс чата', meta.chat_instance],
    ['Стартовый параметр', meta.start_param],
    ['Query ID', meta.query_id],
    ['Auth date', meta.auth_date],
  ].filter(([,v]) => v !== undefined && v !== null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rows.map(([k,v]) => (
        <div key={k as string} className="flex justify-between gap-4 text-sm">
          <span className="text-tg-hint">{k}</span>
          <span className="font-mono break-all text-tg-text/90">{String(v)}</span>
        </div>
      ))}
    </div>
  );
};

const PrettyKV: React.FC<{ obj: Record<string, any>, pick?: string[] }> = ({ obj, pick }) => {
  if (!obj) return <div className="text-tg-hint">—</div>;
  const keys = (pick ?? Object.keys(obj)).filter(k => obj[k] !== undefined && obj[k] !== null);
  if (keys.length === 0) return <div className="text-tg-hint">—</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {keys.map(k => (
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


const AdminCard: React.FC<{ data: CollectedData }> = ({ data }) => {
    const meta: any = (data as any).meta ?? {};

    const { t } = useTranslation();
    return (
        <div className="bg-tg-secondary-bg/50 border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 bg-tg-bg/30 border-b border-white/10">
                <div className="flex items-center space-x-4">
                    <UserIcon className="w-10 h-10 text-tg-link" />
                    <div>
                        <h3 className="font-bold text-xl text-tg-text">
                            {data.telegram_user?.first_name} {data.telegram_user?.last_name || ''}
                        </h3>
                        <p className="text-sm text-tg-hint">@{data.telegram_user?.username || 'N/A'} (ID: {data.telegram_user?.id})</p>
                    </div>
                </div>
                <div className="p-4 grid gap-4">
                  <Section title="Заявка">
                    <PrettyKV obj={{ id: data.id, status: (data as any).status, submission_date: data.submission_date }} />
                  </Section>
                  <Section title="Медиа">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-tg-hint mb-1">Video</div>
                        {data.video_url ? (<video src={data.video_url} controls className="w-full rounded-xl border border-white/10" />) : (<div className="text-tg-hint">—</div>)}
                      </div>
                      <div>
                        <div className="text-xs text-tg-hint mb-1">Passport</div>
                        {data.passport_url ? (<img src={data.passport_url} className="w-full rounded-xl border border-white/10" />) : (<div className="text-tg-hint">—</div>)}
                      </div>
                    </div>
                  </Section>
                  <Section title="Окружение Telegram">
                    <MetaList meta={(data as any).meta} />
                  </Section>
                  <Section title="Environment">
                    <PrettyKV obj={(data as any).meta} pick={["platform","version","colorScheme","isExpanded","viewportHeight","viewportStableHeight","themeParams"]} />
                  </Section>
                  <Section title="Init Data (сырой)">
                    <PrettyKV obj={(data as any).meta} pick={["chat","receiver","chat_type","chat_instance","start_param","query_id","auth_date"]} />
                  </Section>
                  <Section title="Полный Meta (JSON)">
                    <PrettyJSON data={(data as any).meta} />
                  </Section>
                </div>
                <div className="p-4 grid gap-4">
                  <Section title="Профиль Telegram">
                    <PrettyKV obj={data.telegram_user as any} pick={["id","username","first_name","last_name","language_code","is_premium"]} />
                  </Section>
                  <Section title="Заявка">
                    <PrettyKV obj={{ id: data.id, submission_date: data.submission_date, video_url: data.video_url, passport_url: data.passport_url }} />
                  </Section>
                  <Section title="WebApp Meta (quick view)">
                    <PrettyKV obj={{
                      platform: meta.platform,
                      version: meta.version,
                      chat_type: meta.chat_type,
                      chat_instance: meta.chat_instance,
                      start_param: meta.start_param,
                      query_id: meta.query_id,
                      auth_date: meta.auth_date,
                      isExpanded: meta.isExpanded,
                      viewportHeight: meta.viewportHeight,
                      viewportStableHeight: meta.viewportStableHeight,
                      colorScheme: meta.colorScheme
                    }} />
                  </Section>
                  <Section title="Theme Params">
                    <PrettyKV obj={meta.themeParams || {}} />
                  </Section>
                  <Section title="Full Meta JSON">
                    <PrettyJSON data={meta} />
                  </Section>
                </div>
                <p className="text-xs text-tg-hint mt-2 text-right">{t('adminCardSubmitted')}: {new Date(data.submission_date).toLocaleString()}</p>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold mb-2 text-tg-text">{t('adminCardVideoTitle')}</h4>
                    {data.video_url ? (
                        <video src={data.video_url} controls className="w-full rounded-lg bg-black aspect-video"></video>
                    ) : <p className="text-tg-hint">{t('adminCardNoVideo')}</p>}
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-tg-text">{t('adminCardPassportTitle')}</h4>
                    {data.passport_url ? (
                        <img src={data.passport_url} alt="Passport" className="w-full rounded-lg bg-black object-contain aspect-video" />
                    ) : <p className="text-tg-hint">{t('adminCardNoImage')}</p>}
                </div>
            </div>
        </div>
    );
};


export const AdminPanel: React.FC = () => {
    const { t } = useTranslation();
    const [allUserData, setAllUserData] = useState<CollectedData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .order('submission_date', { ascending: false });

            if (error) {
                console.error("Error fetching submissions:", error);
                setError(error.message);
            } else {
                setAllUserData(data as CollectedData[]);
            }
            setLoading(false);
        };
        fetchSubmissions();
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-center text-tg-text drop-shadow-lg">{t('adminTitle')}</h2>
            
            {loading && <div className="text-center p-12 text-tg-hint text-lg">{t('adminLoading')}</div>}
            {error && <div className="text-center p-12 bg-red-500/10 text-red-400 rounded-2xl">{t('adminError')}: {error}</div>}

            {!loading && !error && (
                allUserData.length > 0 ? (
                    <div className="space-y-6">
                    {allUserData.map(data => <AdminCard key={data.id} data={data} />)}
                    </div>
                ) : (
                    <div className="text-center p-12 bg-tg-secondary-bg/50 border border-white/10 rounded-2xl">
                    <p className="text-tg-hint text-lg">{t('adminNoSubmissions')}</p>
                    </div>
                )
            )}
        </div>
    );
};