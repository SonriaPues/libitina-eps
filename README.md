# Libitina EPS

EPS ficticia con fines académicos (Universidad Católica de Colombia · Producción de Software), construida
con una **arquitectura de microservicios**: 7 servicios en **FastAPI**, **PostgreSQL 16**, **Celery + Redis**
para los correos, un **API Gateway** como único punto de entrada y un front en **React + Vite + Tailwind**.

## Estructura del repositorio

```
libitina-eps/
├── services/                 Un microservicio por carpeta (cada uno con su Dockerfile)
│   ├── gateway/              Punto de entrada único: API + front compilado
│   ├── auth/                 Autenticación (usuarios, JWT, verificación de correo)
│   ├── afiliados/            Afiliación, grupo familiar, aprobación y catálogos
│   ├── prestadores/          Red de prestadores: IPS, puntos de atención, profesionales
│   ├── notificaciones/       API de la campanita + worker de Celery que envía los correos
│   ├── tramites/             PQRSD, certificados, autorizaciones (base lista; endpoints en camino)
│   ├── citas/                Agendas, citas y reservas de salas (base lista; endpoints en camino)
│   └── historia/             Historia clínica cifrada y auditada (base lista; endpoints en camino)
├── frontend/                 Sitio público, inscripción, portal del afiliado y panel de administración
├── bases/                    Las 40 tablas: esquemas SQL y scripts que crean bases y usuarios
├── infra/
│   ├── nginx/                Proxy inverso con HTTPS (producción)
│   ├── respaldos/            Respaldo diario de las 7 bases y restauración
│   └── servidor/             Instalación, certificado y despliegue en la máquina de Azure
├── pruebas/e2e.py            Prueba de punta a punta del flujo de afiliación
├── docs/                     Guía de despliegue en Azure
├── .github/workflows/        Integración y despliegue continuos
├── docker-compose.yml            Servicios comunes
├── docker-compose.override.yml   Desarrollo (se carga solo): puertos locales y Mailpit
├── docker-compose.prod.yml       Producción: Nginx, HTTPS y respaldos
└── ROADMAP.md                Lo que falta de la EPS
```

## Arquitectura

```
                          Internet
                             │  80 / 443
                     ┌───────▼────────┐
                     │  Nginx + HTTPS │  (solo en producción)
                     └───────┬────────┘
                     ┌───────▼────────┐
                     │  API Gateway   │  JWT · límite de peticiones · CORS · sirve el front
                     └───────┬────────┘
     ┌──────────┬────────────┼─────────────┬───────────────┬──────────────────────┐
     ▼          ▼            ▼             ▼               ▼                      ▼
   auth    afiliados    prestadores   notificaciones   tramites · citas      historia
     │          │  REST interno (X-Internal-Token)       │                      │
     │          └──► auth, prestadores                   │                      │
     └── eventos ──► Redis ──► worker de Celery ──► SMTP  │                      │
                                                         │                      │
   ┌─────────────────── PostgreSQL general ──────────────┘          PostgreSQL clínico
   │ libitina_auth · afiliados · prestadores ·                      libitina_historia
   │ notificaciones · tramites · citas                              (textos cifrados)
```

| Servicio | Base | Tablas | Estado |
|---|---|---|---|
| Autenticación | libitina_auth | 3 | Completo |
| Afiliados | libitina_afiliados | 7 | Completo |
| Red de Prestadores | libitina_prestadores | 4 | Completo |
| Notificaciones (API + worker) | libitina_notificaciones | 5 | Completo |
| Trámites | libitina_tramites | 7 | Base lista · endpoints en la próxima entrega |
| Citas Médicas | libitina_citas | 6 | Base lista · endpoints en la próxima entrega |
| Historia Clínica | libitina_historia (servidor clínico) | 8 | Base lista · endpoints en la próxima entrega |

### Principios

- **Cada servicio es dueño de su base.** Ninguno lee la base de otro: lo que necesita se lo pide por REST a
  un endpoint `/internal/...` del servicio dueño, protegido con un token compartido que el Gateway nunca expone.
  Las relaciones entre bases son **referencias lógicas** (se guarda el id, nunca una llave foránea).
- **Comunicación asíncrona para lo que puede esperar.** Los servicios publican eventos en Redis
  (`afiliacion_recibida`, `afiliacion_aprobada`…) y el worker de Notificaciones los convierte en correos,
  con reintentos. Si el correo falla, la afiliación no se cae.
- **Compensación en lugar de transacciones distribuidas.** Si la afiliación falla después de crear la cuenta
  en Autenticación, Afiliados la borra.
- **Un único punto de entrada.** El Gateway enruta `/api/v1/<servicio>/...` y sirve el front compilado, así
  que toda la aplicación vive en una sola dirección.

## Seguridad

- **Dos servidores PostgreSQL:** la historia clínica está aislada en el suyo, en una red a la que solo llega el servicio de Historia.
- **Un usuario de base por servicio** (`svc_auth`, `svc_afiliados`…) con `REVOKE CONNECT FROM PUBLIC`.
- **Redes internas de Docker sin salida a internet** (`internal: true`); solo el worker sale, para enviar correos.
- **Mínimo privilegio en contenedores:** cada uno recibe solo sus variables, corre con usuario sin privilegios,
  sistema de archivos de solo lectura y `no-new-privileges`.
- **Textos clínicos cifrados** con pgcrypto; la clave vive fuera de la base.
- **Contraseñas con bcrypt** y tokens guardados como hash SHA-256; bloqueo de 15 minutos tras 5 intentos fallidos.
- **JWT de 30 minutos** y refresh token de 7 días que rota en cada uso.
- **Gateway:** valida el JWT, limita a 10 peticiones por minuto cada ruta sensible (login, inscripción,
  recuperación, consulta pública) y 120 el resto, agrega encabezados de seguridad y nunca expone `/internal`.
- **Producción:** HTTPS con Let's Encrypt, HSTS, límite de peticiones también en Nginx, y solo los puertos 80 y 443 abiertos.
- **Consentimiento** (Ley 1581 de 2012) guardado con versión de la política, fecha e IP.

## Correr en tu computador

Necesitas **Docker Desktop** (en Windows, con WSL2) y **Node.js 20** para el front en modo desarrollo.

```powershell
copy .env.example .env
docker compose up --build
```

| Qué | Dónde |
|---|---|
| La aplicación completa (front compilado + API) | http://localhost:8000 |
| Estado de los servicios | http://localhost:8000/api/v1/health |
| Correos de prueba (Mailpit) | http://localhost:8025 |
| Documentación de cada servicio | http://localhost:8001/docs (auth) · 8002 (afiliados) · 8006 (notificaciones) · 8007 (prestadores) |
| PostgreSQL general / clínico | localhost:5432 / 5433, solo desde tu computador |

Administrador inicial: `admin@libitina.co` / `Admin123` (cámbialo en `.env`).

**Para trabajar en el front** con recarga automática, deja Docker corriendo y en otra terminal:

```powershell
cd frontend
copy .env.example .env     # y pon VITE_USE_MOCK=false
npm install
npm run dev                # http://localhost:5173
```

Si cambias un script de `bases/esquemas`, borra las bases para que se vuelvan a crear: `docker compose down -v`.

## Pruebas

`pruebas/e2e.py` recorre el flujo completo a través del Gateway: validaciones de negocio, inscripción, sesión
y refresh token, rechazo con motivo, corrección, aprobación, consulta pública, correos y bloqueo por intentos.

```powershell
pip install httpx
python pruebas/e2e.py
```

GitHub Actions la corre en **cada push**, con todo el sistema levantado en Docker, y además comprueba que un
servicio no pueda entrar a la base de otro.

## Despliegue

En Azure for Students, sobre una máquina virtual con Docker Compose. Paso a paso en
[`docs/despliegue-azure.md`](docs/despliegue-azure.md). Cada push a `main` que pase las pruebas se despliega solo.

## Endpoints principales (bajo `/api/v1`)

| Método | Ruta | Acceso |
|---|---|---|
| POST | /auth/login · /auth/refresh · /auth/logout | Público |
| GET | /auth/me | Con sesión |
| GET · POST | /auth/verificar-email/{token} · /auth/verificar-email | Público · Con sesión |
| POST | /auth/recuperar · /auth/recuperar/confirmar | Público |
| POST | /afiliados/inscripcion | Público |
| GET · PUT | /afiliados/me · /afiliados/me/reenviar | Afiliado |
| GET | /afiliados/consulta?tipo=&numero= | Público (nombre enmascarado) |
| GET | /afiliados/solicitudes?estado= | Admin |
| POST | /afiliados/solicitudes/{id}/aprobar · /rechazar | Admin |
| GET | /afiliados/regimenes · /tarifas · /medicamentos · /plan-beneficios | Público |
| GET | /prestadores/ips · /prestadores/ips/{id} · /puntos-atencion · /doctores | Público |
| GET · PATCH | /notificaciones/mias · /notificaciones/{id}/leida | Con sesión |
| GET | /notificaciones/envios | Admin |

## Lo que falta

Ver [`ROADMAP.md`](ROADMAP.md).
