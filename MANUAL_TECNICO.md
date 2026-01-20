# 🛠️ MANUAL TÉCNICO - INVENTORY APP

Este documento está dirigido a desarrolladores o administradores de sistemas que deseen mantener, modificar o desplegar la aplicación.

---

## 1. Stack Tecnológico

*   **Frontend:** React 18 + TypeScript + Vite.
*   **Estilos:** TailwindCSS + Lucide React (Iconos).
*   **Estado:** Zustand (Gestión de estado global ligero).
*   **Base de Datos:** Supabase (PostgreSQL + Realtime).
*   **Seguridad:** RLS (Row Level Security) gestionado vía aplicación (Custom Auth Logic).

## 2. Estructura de Carpetas

```
/src
  /components    # Componentes UI reutilizables (Layout, Cards, Modales)
  /lib           # Utilidades (formateo de moneda, fechas, exportación Excel/PDF)
  /pages         # Vistas principales (Ventas, Inventario, Reportes, etc.)
  /store         # Lógica de Estado (useStore.ts - EL CEREBRO DE LA APP)
  /types         # Definiciones TypeScript (Interfaces de BD)
  App.tsx        # Router principal
  main.tsx       # Punto de entrada
```

## 3. Base de Datos (Schema)

El script `database_setup.sql` contiene la definición completa. Puntos clave:

*   **Integridad Referencial Flexibilizada:**
    *   La tabla `purchases` **NO** tiene FK estricta hacia `users` para evitar bloqueos si el usuario local difiere del remoto. Se guardan `user_id` y `user_name` como texto/uuid simple.
*   **Columnas Generadas:**
    *   Evitamos columnas `GENERATED ALWAYS` en `purchases` para compatibilidad con la lógica de inserción de la App. Calculamos totales en el frontend o en consultas.
*   **Seguridad RLS:**
    *   Debido al sistema de autenticación personalizado (tabla `public.users` en lugar de `auth.users`), las políticas RLS son permisivas (`TO public USING true`) para permitir que la App gestione los permisos. **No cambiar a menos que migre a Supabase Auth nativo.**

## 4. Personalización

### Cambiar Colores / Tema
El sistema soporta temas dinámicos. Los colores base se definen en `tailwind.config.js` y se inyectan variables CSS en tiempo de ejecución desde `src/lib/themes.ts`.
Para agregar un tema, edite `src/lib/themes.ts`.

### Modificar Lógica de Negocio
Toda la lógica crítica (cálculo de precios, descuentos, actualizaciones de stock) reside en **`src/store/useStore.ts`**.
*   `addSale()`: Maneja decremento de stock y creación de venta.
*   `addPurchase()`: Maneja incremento de stock.
*   `cancelSaleByFolio()`: Maneja reembolso de monedero y devolución de stock.

## 5. Despliegue (Deploy)

Para subir a producción (ej. Vercel, Netlify):

1.  Subir código a GitHub.
2.  Conectar repositorio a Vercel.
3.  Configurar Variables de Entorno en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4.  El `build command` es `npm run build`.
5.  El `output directory` es `dist`.

---
*Documentación Técnica v1.0 - 2026*
