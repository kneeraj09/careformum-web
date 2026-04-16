import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// In-memory storage shim — prevents Supabase/Phoenix from touching
// sessionStorage or localStorage, which are blocked in Edge under certain
// privacy/security settings and would otherwise crash the page on load.
const memoryStorage = (() => {
  const store: Record<string, string> = {}
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear:      () => { for (const k in store) delete store[k] },
    key:        (n: number) => Object.keys(store)[n] ?? null,
    get length() { return Object.keys(store).length },
  }
})()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            memoryStorage,
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false,
  },
  realtime: {
    // Pass the shim directly to the Phoenix socket so it never reads
    // window.sessionStorage (which throws SecurityError in Edge).
    params: {},
    sessionStorage: memoryStorage,
  } as Record<string, unknown>,
})
