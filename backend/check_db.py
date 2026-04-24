import sqlite3

conn = sqlite3.connect('nesis.db')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tabelas encontradas:")
for table in tables:
    print(f"  - {table[0]}")
conn.close()