# Detail Go — Guía de configuración (Fase 1)

App móvil (iOS + Android) de lavado de autos a domicilio. Hecha con **Expo (React
Native)** + **Firebase**. Una sola base de código para las dos tiendas.

## Qué incluye la Fase 1

- **3 roles con un solo login**: cliente, lavador y administrador.
- **Cliente**: registro, vehículos, direcciones, wizard de reserva de 5 pasos,
  pago por **Zelle** (con comprobante) o **efectivo**, seguimiento e historial.
- **Admin**: panel con métricas del día, **verificación de pagos Zelle**
  (aprobar/rechazar con motivo), **CRUD de servicios** (con la regla de precio > $10).
- **Lavador**: interruptor Disponible/No disponible (base para el envío de la Fase 2).
- **Formulario público "Quiero trabajar aquí"**.

> Fase 2 (siguiente): envío de órdenes "el primero que acepta gana" con
> notificaciones y sonido, estados del lavador, y el ledger de ganancias
> (efectivo/Zelle con saldo neto). Fase 3: reseñas con caritas, corte del día,
> aprobación de solicitudes y publicación en tiendas.

---

## 1. Requisitos

- Node 20+ (ya tienes 24).
- App **Expo Go** en tu teléfono (para probar rápido) o un **development build**
  (para las notificaciones con sonido de la Fase 2).

## 2. Crear el proyecto de Firebase

1. Entra a https://console.firebase.google.com → **Agregar proyecto**.
2. **Build → Authentication → Comenzar → Email/Password → Habilitar.**
3. **Build → Firestore Database → Crear base de datos** (modo producción).
4. **Build → Storage → Comenzar**.
5. **Project settings (⚙️) → General → Tus apps → Web (</>)** → registra una app
   web. Copia el objeto `firebaseConfig`.

## 3. Pegar tu configuración

- Abre `src/config/firebase.js` y reemplaza el objeto `firebaseConfig` con el
  que copiaste (apiKey, authDomain, projectId, storageBucket, etc.).
- Abre `src/config/business.js` y llena tus datos reales: teléfono, **datos de
  Zelle**, zona de cobertura (lista de ciudades en minúsculas) y horario.

## 4. Publicar las reglas de seguridad

En la consola de Firebase:
- **Firestore → Rules**: pega el contenido de `firestore.rules` y publica.
- **Storage → Rules**: pega el contenido de `storage.rules` y publica.

## 5. Crear el primer administrador

Aún no existe la pantalla para crear admins (llega en Fase 3), así que el primero
se crea a mano:

1. En la app, usa **Crear cuenta** y regístrate con tu correo (quedará como cliente).
2. En **Firestore → Data → users → (tu documento)**, cambia el campo
   `role` de `client` a `admin`. Vuelve a entrar a la app y verás el panel de admin.

Para crear un **lavador** de prueba (mientras llega el flujo de aprobación):
registra otra cuenta y cambia su `role` a `worker` en Firestore.

## 6. Correr la app

```bash
npm start          # abre Metro; escanea el QR con Expo Go
# o
npm run android    # emulador/dispositivo Android
npm run web        # vista previa en el navegador (solo para ver la UI)
```

## 7. Índices de Firestore

La primera vez que uses ciertas listas (historial, panel), Firestore puede pedir
un **índice compuesto** y mostrará un enlace en la consola/terminal: ábrelo y dale
**Crear índice**. Son necesarios para ordenar por fecha filtrando por usuario/estado.

---

## Modo demo / vista previa (sin Firebase)

Para ver las pantallas de adentro (cliente/admin/lavador) SIN conectar Firebase,
hay un modo demo con datos de ejemplo:

- Archivo: `src/config/demo.js`.
- `DEMO_MODE = true` → la app finge una sesión y muestra datos de ejemplo.
- `DEMO_ROLE = 'client' | 'admin' | 'worker'` → elige qué rol previsualizar.

⚠️ **Antes de conectar tu Firebase real y publicar, pon `DEMO_MODE = false`.**
Con el modo demo encendido la app NO usa Firebase (ignora login y datos reales).

## Estructura del proyecto

```
app/                      # Rutas (Expo Router), una pantalla por archivo
  (auth)/                 # login, registro, recuperar, "quiero trabajar aquí"
  (client)/               # home, book (wizard), orders, vehicles, addresses, order/[id], profile
  (worker)/               # available (disponibilidad)
  (admin)/                # dashboard, verify (pagos), services (CRUD)
src/
  config/                 # firebase.js (config), business.js (datos del negocio)
  constants/              # theme, roles, bookingStatus (máquina de estados), payments
  services/               # capa de datos (auth, users, services, vehicles, addresses, bookings, storage, applications)
  context/                # AuthContext, I18nContext
  hooks/                  # useSubscription
  components/ui/          # kit de UI (Button, Input, Card, Screen, StatusBadge, …)
  utils/                  # money, dates (calendario), pricing, validation, errors, media
  locales/                # es.js, en.js
firestore.rules / storage.rules
```

## La regla del dinero

De cada servicio completado el negocio gana **$10 fijos**; el lavador gana
`total − $10`. Por eso ningún servicio puede costar $10 o menos (validado en el
formulario de servicios y en la capa de datos). El cálculo definitivo se
congelará en el servidor (Cloud Function) en la Fase 2.
