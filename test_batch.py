import sys
from motor.pipeline import MedicationPipeline

def run_tests():
    pipeline = MedicationPipeline()

    testes = [
        "Paciente eM uSo de lbupr0fen0 relata dor n0 est0mag0. P.A. 120 / 80", # Typos e leetspeak
        "Uso continuo de AAS 100mg 1x ao dia.", # Siglas (AAS)
        "Paciente em uso de Marevan e iniciou Aspirina hoje.", # Interação Grave (Anticoagulante + Antiagregante)
        "Fazendo uso de Fluoxetina e Selegilina simultaneamente." # Interação Grave (ISRS + IMAO)
    ]

    for frase in testes:
        print(f"\n" + "="*60)
        print(f"TEXTO: '{frase}'")
        result = pipeline.analyze(frase)
        
        print("\nMEDICAMENTOS ENCONTRADOS:")
        if not result.medications_found:
            print("  Nenhum.")
        for med in result.medications_found:
            print(f"  - Original: '{med.raw_name}' --> Normalizado: '{med.normalized_name}' (Fonte: {med.normalization_source})")
            if med.dose_value:
                print(f"    Dose: {med.dose_value}{med.dose_unit} | Freq: {med.frequency}")
        
        print("\nALERTAS DE INTERACAO:")
        if result.alerts:
            for alert in result.alerts:
                print(f"  - [{alert.severity}] {alert.name}")
                print(f"    Mecanismo: {alert.mechanism}")
        else:
            print("  - Nenhum alerta gerado.")
            
if __name__ == "__main__":
    # Desabilita logs de warning para focar na saída
    import logging
    logging.getLogger("motor").setLevel(logging.ERROR)
    run_tests()
