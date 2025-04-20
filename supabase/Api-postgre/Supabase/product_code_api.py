import psycopg2
import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Obter a string de conexão do banco de dados
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    # String de conexão padrão para desenvolvimento local
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

app = Flask(__name__)
CORS(app)  # Permitir solicitações de diferentes origens (CORS)

@app.route('/api/product-code/reserve', methods=['POST'])
def reserve_product_code():
    """
    Reserva um código de produto para uma empresa e usuário específicos
    """
    try:
        # Obter os dados da requisição
        data = request.json
        company_id = data.get('company_id')
        user_id = data.get('user_id')
        
        # Validar dados de entrada
        if not company_id or not user_id:
            return jsonify({
                'status': 'error',
                'message': 'company_id e user_id são obrigatórios',
                'code': None
            }), 400
            
        # Conectar ao banco de dados
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Chamar a função para reservar um código
        cursor.execute("SELECT reserve_product_code(%s, %s)", (company_id, user_id))
        code = cursor.fetchone()[0]
        
        # Verificar se houve erro na função
        if code.startswith('ERROR'):
            return jsonify({
                'status': 'error',
                'message': code,
                'code': None
            }), 400
            
        # Retornar o código reservado
        return jsonify({
            'status': 'success',
            'message': 'Código reservado com sucesso',
            'code': code
        })
        
    except Exception as e:
        print(f"Erro ao reservar código: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'code': None
        }), 500
    finally:
        if connection:
            cursor.close()
            connection.close()

@app.route('/api/product-code/release', methods=['POST'])
def release_product_code():
    """
    Libera um código de produto reservado que não será mais utilizado
    """
    try:
        # Obter os dados da requisição
        data = request.json
        company_id = data.get('company_id')
        product_code = data.get('code')
        
        # Validar dados de entrada
        if not company_id or not product_code:
            return jsonify({
                'status': 'error',
                'message': 'company_id e code são obrigatórios'
            }), 400
            
        # Conectar ao banco de dados
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Excluir reserva para este código e empresa
        cursor.execute("""
            DELETE FROM product_code_reservations 
            WHERE company_id = %s AND product_code = %s
        """, (company_id, product_code))
        
        connection.commit()
        
        # Retornar sucesso
        return jsonify({
            'status': 'success',
            'message': 'Código liberado com sucesso'
        })
        
    except Exception as e:
        print(f"Erro ao liberar código: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        if connection:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
