/**
 * AiNet — Mock Integration Test
 * Simula el flujo completo sin necesitar Supabase ni OpenAI reales.
 */

import { calculateCredits, hasEnoughCredits, isBelowThreshold, MODEL_PRICING } from '../lib/credits'

// ─── Colores para la terminal ────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
}

let passed = 0
let failed = 0

function section(title: string) {
  console.log(`\n${c.bold}${c.cyan}━━━ ${title} ━━━${c.reset}`)
}

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ${c.green}✓${c.reset} ${label}`)
    passed++
  } else {
    console.log(`  ${c.red}✗${c.reset} ${label}${detail ? ` ${c.gray}(${detail})${c.reset}` : ''}`)
    failed++
  }
}

function printValue(label: string, value: unknown) {
  console.log(`  ${c.gray}${label}:${c.reset} ${c.yellow}${JSON.stringify(value)}${c.reset}`)
}

// ─── Mock Data ───────────────────────────────────────────────

const MOCK_CLIENTS = [
  {
    id: 'client-001',
    company_name: 'Tacos El Gordo S.A.',
    industry: 'Restaurantes',
    status: 'active',
    credit_balance: 150.00,
    credit_threshold: 10.00,
  },
  {
    id: 'client-002',
    company_name: 'Inmobiliaria Perez',
    industry: 'Bienes Raíces',
    status: 'active',
    credit_balance: 5.00,    // Saldo bajo (bajo threshold)
    credit_threshold: 10.00,
  },
  {
    id: 'client-003',
    company_name: 'Tech Startup XYZ',
    industry: 'Tecnología',
    status: 'suspended',
    credit_balance: 0.00,
    credit_threshold: 10.00,
  },
]

const MOCK_PROJECTS = [
  {
    id: 'proj-001',
    client_id: 'client-001',
    name: 'Chatbot Atención al Cliente',
    type: 'chatbot-basico',
    status: 'active',
    ai_model: 'gpt-4o-mini',
    max_tokens_per_message: 1000,
    n8n_webhook_url: 'https://n8n.example.com/webhook/proj-001',
  },
  {
    id: 'proj-002',
    client_id: 'client-002',
    name: 'Asistente de Propiedades',
    type: 'chatbot-intermedio',
    status: 'active',
    ai_model: 'gpt-4o',
    max_tokens_per_message: 2000,
    n8n_webhook_url: 'https://n8n.example.com/webhook/proj-002',
  },
  {
    id: 'proj-003',
    client_id: 'client-003',
    name: 'Bot de Soporte',
    type: 'chatbot-avanzado',
    status: 'paused',
    ai_model: 'gpt-4-turbo',
    max_tokens_per_message: 4000,
    n8n_webhook_url: 'https://n8n.example.com/webhook/proj-003',
  },
]

// ─── Simulación del estado en memoria ────────────────────────
const db = {
  clients: [...MOCK_CLIENTS],
  api_usage: [] as {
    id: string
    project_id: string
    client_id: string
    model: string
    tokens_input: number
    tokens_output: number
    cost_usd: number
    credits_consumed: number
    created_at: string
  }[],
  credit_transactions: [] as {
    id: string
    client_id: string
    type: string
    amount: number
    balance_after: number
    description: string
    created_at: string
  }[],
}

let usageCounter = 1
let txCounter = 1

function deductCredits(clientId: string, credits: number, usageId: string, description: string) {
  const client = db.clients.find(c => c.id === clientId)
  if (!client) throw new Error('Client not found')
  client.credit_balance = parseFloat((client.credit_balance - credits).toFixed(4))

  db.credit_transactions.push({
    id: `tx-${String(txCounter++).padStart(3, '0')}`,
    client_id: clientId,
    type: 'consumption',
    amount: -credits,
    balance_after: client.credit_balance,
    description,
    created_at: new Date().toISOString(),
  })

  return client.credit_balance
}

// ─── Simular POST /api/proxy/openai ──────────────────────────
function simulateProxyCall(projectId: string, model: string, tokensInput: number, tokensOutput: number) {
  const project = MOCK_PROJECTS.find(p => p.id === projectId)
  if (!project) return { status: 404, error: 'Project not found' }
  if (project.status !== 'active') return { status: 403, error: `Project is not active (${project.status})` }

  const client = db.clients.find(c => c.id === project.client_id)
  if (!client) return { status: 404, error: 'Client not found' }
  if (client.status !== 'active') return { status: 403, error: 'Client account is suspended' }
  if (client.credit_balance <= 0) return { status: 402, error: 'Insufficient credits' }

  const { costUsd, creditsConsumed } = calculateCredits(model, tokensInput, tokensOutput)

  const usageRow = {
    id: `usage-${String(usageCounter++).padStart(3, '0')}`,
    project_id: project.id,
    client_id: client.id,
    model,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: costUsd,
    credits_consumed: creditsConsumed,
    created_at: new Date().toISOString(),
  }
  db.api_usage.push(usageRow)

  const newBalance = deductCredits(
    client.id,
    creditsConsumed,
    usageRow.id,
    `API call — model: ${model}, project: ${project.id}`
  )

  return {
    status: 200,
    data: {
      id: `chatcmpl-mock-${Math.random().toString(36).slice(2, 9)}`,
      object: 'chat.completion',
      model,
      choices: [{ message: { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?' } }],
      usage: { prompt_tokens: tokensInput, completion_tokens: tokensOutput, total_tokens: tokensInput + tokensOutput },
    },
    meta: { costUsd, creditsConsumed, newBalance },
  }
}

// ─── Simular POST /api/credits ───────────────────────────────
function simulateAddCredits(clientId: string, amount: number, description: string) {
  const client = db.clients.find(c => c.id === clientId)
  if (!client) return { status: 404, error: 'Client not found' }

  const newBalance = parseFloat((client.credit_balance + amount).toFixed(2))
  client.credit_balance = newBalance

  const tx = {
    id: `tx-${String(txCounter++).padStart(3, '0')}`,
    client_id: clientId,
    type: 'purchase',
    amount,
    balance_after: newBalance,
    description,
    created_at: new Date().toISOString(),
  }
  db.credit_transactions.push(tx)

  return { status: 201, transaction: tx, new_balance: newBalance }
}

// ─── TESTS ───────────────────────────────────────────────────

console.log(`\n${c.bold}${c.cyan}╔═══════════════════════════════════════╗${c.reset}`)
console.log(`${c.bold}${c.cyan}║     AiNet — Mock Integration Test     ║${c.reset}`)
console.log(`${c.bold}${c.cyan}╚═══════════════════════════════════════╝${c.reset}`)

// ── 1. calculateCredits ──────────────────────────────────────
section('1. calculateCredits() — Cálculo de créditos')

{
  const r = calculateCredits('gpt-4o-mini', 500, 300)
  printValue('gpt-4o-mini 500+300 tokens', r)
  assert('costUsd es mayor que 0', r.costUsd > 0)
  assert('creditsConsumed es mayor que 0', r.creditsConsumed > 0)
  assert('creditsConsumed tiene 4 decimales', r.creditsConsumed === parseFloat(r.creditsConsumed.toFixed(4)))
  // Cálculo esperado: (500/1M * 0.15 + 300/1M * 0.60) * 3 / 0.01
  const expected = ((500 / 1_000_000) * 0.15 + (300 / 1_000_000) * 0.60) * 3 / 0.01
  assert(`creditsConsumed correcto (~${expected.toFixed(4)})`, Math.abs(r.creditsConsumed - expected) < 0.001)
}

{
  const r = calculateCredits('gpt-4o', 1000, 500)
  printValue('gpt-4o 1000+500 tokens', r)
  assert('gpt-4o es más caro que gpt-4o-mini', r.costUsd > calculateCredits('gpt-4o-mini', 1000, 500).costUsd)
}

{
  const r = calculateCredits('modelo-desconocido', 100, 100)
  printValue('modelo desconocido → fallback gpt-4o-mini', r)
  const expected = calculateCredits('gpt-4o-mini', 100, 100)
  assert('fallback a gpt-4o-mini funciona', r.creditsConsumed === expected.creditsConsumed)
}

// ── 2. hasEnoughCredits / isBelowThreshold ───────────────────
section('2. Validaciones de saldo')

assert('saldo 150 es suficiente', hasEnoughCredits(150))
assert('saldo 0 NO es suficiente', !hasEnoughCredits(0))
assert('saldo -5 NO es suficiente', !hasEnoughCredits(-5))
assert('saldo 5 está bajo threshold de 10', isBelowThreshold(5, 10))
assert('saldo 15 NO está bajo threshold de 10', !isBelowThreshold(15, 10))

// ── 3. Proxy OpenAI — Flujo exitoso ─────────────────────────
section('3. POST /api/proxy/openai — Flujo exitoso (client-001)')

{
  const balanceBefore = db.clients.find(c => c.id === 'client-001')!.credit_balance
  const result = simulateProxyCall('proj-001', 'gpt-4o-mini', 850, 420)
  const balanceAfter = db.clients.find(c => c.id === 'client-001')!.credit_balance

  printValue('status', result.status)
  printValue('creditsConsumed', result.meta?.creditsConsumed)
  printValue('costUsd', result.meta?.costUsd)
  printValue(`balance ${balanceBefore} → ${balanceAfter}`, balanceAfter)

  assert('responde 200', result.status === 200)
  assert('respuesta tiene choices', Array.isArray(result.data?.choices))
  assert('balance se redujo', balanceAfter < balanceBefore)
  assert('log de usage creado', db.api_usage.length === 1)
  assert('transacción de consumo creada', db.credit_transactions.some(t => t.type === 'consumption'))
}

// ── 4. Proxy — Proyecto pausado ──────────────────────────────
section('4. POST /api/proxy/openai — Proyecto pausado (proj-003)')

{
  const result = simulateProxyCall('proj-003', 'gpt-4-turbo', 1000, 500)
  printValue('status', result.status)
  printValue('error', result.error)
  assert('responde 403', result.status === 403)
  assert('mensaje de proyecto inactivo', result.error?.includes('paused'))
}

// ── 5. Proxy — Cliente suspendido ───────────────────────────
section('5. POST /api/proxy/openai — Cliente suspendido')

{
  // Crear proyecto activo para cliente suspendido
  const testProject = { ...MOCK_PROJECTS[2], id: 'proj-suspended-test', status: 'active' as const }
  MOCK_PROJECTS.push(testProject)

  const result = simulateProxyCall('proj-suspended-test', 'gpt-4o-mini', 100, 100)
  printValue('status', result.status)
  printValue('error', result.error)
  assert('responde 403', result.status === 403)
  assert('mensaje de cuenta suspendida', result.error?.includes('suspended'))

  MOCK_PROJECTS.pop()
}

// ── 6. Proxy — Sin créditos ──────────────────────────────────
section('6. POST /api/proxy/openai — Sin créditos (client-002)')

{
  // client-002 tiene $5 pero threshold es 10 (saldo bajo, pero aún > 0)
  const result1 = simulateProxyCall('proj-002', 'gpt-4o', 1000, 500)
  assert('primera llamada pasa (balance > 0)', result1.status === 200)

  // Vaciar el saldo
  const client2 = db.clients.find(c => c.id === 'client-002')!
  client2.credit_balance = 0

  const result2 = simulateProxyCall('proj-002', 'gpt-4o', 100, 100)
  printValue('status con balance=0', result2.status)
  printValue('error', result2.error)
  assert('responde 402 sin créditos', result2.status === 402)
}

// ── 7. Añadir créditos ───────────────────────────────────────
section('7. POST /api/credits — Añadir créditos a cliente')

{
  const client2Before = db.clients.find(c => c.id === 'client-002')!.credit_balance
  const result = simulateAddCredits('client-002', 100, 'Recarga mensual Plan Pro')

  printValue('status', result.status)
  printValue('transaction', result.transaction)
  printValue('new_balance', result.new_balance)

  assert('responde 201', result.status === 201)
  assert('nuevo saldo es 100', result.new_balance === client2Before + 100)
  assert('transacción de tipo purchase', result.transaction?.type === 'purchase')

  // Verificar que ahora puede hacer llamadas
  const callResult = simulateProxyCall('proj-002', 'gpt-4o-mini', 300, 150)
  assert('cliente puede llamar después de recargar', callResult.status === 200)
}

// ── 8. Múltiples llamadas y acumulación ─────────────────────
section('8. Múltiples llamadas — Acumulación de usage')

{
  const callsBefore = db.api_usage.length
  for (let i = 0; i < 5; i++) {
    simulateProxyCall('proj-001', 'gpt-4o-mini', 400 + i * 100, 200 + i * 50)
  }
  const callsAfter = db.api_usage.length
  assert('se registraron 5 llamadas adicionales', callsAfter - callsBefore === 5)

  const totalCredits = db.api_usage.reduce((sum, u) => sum + u.credits_consumed, 0)
  const totalCost    = db.api_usage.reduce((sum, u) => sum + u.cost_usd, 0)
  printValue('total llamadas registradas', db.api_usage.length)
  printValue('total créditos consumidos', totalCredits.toFixed(4))
  printValue('total costo USD', totalCost.toFixed(6))
  assert('total créditos > 0', totalCredits > 0)
}

// ── 9. GET /api/usage — Dashboard agrupado por día ──────────
section('9. GET /api/usage — Agrupación para dashboard')

{
  const grouped = new Map<string, { calls: number; credits: number; cost: number }>()

  for (const row of db.api_usage) {
    const day = row.created_at.split('T')[0]
    const existing = grouped.get(day) ?? { calls: 0, credits: 0, cost: 0 }
    grouped.set(day, {
      calls:   existing.calls   + 1,
      credits: existing.credits + row.credits_consumed,
      cost:    existing.cost    + row.cost_usd,
    })
  }

  const periods = Array.from(grouped.entries())
  printValue('periodos en el dashboard', periods.length)
  for (const [day, data] of periods) {
    printValue(`  ${day}`, data)
  }

  assert('hay al menos 1 período', periods.length >= 1)
  assert('cada período tiene calls > 0', periods.every(([, d]) => d.calls > 0))
}

// ── 10. Estado final de DB ────────────────────────────────────
section('10. Estado final de la base de datos mock')

{
  for (const client of db.clients) {
    const low = isBelowThreshold(client.credit_balance, client.credit_threshold)
    printValue(
      `${client.company_name}`,
      { balance: client.credit_balance, threshold: client.credit_threshold, lowAlert: low }
    )
  }
  printValue('Total api_usage rows', db.api_usage.length)
  printValue('Total credit_transactions', db.credit_transactions.length)

  assert('hay registros en api_usage', db.api_usage.length > 0)
  assert('hay registros en credit_transactions', db.credit_transactions.length > 0)
  assert('client-001 tiene balance reducido', db.clients[0].credit_balance < 150)
}

// ── Resultado final ──────────────────────────────────────────
console.log(`\n${c.bold}${'─'.repeat(45)}${c.reset}`)
const total = passed + failed
const emoji = failed === 0 ? c.green : c.red
console.log(`${c.bold}Resultado: ${emoji}${passed}/${total} pruebas pasaron${c.reset}`)
if (failed > 0) {
  console.log(`${c.red}  ${failed} prueba(s) fallaron${c.reset}`)
}
console.log()

if (failed > 0) process.exit(1)
