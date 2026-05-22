import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-brand-700 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="text-5xl mb-4">🥗</div>
          <h1 className="text-3xl font-bold mb-3">NutriCase</h1>
          <p className="text-brand-100 text-lg leading-relaxed">
            Plataforma de simulação clínica para nutricionistas. Pratique consultas com pacientes virtuais e receba avaliação automática da sua conduta nutricional.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {['Casos Clínicos Reais', 'IA como Paciente', 'Feedback Detalhado'].map(t => (
              <div key={t} className="bg-brand-600 rounded-lg p-3">
                <p className="text-sm text-brand-100">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <span className="text-4xl">🥗</span>
            <h1 className="text-2xl font-bold text-brand-700 mt-2">NutriCase</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Entrar</h2>
          <p className="text-slate-500 text-sm mb-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-brand-600 hover:underline font-medium">Cadastre-se</Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
