from motor.pipeline import MedicationPipeline

# Inicializa o motor
pipeline = MedicationPipeline()
texto = 0
while texto != -1:
    # Testa o motor com uma frase que inclui dose, via e frequência
    texto = input("Digite a frase para análise:")
    result = pipeline.analyze(texto)

    # Mostra os medicamentos extraídos com mais detalhes
    print(f"⏱️Tempo de processamento: {result.processing_time_ms:.2f} ms")
    print(f"⚙️ Versão do Pipeline: {result.pipeline_version}\n")

    print("Medicamentos Identificados e Normalizados:")
    for med in result.medications_found:
        print(f"- Nome: {med.raw_name} (ATC: {med.atc_code})")
        print(f"  Dose: {med.dose_value}{med.dose_unit} | Via: {med.route} | Freq: {med.frequency}")
        print(f"  Fonte: {med.normalization_source}\n")

    if result.unresolved_drugs:
        print("❓ Fármacos não reconhecidos:")
        for un in result.unresolved_drugs:
            print(f"- {un}")
        print()

    print("⚠️ Alertas Gerados:")
    if not result.alerts:
        print("Nenhum alerta encontrado.")
    for alert in result.alerts:
        print(f"[{alert.severity}] {alert.drug_pair[0].upper()} + {alert.drug_pair[1].upper()}")
        print(f"  Mecanismo: {alert.mechanism}")
        print(f"  Conduta/Recomendação: {alert.recommendation}")
        print(f"  Score: {alert.final_score:.2f} (Regras: {alert.rule_ids})")
        print("-" * 40)
