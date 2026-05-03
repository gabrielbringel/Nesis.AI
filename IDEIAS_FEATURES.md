# 💡 IDEIAS DE FEATURES - NESIS.AI

**Sistema:** Análise de Interações Medicamentosas para APS (Atenção Primária à Saúde)  
**Stack:** FastAPI + PostgreSQL + Gemini LLM + Rules Engine + Chrome Extension  
**Contexto Clínico:** Médicos prescritores do SUS analisando medicações em tempo real

---

## 🎯 FEATURES PRIORITÁRIAS (Alto Impacto)

### 1. **📊 Dashboard de Segurança Medicamentosa (Médico)**
**Descrição:** Painel que mostra histórico de prescrições analisadas, patterns de interações, e alertas por severidade  
**Por quê:** Médicos precisam acompanhar seus pacientes recorrentes e ver se as mesmas interações aparecem

**Implementação:**
- Persistir `Analises` no banco (já existe schema mas não está gravando)
- Dashboard com gráficos:
  - Interações encontradas (temporal)
  - Top medicamentos que causam conflitos
  - Severity distribution
  - Comparação com outros médicos (anônimo/agregado)
  
**Endpoints:**
```python
GET /api/v1/doctor/dashboard/stats       # Estatísticas
GET /api/v1/doctor/analysis-history      # Histórico
GET /api/v1/doctor/top-interactions      # Interações frequentes
```

**Tempo Estimado:** 2-3 dias

---

### 2. **📋 Prescrição Salva com Versionamento**
**Descrição:** Médico clica "Salvar Prescrição" e pode recuperar depois, reeditar, ou comparar com novas versões  
**Por quê:** Tratamentos crônicos precisam de ajustes ao longo do tempo; médicos querem histórico

**Implementação:**
- Novo schema: `PrescricaoSalva` com campos:
  - `id`, `medico_id`, `paciente_id`, `medicacoes`, `data_criacao`, `versao`
  - `motivo_ultima_alteracao` (ex: "Ajuste por efeito colateral")
  
```python
POST   /api/v1/prescricoes/save          # Salvar nova prescrição
GET    /api/v1/prescricoes/{id}/versions  # Ver versões
POST   /api/v1/prescricoes/{id}/compare   # Comparar versões
DELETE /api/v1/prescricoes/{id}           # Remover
```

**Bonus:** Diff visual mostrando o que mudou entre versões

**Tempo Estimado:** 1-2 dias

---

### 3. **🤖 Sugestões de Alternativas Seguras (LLM)**
**Descrição:** Quando há interação GRAVE, o sistema sugere automaticamente medicamentos alternativos de mesma classe que não conflitam  
**Por quê:** Médico não precisa sair do sistema para pesquisar alternativa

**Implementação:**
```python
# Novo prompt no pipeline
SUGGEST_ALTERNATIVE_PROMPT = """
Prescrição atual: [medicações]
Interação identificada: [descrição]
Classe farmacológica do medicamento conflitante: [classe]

Sugira 2-3 medicamentos ALTERNATIVOS da MESMA CLASSE que:
1. NÃO interajam com os outros medicamentos
2. Estejam na BNAFAR/SUS
3. Sejam de primeira linha para essa condição
Justifique brevemente.
"""

# No endpoint /analyze, adicionar campo:
{
  "alertas": [...],
  "sugestoes_alternativas": [
    {
      "medicamento_original": "Losartana",
      "alternativa": "Valsartana",
      "motivo": "Sem conflito com Espironolactona",
      "confianca": 0.95
    }
  ]
}
```

**Tempo Estimado:** 1-2 dias

---

### 4. **🔔 Alertas por Perfil do Paciente**
**Descrição:** Sistema detecta contexto clínico do paciente (gestante, idoso, renal, hepático) e alertas mudam  
**Por quê:** Mesma medicação é segura para adulto mas PERIGOSA para idoso ou gestante

**Implementação:**
- Expandir `Patient` schema:
  ```python
  class Patient(BaseModel):
      idade: int
      peso: float | None
      clearance_creatinina: float | None  # Função renal
      eh_gestante: bool
      tem_diabetes: bool
      tem_hipertensao: bool
      tem_doenca_hepatica: bool
      alergias: list[str]
  ```

- Rules Engine adapta baseado em contexto
- Gemini recebe contexto no prompt:
  ```
  Paciente: mulher gestante, 32 anos, sem comorbidades
  Medicações: [...]
  
  FOCO ESPECIAL: Evitar medicamentos que atravessam placenta (Categoria C/D/X)
  ```

**Endpoints:**
```python
POST /api/v1/analyze  # Agora com contexto expandido
{
  "paciente": {
    "idade": 72,
    "clearance_creatinina": 35,
    "eh_gestante": false,
    "alergias": ["Penicilina"]
  },
  "medicacoes": [...]
}
```

**Tempo Estimado:** 2-3 dias

---

## 🚀 FEATURES DE ESCALABILIDADE & QUALIDADE

### 5. **⚡ Cache Inteligente de Análises**
**Descrição:** Se mesma combinação de medicamentos já foi analisada, retorna do cache em <50ms  
**Por quê:** APS tem vários pacientes com mesmas condições (hipertensão, diabetes)

**Implementação:**
- Redis cache chaveado por:
  ```python
  cache_key = hash(frozenset(medicacoes_normalizadas) + tuple(alergias))
  ```
- TTL: 30 dias (análises clínicas não mudam tão rápido)
- Endpoint: Adicionar header `X-From-Cache: true` na resposta

**Tempo Estimado:** 1 dia

---

### 6. **📈 Observabilidade & Alertas**
**Descrição:** Sistema detecta anomalias (ex: LLM sempre falhando, muitos alertas GRAVE subitamente)  
**Por quê:** Produção precisa monitoramento

**Implementação:**
```python
# Novo módulo: app/motor/telemetry.py
from opentelemetry import metrics, trace

@app.get("/metrics")
async def metrics():
    """Prometheus-compatible metrics"""
    return {
        "llm_calls_total": counter_llm,
        "llm_errors_total": counter_llm_errors,
        "rag_misses": counter_rag_misses,
        "p95_latency_ms": latency_histogram.percentile(95)
    }

# Alertas: Se LLM error rate > 30% em 5 min, enviar email/Slack
```

**Ferramentas:** Prometheus + Grafana + Alertmanager  
**Tempo Estimado:** 1-2 dias

---

### 7. **🔄 Sync com Prontuário Eletrônico (EMR)**
**Descrição:** Integração com sistemas de prontuário (ex: TISS/HL7) para puxar medicações automaticamente  
**Por quê:** Médico não digita medicações, vem do prontuário do paciente

**Implementação:**
```python
# Novo endpoint
POST /api/v1/integrations/emr/import
{
  "emr_system": "prontuario_aps_municipal",
  "patient_id_external": "CPF_12345678900",
  "auth_token": "..."
}

# Retorna lista de medicações atuais do prontuário
```

**Padrão:** HL7 FHIR para interoperabilidade com EMRs  
**Tempo Estimado:** 3-5 dias (depende do EMR local)

---

## 📚 FEATURES DE EDUCAÇÃO & SUPORTE

### 8. **🎓 Modo "Ensino" - Explicação Detalhada**
**Descrição:** Clica em alerta e recebe explicação clínica completa: mecanismo, evidência, recomendação passo-a-passo  
**Por quê:** Residente/estudante de medicina quer aprender; médico quer confirmar

**Implementação:**
```python
# Novo prompt
EDUCATIONAL_PROMPT = """
Interação: Varfarina + Ibuprofeno
Severidade: GRAVE

Explique para um estudante de medicina:
1. MECANISMO: Por que essa interação ocorre?
2. FARMACOCINÉTICA: Como os medicamentos se comportam?
3. MANIFESTAÇÕES CLÍNICAS: Quais sintomas o paciente pode apresentar?
4. ORIENTAÇÃO: O que fazer se paciente tomou ambos?
5. REFERÊNCIAS: Baseado em quais guias/estudos?

Formato: Markdown com títulos, listas e destaque para pontos críticos
"""

# Novo endpoint
GET /api/v1/alerts/{alert_id}/explain?mode=educational
```

**UI:** Modal com tabs (Resumo | Mecanismo | Manifestações | Referências)  
**Tempo Estimado:** 1-2 dias

---

### 9. **📱 Notificações de Atualizações Clínicas**
**Descrição:** Quando novo alerta/contraindicação surge na base SUS, notifica médicos registrados  
**Por quê:** Conhecimento médico muda; novos estudos surgem

**Implementação:**
```python
# Background job semanal
@scheduler.scheduled_job('cron', day_of_week='mon', hour=6)
async def check_guideline_updates():
    new_guidelines = await fetch_from_anvisa_api()
    for guideline in new_guidelines:
        affected_doctors = get_doctors_using_medication(guideline.medicamento)
        for doctor in affected_doctors:
            send_notification(
                doctor.email,
                f"⚠️ Nova contraindicação: {guideline.descricao}",
                guideline
            )
```

**Integração:** ANVISA API, UpToDate, DynaMed  
**Tempo Estimado:** 2-3 dias

---

## 🎨 FEATURES DE UX/FRONTEND

### 10. **🎯 "Quick Add" - Autocomplete Medicamentos**
**Descrição:** Médico digita "losart" e aparece dropdown com "Losartana", "Losartana Potássica", e dose recomendada  
**Por quê:** Acelera entrada de dados; reduz erros de digitação

**Implementação:**
```typescript
// src/components/MedicationInput.tsx
const [suggestions, setSuggestions] = useState<Medication[]>([])

const handleSearch = async (query: string) => {
  const results = await fetch(
    `/api/v1/medications/autocomplete?q=${query}&limit=10`
  )
  setSuggestions(results)
}

// Quando clica em sugestão, preenche dose, frequência, via automaticamente
```

**Fonte:** Banco SUS (já está em `banco_conhecimento_sus.json`)  
**Tempo Estimado:** 1 dia

---

### 11. **🎨 Tema Claro/Escuro + Acessibilidade**
**Descrição:** UI segue padrões WCAG AA; suporta modo escuro para reduzir fadiga  
**Por quê:** Médico de plantão trabalha de madrugada; precisa legibilidade

**Implementação:**
```typescript
// src/stores/settingsStore.ts
export const useSettings = create((set) => ({
  theme: 'light' | 'dark',
  fontSize: 'small' | 'normal' | 'large',
  contrast: 'normal' | 'high',
  toggleTheme: () => set(...),
}))

// tailwind.config.ts
module.exports = {
  darkMode: 'class',
  theme: {
    colors: {
      // Cores WCAG AA compliant
    }
  }
}
```

**Padrão:** WCAG 2.1 AA  
**Tempo Estimado:** 2-3 dias

---

### 12. **📸 Export Prescrição como PDF**
**Descrição:** Médico gera PDF com prescrição + alertas para enviar ao paciente ou imprimir  
**Por quê:** Workflow real: papel ainda é necessário na APS

**Implementação:**
```python
# Backend
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

@app.post("/api/v1/prescriptions/{id}/export/pdf")
async def export_prescription_pdf(id: str):
    prescription = await get_prescription(id)
    alerts = await get_alerts_for_prescription(id)
    
    pdf_buffer = BytesIO()
    pdf = canvas.Canvas(pdf_buffer, pagesize=letter)
    
    # Desenha prescrição formatada
    y = 750
    pdf.drawString(50, y, f"Prescrição para: {prescription.patient_name}")
    # ... mais conteúdo
    
    pdf.save()
    return FileResponse(pdf_buffer, media_type="application/pdf")
```

**Library:** ReportLab ou PyPDF2  
**Tempo Estimado:** 1 dia

---

## 🔬 FEATURES AVANÇADAS (Roadmap Longo)

### 13. **🧠 Machine Learning - Previsão de Efeitos Colaterais**
**Descrição:** Modelo treinado em dados históricos previne não só interações, mas efeitos colaterais individuais  
**Por quê:** "Esse paciente (idade, sexo, peso, genótipo) tem alto risco de alopecia com minoxidil"

**Implementação:**
- Fine-tune modelo Gemini com dataset FAERS (FDA Adverse Event Reporting System)
- Input: Medicação + perfil do paciente
- Output: Probabilidade de efeito colateral + severidade

**Tempo Estimado:** 5-7 dias (inclui coleta de dados)

---

### 14. **💬 Chat com Farmacêutico IA (Multimodal)**
**Descrição:** Extensão abre chat com IA farmacêutico que responde dúvidas em tempo real  
**Por quê:** Médico tem dúvida específica ("posso dar enalapril a paciente diabético com creatinina 1.8?")

**Implementação:**
```python
# app/motor/pharmaceutical_assistant.py
from langchain_google_genai import ChatGoogleGenerativeAI

system_prompt = """
Você é um farmacêutico clínico especialista em farmacoterapia no SUS.
Contexto: Médico de Atenção Primária fazendo prescrição.
Responda perguntas sobre:
- Adequação de dose para contexto (renal, hepático, etc)
- Alternativas terapêuticas
- Efeitos colaterais esperados
- Quando referir para especialista

SEMPRE cite a fonte (BNAFAR, ANVISA, guideline).
"""

@app.post("/api/v1/chat/pharmaceutical")
async def pharmaceutical_chat(message: str, context: dict):
    """Chat com assistente farmacêutico"""
    response = await llm.astream_log(
        system_prompt + context,
        message
    )
    return {"response": response, "thinking": ...}
```

**Tempo Estimado:** 2-3 dias

---

### 15. **🌍 Validação Multinacional**
**Descrição:** Sistema reconhece medicamentos por país (Brasil tem dipirona, EUA não; losartana é padrão em ambos)  
**Por quê:** Expandir para América Latina / Portugal

**Implementação:**
```python
# Novo field no schema
class AnalyzeRequest(BaseModel):
    country: Literal["BR", "PT", "CO", "AR", "MX"] = "BR"
    medicacoes: list[dict]

# Rules engine adapta baseado em país
if request.country == "BR":
    # Usa BNAFAR/SUS
elif request.country == "PT":
    # Usa INFARMED
```

**Tempo Estimado:** 3-5 dias

---

## 🎯 ROADMAP RECOMENDADO (Priorização)

### **SPRINT 1 (Próximas 2 semanas)** - MVP Melhorado
1. ✅ Corrigir API Key Gemini + Postgres
2. ✅ Persistência de Análises (habilitar gravação)
3. 🔧 Dashboard médico (stats básicas)
4. 🔧 Quick Add - Autocomplete medicamentos
5. 🔧 Export PDF

**Impacto:** Médicos conseguem reusar análises, workflow mais rápido  
**Esforço:** ~4-5 dias de dev

---

### **SPRINT 2 (Semanas 3-4)**
6. 🔧 Prescrição com Versionamento
7. 🔧 Sugestões de Alternativas (LLM)
8. 🔧 Context paciente expandido (gestante, renal, etc)
9. 🔧 Cache inteligente

**Impacto:** Análises mais personalizadas, performance 10x melhor  
**Esforço:** ~5-6 dias de dev

---

### **SPRINT 3 (Semanas 5-6)**
10. 🔧 Modo Ensino (explicações detalhadas)
11. 🔧 Observabilidade + Alertas
12. 🔧 Acessibilidade (A11y) + Tema escuro

**Impacto:** Qualidade de vida dos médicos, confiabilidade de produção  
**Esforço:** ~4-5 dias de dev

---

### **Backlog (Depois)**
- ML: Previsão de efeitos colaterais
- Chat farmacêutico multimodal
- Sincronização EMR
- Suporte multinacional

---

## 💰 BUSINESS VALUE

| Feature | Impacto Clínico | Adoção | ROI |
|---------|-----------------|--------|-----|
| Dashboard médico | Alto (continuidade) | +40% | 🟢 Alto |
| Alternativas LLM | Alto (reduz ida a especialista) | +50% | 🟢 Alto |
| Context paciente | Crítico (segurança) | +60% | 🟢 Alto |
| Cache | Médio (performance) | Transparente | 🟢 Médio |
| Chat IA | Médio (educação) | +20% | 🟡 Médio |

---

## 🛠️ Tech Debt (Importante Corrigir)

**Antes de novas features:**
1. ❌ Remover `@lru_cache` de funções de inicialização (permite reload de API key)
2. ❌ Adicionar retry com backoff exponencial ao LLM
3. ❌ Implementar testes de integração (mock Gemini)
4. ❌ Type hints completos no backend
5. ❌ Documentação API com Swagger atualizada

---

**Próximos passos:** Quer que eu comece a implementação de qual feature?

