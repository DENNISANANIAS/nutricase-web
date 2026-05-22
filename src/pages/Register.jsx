import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm]     = useState({ nome: '', email: '', password: '', confirm: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp }          = useAuth()
  const navigate            = useNavigate()

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) return setError('As senhas não coincidem.')
    if (form.password.length < 6) return setError('Senha deve ter no mínimo 6 caracteres.')
    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.nome)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🥗</span>
          <h1 className="text-2xl font-bold text-brand-700 mt-2">NutriCase</h1>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Criar conta</h2>
          <p className="text-slate-500 text-sm mb-5">
            Já tem conta? <Link to="/login" className="text-brand-600 hover:underline font-medium">Entrar</Link>
          </p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'nome',     label: 'Nome completo', type: 'text',     placeholder: 'Dr(a). Seu Nome' },
              { name: 'email',    label: 'E-mail',        type: 'email',    placeholder: 'seu@email.com' },
              { name: 'password', label: 'Senha',         type: 'password', placeholder: '••••••••' },
              { name: 'confirm',  label: 'Confirmar senha',type:'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input type={f.type} name={f.name} required value={form[f.name]}
                  onChange={handleChange} className="input-field" placeholder={f.placeholder} />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
