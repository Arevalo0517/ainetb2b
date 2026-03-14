# AiNet: Backend & Database Implementation Instructions

Hola Claude! Eres el responsable de construir el **Backend, la Base de Datos y la Lógica Core** del portal "AiNet". AiNet es una plataforma interna (Next.js 14 App Router) para administrar y vender agentes de chatbot con IA.

El frontend (UI/UX) ya está siendo trabajado. Tu objetivo es estrictamente **implementar las tablas en Supabase, el auth, y los endpoints de API (Route Handlers)** basándonos en esta arquitectura.

---

## 🏗 Arquitectura y Contexto

1. **Instancia Multi-Tenant de n8n**: Usaremos UNA sola instancia de n8n para todos los clientes. Los workflows identificarán a qué cliente/proyecto pertenecen usando `client_id` y `project_id`.
2. **Proxy de OpenAI Centralizado**: Para no crear API keys para cada cliente, nosotros actuamos como proxy. Toda llamada de n8n hacia OpenAI pasará primero por `/api/proxy/openai` en Next.js.
3. **Sistema de Créditos Prepagados**: Cada cliente tiene un saldo (ej. 100 créditos). Cada llamada a la API descuenta fracciones de créditos según los tokens consumidos. Si el saldo llega a 0, las llamadas a la API son rechazadas (pausando el agente).

## 🗄 1. Database Schema (Supabase PostgreSQL)

Por favor, crea estas migraciones o scripts SQL para Supabase. Asegúrate de configurar también RLS (Row Level Security) básico donde los `clients` solo puedan leer su propia info, pero el `admin` pueda leer/escribir todo.

```sql
-- 1. Perfiles (extendiendo auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client', -- 'admin' | 'client'
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes (Balances de Crédito)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  industry TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'suspended' | 'inactive'
  credit_balance DECIMAL(10,2) DEFAULT 0,
  credit_threshold DECIMAL(10,2) DEFAULT 10, -- Alerta de saldo bajo
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Proyectos (Agentes/Chatbots vendidos)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'chatbot-basico' | 'chatbot-intermedio' | 'chatbot-avanzado'
  status TEXT DEFAULT 'setup', -- 'setup' | 'active' | 'paused' | 'cancelled'
  price DECIMAL(10,2),
  
  -- n8n config
  n8n_workflow_id TEXT,
  n8n_webhook_url TEXT,
  
  -- AI config
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  max_tokens_per_message INTEGER DEFAULT 1000,
  
  -- Channel config
  channel TEXT,
  channel_config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Uso de API (Logs detallados)
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  
  model TEXT NOT NULL,
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  cost_usd DECIMAL(10,6),
  credits_consumed DECIMAL(10,4),
  
  endpoint TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transacciones de Créditos
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'purchase' | 'consumption' | 'adjustment' | 'refund'
  amount DECIMAL(10,2) NOT NULL, -- Positivo = recarga, Negativo = consumo
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- Apunta a api_usage.id o payment.id
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 2. Endpoints Requeridos (Next.js 14 App Router)

Implementa los siguientes **Route Handlers** bajo `src/app/api/...`:

### `POST /api/proxy/openai`
**Este es el endpoint más importante de todo el sistema.**
**Propósito:** Interceptar las peticiones que n8n quiere hacer a OpenAI, validar créditos y registrar el uso de tokens.
**Flujo esperado:**
1. Leer un header de autenticación, ej: `x-project-key: <project_id>`
2. Verificar en la base de datos que el proyecto existe, está activo, y que el cliente tiene `credit_balance > 0`.
3. Hacer fetch directo a `https://api.openai.com/v1/chat/completions` pasando el body original.
4. Pausar la conexión, esperar la respuesta de OpenAI.
5. Capturar `usage.prompt_tokens` y `usage.completion_tokens` de la respuesta de OpenAI.
6. Calcular `credits_consumed` (ej. basado en precio de GPT-4o-mini más nuestro margen).
7. Insertar fila en `api_usage`.
8. En una transacción (RPC o backend simple), restar los créditos a la tabla `clients` e insertar log en `credit_transactions`.
9. Devolver el JSON original de OpenAI de regreso a n8n.

### REST APIs para el Admin
*   📝 **GET / POST / PUT / DELETE `/api/clients`**
*   ⚙️ **GET / POST / PUT / DELETE `/api/projects`**
*   💰 **POST `/api/credits`** (Para añadir créditos nuevos manualmente a un cliente).
*   📊 **GET `/api/usage`** (Para renderizar los gráficos del dashboard, agupando por día/mes).

## En resumen, tus tareas son:
1. Generar la configuración inicial de Supabase (migrations locales validando las tablas arriba mencionadas).
2. Producir el código (Typescript) crítico para `/api/proxy/openai`.
3. Implementar las operaciones CRUD para Clientes, Proyectos y Créditos en Server Actions o API Routes.
4. Escribir las funciones helper en `src/lib/supabase/server.ts` y `src/lib/credits.ts`.

¡Adelante, puedes empezar analizando la base de datos y los esquemas!
