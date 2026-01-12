# Modo Demo - MVP Web

Este proyecto incluye un sistema completo de datos mock que permite que el frontend funcione completamente sin necesidad de una conexión a la base de datos o backend.

## Características del Modo Demo

- ✅ **Funcionalidad Completa**: Todos los 5 módulos funcionan con datos mock
- ✅ **Persistencia Local**: Los datos se guardan en `localStorage` del navegador
- ✅ **Detección Automática**: El sistema detecta automáticamente si el backend está disponible
- ✅ **Fallback Inteligente**: Si el backend no está disponible, usa automáticamente datos mock
- ✅ **Datos Pre-cargados**: Incluye 4 escenarios de ejemplo listos para usar

## Cómo Funciona

### Detección Automática

El sistema detecta automáticamente si debe usar modo demo basándose en:

1. **Variable de entorno**: `VITE_USE_MOCK_API=true` fuerza el modo demo
2. **Dominio Vercel**: Si estás en `*.vercel.app` sin API URL configurada
3. **Backend no disponible**: Si el backend no responde en 2 segundos

### Almacenamiento

Los datos se guardan en `localStorage` del navegador:
- `mvp_web_mock_data`: Todos los datos (escenarios, producción, resultados, etc.)
- `mvp_web_mock_user`: Usuario actual en sesión
- `mvp_web_token`: Token de autenticación

## Uso en Vercel

Para desplegar en Vercel con modo demo:

### Opción 1: Automático (Recomendado)

El sistema detectará automáticamente que estás en Vercel y usará modo demo si no hay backend configurado.

### Opción 2: Forzar Modo Demo

1. En Vercel, ve a **Settings** → **Environment Variables**
2. Agrega: `VITE_USE_MOCK_API` = `true`
3. Redespliega la aplicación

### Opción 3: Conectar Backend

Si tienes un backend desplegado:

1. En Vercel, agrega: `VITE_API_URL` = `https://tu-backend.com`
2. El sistema usará el backend real

## Datos de Ejemplo Incluidos

El modo demo incluye 4 escenarios pre-configurados:

1. **Producción Leche - Escenario Base**
   - 50 animales
   - 2.5 litros/día por animal
   - 365 días de producción
   - Costos y precios configurados

2. **Transformación a Queso Fresco**
   - Comparación venta directa vs transformación
   - Datos de procesamiento incluidos

3. **Análisis de Lactancia**
   - Ciclo de lactancia: 280 días
   - Días secos: 85 días
   - Vida productiva: 6.5 años

4. **Rendimiento y Conversión**
   - Tasa de conversión: 0.12
   - Eficiencia: 92.5%

## Credenciales de Demo

Puedes iniciar sesión con cualquier email/password en modo demo, o usar:
- **Email**: `demo@test.com`
- **Password**: `demo123`

O:
- **Email**: `admin@test.com`
- **Password**: `admin123`

## Estructura de Datos Mock

Los datos mock incluyen:

- **users**: Usuarios del sistema
- **scenarios**: Escenarios de simulación
- **production_data**: Datos de producción
- **transformation_data**: Datos de transformación
- **lactation_data**: Datos de lactancia
- **yield_data**: Datos de rendimiento
- **results**: Resultados calculados

## Desarrollo Local

Para probar el modo demo localmente:

```bash
# Forzar modo demo
VITE_USE_MOCK_API=true npm run dev

# O simplemente no inicies el backend
npm run dev:client
```

## Limpiar Datos Demo

Para resetear los datos demo a los valores iniciales:

```javascript
// En la consola del navegador
localStorage.removeItem('mvp_web_mock_data');
localStorage.removeItem('mvp_web_mock_user');
localStorage.removeItem('mvp_web_token');
// Recargar la página
```

## Notas Importantes

- ⚠️ Los datos en modo demo **NO se sincronizan** entre dispositivos
- ⚠️ Los datos se **pierden** si el usuario limpia el localStorage
- ⚠️ El modo demo es **solo para demostración**, no para producción con datos reales
- ✅ Los cálculos funcionan igual que con el backend real
- ✅ Todos los módulos están completamente funcionales

## Solución de Problemas

### El modo demo no se activa

1. Verifica que `VITE_USE_MOCK_API=true` esté configurado
2. Verifica la consola del navegador para mensajes de detección
3. Asegúrate de que el backend no esté respondiendo

### Los datos no persisten

1. Verifica que `localStorage` esté habilitado en el navegador
2. No uses modo incógnito (algunos navegadores bloquean localStorage)
3. Verifica que no haya extensiones bloqueando localStorage

### Error al cargar escenarios

1. Limpia el localStorage y recarga
2. Los datos se reinicializarán automáticamente
