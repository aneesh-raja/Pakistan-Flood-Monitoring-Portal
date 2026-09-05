import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// ── Real-time subscriptions ───────────────────────────────────────────────────
export const subscribeToRiverStations = (callback) => {
  return supabase
    .channel('river_stations_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'river_stations' },
      (payload) => callback(payload)
    )
    .subscribe()
}

export const subscribeToFloodEvents = (callback) => {
  return supabase
    .channel('flood_events_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'flood_events' },
      (payload) => callback(payload)
    )
    .subscribe()
}

export default supabase
