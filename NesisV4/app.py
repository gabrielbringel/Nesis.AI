# -*- coding: utf-8 -*-
"""
Intercept CDSS — Servidor Web
Serve a interface HTML e expõe /analyze para processar PDFs de prontuário.
"""

import io
import sys
import json
from flask import Flask, request, jsonify, send_from_directory

# ── Caminhos dos módulos existentes ─────────────────────────────────
sys.path.insert(0, r"C:\Users\Ricardo\Downloads")
sys.path.insert(0, r"C:\Users\Ricardo\.gemini\antigravity\scratch")

from soap_tester import SOAPCDSSRunner   # não modifica nenhum arquivo existente

app    = Flask(__name__, static_folder=".")
runner = SOAPCDSSRunner()


# ── Extração de texto do PDF ─────────────────────────────────────────
def extrair_texto_pdf(file_bytes: bytes) -> str:
    """Tenta pdfplumber → PyPDF2 → erro."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except ImportError:
        pass
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except ImportError:
        raise RuntimeError("Instale pdfplumber: pip install pdfplumber")


# ── Rotas ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    texto = ""
    caso_id = "WEB"

    # Modo 1: upload de PDF
    if "pdf" in request.files:
        f = request.files["pdf"]
        caso_id = f.filename
        try:
            texto = extrair_texto_pdf(f.read())
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    # Modo 2: JSON com campo "texto" (paste direto)
    elif request.is_json and request.json.get("texto"):
        texto = request.json["texto"]
        caso_id = "TEXTO_COLADO"

    else:
        return jsonify({"error": "Envie um PDF ou JSON {\"texto\": \"...\"}"}), 400

    if not texto.strip():
        return jsonify({"error": "Nenhum texto extraído do PDF."}), 400

    try:
        resultado = runner.run(texto, caso_id=caso_id)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": f"Erro na análise: {e}"}), 500


if __name__ == "__main__":
    print("\n  Intercept CDSS — http://localhost:5000\n")
    app.run(debug=False, port=5000, host="0.0.0.0")
