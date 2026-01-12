# MVP Web - Simuladores Productivos y Económicos para Ganadería

Sistema web multiusuario para simulación de escenarios productivos y económicos enfocado en caprinocultura y ovinocultura lechera.

## Características

- ✅ **Multiusuario**: Cada usuario tiene sus propios escenarios y simulaciones aisladas
- ✅ **5 Módulos de Simulación**:
  1. Producción y Venta de Leche
  2. Transformación Láctea
  3. Lactancia y Vida Productiva
  4. Rendimiento/Conversión
  5. Resumen/Dashboard (comparación de escenarios)
- ✅ **Arquitectura Escalable**: Modelo de datos común compartido entre módulos
- ✅ **Motor de Simulación Centralizado**: Lógica única y coherente para todos los cálculos
- ✅ **Visualización**: Tablas y gráficos básicos con Recharts
- ✅ **Modo Demo**: Sistema completo de datos mock para funcionar sin backend (ideal para Vercel)

## Stack Tecnológico

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT
- **Visualización**: Recharts

## Requisitos Previos

- Node.js 18+ 
- npm o yarn
- PostgreSQL 12+ (solo si usas el backend completo)
- **Nota**: El frontend puede funcionar en modo demo sin PostgreSQL

## Instalación

### 1. Clonar e instalar dependencias

```bash
# Instalar dependencias del proyecto raíz
npm install

# Instalar dependencias del servidor y cliente
npm run install:all
```

### 2. Configurar Base de Datos

Crear una base de datos PostgreSQL:

```sql
CREATE DATABASE mvp_ganaderia;
```

### 3. Configurar Variables de Entorno

Crear archivo `server/.env` basado en `server/.env.example`:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mvp_ganaderia
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu-secret-key-seguro
```

### 4. Ejecutar Migraciones

```bash
cd server
npm run migrate
```

Esto creará las tablas necesarias y un usuario admin por defecto:
- Email: `admin@test.com`
- Password: `admin123`

### 5. Iniciar la Aplicación

```bash
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará:
- Backend en `http://localhost:3001`
- Frontend en `http://localhost:3000`

## Estructura del Proyecto

```
mvp-web-ganaderia/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   │   ├── modules/    # 5 módulos de simulación
│   │   │   ├── Dashboard.jsx
│   │   │   └── Login.jsx
│   │   ├── utils/          # Utilidades (auth, api)
│   │   └── App.jsx
│   └── package.json
├── server/                 # Backend Node.js + Express
│   ├── core/              # Motor de simulación centralizado
│   │   └── simulationEngine.js
│   ├── db/                # Configuración de BD
│   │   ├── pool.js
│   │   └── schema.sql
│   ├── middleware/        # Middleware (auth)
│   ├── routes/            # Rutas API
│   │   ├── auth.js
│   │   ├── scenarios.js
│   │   └── modules.js
│   ├── scripts/           # Scripts (migraciones)
│   └── index.js
└── package.json
```

## Arquitectura

### Modelo de Datos

El sistema utiliza un modelo de datos común compartido:

- **users**: Usuarios del sistema
- **scenarios**: Escenarios de simulación (cada uno es una "foto" independiente)
- **production_data**: Datos de producción (compartido por módulos)
- **transformation_data**: Datos de transformación (módulo 2)
- **lactation_data**: Datos de lactancia (módulo 3)
- **yield_data**: Datos de rendimiento (módulo 4)
- **results**: Resultados calculados (compartido por todos los módulos)

### Motor de Simulación

El archivo `server/core/simulationEngine.js` contiene toda la lógica de cálculo. Es el único punto de entrada para todos los cálculos, garantizando:

- **Consistencia**: Todos los módulos usan la misma lógica
- **Mantenibilidad**: Cambios en un solo lugar
- **Escalabilidad**: Fácil agregar nuevos módulos

### Aislamiento de Escenarios

Cada escenario es completamente independiente:
- Duplicar un escenario crea una copia con nuevo ID
- Modificar un escenario solo afecta a ese escenario
- Comparar escenarios ejecuta el mismo motor sobre cada uno

## Modo Demo (Sin Backend)

El proyecto incluye un sistema completo de datos mock que permite funcionar sin backend. Ideal para despliegues en Vercel.

**Ver documentación completa**: [DEMO_MODE.md](./DEMO_MODE.md)

### Características del Modo Demo:
- ✅ Funciona completamente sin base de datos
- ✅ Datos pre-cargados con 4 escenarios de ejemplo
- ✅ Persistencia local en el navegador
- ✅ Detección automática del backend
- ✅ Todos los módulos completamente funcionales

### Para usar en Vercel:
1. Despliega solo el frontend (`client/`)
2. El sistema detectará automáticamente modo demo
3. O configura `VITE_USE_MOCK_API=true` en variables de entorno

## Uso

### 1. Registro/Login

- Crear cuenta nueva o usar el usuario admin por defecto
- El sistema genera un token JWT para autenticación
- **En modo demo**: Puedes usar cualquier credencial o `demo@test.com` / `demo123`

### 2. Crear Escenarios

- Desde el Dashboard, crear un nuevo escenario
- Seleccionar el tipo de módulo correspondiente

### 3. Configurar y Calcular

- Abrir un escenario desde el Dashboard
- Ingresar datos en el módulo correspondiente
- Calcular resultados (se guardan automáticamente)

### 4. Comparar Escenarios

- Ir al Módulo 5 (Resumen/Dashboard)
- Seleccionar múltiples escenarios
- Comparar resultados lado a lado

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login

### Escenarios
- `GET /api/scenarios` - Listar escenarios del usuario
- `GET /api/scenarios/:id` - Obtener escenario completo
- `POST /api/scenarios` - Crear escenario
- `POST /api/scenarios/:id/duplicate` - Duplicar escenario
- `PUT /api/scenarios/:id` - Actualizar escenario
- `DELETE /api/scenarios/:id` - Eliminar escenario
- `POST /api/scenarios/compare` - Comparar múltiples escenarios

### Módulos
- `POST /api/modules/production/:scenarioId` - Guardar datos de producción
- `POST /api/modules/transformation/:scenarioId` - Guardar datos de transformación
- `POST /api/modules/lactation/:scenarioId` - Guardar datos de lactancia
- `POST /api/modules/yield/:scenarioId` - Guardar datos de rendimiento

## Desarrollo

### Scripts Disponibles

```bash
# Desarrollo (frontend + backend)
npm run dev

# Solo backend
npm run dev:server

# Solo frontend
npm run dev:client

# Build producción
npm run build
```

## Notas de Implementación

- Los cálculos se ejecutan en el backend para garantizar consistencia
- Cada módulo puede usar datos de producción base + datos específicos del módulo
- Los resultados se recalculan automáticamente al guardar datos
- El sistema soporta múltiples usuarios con aislamiento completo de datos

## Próximos Pasos (Futuras Mejoras)

- [ ] Validaciones más robustas de datos de entrada
- [ ] Exportación de resultados a PDF/Excel
- [ ] Historial de cambios en escenarios
- [ ] Más tipos de gráficos y visualizaciones
- [ ] Soporte para más tipos de ganado

## Licencia

Proyecto desarrollado como MVP para simulación ganadera.
