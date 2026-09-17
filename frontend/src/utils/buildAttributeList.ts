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

  // 1. Sex
  const sexoNormalizado = normalizeSexo(p.sexo)
  addNode(sexoNormalizado === 'M' ? 'Mulher' : sexoNormalizado === 'H' ? 'Homem' : 'Não informado')

  // 2. Weight and height
  const paParts: string[] = []
  if (p.peso) paParts.push(`Peso: ${p.peso}`)
  if (p.altura) paParts.push(`Altura: ${p.altura}`)
  if (paParts.length > 0) {
    addNode(paParts.join(' · '))
  }

  // 3. Allergies — null = not captured by scraping; [] = captured but empty
  if (p.alergias === null || p.alergias === undefined) {
    // Omit the bullet (scraping did not find the container)
  } else if (p.alergias.length > 0) {
    addNode('Alergias:')
    p.alergias.forEach((a) => addNode(truncate(a, 60), true))
  } else {
    addNode('Alergias: nenhuma')
  }

  // 4. Comorbidities — null = not captured by scraping; [] = captured but empty
  if (p.problemasCondicoes === null || p.problemasCondicoes === undefined) {
    // Omit the bullet (scraping did not find the section)
  } else if (p.problemasCondicoes.length > 0) {
    addNode('Comorbidades:')
    p.problemasCondicoes.forEach((c) => addNode(truncate(c, 60), true))
  } else {
    addNode('Comorbidades: nenhuma')
  }

  // 5. Current medications — null = not captured by scraping; [] = captured but empty
  if (p.medEmUso !== null && p.medEmUso !== undefined && p.medEmUso.length > 0) {
    addNode('Uso contínuo:')
    p.medEmUso.forEach((m) => addNode(truncate(m, 60), true))
  }

  // 6. Reason for visit
  if (p.motivoConsulta) {
    addNode(`Motivo: ${truncate(p.motivoConsulta, 80)}`)
  }

  // 7. Objective findings
  if (p.objetivo) {
    addNode(`Objetivo: ${truncate(p.objetivo, 80)}`)
  }

  // 8. Assessment
  if (p.avaliacao) {
    addNode(`Avaliação: ${truncate(p.avaliacao, 100)}`)
  }

  // 9. Prescription
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
