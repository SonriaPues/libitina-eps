# Despliegue en Azure for Students

Libitina corre en **una máquina virtual Linux con Docker Compose**: la misma configuración que usas en tu
computador, más Nginx con HTTPS y respaldos (`docker-compose.prod.yml`). Después de la configuración inicial,
cada push a `main` que pase las pruebas se despliega solo.

```
GitHub (push a main) ──► GitHub Actions: compila, levanta todo y corre pruebas/e2e.py
                                   │ si pasan
                                   ▼ SSH
        Máquina virtual de Azure: infra/servidor/desplegar.sh  (git pull + docker compose up)
```

Tiempo estimado la primera vez: 45 minutos.

## Costo

Azure for Students da USD 100 por 12 meses, sin tarjeta. Las máquinas gratuitas del plan tienen 1 GB de
memoria y Libitina necesita más (14 contenedores, dos de ellos PostgreSQL), así que se usa una
**B2als v2 (2 procesadores, 4 GB)**: unos USD 0,038 por hora, más unos pocos dólares al mes por el disco y la IP.

- Encendida todo el mes: cerca de USD 30, el crédito dura unos 3 meses.
- **Apagada cuando no la usas** (paso 7): el crédito alcanza para todo el año.

Revisa el consumo en el portal: **Cost Management → Cost analysis**.

## 1. Crear la máquina virtual

En [portal.azure.com](https://portal.azure.com) → **Virtual machines → Create → Azure virtual machine**.

| Campo | Valor |
|---|---|
| Resource group | Nuevo: `libitina-eps` |
| Virtual machine name | `libitina-eps` |
| Region | `East US` (si no la permite tu suscripción, la que esté disponible) |
| Image | **Ubuntu Server 24.04 LTS** |
| Size | **B2als v2** (búscala con "See all sizes") |
| Authentication type | **SSH public key** |
| Username | `libitina` |
| SSH public key source | Generate new key pair → descarga el `.pem` y guárdalo bien |
| Public inbound ports | Allow selected ports: **SSH (22), HTTP (80), HTTPS (443)** |

En la pestaña **Disks**, un disco **Standard SSD** de 30 GB es suficiente. Luego **Review + create → Create**.

## 2. Darle un nombre (dominio gratuito)

En la máquina creada → **Overview → DNS name → Not configured**. En **DNS name label** escribe
`libitina-eps` (o el que esté libre) y guarda. Tu dirección queda así:

```
libitina-eps.eastus.cloudapp.azure.com
```

En la misma página, en **IP address**, cambia la asignación a **Static** para que no cambie al apagarla.

## 3. Entrar por SSH

Desde PowerShell, en la carpeta donde guardaste la llave:

```powershell
ssh -i .\libitina-eps_key.pem libitina@libitina-eps.eastus.cloudapp.azure.com
```

Si Windows se queja de los permisos de la llave, corre una vez:

```powershell
icacls .\libitina-eps_key.pem /inheritance:r /grant:r "$($env:USERNAME):R"
```

## 4. Instalar Docker y el proyecto

Ya dentro de la máquina (el repositorio debe ser **público**; si es privado, mira la nota al final):

```bash
curl -fsSL https://raw.githubusercontent.com/TU-USUARIO/libitina-eps/main/infra/servidor/instalar.sh | bash -s -- https://github.com/TU-USUARIO/libitina-eps.git
```

El script instala Docker, agrega 2 GB de memoria de intercambio, clona el repositorio en `/opt/libitina-eps`
y crea el `.env` con **todas las claves generadas al azar**. Al terminar, **sal (`exit`) y vuelve a entrar**.

## 5. Configurar el `.env`

```bash
cd /opt/libitina-eps
nano .env
```

Cambia estas líneas (guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`):

```
DOMINIO=libitina-eps.eastus.cloudapp.azure.com
FRONTEND_URL=https://libitina-eps.eastus.cloudapp.azure.com
CORREO_CERTIFICADO=tucorreo@gmail.com
ADMIN_CORREO=admin@libitina.co

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USUARIO=tucorreo@gmail.com
SMTP_CLAVE=xxxx xxxx xxxx xxxx
SMTP_TLS=true
CORREO_REMITENTE=Libitina EPS <tucorreo@gmail.com>
```

`SMTP_CLAVE` es una **contraseña de aplicación** de Google (Cuenta de Google → Seguridad → Verificación en
dos pasos → Contraseñas de aplicaciones), nunca tu contraseña normal. Azure bloquea el puerto 25, pero Gmail usa
el 587, que sí funciona.

La clave del administrador quedó generada en `ADMIN_CLAVE`. Anótala: `grep ADMIN_CLAVE .env`.

## 6. Certificado HTTPS y primer despliegue

```bash
./infra/servidor/certificado.sh
./infra/servidor/desplegar.sh
```

La primera vez tarda unos 10 minutos (descarga imágenes y compila). Al final debe decir
`Despliegue correcto: todos los servicios responden`. Abre `https://libitina-eps.eastus.cloudapp.azure.com`.

El certificado se renueva solo, y las 7 bases se respaldan cada día a las 9:00 p. m. de Colombia (o apenas enciendas la máquina, si ese día estaba apagada).

## 7. Apagado automático (para cuidar el crédito)

En la máquina → **Operations → Auto-shutdown**: actívalo a las **11:00 p. m.**, zona horaria
**(UTC-05:00) Bogota**. Para encenderla, **Start** en el portal; todos los contenedores arrancan solos.
Ojo: **apagar con Stop desde el portal** (no solo `shutdown` desde SSH) para que Azure deje de cobrar la máquina.

## 8. Despliegue automático desde GitHub

1. En tu computador, crea una llave solo para GitHub Actions:
   ```powershell
   ssh-keygen -t ed25519 -f libitina-deploy -N '""' -C "github-actions"
   ```
2. Agrega la llave **pública** a la máquina:
   ```powershell
   type .\libitina-deploy.pub | ssh -i .\libitina-eps_key.pem libitina@libitina-eps.eastus.cloudapp.azure.com "cat >> ~/.ssh/authorized_keys"
   ```
3. En GitHub → tu repositorio → **Settings → Environments → New environment** → `produccion`. Dentro,
   en **Environment secrets**, crea:

| Secreto | Valor |
|---|---|
| `AZURE_HOST` | `libitina-eps.eastus.cloudapp.azure.com` |
| `AZURE_USUARIO` | `libitina` |
| `AZURE_LLAVE_SSH` | el contenido completo del archivo `libitina-deploy` (la privada, sin `.pub`) |

Desde ahí, cada push a `main` corre las pruebas y, si pasan, despliega. Lo ves en la pestaña **Actions**.
Si la máquina está apagada, las pruebas pasan pero el paso de despliegue falla; basta con encenderla y darle
**Re-run failed jobs**.

## Operación diaria

Todos los comandos se corren en `/opt/libitina-eps`. Para no escribir los dos archivos cada vez:

```bash
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'
```

| Para… | Comando |
|---|---|
| Ver el estado de los contenedores | `dc ps` |
| Ver los registros de un servicio | `dc logs --tail 100 -f afiliados` |
| Reiniciar un servicio | `dc restart afiliados` |
| Hacer un respaldo ahora | `dc exec respaldos sh /scripts/respaldar.sh` |
| Ver los respaldos | `dc exec respaldos ls -R /respaldos` |
| Restaurar una base | `./infra/respaldos/restaurar.sh 2026-10-12 libitina_afiliados` |
| Desplegar a mano | `./infra/servidor/desplegar.sh` |

## Si el repositorio es privado

La máquina necesita permiso de lectura: en GitHub → **Settings → Deploy keys → Add deploy key**, pega una llave
pública generada **en la máquina** (`ssh-keygen -t ed25519` y `cat ~/.ssh/id_ed25519.pub`), sin permiso de
escritura, y clona con la dirección SSH (`git@github.com:TU-USUARIO/libitina-eps.git`).

## Seguridad adicional recomendada

- SSH solo acepta llaves, nunca contraseñas (así lo deja Azure con la opción del paso 1). Si limitas la regla de
  SSH (22) a tu IP, GitHub Actions ya no podrá entrar a desplegar: tendrías que hacerlo a mano.
- Nunca subas el `.env` ni las llaves `.pem` al repositorio (ya están en `.gitignore`).
