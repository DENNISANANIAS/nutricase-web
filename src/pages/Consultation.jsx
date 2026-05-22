import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { extractUnlockedData, mergeUnlocked, getInitialUnlocked } from '../lib/triggers'
import { Send, Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react'

/* ── DataPanel ─────────────────────────────────────────────────── */
function DataPanel({ unlockedData, caseData }) {
  if (!caseData) return null
  const sections = {
    anamnese_clinica:'Anamnese', avaliacao_clinica:'Avaliação Clínica',
    habitos_vida:'Hábitos de Vida', habitos_alimentares:'Hábitos Alimentares',
    sintomas_rastreamento:'Rastreamento', antropometria:'Antropometria',
    necessidades_energeticas:'Necessidades Energéticas',
  }
  const examKeys  = Object.keys(caseData.exames_bioquimicos || {})
  const allKeys   = [...Object.keys(sections), ...examKeys]
  const unlockedN = allKeys.filter(k => unlockedData[k]).length

  const renderVal = (v) => {
    if (typeof v === 'object' && v !== null && v.valor !== undefined) return (
      <span>
        <strong>{v.valor}</strong>
        <span className="text-slate-400 ml-1 text-xs">({v.referencia})</span>
        <span className={`ml-1 text-xs font-medium ${v.interpretacao?.toLowerCase().includes('normal') ? 'text-green-600' : 'text-amber-600'}`}> — {v.interpretacao}</span>
      </span>
    )
    return null
  }

  const renderData = (data, d = 0) => {
    if (!data || typeof data !== 'object') return null
    return Object.entries(data).map(([k, v]) => {
      if (['gatilho_fino','gatilho_subgrupo','gatilho_grupo','liberacao','gatilho'].includes(k)) return null
      const rv = renderVal(v)
      if (rv) return <div key={k} className="text-xs mb-0.5"><span className="text-slate-400">{k.replace(/_/g,' ')}: </span>{rv}</div>
      if (typeof v === 'object' && !Array.isArray(v) && v !== null) return (
        <div key={k} className={`${d>0?'ml-2 border-l border-slate-100 pl-2':''} mb-1`}>
          <p className="text-xs font-medium text-slate-500 capitalize mb-0.5">{k.replace(/_/g,' ')}</p>
          {renderData(v, d+1)}
        </div>
      )
      if (Array.isArray(v)) return <div key={k} className="text-xs mb-0.5"><span className="text-slate-400">{k.replace(/_/g,' ')}: </span><span className="text-slate-700">{v.join(', ')}</span></div>
      return <div key={k} className="text-xs mb-0.5"><span className="text-slate-400">{k.replace(/_/g,' ')}: </span><span className="text-slate-700">{String(v)}</span></div>
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Dados do Paciente</h2>
          <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{unlockedN}/{allKeys.length} desbloqueados</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Solicite informações para revelar</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {allKeys.map(key => {
          const data = unlockedData[key]
          const label = sections[key] || key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())
          return (
            <div key={key} className={`rounded-lg border text-sm ${data ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                {data ? <Unlock size={13} className="text-brand-600 flex-shrink-0" /> : <Lock size={13} className="text-slate-300 flex-shrink-0" />}
                <span className={`font-medium text-xs ${data ? 'text-brand-700' : 'text-slate-400'}`}>{label}</span>
              </div>
              {data && <div className="px-3 pb-2 border-t border-brand-100 pt-2">{renderData(data)}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── ConductForm ───────────────────────────────────────────────── */
function ConductForm({ onSubmit, loading }) {
  const [text, setText] = useState('')
  return (
    <div className="p-4 border-t border-slate-200 bg-amber-50 flex-shrink-0">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Encerrar consulta</p>
          <p className="text-xs text-amber-600">Escreva sua conduta nutricional completa. O sistema avaliará automaticamente.</p>
        </div>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
        className="input-field text-sm font-mono resize-none"
        placeholder={`Descreva sua conduta nutricional:\n\n1. Diagnóstico nutricional (SOAP/PES)\n2. Metas calóricas e macros\n3. Orientações alimentares\n4. Suplementação\n5. Atividade física\n6. Monitoramento e retorno`} />
      <button onClick={() => onSubmit(text)} disabled={!text.trim() || loading}
        className="btn-primary w-full mt-2 flex items-center justify-center gap-2 text-sm">
        <CheckCircle size={15} />
        {loading ? 'Avaliando conduta...' : 'Enviar para avaliação'}
      </button>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function Consultation() {
  const { sessionId }             = useParams()
  const { user }                  = useAuth()
  const navigate                  = useNavigate()
  const [session,    setSession]  = useState(null)
  const [caseData,   setCaseData] = useState(null)
  const [messages,   setMessages] = useState([])
  const [input,      setInput]    = useState('')
  const [sending,    setSending]  = useState(false)
  const [conducting, setConducting] = useState(false)
  const [showConduct,setShowConduct] = useState(false)
  const [unlocked,   setUnlocked] = useState({})
  const [loading,    setLoading]  = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase
        .from('case_sessions')
        .select('*, cases(payload, titulo)')
        .eq('id', sessionId)
        .single()

      if (!sess || sess.user_id !== user.id) { navigate('/dashboard'); return }
      if (sess.status === 'evaluated') { navigate(`/results/${sessionId}`); return }

      const parsed = sess.cases?.payload
      setSession(sess)
      setCaseData(parsed)

      const savedMsgs = sess.chat_log || []
      setMessages(savedMsgs)

      if (parsed) {
        let acc = getInitialUnlocked(parsed)
        for (const msg of savedMsgs) {
          if (msg.role === 'user') acc = mergeUnlocked(acc, extractUnlockedData(msg.content, parsed))
        }
        setUnlocked(acc)

        if (savedMsgs.length === 0) {
          const a = parsed.ficha_paciente?.anamnese_clinica?.dados
          const p = parsed.persona
          const opening = `Olá! Pode entrar. Eu sou ${a?.nome?.split(' ')[0] || p?.nome}, ${a?.idade} anos. ${p?.queixas_espontaneas_autorizadas?.[0] || 'O médico me encaminhou aqui.'}`
          const initMsgs = [{ role: 'assistant', content: opening }]
          setMessages(initMsgs)
          await supabase.from('case_sessions').update({ chat_log: initMsgs }).eq('id', sessionId)
        }
      }
      setLoading(false)
    }
    load()
  }, [sessionId, user.id, navigate])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending || !caseData) return
    const userMsg  = { role: 'user', content: input.trim() }
    const nextMsgs = [...messages, userMsg]
    setMessages(nextMsgs)
    setInput('')
    setSending(true)

    setUnlocked(prev => mergeUnlocked(prev, extractUnlockedData(input, caseData)))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMsgs, caseData })
      })
      const { content, error } = await res.json()
      if (error) throw new Error(error)
      const finalMsgs = [...nextMsgs, { role: 'assistant', content }]
      setMessages(finalMsgs)
      await supabase.from('case_sessions').update({ chat_log: finalMsgs }).eq('id', sessionId)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao conectar. Tente novamente.' }])
    }
    setSending(false)
  }, [input, sending, caseData, messages, sessionId])

  async function handleSubmitConduct(conductText) {
    if (!conductText.trim()) return
    setConducting(true)
    try {
      await supabase.from('case_sessions').update({
        conduta_submetida: { texto: conductText },
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }).eq('id', sessionId)

      const res = await fetch('/api/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conduct: conductText, messages, caseData })
      })
      const evaluation = await res.json()

      await supabase.from('evaluations').insert({
        session_id:              sessionId,
        user_id:                 user.id,
        pontuacao_total:         evaluation.score_total,
        pontuacao_por_bloco:     evaluation.scores,
        criterios_avaliados:     evaluation.feedback,
        penalidades_aplicadas:   evaluation.omissoes,
        criterios_negligenciados: evaluation.omissoes?.filter(o => o.missed) || [],
        feedback_geral:          evaluation.feedback_geral || ''
      })

      await supabase.from('case_sessions').update({
        status: 'evaluated',
        finished_at: new Date().toISOString()
      }).eq('id', sessionId)

      // Update user stats
      await supabase.rpc('increment_cases_completed', { uid: user.id })
        .catch(() => {}) // ignore if function doesn't exist

      navigate(`/results/${sessionId}`)
    } catch (err) {
      console.error(err)
      alert('Erro ao avaliar. Tente novamente.')
    }
    setConducting(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  const meta    = caseData?.meta
  const persona = caseData?.persona

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Chat */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">{session?.cases?.titulo || 'Consulta'}</h1>
            {meta && <p className="text-xs text-slate-400 mt-0.5 capitalize">{meta.categoria} · {meta.dificuldade} · {meta.sexo}</p>}
          </div>
          <button onClick={() => setShowConduct(v => !v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${showConduct ? 'bg-amber-100 border-amber-300 text-amber-700' : 'btn-secondary'}`}>
            {showConduct ? 'Cancelar' : 'Encerrar consulta'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                  {persona?.nome?.[0] || '?'}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
              }`}>{msg.content}</div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center mr-2 flex-shrink-0">
                {persona?.nome?.[0] || '?'}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  {[0,1,2].map(n => <span key={n} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay:`${n*0.15}s`}} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {showConduct ? (
          <ConductForm onSubmit={handleSubmitConduct} loading={conducting} />
        ) : (
          <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Faça uma pergunta ao paciente..." className="input-field flex-1 text-sm" disabled={sending} />
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                className="btn-primary px-3 aspect-square flex items-center justify-center">
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 px-1">
              💡 Solicite exames pelo nome para desbloqueá-los. Ex: "Quero ver o hemograma" · "Pedir HbA1c"
            </p>
          </div>
        )}
      </div>

      {/* Data Panel */}
      <div className="w-80 flex-shrink-0 overflow-hidden bg-white hidden lg:flex flex-col">
        <DataPanel unlockedData={unlocked} caseData={caseData} />
      </div>
    </div>
  )
}
