# NutriCase — Guia de Deploy

## Status atual

- ✅ Supabase: projeto **NutriCase v2** (`nxvbrqjrcsvzbfyiopgi`) configurado e ativo
- ✅ Banco de dados: schema real, coluna `ativo` adicionada
- ✅ Caso clínico v5.0 inserido (Lucas — DM2 fácil, ID: `d9e122fa`)
- ✅ Usuário admin: `dennisananias@hotmail.com`
- ✅ Build de produção gerado (`dist/`)
- ⏳ Netlify: publicação pendente (escolha uma das opções abaixo)

---

## Variáveis de Ambiente Necessárias

Configure no painel do Netlify → Site settings → Environment variables:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://nxvbrqjrcsvzbfyiopgi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dmJycWpyY3N2emJmeWlvcGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzQzMzQsImV4cCI6MjA5NDUxMDMzNH0.DyXZ1zg6ELu2O_QMfWed07MXd7mdZIgN93q0JomgE8A` |
| `ANTHROPIC_API_KEY` | *(sua chave — https://console.anthropic.com/settings/keys)* |

---

## Opção 1 — Netlify CLI (recomendado)

```bash
# Instalar CLI
npm install -g netlify-cli

# Na pasta do projeto
cd nutricase-web

# Login (abre navegador)
netlify login

# Adicionar variáveis
netlify env:set VITE_SUPABASE_URL "https://nxvbrqjrcsvzbfyiopgi.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
netlify env:set ANTHROPIC_API_KEY "sk-ant-..."

# Build e deploy
npm run build
netlify deploy --prod --dir=dist
```

---

## Opção 2 — GitHub + Netlify (melhor para longo prazo)

1. Suba o projeto para o GitHub:
```bash
cd nutricase-web
git init && git add . && git commit -m "feat: NutriCase v1.0"
git remote add origin https://github.com/SEU_USUARIO/nutricase.git
git push -u origin main
```

2. Em app.netlify.com → **Add new site → Import from GitHub**

3. Configurações de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

4. Adicione as 3 variáveis de ambiente e clique **Deploy site**

---

## Opção 3 — Drag & Drop (apenas frontend, sem Functions)

> ⚠️ Esta opção NÃO faz deploy das Netlify Functions (chat IA e avaliação não funcionarão).

1. Acesse app.netlify.com → **Add new site → Deploy manually**
2. Arraste a pasta `nutricase-web/dist/` para a área indicada
3. Use as Opções 1 ou 2 para adicionar as Functions depois

---

## Após o Deploy

1. Acesse o URL gerado (ex: `https://nutricase-abc123.netlify.app`)
2. Faça login com `dennisananias@hotmail.com`
3. Painel Admin → confirme que o caso Lucas Henrique Martins aparece
4. Inicie uma consulta e teste o chat com o paciente
5. Submeta uma conduta e verifique a avaliação automática

---

## Políticas RLS no Supabase (antes de ir a produção)

```sql
ALTER TABLE case_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sessions" ON case_sessions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_authenticated" ON cases
  FOR SELECT USING (auth.role() = 'authenticated' AND ativo = true);
```
