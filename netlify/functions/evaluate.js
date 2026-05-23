import Anthropic from '@anthropic-ai/sdk'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { conduct, messages, caseData } = await req.json()
    if (!conduct || !caseData) {
      return Response.json({ error: 'Missing conduct or caseData' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const conversationText = messages
      .filter(m => m.role === 'user')
      .map(m => `NUTRICIONISTA: ${m.content}`)
      .join('\n')

    const avaliacao   = caseData.avaliacao || {}
    const omissoes    = caseData.omissoes_criticas || []
    const condutas    = caseData.condutas_e_orientacoes || []
    const fichaResp   = caseData.ficha_resposta || {}

    const systemPrompt = `Você é um avaliador expert em nutrição clínica. Sua função é avaliar a conduta nutricional de um estudante/profissional com base em critérios objetivos definidos no gabarito do caso clínico.

Retorne EXCLUSIVAMENTE um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{
  "score_total": <número inteiro 0-100>,
  "scores": {
    "coleta_dados": <0-20>,
    "interpretacao": <0-30>,
    "conduta": <0-30>,
    "priorizacao": <0-10>,
    "refinamento": <0-10>
  },
  "feedback": {
    "coleta_dados":  [{"ok": true/false, "text": "..."}],
    "interpretacao": [{"ok": true/false, "text": "..."}],
    "conduta":       [{"ok": true/false, "text": "..."}],
    "priorizacao":   [{"ok": true/false, "text": "..."}],
    "refinamento":   [{"ok": true/false, "text": "..."}]
  },
  "omissoes": [
    {"id": "OC1", "descricao": "...", "missed": true/false, "feedback": "...", "penalidade": 5}
  ]
}`

    const userPrompt = `## CASO CLÍNICO
Categoria: ${caseData.meta?.categoria || 'N/A'}
Diagnóstico: ${caseData.ficha_paciente?.anamnese_clinica?.dados?.diagnostico_principal || 'N/A'}
Dificuldade: ${caseData.meta?.dificuldade || 'N/A'}

## GABARITO RESUMIDO (ficha_resposta)
SOAP:
- S: ${fichaResp.soap?.S_subjetivo || 'N/A'}
- O: ${fichaResp.soap?.O_objetivo || 'N/A'}
- A: ${fichaResp.soap?.A_avaliacao || 'N/A'}
- P: ${fichaResp.soap?.P_plano || 'N/A'}

PES: ${fichaResp.pes?.diagnostico_nutricional_completo || 'N/A'}

Metas calóricas: ${JSON.stringify(fichaResp.metas_nutricionais?.calorico || {})}
Metas proteína: ${JSON.stringify(fichaResp.metas_nutricionais?.proteina || {})}
Metas CHO: ${JSON.stringify(fichaResp.metas_nutricionais?.cho || {})}
Metas lipídios: ${JSON.stringify(fichaResp.metas_nutricionais?.lipidios || {})}
Fibras meta: ${fichaResp.metas_nutricionais?.fibras?.meta_g_dia || 'N/A'}g/dia

Micronutrientes chave: ${(fichaResp.micronutrientes_chave || []).map(m => `${m.nutriente}: ${m.status} — conduta: ${m.conduta}`).join(' | ')}

Metas comportamentais: ${(fichaResp.metas_comportamentais || []).join(' | ')}
Monitoramento: ${(fichaResp.monitoramento?.indicadores_avaliacao || []).join(', ')}

## CRITÉRIOS DE AVALIAÇÃO
${JSON.stringify(avaliacao.blocos || {}, null, 2)}

## OMISSÕES CRÍTICAS A VERIFICAR
${omissoes.map(o => `ID ${o.id}: "${o.descricao}" | Gatilhos esperados: ${o.gatilhos_esperados?.join(', ')} | Penalidade: ${o.penalidade_pontos} pts | Feedback: ${o.feedback_quando_omitido}`).join('\n')}

## CONDUTAS ESPERADAS
${condutas.map(c => `Tema: ${c.tema}\nFeedback positivo: ${c.feedback_positivo_template}\nFeedback negativo: ${c.feedback_negativo_template}`).join('\n---\n')}

## O QUE O NUTRICIONISTA PERGUNTOU NA CONSULTA
${conversationText || '(sem perguntas registradas)'}

## CONDUTA ENVIADA PELO NUTRICIONISTA
${conduct}

---
Avalie a conduta acima considerando todos os critérios. Para cada bloco, some os pontos dos critérios contemplados. Aplique penalidades das omissões críticas não abordadas.
Para o campo "omissoes", verifique se cada omissão crítica foi endereçada — tanto na conversa com o paciente quanto na conduta final.
Seja justo mas exigente. Justifique cada ponto do feedback em linguagem didática em português.`

    const response = await client.messages.create({
      model:      'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }]
    })

    const rawText = response.content[0].text.trim()

    let evaluation
    try {
      evaluation = JSON.parse(rawText)
    } catch (parseErr) {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) evaluation = JSON.parse(match[0])
      else throw new Error('Could not parse evaluation JSON: ' + rawText.substring(0, 200))
    }

    const scoreSum = Object.values(evaluation.scores || {}).reduce((a, b) => a + (Number(b) || 0), 0)
    evaluation.score_total = Math.min(100, Math.max(0, scoreSum))

    return Response.json(evaluation)
  } catch (err) {
    console.error('Evaluate function error:', err)
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
