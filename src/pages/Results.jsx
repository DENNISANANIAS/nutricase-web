import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Trophy, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Home } from 'lucide-react'

const BLOCKS = {
  coleta_dados:  { label: 'Coleta de Dados',       color: 'blue',   max: 20 },
  interpretacao: { label: 'Interpretação Clínica',  color: 'purple', max: 30 },
  conduta:       { label: 'Conduta Nutricional',    color: 'green',  max: 30 },
  priorizacao:   { label: 'Priorização',            color: 'orange', max: 10 },
  refinamento:   { label: 'Refinamento',            color: 'teal',   max: 10 },
}
const COLORS = {
  blue:   { bar:'bg-blue-500',   bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200' },
  purple: { bar:'bg-purple-500', bg:'bg-purple-50', text:'text-purple-700', border:'border-purple-200' },
  green:  { bar:'bg-green-500',  bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200' },
  orange: { bar:'bg-orange-500', bg:'bg-orange-50', text:'text-orange-700', border:'border-orange-200' },
  teal:   { bar:'bg-teal-500',   bg:'bg-teal-50',   text:'text-teal-700',   border:'border-teal-200' },
}

function ScoreCircle({ score }) {
  const pct   = Math.min(100, Math.max(0, score))
  const color = pct >= 85 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
  const r = 54, circ = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ - (pct/100)*circ}
          strokeLinecap="round" transform="rotate(-90 70 70)" />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-slate-400 text-xs">/ 100 pts</p>
      </div>
    </div>
  )
}

function BlockCard({ blockKey, score, feedback, max }) {
  const [open, setOpen] = useState(false)
  const meta = BLOCKS[blockKey]; const clrs = COLORS[meta?.color || 'blue']
  const pct  = Math.round((score / max) * 100)
  return (
    <div className={`card border ${clrs.border} overflow-hidden`}>
      <button onClick={() => setOpen(v => !v)} className={`w-full flex items-center justify-between px-4 py-3 ${clrs.bg} text-left`}>
        <div>
          <p className={`font-semibold text-sm ${clrs.text}`}>{meta?.label || blockKey}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full ${clrs.bar} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500">{score}/{max} pts</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${clrs.text}`}>{pct}%</span>
          {open ? <ChevronUp size={16} className={clrs.text} /> : <ChevronDown size={16} className={clrs.text} />}
        </div>
      </button>
      {open && feedback && (
        <div className="px-4 py-3 text-sm text-slate-700 space-y-2 border-t border-slate-100">
          {Array.isArray(feedback)
            ? feedback.map((f, i) => (
                <div key={i} className="flex gap-2">
                  {f.ok ? <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                        : <XCircle    size={14} className="text-red-400 flex-shrink-0 mt-0.5" />}
                  <p>{f.text}</p>
                </div>
              ))
            : <p>{typeof feedback === 'string' ? feedback : JSON.stringify(feedback)}</p>
          }
        </div>
      )}
    </div>
  )
}

export default function Results() {
  const { sessionId } = useParams()
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase
        .from('case_sessions')
        .select('*, cases(titulo), evaluations(*)')
        .eq('id', sessionId)
        .single()
      if (!sess || sess.user_id !== user.id) { navigate('/dashboard'); return }
      setData(sess)
      // Mark as viewed
      if (sess.evaluations?.[0]?.id) {
        await supabase.from('evaluations').update({ visualizado: true }).eq('id', sess.evaluations[0].id)
      }
      setLoading(false)
    }
    load()
  }, [sessionId, user.id, navigate])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  const ev      = data?.evaluations?.[0]
  if (!ev) return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center text-slate-400">
      <p>Nenhuma avaliação encontrada.</p>
      <Link to="/dashboard" className="text-brand-600 hover:underline mt-2 inline-block">Voltar</Link>
    </div>
  )

  const total     = Number(ev.pontuacao_total) || 0
  const scores    = ev.pontuacao_por_bloco    || {}
  const feedback  = ev.criterios_avaliados    || {}
  const omissoes  = ev.penalidades_aplicadas  || []
  const isApproved  = total >= 60
  const isExcellent = total >= 85
  const conduct   = data?.conduta_submetida?.texto || ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Score card */}
      <div className="card p-6 mb-6 text-center">
        <div className="flex justify-center mb-4">
          {isExcellent ? <Trophy size={40} className="text-yellow-500" />
            : isApproved ? <CheckCircle size={40} className="text-green-500" />
            : <AlertTriangle size={40} className="text-red-500" />}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">
          {isExcellent ? 'Excelente conduta!' : isApproved ? 'Aprovado!' : 'Precisa melhorar'}
        </h1>
        <p className="text-slate-500 text-sm mb-5">{data?.cases?.titulo}</p>
        <ScoreCircle score={total} />
        <p className={`mt-3 text-sm font-medium ${isExcellent?'text-green-600':isApproved?'text-yellow-600':'text-red-600'}`}>
          {isExcellent ? 'Excelência (≥85 pts)' : isApproved ? 'Aprovado (≥60 pts)' : 'Reprovado (<60 pts)'}
        </p>
        {ev.feedback_geral && <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto">{ev.feedback_geral}</p>}
      </div>

      {/* Blocks */}
      <h2 className="text-base font-semibold text-slate-700 mb-3">Desempenho por bloco</h2>
      <div className="space-y-3 mb-6">
        {Object.entries(BLOCKS).map(([key, meta]) => (
          <BlockCard key={key} blockKey={key} score={scores[key] || 0} max={meta.max} feedback={feedback[key]} />
        ))}
      </div>

      {/* Omissões críticas */}
      {omissoes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Omissões críticas
          </h2>
          <div className="space-y-2">
            {omissoes.map((o, i) => (
              <div key={i} className={`card p-4 border ${o.missed?'border-red-200 bg-red-50':'border-green-200 bg-green-50'}`}>
                <div className="flex items-start gap-2">
                  {o.missed ? <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                            : <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-sm font-medium ${o.missed?'text-red-700':'text-green-700'}`}>
                      {o.missed ? `Omitido: ${o.descricao}` : `Contemplado: ${o.descricao}`}
                    </p>
                    {o.missed && o.feedback && <p className="text-xs text-red-600 mt-1">{o.feedback} (−{o.penalidade} pts)</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conduta enviada */}
      {conduct && (
        <div className="card p-4 mb-6 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-600 mb-2">Sua conduta enviada</h2>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">{conduct}</pre>
        </div>
      )}

      <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2 text-sm">
        <Home size={14} /> Voltar ao início
      </Link>
    </div>
  )
}
