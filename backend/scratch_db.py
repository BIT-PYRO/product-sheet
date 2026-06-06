import psycopg
import os

passwords_to_try = [
    "KvrtikBakugo@15",
    "postgres",
    "",
    "admin",
    "password"
]

print("Starting DB Connection diagnostics...")
for pw in passwords_to_try:
    try:
        conn = psycopg.connect(
            dbname="postgres",
            user="postgres",
            password=pw,
            host="127.0.0.1",
            port="5432"
        )
        print(f"SUCCESS: Connected as user 'postgres' with password '{pw}'!")
        conn.close()
        break
    except Exception as e:
        print(f"FAILED: Connection with password '{pw}' failed: {e}")
