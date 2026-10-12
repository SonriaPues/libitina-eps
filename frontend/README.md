# Libitina EPS · Frontend

Sitio público, inscripción, portal del afiliado y panel de administrador de Libitina EPS.
React 18 + Vite 5 + Tailwind CSS 3 + React Router 6, en JavaScript con JSX.

## Cómo correrlo

Necesitas Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Modo demostración (sin backend)

Con `VITE_USE_MOCK=true` en el archivo `.env` (viene así por defecto), el front funciona solo:
la inscripción, el inicio de sesión, el portal y el panel de admin usan datos simulados que se
guardan en el navegador. Usuarios de prueba:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@libitina.co | Admin123 |
| Afiliado (solicitud pendiente) | laura@correo.com | Laura123 |

Para empezar de cero, borra en el navegador la clave `libitina_mock_db_v2` del almacenamiento local.

## Conectarlo al backend

1. Desde la raíz del repositorio levanta el backend con `docker compose up --build` (el API Gateway queda en http://localhost:8000).
2. En `.env` cambia `VITE_USE_MOCK=false`.
3. Reinicia `npm run dev`. Vite reenvía todas las peticiones `/api/v1` al gateway en http://localhost:8000.

## Estructura

```
public/
  images/<pagina>/...   fotos e ilustraciones del sitio
  logo/                 logo.png y MiniLogoSVG.svg (sin modificar)
src/
  api/                  cliente HTTP, servicios y backend simulado
  components/layout/    menú, footer, layouts del sitio y de los paneles, rutas protegidas
  components/ui/        marca, controles, íconos, encabezados
  context/              sesión (JWT y rol)
  data/                 contenido: IPS, preguntas, historia, medicamentos, etc.
  pages/                una página por archivo; portal/ y admin/ para los paneles
  utils/                formatos, validaciones y reglas de beneficiarios
```

## Contrato con el API

Todas las rutas van bajo `/api/v1` y pasan por el API Gateway. La lista completa de endpoints, con quién puede usar cada uno,
está en el README de la raíz del repositorio, y cada servicio publica su documentación interactiva en `/docs`.

La sesión usa un access token de 30 minutos y un refresh token de 7 días: `src/api/client.js` renueva el token solo cuando vence,
y si el refresh también venció, cierra la sesión y envía al usuario a iniciar sesión.

## Pendientes de contenido

- `src/data/sitio.js`: correo, teléfono y horario reales de la universidad, y verificar los enlaces de Instagram y Facebook.
- `src/pages/Inicio.jsx`: las cifras marcadas con `[000]`.
- PQRSD, citas, resultados, entrega de medicamentos y autorizaciones dependen de los servicios de Trámites, Citas e Historia Clínica, que llegan en una entrega posterior.

## Despliegue

En producción el front no tiene servidor propio: el Dockerfile del Gateway (`services/gateway/Dockerfile`)
lo compila y el Gateway lo sirve en la misma dirección que la API. Ver `docs/despliegue-azure.md`.
