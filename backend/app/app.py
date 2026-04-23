from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permite conexão do frontend

@app.route('/')
def home():
    return {'message': 'Backend funcionando!'}

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)