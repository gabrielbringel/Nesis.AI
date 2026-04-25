"""Adaptador para o motor de IA (LLM + RAG).

Por enquanto exporta apenas o stub determinístico que retorna mocks
realistas para validar o pipeline de ponta a ponta com a extensão.
"""

from app.motor.stub import analyze

__all__ = ["analyze"]
