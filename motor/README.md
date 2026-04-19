# Motor de Interações Medicamentosas

Biblioteca Python independente que recebe o texto bruto de um prontuário e retorna alertas estruturados com severidade, mecanismo, evidência e recomendação clínica.

## Instalação

### 1. Crie um ambiente virtual

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Instale as dependências

**Dependências obrigatórias** (motor funciona apenas com estas):

```bash
pip install pydantic python-dotenv httpx pytest
```

**Dependências completas** (habilita BioBERTpt, ChemicalX e Neo4j):

```bash
pip install -r motor/requirements.txt
```

### 3. Configure variáveis de ambiente

```bash
cp motor/.env.example .env
# edite .env com suas credenciais Neo4j e caminhos de modelo
```

---

## Rodando os testes

A partir da raiz do projeto:

```bash
pytest motor/tests/ -v
```

Saída esperada: **36 testes passando**. Nenhuma dependência externa (rede, Neo4j, GPU) é necessária para os testes — os clientes externos são neutralizados automaticamente pelo `conftest.py`.

---

## Como usar `MedicationPipeline`

### Uso básico

```python
from motor.pipeline import MedicationPipeline

pipeline = MedicationPipeline()
result = pipeline.analyze("Paciente em uso de Warfarina 5mg e Aspirina 100mg 1x ao dia")

for alert in result.alerts:
    print(f"{alert.severity} — {alert.drug_pair}")
    print(f"  score: {alert.final_score:.2f}")
    print(f"  mecanismo: {alert.mechanism}")
    print(f"  conduta: {alert.recommendation}")
    print(f"  regras: {alert.rule_ids}")
```

### Passando contexto do paciente

```python
result = pipeline.analyze(
    text="Paciente em uso de Enalapril 10mg e Losartana 50mg",
    context={
        "patient_age": 34,
        "patient_pregnant": True,       # ativa regra R005 (IECA/BRA em gestante)
        "patient_renal_function": 45,   # TFG estimada em mL/min/1.73m²
        "patient_weight": 70,
    }
)
```

### Inspecionando o resultado completo

```python
print(result.medications_found)   # list[Medication] — fármacos extraídos e normalizados
print(result.alerts)              # list[Alert] — ordenados por score decrescente
print(result.unresolved_drugs)    # list[str] — nomes não normalizados
print(result.processing_time_ms)  # float — tempo total em ms
print(result.pipeline_version)    # str
```

### Filtrando severidade mínima

Por padrão apenas alertas `MODERADA` e `GRAVE` são retornados. Para incluir `LEVE`:

```python
import os
os.environ["MIN_SEVERITY_TO_ALERT"] = "LEVE"

pipeline = MedicationPipeline()   # recria para ler a nova variável
```

Ou passe diretamente no construtor:

```python
pipeline = MedicationPipeline(min_severity="LEVE")
```

---

## Estrutura dos modelos

### `Medication`

| Campo | Tipo | Descrição |
|---|---|---|
| `raw_name` | `str` | Nome como apareceu no texto |
| `normalized_name` | `str \| None` | Nome padronizado (principio ativo) |
| `rxnorm_id` | `int \| None` | Identificador RxNorm |
| `smiles` | `str \| None` | Estrutura molecular SMILES |
| `atc_code` | `str \| None` | Código ATC (ex: `B01AA03`) |
| `dose_value` | `float \| None` | Valor numérico da dose |
| `dose_unit` | `str \| None` | Unidade (`mg`, `g`, `mcg`, `ml`) |
| `frequency` | `str \| None` | Frequência normalizada (`8h`, `12h`, `dia`) |
| `route` | `str \| None` | Via (`oral`, `IV`, `IM`, `SC`) |
| `normalization_source` | `str` | `rxnorm` \| `anvisa` \| `fuzzy` \| `unknown` |

### `Alert`

| Campo | Tipo | Descrição |
|---|---|---|
| `drug_pair` | `tuple[str, str]` | Par de fármacos envolvidos |
| `severity` | `str` | `GRAVE` \| `MODERADA` \| `LEVE` |
| `final_score` | `float` | Score ensemble (0–1) |
| `component_scores` | `dict` | `{"drugbank": 0.95, "chemicalx": 0.78, "rules": 0.9}` |
| `mechanism` | `str` | Descrição do mecanismo |
| `recommendation` | `str` | Conduta clínica recomendada |
| `evidence` | `list[dict]` | Evidências das fontes com score > 0.3 |
| `rule_ids` | `list[str]` | Regras ativadas, ex: `["R001", "R004"]` |
| `timestamp` | `datetime` | UTC |

---

## Dependências opcionais

O motor funciona mesmo que todas as dependências abaixo estejam ausentes — nesse caso usa apenas as fontes disponíveis e redistribui os pesos do scoring proporcionalmente.

### Neo4j — interações conhecidas (DrugBank + OpenFDA)

Fornece o sinal mais forte para interações já catalogadas.

```bash
pip install neo4j>=5.18.0
```

Preencha no `.env`:
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=sua_senha
```

Para popular o grafo a partir dos dumps do DrugBank/OpenFDA:

```bash
python -m motor.scripts.populate_neo4j \
    --drugbank path/to/drugbank.xml \
    --openfda  path/to/openfda.json
```

**Se ausente:** o checker retorna `{"found": False}` e o motor continua com as outras fontes.

---

### ChemicalX + RDKit — predição por estrutura molecular

Detecta interações raras ou não catalogadas usando uma Graph Neural Network treinada sobre estruturas SMILES.

```bash
pip install rdkit>=2023.9.0 chemicalx>=0.1.0 torch>=2.2.0
```

**Se ausente:** o predictor retorna probabilidade `0.0` e é excluído do ensemble automaticamente.

---

### BioBERTpt — extração de entidades via NLP

Reconhece medicamentos, doses e vias em texto clínico em português usando o modelo `pucpr/biobertpt-all`.

```bash
pip install transformers>=4.40.0 torch>=2.2.0
```

Configure no `.env`:
```
BIOBERTPT_MODEL=pucpr/biobertpt-all
USE_GPU=false   # true para usar CUDA
```

**Se ausente:** o extrator usa fallback baseado em regex com os 50 medicamentos mais comuns do SUS. O pipeline continua funcional.

---

### Base ANVISA local — mapeamento de nomes brasileiros

O arquivo `motor/data/anvisa_rxnorm_map.csv` mapeia nomes comerciais e princípios ativos brasileiros para RxNorm ID, SMILES e código ATC. A distribuição inclui ~55 fármacos de uso comum no SUS.

Para expandir a base, adicione linhas ao CSV seguindo o esquema:

```
nome_comercial,principio_ativo,rxnorm_id,smiles,atc_code,concentracao
```

Campos `nome_comercial` e `smiles` são opcionais (pode deixar em branco). Se `nome_comercial` estiver vazio, o registro é indexado apenas pelo `principio_ativo`.

**Se ausente:** fármacos não resolvidos são incluídos em `PipelineResult.unresolved_drugs` e não participam da verificação de interações.

---

## Regras clínicas implementadas

| ID | Regra | Severidade |
|---|---|---|
| R001 | Anticoagulante + antiagregante plaquetário | GRAVE |
| R002 | Dose acima do máximo diário (Paracetamol > 4g, Ibuprofeno > 2,4g, AAS > 4g) | GRAVE |
| R003 | Duplicidade terapêutica (mesma classe ATC de 3 dígitos) | MODERADA |
| R004 | Fármaco com ajuste renal obrigatório sem TFG informada | GRAVE |
| R005 | IECA ou BRA em gestante | GRAVE |
| R006 | Dois opioides simultâneos | GRAVE |
| R007 | IMAO + antidepressivo serotoninérgico | GRAVE |
| R008 | Metotrexato + AINE | GRAVE |
| R009 | Via de administração inadequada (ex: Vancomicina oral para infecção sistêmica) | MODERADA |
| R010 | Corticosteroide sistêmico + AINE | MODERADA |

---

## Scoring ensemble

```
final_score = 0.40 × DrugBank_score + 0.30 × ChemicalX_prob + 0.30 × max(rules_scores)
```

| Faixa | Severidade |
|---|---|
| ≥ 0.70 | GRAVE |
| 0.40 – 0.69 | MODERADA |
| < 0.40 | LEVE |

Se uma fonte estiver indisponível, seu peso é redistribuído proporcionalmente entre as fontes ativas.
