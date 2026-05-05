// Content script da extensão NesisAI.
//
// Roda no contexto da página do eSUS APS, extrai os dados clínicos via XPath,
// envia para o backend e notifica a sidebar com o resultado.
//
// Fluxo:
//   1. Aguarda 2s após DOMContentLoaded (eSUS é SPA, carrega tarde).
//   2. Extrai paciente, alergias, problemas/condições e medicações.
//   3. Lê chrome.storage.local.nesis_settings para decidir entre auto-leitura
//      ou aguardar TRIGGER_SCRAPE da sidebar.
//   4. Envia POST para http://localhost:8000/api/v1/analyze.
//   5. Encaminha o resultado para a sidebar via chrome.runtime.sendMessage.

import { getAllByXPath, getByXPath } from './xpath-helper'

declare const chrome: any

interface Medicacao {
  nome: string
  dose: string
  frequencia: string
  via: string
  posologia_completa: string
}

interface Paciente {
  nome: string
  idade: number
  alergias: string[]
  sexo: string
  peso: string | null
  altura: string | null
  motivo_consulta: string | null
  objetivo: string | null
  avaliacao: string | null
  problemas_condicoes: string[]
}

interface Payload {
  paciente: Paciente
  medicacoes: Medicacao[]
}

const XPATHS = {
  nome: '//*[@id="root"]/div/div[3]/main/header/div/div/div[1]/div/div/div[1]/div/div[1]/h2',
  idade: '//*[@id="root"]/div/div[3]/main/header/div/div/div[1]/div/div/div[2]/div/div[1]/div/div/span/text()[1]',
  sexo: '//*[@id="root"]/div/div[3]/main/header/div/div/div[1]/div/div/div[1]/div/div[2]/span',
  peso: '//*[@id="root"]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[4]/div[2]/div[2]/div[1]/div/div/div/div/div/div/span/text()',
  altura: '//*[@id="root"]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[4]/div[2]/div[2]/div[2]/div/div/div/div/div/div/span/text()',
  alergiasContainer:
    '//*[@id="root"]/div/div[3]/main/div[1]/form/div[1]/div/div/div[1]/div/aside/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div/div[1]/div',
  motivoConsulta:
    '//*[@id="accordion__panel-S"]/div/div/div[2]/div/div[2]/div/div/div/div',
  objetivo:
    '//*[@id="accordion__panel-O"]/div/div/div[1]/div/div/div/div/div[1]/div/div[2]/div/div/div/div/div/div/span/span',
  avaliacao:
    '//*[@id="accordion__panel-A"]/div/div/div[2]/div/div/div/div/div[1]/div/div[2]/div/div/div/div/div/div/span/span',
}

function normalizarSexo(raw: string | null): string {
  if (!raw) return '?'
  const lower = raw.toLowerCase().trim()
  if (lower.includes('masculino') || lower === 'm') return 'H'
  if (lower.includes('feminino') || lower === 'f') return 'M'
  return '?'
}

function extrairIdade(raw: string | null): number {
  if (!raw) return 0
  const match = raw.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

function extrairAlergias(): string[] {
  const container = getAllByXPath(XPATHS.alergiasContainer)
  if (container.length === 0) return []

  const alergias: string[] = []
  for (const el of container) {
    const texto = el.textContent?.trim()
    if (texto && texto.length > 0) alergias.push(texto)
  }
  return alergias
}

function extrairProblemasCondicoes(): string[] {
  // Itera div[3], div[4], div[5]... até não encontrar mais.
  const problemas: string[] = []
  let n = 3
  while (true) {
    const xpath = `//*[@id="accordion__panel-A"]/div/div/div[3]/div/div/div/div/div[1]/div/div[2]/div/div[${n}]`
    const valor = getByXPath(xpath)
    if (!valor) break
    problemas.push(valor)
    n++
    if (n > 30) break
  }
  return problemas
}

function extrairMedicacoes(): Medicacao[] {
  const medicacoes: Medicacao[] = []
  let n = 1
  while (true) {
    const nomeXPath = `//*[@id="accordion__panel-raa-801"]/div[${n}]/div/div[1]/div/h5`
    const posologiaXPath = `//*[@id="accordion__panel-raa-801"]/div[${n}]/div/div[1]/span`

    const nome = getByXPath(nomeXPath)
    if (!nome) break

    const posologia = getByXPath(posologiaXPath) || ''
    medicacoes.push({
      nome,
      dose: '',
      frequencia: '',
      via: '',
      posologia_completa: posologia
        ? `${nome} ${posologia}`.trim()
        : nome,
    })
    n++
    if (n > 50) break
  }
  return medicacoes
}

function montarPayload(): Payload {
  const nome = getByXPath(XPATHS.nome) || 'Desconhecido'
  const idade = extrairIdade(getByXPath(XPATHS.idade))
  const sexo = normalizarSexo(getByXPath(XPATHS.sexo))
  const peso = getByXPath(XPATHS.peso)
  const altura = getByXPath(XPATHS.altura)
  const motivo_consulta = getByXPath(XPATHS.motivoConsulta)
  const objetivo = getByXPath(XPATHS.objetivo)
  const avaliacao = getByXPath(XPATHS.avaliacao)

  return {
    paciente: {
      nome,
      idade,
      alergias: extrairAlergias(),
      sexo,
      peso,
      altura,
      motivo_consulta,
      objetivo,
      avaliacao,
      problemas_condicoes: extrairProblemasCondicoes(),
    },
    medicacoes: extrairMedicacoes(),
  }
}

function montarDisplayLabel(p: Paciente): string {
  return `${p.nome} · ${p.sexo}, ${p.idade} anos`
}

async function enviarBackendENotificar(payload: Payload) {
  const displayLabel = montarDisplayLabel(payload.paciente)
  try {
    const res = await fetch('http://localhost:8000/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    chrome.runtime.sendMessage({
      type: 'ANALYSIS_COMPLETE',
      payload: data,
      paciente: { displayLabel },
    })
  } catch (e: any) {
    console.error('[NesisAI] Erro ao chamar backend:', e)
    chrome.runtime.sendMessage({
      type: 'ANALYSIS_ERROR',
      error: e?.message || 'Erro desconhecido',
      paciente: { displayLabel },
    })
  }
}

function inicializar() {
  const payload = montarPayload()
  console.log('[NesisAI] Dados extraídos:', payload)

  if (chrome?.storage?.local) {
    chrome.storage.local.get('nesis_settings', (result: any) => {
      let settings: any = {}
      try {
        const raw = result?.nesis_settings
        settings = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
      } catch {
        settings = {}
      }

      if (settings.autoRead) {
        enviarBackendENotificar(payload)
      } else {
        chrome.runtime.onMessage.addListener((msg: any) => {
          if (msg?.type === 'TRIGGER_SCRAPE') {
            // Re-extrai a cada gatilho — o prontuário pode ter sido atualizado
            // entre a injeção do content-script e o clique em "Ler prontuário".
            const fresh = montarPayload()
            console.log('[NesisAI] Re-extraindo a pedido da sidebar:', fresh)
            enviarBackendENotificar(fresh)
          }
        })
      }
    })
  } else {
    chrome.runtime.onMessage.addListener((msg: any) => {
      if (msg?.type === 'TRIGGER_SCRAPE') {
        enviarBackendENotificar(montarPayload())
      }
    })
  }
}

// eSUS é SPA — aguarda 2s para a árvore React montar antes de extrair.
setTimeout(inicializar, 2000)
