"""
seed_river_stations.py - Seeds river stations and historical readings into Supabase.
"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

STATIONS = [
    {"station_name": "Tarbela Dam", "station_code": "TBL", "river_name": "Indus",
     "province": "Khyber Pakhtunkhwa", "latitude": 33.99, "longitude": 72.73,
     "warning_level_m": 1540.0, "danger_level_m": 1550.0, "current_level_m": 1525.0,
     "discharge_cusecs": 180000, "flood_status": "Normal"},
    {"station_name": "Taunsa Barrage", "station_code": "TNS", "river_name": "Indus",
     "province": "Punjab", "latitude": 30.70, "longitude": 70.85,
     "warning_level_m": 12.0, "danger_level_m": 15.0, "current_level_m": 14.2,
     "discharge_cusecs": 350000, "flood_status": "Medium Flood"},
    {"station_name": "Guddu Barrage", "station_code": "GDU", "river_name": "Indus",
     "province": "Sindh", "latitude": 28.43, "longitude": 69.70,
     "warning_level_m": 11.0, "danger_level_m": 13.5, "current_level_m": 14.8,
     "discharge_cusecs": 450000, "flood_status": "High Flood"},
    {"station_name": "Sukkur Barrage", "station_code": "SKR", "river_name": "Indus",
     "province": "Sindh", "latitude": 27.70, "longitude": 68.86,
     "warning_level_m": 10.5, "danger_level_m": 13.0, "current_level_m": 15.1,
     "discharge_cusecs": 520000, "flood_status": "Very High Flood"},
    {"station_name": "Kotri Barrage", "station_code": "KTR", "river_name": "Indus",
     "province": "Sindh", "latitude": 25.37, "longitude": 68.31,
     "warning_level_m": 9.5, "danger_level_m": 12.0, "current_level_m": 13.5,
     "discharge_cusecs": 480000, "flood_status": "High Flood"},
    {"station_name": "Mangla Dam", "station_code": "MGL", "river_name": "Jhelum",
     "province": "Azad Jammu & Kashmir", "latitude": 33.14, "longitude": 73.64,
     "warning_level_m": 1202.0, "danger_level_m": 1210.0, "current_level_m": 1198.0,
     "discharge_cusecs": 90000, "flood_status": "Normal"},
    {"station_name": "Marala Headworks", "station_code": "MRL", "river_name": "Chenab",
     "province": "Punjab", "latitude": 32.68, "longitude": 74.47,
     "warning_level_m": 12.0, "danger_level_m": 14.5, "current_level_m": 13.2,
     "discharge_cusecs": 280000, "flood_status": "Low Flood"},
    {"station_name": "Nowshera", "station_code": "NWS", "river_name": "Kabul",
     "province": "Khyber Pakhtunkhwa", "latitude": 34.01, "longitude": 71.98,
     "warning_level_m": 11.0, "danger_level_m": 13.5, "current_level_m": 9.5,
     "discharge_cusecs": 75000, "flood_status": "Normal"},
]

def seed():
    print(f"Seeding {len(STATIONS)} stations ...")
    for s in STATIONS:
        try:
            supabase.table("river_stations").upsert(s, on_conflict="station_code").execute()
            print(f"  [OK] {s['station_name']}")
        except Exception as e:
            print(f"  [ERROR] {s['station_name']}: {e}")

    print("Historical readings were not generated: import verified telemetry data instead.")
    print("Done!")


if __name__ == "__main__":
    seed()
