'use client'
import React, { useState, useEffect, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Settings } from 'lucide-react'
import { voiceApi, projectsApi } from '@/lib/api'
import type { Project } from '@/types/database'

interface VoiceConfigForm {
  stt_model: string
  tts_model: string
  tts_language: string
  stt_language: string
  voice_ai_model: string
  greeting_message: string
  end_call_phrases: string[]
  max_call_duration_seconds: string
  silence_timeout_seconds: string
  transfer_number: string
  n8n_voice_webhook_url: string
  voice_tools: string
  livekit_room_prefix: string
  voice_max_tokens: string
  // VAPI-inspired
  first_message_mode: string
  wait_seconds_before_speaking: string
  interruption_num_words: string
  background_sound: string
  background_denoising_enabled: boolean
  voicemail_detection_enabled: boolean
  analysis_summary_prompt: string
  analysis_structured_schema: string
  analysis_success_prompt: string
}

const DEFAULT_FORM: VoiceConfigForm = {
  stt_model: 'deepgram-nova-2',
  tts_model: 'deepgram-aura-2-celeste-es',
  tts_language: 'en-US',
  stt_language: 'en-US',
  voice_ai_model: 'gpt-4o-mini',
  greeting_message: '',
  end_call_phrases: [],
  max_call_duration_seconds: '300',
  silence_timeout_seconds: '10',
  transfer_number: '',
  n8n_voice_webhook_url: '',
  voice_tools: '[]',
  livekit_room_prefix: 'voice-',
  voice_max_tokens: '1024',
  first_message_mode: 'assistant-speaks-first',
  wait_seconds_before_speaking: '0.4',
  interruption_num_words: '3',
  background_sound: 'off',
  background_denoising_enabled: false,
  voicemail_detection_enabled: false,
  analysis_summary_prompt: '',
  analysis_structured_schema: '',
  analysis_success_prompt: '',
}

function configToForm(config: Record<string, unknown>): VoiceConfigForm {
  return {
    stt_model: String(config.stt_model ?? DEFAULT_FORM.stt_model),
    tts_model: String(config.tts_model ?? DEFAULT_FORM.tts_model),
    tts_language: String(config.tts_language ?? DEFAULT_FORM.tts_language),
    stt_language: String(config.stt_language ?? DEFAULT_FORM.stt_language),
    voice_ai_model: String(config.voice_ai_model ?? DEFAULT_FORM.voice_ai_model),
    greeting_message: String(config.greeting_message ?? ''),
    end_call_phrases: Array.isArray(config.end_call_phrases) ? (config.end_call_phrases as string[]) : [],
    max_call_duration_seconds: String(config.max_call_duration_seconds ?? DEFAULT_FORM.max_call_duration_seconds),
    silence_timeout_seconds: String(config.silence_timeout_seconds ?? DEFAULT_FORM.silence_timeout_seconds),
    transfer_number: String(config.transfer_number ?? ''),
    n8n_voice_webhook_url: String(config.n8n_voice_webhook_url ?? ''),
    voice_tools: JSON.stringify(config.voice_tools ?? [], null, 2),
    livekit_room_prefix: String(config.livekit_room_prefix ?? DEFAULT_FORM.livekit_room_prefix),
    voice_max_tokens: String(config.voice_max_tokens ?? DEFAULT_FORM.voice_max_tokens),
    first_message_mode: String(config.first_message_mode ?? DEFAULT_FORM.first_message_mode),
    wait_seconds_before_speaking: String(config.wait_seconds_before_speaking ?? DEFAULT_FORM.wait_seconds_before_speaking),
    interruption_num_words: String(config.interruption_num_words ?? DEFAULT_FORM.interruption_num_words),
    background_sound: String(config.background_sound ?? DEFAULT_FORM.background_sound),
    background_denoising_enabled: Boolean(config.background_denoising_enabled ?? false),
    voicemail_detection_enabled: Boolean(config.voicemail_detection_enabled ?? false),
    analysis_summary_prompt: String(config.analysis_summary_prompt ?? ''),
    analysis_structured_schema: config.analysis_structured_schema
      ? JSON.stringify(config.analysis_structured_schema, null, 2)
      : '',
    analysis_success_prompt: String(config.analysis_success_prompt ?? ''),
  }
}

export default function VoiceConfigPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [form, setForm] = useState<VoiceConfigForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    projectsApi.list()
      .then(data => setProjects((data as Project[]).filter(p => p.type.startsWith('voz-'))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    setSaveStatus('idle')
    voiceApi.getConfig(selectedProject)
      .then(config => {
        setForm(configToForm(config as Record<string, unknown>))
        setIsNew(false)
      })
      .catch((err: Error) => {
        // 404 means no config yet — show empty form with note
        if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
          setForm(DEFAULT_FORM)
          setIsNew(true)
        }
      })
      .finally(() => setLoading(false))
  }, [selectedProject])

  function setField(key: keyof VoiceConfigForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addTag(phrase: string) {
    const trimmed = phrase.trim()
    if (trimmed && !form.end_call_phrases.includes(trimmed)) {
      setForm(f => ({ ...f, end_call_phrases: [...f.end_call_phrases, trimmed] }))
    }
  }

  function removeTag(phrase: string) {
    setForm(f => ({ ...f, end_call_phrases: f.end_call_phrases.filter(p => p !== phrase) }))
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject) return
    setSaving(true)
    setSaveStatus('idle')
    setSaveError('')

    let parsedTools
    try {
      parsedTools = JSON.parse(form.voice_tools)
    } catch {
      setSaveStatus('error')
      setSaveError('Voice Tools contiene JSON inválido')
      setSaving(false)
      return
    }

    let parsedSchema: Record<string, unknown> | null = null
    if (form.analysis_structured_schema.trim()) {
      try {
        parsedSchema = JSON.parse(form.analysis_structured_schema)
      } catch {
        setSaveStatus('error')
        setSaveError('Analysis Schema contiene JSON inválido')
        setSaving(false)
        return
      }
    }

    const payload = {
      stt_model: form.stt_model,
      tts_model: form.tts_model,
      tts_language: form.tts_language,
      stt_language: form.stt_language,
      voice_ai_model: form.voice_ai_model,
      greeting_message: form.greeting_message || null,
      end_call_phrases: form.end_call_phrases,
      max_call_duration_seconds: parseInt(form.max_call_duration_seconds) || null,
      silence_timeout_seconds: parseInt(form.silence_timeout_seconds) || null,
      transfer_number: form.transfer_number || null,
      n8n_voice_webhook_url: form.n8n_voice_webhook_url || null,
      voice_tools: parsedTools,
      livekit_room_prefix: form.livekit_room_prefix || null,
      voice_max_tokens: parseInt(form.voice_max_tokens) || null,
      first_message_mode: form.first_message_mode,
      wait_seconds_before_speaking: parseFloat(form.wait_seconds_before_speaking) || 0.4,
      interruption_num_words: parseInt(form.interruption_num_words) || 3,
      background_sound: form.background_sound,
      background_denoising_enabled: form.background_denoising_enabled,
      voicemail_detection_enabled: form.voicemail_detection_enabled,
      analysis_summary_prompt: form.analysis_summary_prompt || null,
      analysis_structured_schema: parsedSchema,
      analysis_success_prompt: form.analysis_success_prompt || null,
    }

    try {
      await voiceApi.updateConfig(selectedProject, payload)
      setSaveStatus('success')
      setIsNew(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: unknown) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:ring-1 focus:ring-[#2B79FF]"
  const inputStyle = { background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)' }
  const labelClass = "block text-xs font-medium text-[#94A3B8] mb-1.5"
  const sectionClass = "glass-card rounded-xl p-5 space-y-4"
  const sectionTitle = "text-sm font-semibold text-[#F8FAFC] mb-4"

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(100,116,139,0.2)' }}>
        <div>
          <h1 className="text-lg font-bold text-[#F8FAFC]">Configuración de Voz</h1>
          <p className="text-xs text-[#64748B]">Pipeline STT/TTS y parámetros del agente</p>
        </div>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-[#94A3B8] outline-none"
          style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
          <option value="">Seleccionar proyecto...</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(43,121,255,0.1)' }}>
              <Settings size={24} className="text-[#2B79FF]" />
            </div>
            <p className="text-[#94A3B8] text-sm">Selecciona un proyecto para ver su configuración</p>
          </div>
        ) : loading ? (
          <p className="text-[#64748B] text-sm text-center py-12">Cargando configuración...</p>
        ) : (
          <form onSubmit={handleSave} className="max-w-2xl space-y-5">
            {isNew && (
              <div className="px-4 py-3 rounded-lg text-xs text-[#F59E0B]"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                Este proyecto no tiene configuración de voz. Guarda para crear una.
              </div>
            )}

            {/* 1. Pipeline */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              className={sectionClass}>
              <h2 className={sectionTitle}>Pipeline</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>STT Model</label>
                  <select value={form.stt_model} onChange={e => setField('stt_model', e.target.value)}
                    className={inputClass} style={inputStyle}>
                    <option value="deepgram-nova-2">Deepgram Nova-2</option>
                    <option value="deepgram-nova">Deepgram Nova</option>
                    <option value="whisper-1">OpenAI Whisper-1</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>TTS Model</label>
                  <select value={form.tts_model} onChange={e => setField('tts_model', e.target.value)}
                    className={inputClass} style={inputStyle}>
                    <optgroup label="Aura 2 — Español Femenino">
                      <option value="deepgram-aura-2-celeste-es">Celeste — Colombia</option>
                      <option value="deepgram-aura-2-estrella-es">Estrella — México</option>
                      <option value="deepgram-aura-2-selena-es">Selena — Latinoamérica</option>
                      <option value="deepgram-aura-2-carina-es">Carina — España</option>
                      <option value="deepgram-aura-2-diana-es">Diana — España</option>
                      <option value="deepgram-aura-2-agustina-es">Agustina — España</option>
                      <option value="deepgram-aura-2-antonia-es">Antonia — Argentina</option>
                      <option value="deepgram-aura-2-gloria-es">Gloria — Colombia</option>
                      <option value="deepgram-aura-2-olivia-es">Olivia — México</option>
                      <option value="deepgram-aura-2-silvia-es">Silvia — España</option>
                    </optgroup>
                    <optgroup label="Aura 2 — Español Masculino">
                      <option value="deepgram-aura-2-nestor-es">Néstor — España</option>
                      <option value="deepgram-aura-2-sirio-es">Sirio — México</option>
                      <option value="deepgram-aura-2-alvaro-es">Álvaro — España</option>
                      <option value="deepgram-aura-2-aquila-es">Aquila — Latinoamérica</option>
                      <option value="deepgram-aura-2-javier-es">Javier — México</option>
                      <option value="deepgram-aura-2-luciano-es">Luciano — México</option>
                      <option value="deepgram-aura-2-valerio-es">Valerio — México</option>
                    </optgroup>
                    <optgroup label="Aura 2 — Inglés Femenino">
                      <option value="deepgram-aura-2-asteria-en">Asteria (EN)</option>
                      <option value="deepgram-aura-2-luna-en">Luna (EN)</option>
                      <option value="deepgram-aura-2-stella-en">Stella (EN)</option>
                      <option value="deepgram-aura-2-athena-en">Athena (EN)</option>
                      <option value="deepgram-aura-2-hera-en">Hera (EN)</option>
                    </optgroup>
                    <optgroup label="Aura 2 — Inglés Masculino">
                      <option value="deepgram-aura-2-orion-en">Orion (EN)</option>
                      <option value="deepgram-aura-2-arcas-en">Arcas (EN)</option>
                      <option value="deepgram-aura-2-perseus-en">Perseus (EN)</option>
                      <option value="deepgram-aura-2-angus-en">Angus (EN)</option>
                      <option value="deepgram-aura-2-orpheus-en">Orpheus (EN)</option>
                      <option value="deepgram-aura-2-helios-en">Helios (EN)</option>
                      <option value="deepgram-aura-2-zeus-en">Zeus (EN)</option>
                    </optgroup>
                    <optgroup label="Aura (Legacy) — Inglés Femenino">
                      <option value="deepgram-aura-asteria-en">Asteria (EN)</option>
                      <option value="deepgram-aura-luna-en">Luna (EN)</option>
                      <option value="deepgram-aura-stella-en">Stella (EN)</option>
                      <option value="deepgram-aura-athena-en">Athena (EN)</option>
                      <option value="deepgram-aura-hera-en">Hera (EN)</option>
                    </optgroup>
                    <optgroup label="Aura (Legacy) — Inglés Masculino">
                      <option value="deepgram-aura-orion-en">Orion (EN)</option>
                      <option value="deepgram-aura-arcas-en">Arcas (EN)</option>
                      <option value="deepgram-aura-perseus-en">Perseus (EN)</option>
                      <option value="deepgram-aura-angus-en">Angus (EN)</option>
                      <option value="deepgram-aura-orpheus-en">Orpheus (EN)</option>
                      <option value="deepgram-aura-helios-en">Helios (EN)</option>
                      <option value="deepgram-aura-zeus-en">Zeus (EN)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>LLM Model</label>
                  <select value={form.voice_ai_model} onChange={e => setField('voice_ai_model', e.target.value)}
                    className={inputClass} style={inputStyle}>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Idioma TTS</label>
                  <input value={form.tts_language} onChange={e => setField('tts_language', e.target.value)}
                    placeholder="en-US · es · es-419" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Idioma STT</label>
                  <input value={form.stt_language} onChange={e => setField('stt_language', e.target.value)}
                    placeholder="en-US · es · es-419" className={inputClass} style={inputStyle} />
                </div>
              </div>
            </motion.div>

            {/* 2. Comportamiento */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={sectionClass}>
              <h2 className={sectionTitle}>Comportamiento</h2>
              <div>
                <label className={labelClass}>Mensaje de bienvenida</label>
                <textarea value={form.greeting_message} onChange={e => setField('greeting_message', e.target.value)}
                  rows={3} placeholder="Hola, soy tu asistente. ¿En qué puedo ayudarte?"
                  className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass}>Frases de fin de llamada (Enter para agregar)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.end_call_phrases.map(phrase => (
                    <span key={phrase} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                      style={{ background: 'rgba(43,121,255,0.15)', color: '#2B79FF' }}>
                      {phrase}
                      <button type="button" onClick={() => removeTag(phrase)}
                        className="text-[#2B79FF]/60 hover:text-[#2B79FF]">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Ej: adiós, hasta luego..."
                  className={inputClass} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Duración máxima (seg)</label>
                  <input type="number" value={form.max_call_duration_seconds}
                    onChange={e => setField('max_call_duration_seconds', e.target.value)}
                    min={10} className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Silencio antes de colgar (seg)</label>
                  <input type="number" value={form.silence_timeout_seconds}
                    onChange={e => setField('silence_timeout_seconds', e.target.value)}
                    min={1} className={inputClass} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Número de transferencia</label>
                <input value={form.transfer_number} onChange={e => setField('transfer_number', e.target.value)}
                  placeholder="+1 555 000 0000" className={inputClass} style={inputStyle} />
              </div>
            </motion.div>

            {/* 3. Integración n8n */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className={sectionClass}>
              <h2 className={sectionTitle}>Integración n8n</h2>
              <div>
                <label className={labelClass}>Webhook URL de n8n</label>
                <input value={form.n8n_voice_webhook_url} onChange={e => setField('n8n_voice_webhook_url', e.target.value)}
                  placeholder="https://n8n.example.com/webhook/..." className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass}>Voice Tools (JSON array)</label>
                <textarea value={form.voice_tools} onChange={e => setField('voice_tools', e.target.value)}
                  rows={6}
                  placeholder={`[{"name": "example_tool", "description": "..."}]`}
                  className={`${inputClass} resize-none font-mono text-xs`} style={inputStyle} />
              </div>
            </motion.div>

            {/* 4. Conversación */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className={sectionClass}>
              <h2 className={sectionTitle}>Conversación</h2>
              <div>
                <label className={labelClass}>Modo de inicio</label>
                <select value={form.first_message_mode} onChange={e => setField('first_message_mode', e.target.value)}
                  className={inputClass} style={inputStyle}>
                  <option value="assistant-speaks-first">El agente habla primero (Inbound recomendado)</option>
                  <option value="assistant-waits-for-user">El agente espera al usuario (Outbound recomendado)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Pausa antes de hablar (seg)</label>
                  <input type="number" step="0.1" min="0" max="3"
                    value={form.wait_seconds_before_speaking}
                    onChange={e => setField('wait_seconds_before_speaking', e.target.value)}
                    className={inputClass} style={inputStyle} />
                  <p className="text-[10px] text-[#475569] mt-1">Silencio del usuario antes de que el agente responda. Default: 0.4s</p>
                </div>
                <div>
                  <label className={labelClass}>Palabras para interrumpir</label>
                  <input type="number" min="0" max="10"
                    value={form.interruption_num_words}
                    onChange={e => setField('interruption_num_words', e.target.value)}
                    className={inputClass} style={inputStyle} />
                  <p className="text-[10px] text-[#475569] mt-1">Palabras del usuario para detener al agente. 0 = interrumpir inmediatamente</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sonido de fondo</label>
                  <select value={form.background_sound} onChange={e => setField('background_sound', e.target.value)}
                    className={inputClass} style={inputStyle}>
                    <option value="off">Sin sonido</option>
                    <option value="office">Oficina (PSTN/teléfono)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.background_denoising_enabled}
                      onChange={e => setForm(f => ({ ...f, background_denoising_enabled: e.target.checked }))}
                      className="w-4 h-4 rounded accent-[#2B79FF]" />
                    <div>
                      <span className="text-xs text-[#94A3B8] font-medium">Filtrado de ruido</span>
                      <p className="text-[10px] text-[#475569]">Elimina ruido de fondo del usuario</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.voicemail_detection_enabled}
                      onChange={e => setForm(f => ({ ...f, voicemail_detection_enabled: e.target.checked }))}
                      className="w-4 h-4 rounded accent-[#2B79FF]" />
                    <div>
                      <span className="text-xs text-[#94A3B8] font-medium">Detectar buzón de voz</span>
                      <p className="text-[10px] text-[#475569]">Útil para llamadas salientes</p>
                    </div>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* 5. Análisis post-llamada */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className={sectionClass}>
              <h2 className={sectionTitle}>Análisis Post-Llamada</h2>
              <p className="text-[10px] text-[#64748B] -mt-2 mb-2">El LLM analiza el transcript al finalizar cada llamada. Deja vacío para desactivar.</p>
              <div>
                <label className={labelClass}>Prompt de resumen</label>
                <textarea value={form.analysis_summary_prompt}
                  onChange={e => setField('analysis_summary_prompt', e.target.value)}
                  rows={3} placeholder="Ej: Resume en 2-3 oraciones de qué trató esta llamada y cuál fue el resultado."
                  className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass}>Prompt de evaluación de éxito</label>
                <textarea value={form.analysis_success_prompt}
                  onChange={e => setField('analysis_success_prompt', e.target.value)}
                  rows={2} placeholder="Ej: ¿Agendó el usuario una cita? Responde solo 'sí' o 'no'."
                  className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass}>Schema de datos estructurados (JSON Schema opcional)</label>
                <textarea value={form.analysis_structured_schema}
                  onChange={e => setField('analysis_structured_schema', e.target.value)}
                  rows={4} placeholder={`{\n  "nombre": "string",\n  "interes": "string",\n  "cita_agendada": "boolean"\n}`}
                  className={`${inputClass} resize-none font-mono text-xs`} style={inputStyle} />
              </div>
            </motion.div>

            {/* 6. Avanzado */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className={sectionClass}>
              <h2 className={sectionTitle}>Avanzado</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>LiveKit Room Prefix</label>
                  <input value={form.livekit_room_prefix} onChange={e => setField('livekit_room_prefix', e.target.value)}
                    placeholder="voice-" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Voice Max Tokens</label>
                  <input type="number" value={form.voice_max_tokens}
                    onChange={e => setField('voice_max_tokens', e.target.value)}
                    min={64} className={inputClass} style={inputStyle} />
                </div>
              </div>
            </motion.div>

            {/* Save feedback */}
            {saveStatus === 'success' && (
              <div className="px-4 py-3 rounded-lg text-xs text-[#10B981]"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                Configuración guardada
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="px-4 py-3 rounded-lg text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {saveError}
              </div>
            )}

            <motion.button type="submit" disabled={saving}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#2B79FF', boxShadow: '0 0 15px rgba(43,121,255,0.35)' }}>
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  )
}
