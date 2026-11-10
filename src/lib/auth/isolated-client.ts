import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authConfig } from "./config";

export interface IsolatedClientOptions {
  url?: string;
  key?: string;
  customFetch?: typeof fetch;
}

export function createIsolatedAuthClient(options: IsolatedClientOptions = {}): SupabaseClient {
  const cfg = options.url && options.key ? { url: options.url, key: options.key } : authConfig();
  const fetchFn = options.customFetch ?? fetch;
  return createClient(cfg.url, cfg.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (url, opts) => {
        const timeoutSignal = AbortSignal.timeout(10_000);
        const signal = opts?.signal ? AbortSignal.any([opts.signal, timeoutSignal]) : timeoutSignal;
        return fetchFn(url, { ...opts, signal });
      },
    },
  });
}
