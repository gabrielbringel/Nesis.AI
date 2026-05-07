import type { ScrapedResult } from '../scraper/esus-scraper'
import type { AttributeNode } from '../types'
import { normalizeSexo } from './format'

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

export function buildAttributeList(scraped: ScrapedResult): AttributeNode[] {
  const p = scraped.paciente
  const nodes: AttributeNode[] = []
  let idCounter = 0

  const addNode = (text: string, isSubItem = false) => {
    nodes.push({ id: `attr_${idCounter++}`, text, isSubItem })
  }

  // 1. Sexo
  const sexoNormalizado = normalizeSexo(p.sexo)
  addNode(`Sexo: ${sexoNormalizado === 'M' ? 'Mulher' : sexoNormalizado === 'H' ? 'Homem' : 'Não informado'}`)

  // 2. Peso e Altura
  const paParts: string[] = []
  if (p.peso) paParts.push(`Peso: ${p.peso}`)
  if (p.altura) paParts.push(`Altura: ${p.altura}`)
  if (paParts.length > 0) {
    addNode(paParts.join(' · '))
  }

  // 3. Alergias — null = scraping não capturou; [] = capturou mas vazio
  if (p.alergias === null || p.alergias === undefined) {
    // Omitir o bullet (scraping não encontrou o container)
  } else if (p.alergias.length > 0) {
    addNode('Alergias:')
    p.alergias.forEach((a) => addNode(truncate(a, 60), true))
  } else {
    addNode('Alergias: nenhuma')
  }

  // 4. Comorbidades — null = scraping não capturou; [] = capturou mas vazio
  if (p.problemasCondicoes === null || p.problemasCondicoes === undefined) {
    // Omitir o bullet (scraping não encontrou a seção)
  } else if (p.problemasCondicoes.length > 0) {
    addNode('Comorbidades:')
    p.problemasCondicoes.forEach((c) => addNode(truncate(c, 60), true))
  } else {
    addNode('Comorbidades: nenhuma')
  }

  // 5. Medicamentos em Uso — null = scraping não capturou; [] = capturou mas vazio
  if (p.medEmUso !== null && p.medEmUso !== undefined && p.medEmUso.length > 0) {
    addNode('Uso contínuo:')
    p.medEmUso.forEach((m) => addNode(truncate(m, 60), true))
  }

  // 6. Motivo da consulta
  if (p.motivoConsulta) {
    addNode(`Motivo: ${truncate(p.motivoConsulta, 80)}`)
  }

  // 7. Objetivo da consulta
  if (p.objetivo) {
    addNode(`Objetivo: ${truncate(p.objetivo, 80)}`)
  }

  // 8. Avaliação
  if (p.avaliacao) {
    addNode(`Avaliação: ${truncate(p.avaliacao, 100)}`)
  }

  // 9. Prescrição
  if (scraped.medicacoes && scraped.medicacoes.length > 0) {
    addNode('Prescrição:')
    scraped.medicacoes.forEach((m) => {
      if (m.posologia) {
        addNode(`${m.nome} — ${truncate(m.posologia, 50)}`, true)
      } else {
        addNode(m.nome, true)
      }
    })
  }

  return nodes
}
