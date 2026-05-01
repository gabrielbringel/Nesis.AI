declare var chrome: any;
import { useCallback, useEffect, useRef, useState } from 'react'
import { READING_ATTRIBUTES } from '../mock'
import { getSettings } from '../stores/settingsStore'
import type { Alert, AlertCounts, SidebarState } from '../types'

const INITIAL_STATE: SidebarState = {
  view: 'idle',
  patient: { abbreviated: 'Carregando...', age: 0 },
  loadedAttributes: [],
  totalAttributes: READING_ATTRIBUTES,
  alerts: [],
  counts: { grave: 0, moderado: 0, leve: 0 },
  lastAnalyzedAt: null,
}

function countAlerts(alerts: Alert[]): AlertCounts {
  return {
    grave: alerts.filter((a) => a.severidade === 'GRAVE').length,
    moderado: alerts.filter((a) => a.severidade === 'MODERADO').length,
    leve: alerts.filter((a) => a.severidade === 'LEVE').length,
  }
}

function sortAlerts(alerts: Alert[]): Alert[] {
  const order = { GRAVE: 0, MODERADO: 1, LEVE: 2 }
  return [...alerts].sort((a, b) => (order[a.severidade as keyof typeof order] ?? 3) - (order[b.severidade as keyof typeof order] ?? 3))
}

// 💉 FUNÇÃO INJETADA: Lê o DOM da aba ativa do e-SUS procurando textos médicos
function scrapeESUSData() {
  const nameElement = document.querySelector('#root > div > div.css-1ylu0bo > main > header div:nth-child(1) h2');
  const ageElement = document.querySelector('#root > div > div.css-1ylu0bo > main > header div:nth-child(2) span');

  const paciente = nameElement ? nameElement.textContent?.trim() : 'Desconhecido';
  const idadeMatch = ageElement ? ageElement.textContent?.match(/\d+/) : null;
  const idade = idadeMatch ? parseInt(idadeMatch[0], 10) : 0;

  const medicacoes: any[] = [];
  const foundMeds = new Set<string>();

  // Varre os textos da página atrás de dosagens (Apenas elementos sem filhos para evitar texto duplicado)
  document.querySelectorAll('div, p, span, h4, h5, li').forEach((el) => {
    if (el.children.length === 0) {
      const text = el.textContent?.trim() || '';
      const lowerText = text.toLowerCase();
      
      // Procura padrões de receita num tamanho razoável
      if (
        (lowerText.includes('mg') || lowerText.includes('ml') || lowerText.includes('comprimido') || lowerText.includes('gotas') || lowerText.includes('ui')) &&
        text.length > 3 && text.length < 150
      ) {
        if (!lowerText.includes('pesquise') && !lowerText.includes('adicionar') && !lowerText.includes('nenhum')) {
          foundMeds.add(text);
        }
      }
    }
  });

  Array.from(foundMeds).forEach((medText) => {
    medicacoes.push({
      nome: medText,
      dose: 'Extraído do texto',
      frequencia: 'Não especificada',
      via: 'Não especificada'
    });
  });

  return { paciente, idade, medicacoes };
}

export function useSidebar() {
  const [state, setState] = useState<SidebarState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)

  const performAnalysis = async () => {
    let payload = null;
    let realPatient = { abbreviated: 'Carregando...', age: 0 }; 
    
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeESUSData
          });
          
          const scraped = injectionResults[0]?.result;
          if (scraped && scraped.paciente !== 'Desconhecido') {
            realPatient = { abbreviated: scraped.paciente, age: scraped.idade };
            
            payload = {
              paciente: {
                nome: scraped.paciente,
                idade: scraped.idade,
                alergias: []
              },
              medicacoes: scraped.medicacoes
            };
          }
        }
      }
    } catch (err) {
      console.error("Erro ao ler dados do e-SUS:", err);
    }

    // Se estiver fora da extensão (testes locais), monta um payload genérico vazio para o backend resolver
    if (!payload) {
       payload = { paciente: { nome: 'Teste Local', idade: 30, alergias: [] }, medicacoes: [] };
    }

    setState(prev => ({ ...prev, patient: realPatient }));

    try {
      const res = await fetch('http://localhost:8000/api/avaliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      return { data, payload };

    } catch (error) {
      console.error("Erro de conexão com a API:", error);
      // Retorna objeto vazio para não quebrar a UI caso o backend morra, mas não exibe os mocks falsos
      return { data: { alertas: [] }, payload }; 
    }
  };

  const startReading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'reading',
      loadedAttributes: [],
    }))

    const apiPromise = performAnalysis()

    let idx = 0
    intervalRef.current = setInterval(() => {
      idx++
      setState((prev) => ({
        ...prev,
        loadedAttributes: READING_ATTRIBUTES.slice(0, idx),
      }))

      if (idx >= READING_ATTRIBUTES.length) {
        clearInterval(intervalRef.current!)
        setState((prev) => ({ ...prev, view: 'analyzing' }))

        apiPromise.then(({ data: response }) => {
          const sorted = sortAlerts(response?.alertas || [])
          setState((prev) => ({
            ...prev,
            view: 'results',
            alerts: sorted,
            counts: countAlerts(sorted),
            lastAnalyzedAt: new Date()
          }))
        })
      }
    }, 500)
  }, [])

  const reanalyze = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    startReading()
  }, [startReading])

  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    if (getSettings().autoRead) {
      startReading()
    }
  }, [startReading])

  return { state, startReading, reanalyze }
}