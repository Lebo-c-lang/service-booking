import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const normalizedSupabaseUrl = rawSupabaseUrl
  .replace(/\/(?:rest|auth)\/v1\/?$/, "")
  .replace(/\/+$/, "");

const hasSupabaseConfig = Boolean(normalizedSupabaseUrl && rawSupabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    "Missing or invalid VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in."
  );
}

export const supabase = hasSupabaseConfig
  ? createClient(normalizedSupabaseUrl, rawSupabaseAnonKey)
  : null;

export const isSupabaseConfigured = hasSupabaseConfig;
