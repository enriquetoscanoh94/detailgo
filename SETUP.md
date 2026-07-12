# Detail Go — Estado del proyecto y guía

App de lavado/detallado de autos a domicilio (estilo Uber). **Expo (React
Native)** + **Firebase**. Un solo código para **iOS, Android y web**.

## 🌐 En vivo

- **Sitio (marketing):** https://detailgo.app
- **App (donde el cliente se registra y pide):** https://detailgo.app/app
  - Publicada en GitHub Pages (repo `enriquetoscanoh94/detailgo`, carpeta `web/app`).
- Tema visual: **oscuro premium** (navy `#06101F` + acento cyan `#06B6D4` + dorado),
  inspirado en el Figma del cliente.

## 🔑 Cuentas de prueba

> ⚠️ Este repo es **público**, así que **las contraseñas NO van aquí**. Todas las
> credenciales (cliente/detailer/admin + Firebase) están en
> `Desktop/DetailGo/SECRETO-credenciales.txt`, **fuera del repo**.

| Rol | Correo |
|-----|--------|
| Cliente (prueba) | `clientedemo1@detailgo.app` |
| Detailer (prueba) | `juandetailer@detailgo.app` |
| Admin | *(ver SECRETO-credenciales.txt)* |

---

## Qué hace cada rol

- **Cliente:** se registra e inicia sesión con **correo** o **Google**. Guarda
  **carros** (con foto) y **direcciones**, y arma una orden con **hasta 5 carros,
  cada uno con su propio paquete**. Agrega **extras** (con precio; el shampoo se
  cobra por asiento). Paga por **Zelle / Venmo** (sube comprobante) o **efectivo**.
  Sigue la orden, ve su historial, califica al detailer con **caritas**, sube
  **foto de perfil** y puede abrir la pagina publica para solicitar eliminacion
  de cuenta.
- **Detailer:** NO se registra solo — lo **crea el admin**. Recibe órdenes ("el
  primero que acepta gana", con sonido), avanza el estado, abre la dirección en
  **Maps**, ve su **ID**, sus **ganancias** y su **calificación**, y su foto de perfil.
- **Admin:** recibe solicitudes ("Quiero ser detailer") y **crea la cuenta del
  detailer** (correo + contraseña). Verifica pagos Zelle/Venmo, administra
  servicios/extras y precios, ve la **lista de clientes**, y hace la
  **liquidación por detailer** (cuánto pagarle / cuánto le debe, y marcar pagado).

## 💵 El modelo de dinero (real)

Cada paquete define **el precio al cliente** y **lo que gana el detailer**, por
tipo de vehículo (**SUV = camioneta**). El negocio se queda con la diferencia (el
margen **varía por paquete**, ya NO son $10 fijos).

| Paquete | Cliente sedán / SUV | Gana detailer sedán / SUV |
|---|---|---|
| Express | $40 / $45 | $35 / $40 |
| Regular | $55 / $60 | $45 / $50 |
| Premium | $95 / $95 | $75 / $75 |
| Clay Bar | $130 / $130 | $110 / $110 |
| Ditel | $180 / $180 | $160 / $160 |
| Full Ditel | $230 / $230 | $190 / $190 |

- **Extras** (se suman al total; el detailer gana **$5 c/u**): Pelo de mascotas $15,
  Manchas de agua $25, **Shampoo de asientos $15 por asiento**, Cera $25,
  Restauración de faros $25.
- **Liquidación:** en **efectivo** el detailer se queda con el total y le debe la
  comisión al negocio; en **transferencia** el negocio cobra y le debe su parte al
  detailer. El admin transfiere el neto manualmente (Zelle/Venmo).

**Pagos del negocio:** Zelle **747 321 2609** (Abraham Gutierrez Degollado) ·
Venmo **@Abraham-Gutierrez-101**.

---

## Correr en local

```bash
npm start          # Metro; escanea el QR con Expo Go
npm run web        # vista previa web en el navegador
```

## Variables de entorno

Copia `.env.example` a `.env` y llena los IDs de OAuth segun la plataforma.
`.env` no se sube al repo.

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

- Firebase real: proyecto `detailgo-3991f`.
- Web OAuth Client ID: ya existe en Google Cloud/Firebase.
- Android OAuth Client ID: ya existe para el keystore de EAS.

## Publicar la app web (redeploy)

```bash
# 1) genera el build web
npx expo export --platform web
# 2) copia el build al repo del sitio
rm -rf ../web/app && mkdir -p ../web/app && cp -r dist/* ../web/app/
# 3) re-inyecta el decoder de rutas SPA en ../web/app/index.html
#    (script <script> que hace history.replaceState; ver el 404.html)
# 4) commit + push del repo ../web  (pedir permiso antes del push)
```

GitHub Pages necesita: `web/.nojekyll` (para servir la carpeta `_expo`) y
`web/404.html` (redirección SPA). Tras el push tarda ~1–2 min en actualizar; si lo
ves igual, es **caché del navegador** → recarga forzada (Ctrl+Shift+R / incógnito).

## Firebase y Google Sign-In

- Proyecto Firebase correcto: `detailgo-3991f`.
- Proveedores de Authentication habilitados: **Email/password** y **Google**.
- Nombre publico de OAuth/Firebase: `Detail Go`.
- Email de soporte configurado: `carwashdetailgo@gmail.com`.
- App Android registrada: `com.detailgo.app`.
- SHA-1 del keystore EAS agregado a la app Android de Firebase.
- La app crea automaticamente el perfil `users/{uid}` cuando un cliente entra
  con Google por primera vez.

Las reglas ya estan publicadas en el proyecto `detailgo-3991f`. Si cambias
`firestore.rules` o `storage.rules`, republícalas en la consola
(Firestore/Storage → Reglas → pega y Publica) o con la CLI. **La app corre con
Firebase real** (sin modo demo).

## Play Store / Android

Ya esta configurado el proyecto EAS:

- Proyecto EAS: `@detailgoapps-team/detailgo`.
- Project ID: `8982ba52-f93c-4c32-98e2-6adb5ac99133`.
- Variables EAS `production` creadas:
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

Para generar el `.aab`:

```bash
eas build --platform android --profile production
```

Despues de subir el primer `.aab` a Play Console, Google Play App Signing puede
mostrar otro SHA-1 para el certificado final de distribucion. Agrega tambien ese
SHA-1 en Firebase si Google Play lo asigna.

```bash
# Play Console -> Setup -> App integrity -> App signing key certificate
# Copia el SHA-1 y agregalo en Firebase -> Project settings -> Android app.
```

El perfil production genera `.aab` para Play Store. Para apps nuevas o updates,
Play Store exige target API vigente; este proyecto debe mantenerse con un SDK de
Expo que compile contra el target requerido por Google Play.

## Scripts útiles (`scripts/`)

```bash
# actualizar precios/extras en Firestore (idempotente, lee creds de env)
ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/update-prices.mjs
```

---

## Pendiente

- **Fuentes del Figma:** Exo 2 (títulos) + DM Sans (texto).
- **Bloqueado por cuentas externas:** notificaciones push con la app cerrada
  (Cloud Functions), Apple Sign-In, certificado SHA-1 de Play App Signing cuando
  exista la app en Play Console, y publicación en App Store / Play Store.

## Estructura

```
app/                      # Rutas (Expo Router)
  (auth)/                 # login, registro, recuperar, catalog, apply
  (client)/               # home, book (wizard multi-carro), orders, vehicles, addresses, order/[id], profile
  (worker)/               # available (disponibilidad + ganancias)
  (admin)/                # dashboard, verify, services, applications, available, payouts, clients, profile
src/
  config/                 # firebase.js, business.js
  constants/              # theme (tema OSCURO), roles, bookingStatus, payments
  services/               # auth, users, admin (crear detailer), services, extras, vehicles, addresses, bookings, payouts, storage, applications
  components/ui/ + AvatarUpload
  utils/                  # money, dates, pricing (multi-carro), validation, errors, media, confirm (confirm web/móvil)
  locales/                # es.js, en.js
firestore.rules / storage.rules · scripts/
```

> Nota web: `Alert.alert` con botones no funciona en react-native-web. Para
> confirmaciones (cerrar sesión, borrar, cancelar) usa `utils/confirm.js`
> (`confirmAction`), que usa `window.confirm` en web.
