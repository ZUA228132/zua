declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any;
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface CollectedData {
  id: string;
  telegram_user: TelegramUser;
  video_url: string | null;
  passport_url: string | null;
  submission_date: string;
}