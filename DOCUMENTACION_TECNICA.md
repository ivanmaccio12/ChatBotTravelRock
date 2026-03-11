# Documentación Técnica y Arquitectura (Travel Rock Bot & CRM)

Este documento detalla la arquitectura, tecnologías, infraestructura y el flujo de datos específicos del sistema **Travel Rock (Chatbot IA Pospventa + CRM React)**. El objetivo es proporcionar una referencia clara sobre cómo está operando este bot y cómo interactúa con el ecosistema global de bots alojado en el servidor.

---

## 1. Stack Tecnológico

El sistema se divide en tres capas principales: Backend (Motor del Bot), Frontend (CRM) e Infraestructura de Terceros.

### 1.1. Backend (Motor del Chatbot y API)
- **Lenguaje / Entornos:** Node.js (v18+) utilizando ES Modules (`"type": "module"`).
- **Framework Web:** Express.js (manejo de endpoints HTTP para integrarse mediante webhooks locales con n8n y para servir la web).
- **Inteligencia Artificial:** SDK oficial de Anthropic (`@anthropic-ai/sdk`), utilizando de forma interna el modelo referenciado como `claude-sonnet-4-5-20250929` (o Claude 3.5 Sonnet bajo el entorno actual de API key). Se le proporciona de base el `DISEÑO_CONVERSACIONAL.md` para seguir el árbol de decisiones de la empresa fielmente.
- **Acceso a Datos:** Base de Datos nativa en PostgreSQL mediante el paquete `pg` para persistir el historial de mensajes de todas las sesiones de usuario para que Claude pueda generar contexto.
- **Herramientas Clave:** `cors`, `dotenv` (gestión segura de credenciales), PM2 para orquestación de vida.

### 1.2. Frontend (Panel Web CRM)
- **Librería Core:** React.js (v18+).
- **Bundler y Compilador:** Vite. Genera la carpeta `/dist/` optimizada que NodeJS sirve automáticamente.
- **Funcionalidad:** Panel de administración donde asesores humanos pueden visualizar conversaciones en vivo, tomar el control de chats marcados por la IA como que requieren intervención, y pausar el bot para comunicarse directamente (enviando datos al workflow aislado de n8n).

### 1.3. Orquestador y Flow de Comunicaciones
- **n8n (Workflow Automation):** Ejerce de núcleo enrutador:
  - **Inbound (AntigravityCopyShow - WhatsApp):** Escucha el Webhook oficial de Meta y cuenta con una lógica que lee el número receptor (`5493875545567` / números de fallback) y envía toda la carga útil directamente a `http://31.97.31.53:3006/chat` por HTTP puro de red interna.
  - **Outbound CRM (Travel Rock - CRM Outbound):** Es un workflow 100% aislado. N8n recibe el payload desde el CRM en React y ejecuta un nodo de salida oficial de WhatsApp, enviando en nombre de Asesor humano.

---

## 2. Infraestructura y Alojamiento (Hosting)

El ecosistema entero reside en un servidor privado virtual (VPS) de Hostinger junto al resto de bots modulares de la empresa.

### 2.1. Servidor Principal
- **Proveedor:** Hostinger.
- **Sistema Operativo:** Linux (Ubuntu).
- **Dirección IP Pública:** `31.97.31.53`.

### 2.2. Alojamiento Aplicativo de Travel Rock (PM2 Host nativo)
El proyecto Node.js de Travel Rock corre fuera de Docker, directamente alojado bajo NGINX en `localhost/var/www/TravelRock`.
- **Puerto:** `3006`.
- **Servicio PM2:** Su proceso de vida es administrado por el demonio PM2 bajo el identificador `travelrock-bot`. Esto significa que si crashea, se reinicia instantáneamente en el mismo microsegundo.
- El panel web está expuesto globalmente visitando directamente **`http://31.97.31.53:3006/`** en el navegador.

### 2.3. Estructura de Base de Datos Compartida
Para la persistencia de las conversaciones, Travel Rock utiliza el contenedor de base de datos PostgreSQL activo del servidor (`evolution_postgres`), pero aísla sus datos para no mezclarse con otros sistemas:
- **Base de Datos:** `travelrock_db`
- **Usuario de Acceso:** `evouser`
- **Conectividad:** Vía localhost nativa: `postgresql://evouser:[PASSWORD]@127.0.0.1:5432/travelrock_db`
- Crea automáticamente al inicializar la tabla `travelrock_conversations` si es que no está presente.

---

## 3. Repositorio Abierto y Workflow Git

El código fuente local y todo su progreso se encuentra guardado bajo versión distribuida en GitHub, lo que permite replicar o contribuir fácilmente.

- **URL de Repositorio Github:** `https://github.com/ivanmaccio12/ChatBotTravelRock.git`
- **Estructura del Proyecto:**
  - `DOCUMENTACION_TECNICA.md`: Arquitectura del sistema (este propio archivo).
  - `DISEÑO_CONVERSACIONAL.md`: Árbol de decisiones y directivas que Anthropic Claude absorbe para guiar las conversaciones y detectar el cierre comercial o intervención humana.
  - `/src`: Lógica central del Backend (Bot, CRM backend y Claude integration).
    - `/controllers`: Recibe los endpoints de webhooks (como `/chat` para el diálogo con clientes e interfaces de consulta del front).
    - `/services`: Funciones como `aiService.js` donde vive Claude, y persistencia de memoria de la DB.
  - `/frontend`: Interface React construida con interfaz gráfica CRM.
  - `.env` (No trackeado): Almacena secretos productivos (`ANTHROPIC_API_KEY`, URLs relativas).

---

## Notas de Administración
Todas las configuraciones y dependencias en el VPS se construyeron sobre un directorio espejo de `C:\Proyectos\ChatBots\TravelRock`. El servidor de **Hostinger** contiene la aplicación final y compilada del frontend bajo `/var/www/TravelRock`. Frente a actualizaciones profundas, el proceso requiere mover el `.js` reparado y correr `pm2 restart travelrock-bot`.
