import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Trash2, Eye, EyeOff, CheckCircle, AlertCircle, FileJson } from 'lucide-react'

export default function Admin() {
  const [cases,     setCases]     = useState([])
  const [categories,setCategories]= useState([])
  const [difficulty,setDifficulty]= useState([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [results,   setResults]   = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: cat }, { data: dif }] = await Promise.all([
        supabase.from('cases').select('id,titulo,schema_version,ativo,revisado,criado_em,categories(nome,slug),difficulty_levels(nome)').order('criado_em', { ascending: false }),
        supabase.from('categories').select('id,nome,slug').order('nome'),
        supabase.from('difficulty_levels').select('id,nome').order('ordem'),
      ])
      setCases(c || [])
      setCategories(cat || [])
      setDifficulty(dif || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true); setResults(null)

    const res = []
    for (const file of files) {
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        if (!json.meta || !json.ficha_paciente) {
          res.push({ file: file.name, ok: false, msg: 'JSON inválido: falta meta ou ficha_paciente' }); continue
        }
        const m = json.meta
        // Resolve categoria
        const cat = categories.find(c => c.slug === m.categoria || c.nome.toLowerCase() === m.categoria?.toLowerCase())
        const dif = difficulty.find(d => d.nome === m.dificuldade)
        if (!cat) { res.push({ file: file.name, ok: false, msg: `Categoria "${m.categoria}" não encontrada.` }); continue }
        if (!dif) { res.push({ file: file.name, ok: false, msg: `Dificuldade "${m.dificuldade}" não encontrada.` }); continue }

        const nome = json.ficha_paciente?.anamnese_clinica?.dados?.nome || m.id
        const titulo = `${nome} — ${m.subcategoria?.replace(/_/g,' ') || m.categoria} (${m.dificuldade === 'facil' ? 'Fácil' : m.dificuldade === 'intermediario' ? 'Intermediário' : 'Difícil'})`

        const { error } = await supabase.from('cases').upsert({
          titulo, schema_version: m.schema_version || 'v5.0',
          categoria_id: cat.id, dificuldade_id: dif.id,
          revisado: true, ativo: true,
          tempo_estimado_minutos: m.tempo_estimado_minutos || 25,
          payload: json
        }, { onConflict: 'titulo' })

        if (error) res.push({ file: file.name, ok: false, msg: error.message })
        else       res.push({ file: file.name, ok: true,  msg: `"${titulo}" salvo com sucesso.` })
      } catch (err) {
        res.push({ file: file.name, ok: false, msg: `Erro: ${err.message}` })
      }
    }
    setResults(res)
    setUploading(false)
    const { data } = await supabase.from('cases').select('id,titulo,schema_version,ativo,revisado,criado_em,categories(nome,slug),difficulty_levels(nome)').order('criado_em', { ascending: false })
    setCases(data || [])
    e.target.value = ''
  }

  async function toggleAtivo(id, current) {
    await supabase.from('cases').update({ ativo: !current }).eq('id', id)
    setCases(c => c.map(x => x.id === id ? { ...x, ativo: !current } : x))
  }

  async function deleteCase(id) {
    if (!confirm('Excluir este caso? Isso removerá também todas as sessões associadas.')) return
    await supabase.from('cases').delete().eq('id', id)
    setCases(c => c.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Painel Admin</h1>
        <p className="text-slate-500 mt-1">Gerencie os casos clínicos NutriCase v5.0.</p>
      </div>

      {/* Upload */}
      <div className="card p-6 mb-8">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Upload size={16} /> Upload de Casos (JSON v5.0)
        </h2>
        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-brand-300 rounded-xl p-8 bg-brand-50 cursor-pointer hover:bg-brand-100 transition-colors">
          <FileJson size={32} className="text-brand-400 mb-2" />
          <p className="text-sm font-medium text-brand-700">Clique ou arraste arquivos .json</p>
          <p className="text-xs text-brand-400 mt-1">Múltiplos arquivos · Schema NutriCase v5.0</p>
          <input type="file" accept=".json" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {uploading && <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />Processando...</div>}
        {results && (
          <div className="mt-4 space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${r.ok?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
                {r.ok ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
                <div><span className="font-medium">{r.file}</span><span className="mx-2">—</span>{r.msg}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">Casos cadastrados ({cases.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin mx-auto" /></div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum caso. Faça upload acima.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2 font-medium">Caso</th>
                  <th className="text-left px-4 py-2 font-medium">Categoria</th>
                  <th className="text-left px-4 py-2 font-medium">Dificuldade</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-xs">{c.titulo}</p>
                      <p className="text-slate-400 text-xs">{c.schema_version}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs capitalize">{c.categories?.nome || '—'}</td>
                    <td className="px-4 py-3 text-xs capitalize">{c.difficulty_levels?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.ativo?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleAtivo(c.id, c.ativo)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          title={c.ativo ? 'Desativar' : 'Ativar'}>
                          {c.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => deleteCase(c.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                          title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
