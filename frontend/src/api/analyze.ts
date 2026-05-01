import type { AnalyzeResponse } from '../types'
import { FALLBACK_RESPONSE } from '../mock'

// Função que será injetada e executada no contexto da página do eSUS
function scrapeESUS() {
  const SELECTORS = {
    medicationItem: '[id^="accordion__panel-raa-"]',
    medicationName: 'h5',
    medicationDosage: 'div.css-1juhwne > span',
    patientName: '#root > div > div.css-1ylu0bo > main > header div:nth-child(1) h2',
    patientAge: '#root > div > div.css-1ylu0bo > main > header div:nth-child(2) span',
  };

  let patientName = 'Paciente Desconhecido';
  let patientAge = null;
  try {
    const pNameEl = document.querySelector(SELECTORS.patientName);
    if (pNameEl && pNameEl.textContent) patientName = pNameEl.textContent.trim();
    
    const pAgeEl = document.querySelector(SELECTORS.patientAge);
    if (pAgeEl && pAgeEl.textContent) {
      const match = pAgeEl.textContent.match(/\d+/);
      if (match) patientAge = parseInt(match[0], 10);
    }
  } catch (e) {
    console.error('Erro extraindo paciente', e);
  }

  const medicacoes: any[] = [];
  document.querySelectorAll(SELECTORS.medicationItem).forEach((item) => {
    const nameEl = item.querySelector(SELECTORS.medicationName);
    const dosageEl = item.querySelector(SELECTORS.medicationDosage);
    
    const name = nameEl && nameEl.textContent ? nameEl.textContent.trim() : '';
    const dosage = dosageEl && dosageEl.textContent ? dosageEl.textContent.trim() : 'Dosagem não especificada';
    
    if (name && !name.startsWith('Medicamento ')) {
      medicacoes.push({ 
        nome: name, 
        dose: dosage,
        frequencia: 'Não especificada',
        via: 'Não especificada'
      });
    }
  });

  return {
    paciente: {
      nome: patientName,
      idade: patientAge || 0,
      alergias: []
    },
    medicacoes
  };
}

export async function callAnalyze(): Promise<{ data: AnalyzeResponse; payload: any }> {
  let payload: any = null;
  try {
    // Verificar se estamos no ambiente de extensão
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
      // @ts-ignore
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        // @ts-ignore
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapeESUS,
        });
        
        if (results && results[0] && results[0].result) {
          payload = results[0].result;
          console.log('[NesisAI] Payload extraído da página:', payload);
        }
      }
    }

    if (!payload || payload.medicacoes?.length === 0) {
      console.warn('Nenhum dado extraído da página. Usando payload vazio.');
      payload = { 
        paciente: { nome: 'Nenhum Paciente', idade: 0, alergias: [] }, 
        medicacoes: [] 
      };
    }

    // Fazer a requisição para o backend
    const res = await fetch('http://localhost:8000/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Erro na API:', res.status, errorText);
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = (await res.json()) as AnalyzeResponse;
    return { data, payload };
  } catch (err) {
    console.error('API indisponível ou erro na extração:', err);
    return { data: FALLBACK_RESPONSE, payload };
  }
}
