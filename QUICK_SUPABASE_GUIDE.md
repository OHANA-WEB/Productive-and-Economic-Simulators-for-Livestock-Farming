# ⚡ Guía Rápida: Aplicar Migraciones en Supabase

## 🎯 Método Recomendado: SQL Editor de Supabase

---

## 📋 PASO 1: Abrir SQL Editor

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. En el menú lateral → **"SQL Editor"**
4. Haz clic en **"New query"**

---

## 📋 PASO 2: Crear Tablas (Migración 1)

1. **Abre el archivo:** `server/db/migration_scientific_lactation.sql`
2. **Copia TODO** el contenido (Ctrl+A, Ctrl+C)
3. **Pega** en el SQL Editor de Supabase (Ctrl+V)
4. **Ejecuta** con el botón "Run" o `Ctrl+Enter`

✅ **Resultado esperado:** "Success. No rows returned"

---

## 📋 PASO 3: Insertar Datos de Razas (Migración 2)

1. Haz clic en **"New query"** nuevamente
2. **Abre el archivo:** `server/db/seed_breed_profiles.sql`
3. **Copia TODO** el contenido
4. **Pega** en el SQL Editor
5. **Ejecuta** con "Run" o `Ctrl+Enter`

✅ **Resultado esperado:** Deberías ver un mensaje mostrando las 8 razas insertadas

---

## 📋 PASO 4: Verificar

Ejecuta esta query en el SQL Editor:

```sql
SELECT breed_name, breed_category, total_lactation_liters, fat_percentage 
FROM breed_profiles 
ORDER BY breed_category, total_lactation_liters DESC;
```

✅ **Deberías ver 8 razas:**
- Holstein (9,500 L)
- Pardo Suizo (8,200 L)
- Ayrshire (7,800 L)
- Normande (7,500 L)
- Girolando (7,000 L)
- Jersey (6,500 L)
- Gyr Lechero (5,500 L)
- Criollo Lechero (4,500 L)

---

## 🔄 Alternativa: Usar Scripts NPM

Si tu `DATABASE_URL` en `.env` ya está configurada con Supabase:

```powershell
cd "C:\My working\MVP Web\server"
npm run migrate:scientific-lactation
npm run seed:breeds
```

**Nota:** Si aparece el error "no pg_hba.conf entry", significa que tu `DATABASE_URL` no está configurada correctamente para Supabase. En ese caso, usa el método del SQL Editor (método recomendado arriba).

---

## 📍 Ubicación de Archivos SQL

Los archivos que necesitas están en:
- `C:\My working\MVP Web\server\db\migration_scientific_lactation.sql`
- `C:\My working\MVP Web\server\db\seed_breed_profiles.sql`

---

## ✅ ¡Listo!

Una vez aplicadas las migraciones, tu Módulo 3 científico estará listo para usar! 🚀

---

## 🆘 Si Algo Sale Mal

**Error: "relation already exists"**
→ Las tablas ya existen. Continúa con el Paso 3 para insertar datos.

**Error: "duplicate key value"**
→ Los datos ya están insertados. Todo está bien! ✅

**Error al ejecutar desde npm scripts**
→ Usa el SQL Editor de Supabase (método recomendado arriba).

---

¿Listo? ¡Abre Supabase y ejecuta los SQL! 🎯
