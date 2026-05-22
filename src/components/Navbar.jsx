import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard, Shield } from 'lucide-react'

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          <span className="text-2xl">🥗</span>
          NutriCase
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
            <LayoutDashboard size={15} />
            Casos
          </Link>

          {isAdmin && (
            <Link to="/admin"
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
              <Shield size={15} />
              Admin
            </Link>
          )}

          <div className="flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
            <span className="text-sm text-slate-500 hidden sm:block">
              {profile?.full_name || user?.email}
            </span>
            <button onClick={handleSignOut}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut size={15} />
              <span className="hidden sm:block">Sair</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
