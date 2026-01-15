# 🚀 Aplicar Migraciones en Supabase

## 📚 ¿Qué es Supabase?

**Supabase** es PostgreSQL alojado en la nube. Funciona igual que PostgreSQL, pero:
- ✅ No necesitas instalar nada localmente
- ✅ Tienes una interfaz web para administrar la base de datos
- ✅ Se accede mediante una URL de conexión (ej: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`)
- ✅ Tienes un SQL Editor integrado en el dashboard

---

## 🎯 Opción 1: SQL Editor de Supabase (Más Fácil) ⭐

### Paso 1: Abrir Supabase Dashboard
1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión y selecciona tu proyecto
3. En el menú lateral, haz clic en **"SQL Editor"**

### Paso 2: Aplicar Migración de Tablas

1. Haz clic en **"New query"**
2. Abre el archivo: `server/db/migration_scientific_lactation.sql`
3. Copia TODO el contenido del archivo
4. Pégalo en el SQL Editor de Supabase
5. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)

**✅ Deberías ver:** "Success. No rows returned"

### Paso 3: Poblar Datos de Razas

1. Haz clic en **"New query"** (otra vez)
2. Abre el archivo: `server/db/seed_breed_profiles.sql`
3. Copia TODO el contenido del archivo
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"**

**✅ Deberías ver:** Mensaje de éxito con las 8 razas insertadas

### Paso 4: Verificar

Ejecuta esta query en el SQL Editor:

```sql
SELECT breed_name, breed_category, total_lactation_liters, fat_percentage 
FROM breed_profiles 
ORDER BY breed_category, total_lactation_liters DESC;
```

**✅ Deberías ver:** 8 razas listadas

---

## 🎯 Opción 2: Usando Scripts NPM con Conexión Remota

Si tu `DATABASE_URL` ya está configurado con las credenciales de Supabase, los scripts npm deberían funcionar directamente.

### Verificar DATABASE_URL

Tu `.env` o variables de entorno debería tener algo como:

```
DATABASE_URL=postgresql://postgres:[TU_PASSWORD]@db.[TU_PROJECT].supabase.co:5432/postgres
```

### Aplicar Migraciones

```powershell
cd "C:\My working\MVP Web\server"
npm run migrate:scientific-lactation
npm run seed:breeds
```

**⚠️ Si aparece error de conexión:**
- Verifica que tu `DATABASE_URL` esté correcta
- Asegúrate de incluir la contraseña
- Verifica que no haya espacios extra

---

## 🔧 Solución de Problemas

### Error: "no pg_hba.conf entry"

Este error NO aplica para Supabase. Si lo ves, significa que:
- Tu `DATABASE_URL` no está configurada correctamente
- O está apuntando a un PostgreSQL local en lugar de Supabase

**Solución:** Verifica que `DATABASE_URL` apunte a `*.supabase.co`

### Error: "password authentication failed"

1. Ve a Supabase Dashboard → Settings → Database
2. Copia la "Connection string" con la contraseña correcta
3. Actualiza tu `DATABASE_URL` en `.env`

### Error: "database does not exist"

Supabase usa la base de datos `postgres` por defecto. Tu `DATABASE_URL` debería terminar en `/postgres`, no `/mvp_web`.

Si necesitas crear una base de datos separada (opcional):
```sql
-- En SQL Editor de Supabase
CREATE DATABASE mvp_web;
```

---

## 📋 Verificación Final

Después de aplicar las migraciones, verifica en Supabase:

### 1. Tablas Creadas

Ve a **Table Editor** en Supabase Dashboard. Deberías ver:
- ✅ `breed_profiles` (con datos)
- ✅ `lactation_simulations` (vacía, se llenará al usar el módulo)

### 2. Razas Disponibles

En **Table Editor** → `breed_profiles`, deberías ver **8 razas**:
1. Holstein
2. Jersey
3. Pardo Suizo
4. Girolando
5. Criollo Lechero
6. Normande
7. Gyr Lechero
8. Ayrshire

---

## 🎯 Recomendación

**Usa la Opción 1 (SQL Editor)** porque:
- ✅ Es más visual y fácil de verificar
- ✅ No requiere configuración adicional
- ✅ Puedes ver errores inmediatamente
- ✅ Puedes verificar los datos insertados fácilmente

---

## 🚀 Siguiente Paso

Una vez aplicadas las migraciones en Supabase:
1. Inicia tu servidor: `npm run dev` (en server/)
2. Inicia tu cliente: `npm run dev` (en client/)
3. Navega a Módulo 3 en la aplicación
4. Deberías ver el selector de razas funcionando!

---

¿Necesitas ayuda con algún paso específico? 🤔
