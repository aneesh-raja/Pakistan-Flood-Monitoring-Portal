"""
supabase_client.py
Supabase (PostGIS) client wrapper for the Pakistan Flood Monitoring Portal.
"""
from supabase import create_client, Client
from app.config import settings


def get_supabase() -> Client:
    """Return an authenticated Supabase client using the service role key."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


# Singleton client for reuse across the app
supabase: Client = get_supabase()
