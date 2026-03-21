"""Quick diagnostic script — check publisher data in the database."""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv("apps/crawler/.env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:dev@localhost:5432/vanta")

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT p.name, p.publisher_id, pub.display_name FROM packages p LEFT JOIN publishers pub ON p.publisher_id = pub.id WHERE p.name = %s', ('esp8266audio',))
        row = cur.fetchone()
        if row:
            print(f'Package: {row[0]}, publisher_id: {row[1]}, display_name: {row[2]}')
        else:
            print('esp8266audio not found')
        
        cur.execute('SELECT COUNT(*) FROM publishers')
        print(f'Total publishers: {cur.fetchone()[0]}')
        
        cur.execute('SELECT COUNT(*) FROM packages WHERE publisher_id IS NULL')
        print(f'Packages WITHOUT publisher_id: {cur.fetchone()[0]}')
        
        cur.execute('SELECT COUNT(*) FROM packages')
        print(f'Total packages: {cur.fetchone()[0]}')
