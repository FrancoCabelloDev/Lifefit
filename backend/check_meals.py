import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Find nutrition tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'nutrition%'")
tables = cursor.fetchall()
print('Tablas nutrition encontradas:')
for t in tables:
    print(f'  - {t[0]}')

# Check MealTemplate
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='nutrition_mealtemplate'")
if cursor.fetchone():
    cursor.execute('SELECT day_number, COUNT(*) FROM nutrition_mealtemplate GROUP BY day_number ORDER BY day_number')
    print('\nComidas por día:')
    for row in cursor.fetchall():
        print(f'  Día {row[0]}: {row[1]} comidas')

    cursor.execute('SELECT COUNT(*) FROM nutrition_mealtemplate')
    print(f'\nTotal: {cursor.fetchone()[0]} comidas')
else:
    print('\nLa tabla nutrition_mealtemplate no existe')

conn.close()
