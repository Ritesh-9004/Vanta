"""Backfill publisher_id for existing packages using github_owner column."""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:dev@localhost:5432/vanta")

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM packages")
print(f"Total packages: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM packages WHERE publisher_id IS NULL")
print(f"Missing publisher_id: {cur.fetchone()[0]}")

# Step 1: Create publishers from github_owner
cur.execute("""
    INSERT INTO publishers (name, display_name, avatar_url)
    SELECT DISTINCT github_owner, github_owner,
           'https://github.com/' || github_owner || '.png'
    FROM packages
    WHERE github_owner IS NOT NULL
    ON CONFLICT (name) DO NOTHING
""")
print(f"Publishers created/skipped: {cur.rowcount}")

# Step 2: Link packages to their publishers
cur.execute("""
    UPDATE packages p
    SET publisher_id = pub.id
    FROM publishers pub
    WHERE p.github_owner = pub.name
      AND p.publisher_id IS NULL
""")
print(f"Packages fixed: {cur.rowcount}")

conn.commit()

# Verify
cur.execute("SELECT COUNT(*) FROM packages WHERE publisher_id IS NULL")
print(f"Still missing publisher_id: {cur.fetchone()[0]}")

# Clear crawl_state so next crawl re-processes with updated scorer + version logic
cur.execute("DELETE FROM crawl_state")
conn.commit()
print("Cleared crawl_state for fresh re-crawl next run")

# Sample check
cur.execute("""
    SELECT p.name, pub.display_name
    FROM packages p
    JOIN publishers pub ON p.publisher_id = pub.id
    LIMIT 5
""")
rows = cur.fetchall()
print("\nSample packages with publishers:")
for name, pub in rows:
    print(f"  {name} -> by {pub}")

conn.close()
