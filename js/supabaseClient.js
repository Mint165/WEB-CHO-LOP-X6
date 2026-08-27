// Public Supabase configuration. The publishable key is safe to expose in a browser;
// database access is protected by Supabase Auth and Row Level Security.
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(
    'https://uiovckfbifsuswevfnir.supabase.co',
    'sb_publishable_iGzyoOJ2aqSxeL9pNRCYUw_R9T3XBrn',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}
