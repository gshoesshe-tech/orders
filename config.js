// config.js
// Keep this file separate so you don’t hardcode keys inside HTML.

// REQUIRED:
window.__SUPABASE_URL__ = "https://ngthitqzqtnvmsthwddl.supabase.co";
window.__SUPABASE_ANON_KEY__ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGhpdHF6cXRudm1zdGh3ZGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQ5NTEsImV4cCI6MjA4NDk0MDk1MX0.MSC3lSHfazA4vpbM69lwzkzxpws7aiGAQk8oVPTZXNw";

// OPTIONAL: admin allowlist (emails). Admins see dashboard UI.
window.__ADMIN_EMAILS__ = [
  "gshoes@gmail.com"
  "marian@gmail.com"
  "aron@gmail.com"
];

// Storage bucket for attachments (must match Supabase bucket id):
window.__ATTACHMENTS_BUCKET__ = "order_attachments";
