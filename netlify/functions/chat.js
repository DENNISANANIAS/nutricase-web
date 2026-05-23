import Anthropic from '@anthropic-ai/sdk'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { messages, caseData } = await req.json()
    if (!messages || !caseData) {
      return Response.json({ error: 'Missing messages or caseData' }, { status: 400 })
    }

    const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const persona  = caseData.persona || {}
    const anamnese = caseData.ficha_paciente?.anamnese_clinica?.dados || {}
    const meta     = caseData.meta || {}

    const systemPrompt = `Você é um paciente virtual chamado ${persona.nome || anamnese.nome?.split(' ')[0] || 'Paciente'} em uma consulta nutricional simulada para fins educacionais.

## Perfil do paciente
- Nome: ${anamnese.nome || 'N/A'}
- Idade: ${anamnese.idade || 'N/A'} anos
- Diagnóstico: ${anamnese.diagnostico_principal || 'N/A'}
- Profissão: ${anamnese.profissao || 'N/A'}
- Tom: ${persona.tom_geral || 'ansioso_cooperativo'}
- Nível de linguagem: ${persona.nivel_linguagem || 'leigo_medio'}
- Ansiedade (0-10): ${persona.ansiedade || 5}
- Espontaneidade: ${persona.espontaneidade || 'low'}

## Expressões características
${(persona.expressoes_caracteristicas || []).join(', ')}

## Queixas que você pode mencionar espontaneamente
${(persona.queixas_espontaneas_autorizadas || []).map((q, i) => `${i+1}. ${q}`).join('\n')}

## Informações que você NUNCA revela sem ser perguntado
${(persona.queixas_omitidas_se_nao_perguntado || []).map((q, i) => `${i+1}. ${q}`).join('\n')}

## REGRAS OBRIGATÓRIAS
${(persona.regras_chat || []).map((r, i) => `${i+1}. ${r}`).join('\n')}

## Regras gerais
- Responda SEMPRE em primeira pessoa, de forma natural e coloquial.
- Você NÃO é médico nem nutricionista — não dê diagnósticos nem conselhos clínicos.
- Se perguntado sobre valores de exames, diga apenas "o médico falou que estava alterado" ou "não sei o número exato" — NUNCA revele valores numéricos dos exames. O sistema revelará os dados ao nutricionista separadamente quando ele os solicitar corretamente.
- Mantenha respostas curtas (2-4 frases) e naturais, como uma pessoa real falaria.
- Caso clínico: ${meta.categoria} | ${meta.dificuldade} | ${meta.subcategoria || ''}`

    const recentMessages = messages.slice(-20)

    const response = await client.messages.create({
      model:      'claude-3-5-haiku-20241022',
      max_tokens: 400,
      system:     systemPrompt,
      messages:   recentMessages
    })

    return Response.json({ content: response.content[0].text })
  } catch (err) {
    console.error('Chat function error:', err)
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
