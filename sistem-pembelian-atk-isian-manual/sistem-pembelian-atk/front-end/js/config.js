// Ganti dengan Project URL dan publishable key dari dashboard Supabase.
// Jangan pernah menggunakan service_role key di browser.
const SUPABASE_URL = "https://wbliilihsbcxbeggxcoc.supabase.co";
const SUPABASE_KEY = "sb_publishable_I0jla8KdMIqx2TNtKMrBeg_nPScIVy7";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
