/**
 * Sistema de Liberação em 3 Níveis — NutriCase v5.0
 * Analisa mensagem do nutricionista e retorna dados desbloqueados do caso.
 */

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function matchesAny(message, keywords) {
  if (!keywords || !keywords.length) return false
  const msg = normalize(message)
  return keywords.some(k => msg.includes(normalize(k)))
}

/**
 * Processa uma mensagem e retorna um objeto com os dados desbloqueados.
 * O resultado é ACUMULATIVO — deve ser merged com o estado anterior.
 */
export function extractUnlockedData(message, caseData) {
  const unlocked = {}

  // ── ficha_paciente blocks ─────────────────────────────────────────
  const ficha = caseData.ficha_paciente || {}
  for (const [blockKey, block] of Object.entries(ficha)) {
    if (block.liberacao === 'inicial') {
      unlocked[blockKey] = block.dados
      continue
    }
    if (block.liberacao === 'sob_pergunta' && matchesAny(message, block.gatilho)) {
      unlocked[blockKey] = block.dados
    }
  }

  // ── exames_bioquimicos ────────────────────────────────────────────
  const exames = caseData.exames_bioquimicos || {}
  for (const [groupKey, group] of Object.entries(exames)) {
    if (typeof group !== 'object') continue

    // Nível 1 — grupo completo
    if (matchesAny(message, group.gatilho_grupo)) {
      unlocked[groupKey] = _serializeGroup(group)
      continue
    }

    // Nível 2 — subgrupo
    for (const [subKey, sub] of Object.entries(group)) {
      if (!sub || typeof sub !== 'object' || !sub.gatilho_subgrupo) continue

      if (matchesAny(message, sub.gatilho_subgrupo)) {
        if (!unlocked[groupKey]) unlocked[groupKey] = {}
        unlocked[groupKey][subKey] = sub.dados
        continue
      }

      // Nível 3 — campo individual
      const dados = sub.dados || {}
      for (const [fieldKey, field] of Object.entries(dados)) {
        if (!field || !field.gatilho_fino) continue
        if (matchesAny(message, field.gatilho_fino)) {
          if (!unlocked[groupKey]) unlocked[groupKey] = {}
          if (!unlocked[groupKey][subKey]) unlocked[groupKey][subKey] = {}
          unlocked[groupKey][subKey][fieldKey] = field
        }
      }
    }

    // Grupos com dados diretos (ex: glicemia_metabolismo, lipidograma)
    if (group.dados) {
      if (matchesAny(message, group.gatilho_grupo)) {
        unlocked[groupKey] = group.dados
      } else {
        for (const [fieldKey, field] of Object.entries(group.dados)) {
          if (!field || !field.gatilho_fino) continue
          if (matchesAny(message, field.gatilho_fino)) {
            if (!unlocked[groupKey]) unlocked[groupKey] = {}
            unlocked[groupKey][fieldKey] = field
          }
        }
      }
    }
  }

  return unlocked
}

function _serializeGroup(group) {
  const result = {}
  for (const [k, v] of Object.entries(group)) {
    if (['liberacao', 'gatilho_grupo'].includes(k)) continue
    if (v && v.dados) result[k] = v.dados
    else if (v && v.valor !== undefined) result[k] = v
  }
  return result
}

/** Mescla novos dados desbloqueados com o estado acumulado */
export function mergeUnlocked(prev, next) {
  const merged = { ...prev }
  for (const [k, v] of Object.entries(next)) {
    if (typeof v === 'object' && !Array.isArray(v) && merged[k]) {
      merged[k] = { ...merged[k], ...v }
    } else {
      merged[k] = v
    }
  }
  return merged
}

/** Inicializa com dados de liberação "inicial" */
export function getInitialUnlocked(caseData) {
  return extractUnlockedData('__init__', caseData)
}
