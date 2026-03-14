# AiNet: Frontend UI Architecture & Implementation Instructions

Hola Claude. Eres el responsable de construir el **Frontend (UI/UX)** del portal "AiNet" en Next.js 14 (App Router). 

AiNet es un portal para administrar y vender agentes de chatbot. La parte del backend y endpoints de la API estarán (o ya están) implementados de acuerdo a `backend_architecture.md`. Tu objetivo es codificar la interfaz de usuario basándote en un diseño de alta fidelidad que ya fue generado, asegurando que utilices componentes modernos y los colores correctos.

---

## 🎨 1. Design System & Tech Stack

Deberás usar y configurar estrictamente:
- **Framework:** Next.js 14 App Router, TypeScript, React Server Components.
- **Styling:** Tailwind CSS.
- **Components:** shadcn/ui.
- **Animations:** framer-motion (para transiciones de páginas y números, glassmorphism hovers).

### Paleta de Colores Exigida:
- **Fondo Oscuro:** `#0F172A` (Usar globalmente como background principal)
- **Azul Eléctrico:** `#2B79FF` (Botones de acción, enlaces, highlights y glows)
- **Gris Pizarra:** `#64748B` (Subtítulos, bordes de tablas y tarjetas, textos secundarios)
- **Blanco Hielo:** `#F8FAFC` (Texto principal de lectura)
- **Verde Éxito:** `#10B981` (Para badges/status como "Online")

### Estilo General (UI/UX):
- **Glassmorphism:** Las tarjetas principales, el sidebar y los modales deben tener un fondo oscuro semi-transparente (`bg-slate-900/50`) con un desenfoque de fondo (`backdrop-blur-md` o similar) y bordes muy sutiles en `#64748B`.
- **Glows:** Los elementos primarios (como el botón de Login o tarjetas destacadas) deben tener "glows" (sombras sutiles) usando el color `#2B79FF`.
- Las pantallas no tienen un diseño SaaS de creación para los clientes; el "Client Dashboard" es solo de lectura.
- Implementar **Dark Mode** como modo único o por defecto absoluto de la aplicación.

---

## 🖼 2. Pantallas a Implementar (Rutas de Next.js)

Se han diseñado 5 pantallas en alta fidelidad. A continuación te detallo cada ruta y los elementos que debes construir. Si el entorno te permite leer imágenes, puedes encontrar los diseños originales (mockups) en las siguientes rutas absolutas de la máquina local:

### 1️⃣ `/login` (Login Page)
* **Imagen de referencia:** `/Users/davidaaronarevalocruz/.gemini/antigravity/brain/a114fc0e-a033-4dd5-806a-8fe0155dba66/login.png`
* **Elementos:** Fondo oscuro `#0F172A`. Card central de glassmorphism con efecto glow exterior azul `#2B79FF`. Título "Welcome Back" en Ice White, subtítulo en Slate Grey. Campos de Email y Password oscuros. Botón de CTA primario muy destacado en `#2B79FF`.

### 2️⃣ `/admin/dashboard` (Admin Overview)
* **Imagen de referencia:** `/Users/davidaaronarevalocruz/.gemini/antigravity/brain/a114fc0e-a033-4dd5-806a-8fe0155dba66/admin_dashboard.png`
* **Elementos:** Sidebar a la izquierda (highlight azul en la ruta actual). Header. Área principal con 4 tarjetas de métricas en la parte superior (Total Clients, Active Agents, Monthly Revenue, Messages Processed). Debajo, un gráfico de línea/área de ancho completo que muestre "API Usage" (usa Recharts con el color principal azul). Barra derecha con un log/feed de 'Recent Activity'.

### 3️⃣ `/admin/clients` (Client Management)
* **Imagen de referencia:** `/Users/davidaaronarevalocruz/.gemini/antigravity/brain/a114fc0e-a033-4dd5-806a-8fe0155dba66/clients.png`
* **Elementos:** Misma estructura con Sidebar. Header destacando "Clientes" y un botón CTA "+ New Client" arriba a la derecha. Una tabla de datos ocupando el ancho completo utilizando `shadcn/ui` Data Table. Columnas: Name, Company, Industry, Active Agents, Credit Balance, Status (usar badges/pills). Menú desplegable en cada fila.

### 4️⃣ `/admin/projects` (AI Agents Grid)
* **Imagen de referencia:** `/Users/davidaaronarevalocruz/.gemini/antigravity/brain/a114fc0e-a033-4dd5-806a-8fe0155dba66/agents.png`
* **Elementos:** Vista en formato Grilla (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). Cada tarjeta representa un agente IA (ej. "Customer Service Bot"). Mostrar detalles del modelo ("GPT-4o-mini"). Incluir un pequeño indicador circular (`badge`/`dot`) con efecto 'ping'/pulso animado en color verde `#10B981` cuando el agente esté Online.

### 5️⃣ `/client/dashboard` (Client Read-only Dashboard)
* **Imagen de referencia:** `/Users/davidaaronarevalocruz/.gemini/antigravity/brain/a114fc0e-a033-4dd5-806a-8fe0155dba66/client_dashboard.png`
* **Elementos:** Es el portal del usuario final. Sidebar resumido (ej. "Overview", "Billing"). Diseño sin opciones de edición. Elemento central gigantesco que demuestre el "Credit Balance" con una barra de progreso que refleje capacidad. Dos tarjetas secundarias con estadísticas y un gráfico claro y limpio (Recharts) en la parte inferior mostrando uso de API de los últimos 7 días.

---

## 💻 3. Tareas Prioritarias

1. **Setup Inicial:** Inicializa Tailwind y configúralo con las variables de colores requeridas en `tailwind.config.ts`.
2. **Instalación de Componentes:** Utiliza `shadcn/ui` para instalar (button, card, input, table, dropdown-menu, etc.).
3. **Estructura de Layouts:** Crea `src/app/(admin)/layout.tsx` y `src/app/(client)/layout.tsx`. Construye un Navbar o Sidebar re-utilizable con estado activo.
4. **Construcción de Páginas:** Replíca cada diseño base en su ruta correspondiente usando componentes estáticos y mock de datos, hasta que lo conectes con el backend.
5. **Animaciones:** Agrega framer-motion para que las transiciones de las rutas App Router y las interacciones hover de los glassmorphism cards se sientan de la mejor calidad.

Inicia este trabajo configurando el `layout.tsx` raíz y las variables CSS de la aplicación. ¡Mucho éxito construyendo esta increíble interfaz!
