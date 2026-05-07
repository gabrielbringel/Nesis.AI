// Scraping do prontuário do eSUS APS via XPaths confirmados.
//
// IMPORTANTE: scrapeESUSData é injetada via chrome.scripting.executeScript no
// contexto da aba do navegador, então o corpo da função precisa ser
// 100% self-contained — sem imports, sem closures sobre módulos. Helpers
// auxiliares também ficam dentro da função.

export interface ScrapedPaciente {
  nome: string | null
  idade: number | null
  sexo: string | null
  peso: string | null
  altura: string | null
  alergias: string[]
  motivoConsulta: string | null
  objetivo: string | null
  avaliacao: string | null
  problemasCondicoes: string[]
  medEmUso: string[]
}

export interface ScrapedMedicacao {
  nome: string
  posologia: string
}

export interface ScrapedResult {
  paciente: ScrapedPaciente
  medicacoes: ScrapedMedicacao[]
}

export function scrapeESUSData(): ScrapedResult {
  // ─── Helpers (inline porque a função é serializada e injetada) ───
  function getByXPath(xpath: string): string | null {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )
    const node = result.singleNodeValue
    if (!node) return null
    const text = node.textContent?.trim() || ''
    return text || null
  }

  function getAllByXPath(xpath: string): string[] {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    )
    const out: string[] = []
    for (let i = 0; i < result.snapshotLength; i++) {
      const node = result.snapshotItem(i)
      const text = node?.textContent?.trim()
      if (text) out.push(text)
    }
    return out
  }

  // ─── Paciente ───
  const NOME_XPATH =
    '//*[@id="root"]/div/div[3]/main/header/div/div/div[1]/div/div/div[1]/div/div[1]/h2'
  const IDADE_XPATH =
    '//*[@id="root"]/div/div[3]/main/header/div/div/div[1]/div/div/div[2]/div/div[1]/div/div/span/text()[1]'
  const SEXO_XPATH =
    '//*[@id="root"]/div/div[3]/main/header/div/div/div[1]/div/div/div[1]/div/div[2]/span'
  const PESO_XPATH =
    '//*[@id="root"]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[4]/div[2]/div[2]/div[1]/div/div/div/div/div/div/span/text()'
  const ALTURA_XPATH =
    '//*[@id="root"]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[4]/div[2]/div[2]/div[2]/div/div/div/div/div/div/span/text()'
  const ALERGIAS_CONTAINER_XPATH =
    '//*[@id="root"]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div/div[1]/div'

  const nome = getByXPath(NOME_XPATH)
  const idadeRaw = getByXPath(IDADE_XPATH)
  const idadeMatch = idadeRaw?.match(/\d+/)
  const idade = idadeMatch ? parseInt(idadeMatch[0], 10) : null
  const sexo = getByXPath(SEXO_XPATH)
  const peso = getByXPath(PESO_XPATH)
  const altura = getByXPath(ALTURA_XPATH)

  // Alergias: o container tem múltiplos filhos (cada div é uma alergia).
  const alergias: string[] = []
  const alergiaContainerResult = document.evaluate(
    ALERGIAS_CONTAINER_XPATH,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )
  const alergiaContainer = alergiaContainerResult.singleNodeValue as Element | null
  if (alergiaContainer) {
    Array.from(alergiaContainer.children).forEach((child) => {
      const text = child.textContent?.trim()
      if (text) alergias.push(text)
    })
  }

  // ─── SOAP ───
  const motivoConsulta = getByXPath(
    '//*[@id="accordion__panel-S"]/div/div/div[2]/div/div[2]/div/div/div/div',
  )
  const objetivo = getByXPath(
    '//*[@id="accordion__panel-O"]/div/div/div[1]/div/div/div/div/div[1]/div/div[2]/div/div/div/div/div/div/span/span',
  )
  const avaliacao = getByXPath(
    '//*[@id="accordion__panel-A"]/div/div/div[2]/div/div/div/div/div[1]/div/div[2]/div/div/div/div/div/div/span/span',
  )

  // Problemas/condições: itera div[3], div[4], ... até não encontrar mais
  const problemasCondicoes: string[] = []
  for (let i = 3; i < 30; i++) {
    const xpath = `//*[@id="accordion__panel-A"]/div/div/div[3]/div/div/div/div/div[1]/div/div[2]/div/div[${i}]`
    const text = getByXPath(xpath)
    if (!text) break
    problemasCondicoes.push(text)
  }

  // ─── Medicamentos em uso ───
  const medEmUso: string[] = []
  try {
    const boxXPath = '/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[5]'
    const boxNode = document.evaluate(boxXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement | null
    
    if (boxNode) {
      // Pega todos os textos dentro do container separando por quebra de linha visual
      const rawTexts = (boxNode.innerText || '').split('\n').map(s => s.trim()).filter(s => s.length > 3)
      
      rawTexts.forEach(text => {
        const lower = text.toLowerCase()
        if (!lower.includes('medicamentos em uso') && !lower.includes('nenhum')) {
          medEmUso.push(text)
        }
      })
    }
  } catch (err) {
    // Falha silenciosa se der erro no XPath
  }

  // ─── Medicações ───
  const medicacoes: ScrapedMedicacao[] = []
  
  // O XPath base fornecido para o container de medicações (onde os div[i] estão)
  const basePathAbsolute = '/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[2]/div/div/div[5]/div[2]/div/div/div[4]/div/div[2]/div[3]/div/div/div[2]'
  
  for (let i = 1; i < 50; i++) {
    // 1. Tenta o XPath novo e mais robusto (baseado no DOM atual)
    let nomeXPath = `${basePathAbsolute}/div[${i}]/div/div[1]/div/h5`
    let posologiaXPath = `${basePathAbsolute}/div[${i}]/div/div[1]/span`
    
    let nomeMed = getByXPath(nomeXPath)
    let posologia = getByXPath(posologiaXPath) || ''

    // 2. Se falhar, tenta o XPath antigo baseado no ID que costumava existir
    if (!nomeMed) {
      const oldNomeXPath = `//*[@id="accordion__panel-raa-801"]/div[${i}]/div/div[1]/div/h5`
      const oldPosXPath = `//*[@id="accordion__panel-raa-801"]/div[${i}]/div/div[1]/span`
      nomeMed = getByXPath(oldNomeXPath)
      if (nomeMed) {
        posologia = getByXPath(oldPosXPath) || ''
      }
    }

    if (!nomeMed) break
    medicacoes.push({ nome: nomeMed, posologia })
  }

  // ─── Fallback heurístico (se nenhum XPath de medicação retornou) ───
  if (medicacoes.length === 0) {
    const found = new Set<string>()
    document.querySelectorAll('div, p, span, h4, h5, li').forEach((el) => {
      if (el.children.length !== 0) return
      const text = el.textContent?.trim() || ''
      const lower = text.toLowerCase()
      const looksLikeDose = /\b(mg|ml|mcg|g|comprimidos?|gotas?|ui|cps|cápsulas?|ampolas?|frascos?)\b/i.test(text)
      if (!looksLikeDose) return
      if (text.length <= 3 || text.length >= 150) return
      if (
        lower.includes('pesquise') ||
        lower.includes('adicionar') ||
        lower.includes('nenhum')
      )
        return
      found.add(text)
    })
    Array.from(found).forEach((text) => {
      medicacoes.push({ nome: text, posologia: '' })
    })
  }

  // Suprime warning de unused (mantemos getAllByXPath caso seja útil em
  // futuras seções iterativas e para deixar a função self-contained completa)
  void getAllByXPath

  return {
    paciente: {
      nome,
      idade,
      sexo,
      peso,
      altura,
      alergias,
      motivoConsulta,
      objetivo,
      avaliacao,
      problemasCondicoes,
      medEmUso,
    },
    medicacoes,
  }
}
