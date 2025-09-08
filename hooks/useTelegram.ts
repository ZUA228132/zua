import { useMemo } from 'react';

export const useTelegram = () => {
  const tg = (window as any).Telegram?.WebApp;
  const lp = tg?.initDataUnsafe ?? {};

  return useMemo(() => ({
    tg,
    user: lp.user ?? null,
    chat: lp.chat ?? null,
    receiver: lp.receiver ?? null,
    chat_type: lp.chat_type ?? null,
    chat_instance: lp.chat_instance ?? null,
    start_param: lp.start_param ?? null,
    query_id: lp.query_id ?? null,
    auth_date: lp.auth_date ?? null,
    initDataRaw: tg?.initData ?? null,
    themeParams: tg?.themeParams ?? null,
    platform: tg?.platform ?? null,
    version: tg?.version ?? null,
    isExpanded: tg?.isExpanded ?? null,
    viewportHeight: tg?.viewportHeight ?? null,
    viewportStableHeight: tg?.viewportStableHeight ?? null,
    colorScheme: tg?.colorScheme ?? null,
  }), [tg]);
};