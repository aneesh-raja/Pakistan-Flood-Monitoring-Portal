import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vlmnqurteqscnqqahzun.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WKks7b2eebqhKWVjNJc36Q_TZEFUl7m'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
