// This file initializes the Supabase client.
// It assumes the Supabase JS library is loaded via a CDN in index.html.

// --- IMPORTANT ---
// Replace these with your actual Supabase URL and Anon Key.
// You can get these from your Supabase project's API settings.
const SUPABASE_URL = "https://hjaejnhxdzkyqcgbxqdq.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYWVqbmh4ZHpreXFjZ2J4cWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzk0NTQsImV4cCI6MjA3MjkxNTQ1NH0.fYWnlIiyRDNPe0W8lhfLSYBogumFYKxwD207Hfg0RDI";
// -----------------


if (!window.supabase || !window.supabase.createClient) {
    throw new Error("Supabase client not found. Make sure the Supabase CDN script is loaded before this script in index.html.");
}

if (SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.includes('your-public-anon-key')) {
    console.warn("Supabase credentials in lib/supabase.ts are placeholders and need to be replaced for the application to work correctly.");
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);