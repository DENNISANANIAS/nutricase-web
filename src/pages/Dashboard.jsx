import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Clock, Star, Play } from 'lucide-react'

const DIFF_BADGE = {
  facil:         'badge-easy',
  intermediario: 'badge-medium',
  dificil:       'badge-hard',
}
const DIFF_LABEL = { facil: 'Fácil', intermediario: 'Intermediário', dificil: 'Difícil' }
const CAT_EMOJI  = {
  metabolico:'🩸', esportivo:'🏋️', cardiovascular:'❤️', renal:'🫘',
  hormonal:'⚗️', oncologico:'🎗️', vegetariano:'🥦', geriatrico:'👴',
  pediatrico:'👶', gestante:'🤰', diabetes:'💉', geral:'📋',
}

export default function Dashboard() {
  const [cases,    setCases]    = useState([])
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [{ data: casesData }, { data: sessionsData }] = await Promise.all([
        supabase
          .from('cases')
          .select('id, titulo, schema_version, ativo, revisado, tempo_estimado_minutos, categories(nome, slug), difficulty_levels(nome)')
          .eq('ativo', true)
          .order('criado_em', { ascending: false }),
        supabase
          .from('case_sessions')
          .select('id, case_id, status, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
      ])
      setCases(casesData || [])
      setSessions(sessionsData || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  async function startSession(caseId) {
    const existing = sessions.find(s => s.case_id === caseId && s.status === 'in_progress')
    if (existing) return navigate(`/consultation/${existing.id}`)

    const { data, error } = await supabase
      .from('case_sessions')
      .insert({ user_id: user.id, case_id: caseId, status: 'in_progress', chat_log: [], blocos_liberados: [] })
      .select().single()

    if (!error) navigate(`/consultation/${data.id}`)
  }

  const getSession = (caseId) => sessions.find(s => s.case_id === caseId)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  const done      = sessions.filter(s => s.status === 'evaluated').length
  const inProgress= sessions.filter(s => s.status === 'in_progress').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Casos Clínicos</h1>
        <p className="text-slate-500 mt-1">Selecione um caso para iniciar a consulta simulada com o paciente IA.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Disponíveis', value: cases.length, icon: BookOpen },
          { label: 'Concluídos',  value: done,         icon: Star },
          { label: 'Em andamento',value: inProgress,   icon: Clock },
          { label: 'Total feitos',value: sessions.length, icon: Play },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <s.icon size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cases grid */}
      {cases.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum caso disponível.</p>
          <p className="text-sm mt-1">O admin precisa ativar casos no painel.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map(c => {
            const slug    = c.categories?.slug || 'geral'
            const dif     = c.difficulty_levels?.nome || 'facil'
            const emoji   = CAT_EMOJI[slug] || '📋'
            const sess    = getSession(c.id)
            const status  = sess?.status

            return (
              <div key={c.id} className="card p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{emoji}</span>
                  <span className={DIFF_BADGE[dif] || 'badge-easy'}>{DIFF_LABEL[dif] || dif}</span>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1">{c.titulo}</h3>
                <p className="text-xs text-slate-400 capitalize mb-3">
                  {c.categories?.nome || slug} · v{c.schema_version}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <Clock size={12} />
                  <span>{c.tempo_estimado_minutos || 25} min estimados</span>
                </div>
                <div className="mt-auto">
                  {status === 'evaluated' ? (
                    <button onClick={() => navigate(`/results/${sess.id}`)}
                      className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                      <Star size={14} /> Ver resultado
                    </button>
                  ) : (
                    <button onClick={() => startSession(c.id)}
                      className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                      <Play size={14} />
                      {status === 'in_progress' ? 'Continuar consulta' : 'Iniciar consulta'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
