#!/usr/bin/env python3
"""
Backend 2 - Flask + MySQL (Productos) - VERSIÓN FINAL CORREGIDA
Sistema SOA - Gestión de Productos
"""
import os
import pymysql
import jwt
from functools import wraps
from datetime import datetime
from dotenv import load_dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_restful import Api, Resource
from flasgger import Swagger, swag_from
from marshmallow import Schema, fields, ValidationError

import json
from decimal import Decimal

# Cargar variables de entorno al inicio de la aplicación
load_dotenv()

# --- Configuración de la aplicación ---
app = Flask(__name__)

# JWT_SECRET desde variables de entorno
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    print("❌ ADVERTENCIA: JWT_SECRET no encontrado en variables de entorno")
    JWT_SECRET = 'JlpGNqdI-mt4tPavhvUAerYNUcvlOj8lR0Oy-1OzsHU'  # Fallback

print(f"🔑 JWT_SECRET cargado: {JWT_SECRET[:10]}... (longitud: {len(JWT_SECRET)})")

app.config['SECRET_KEY'] = JWT_SECRET
app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', 'soa_products')
app.config['MYSQL_PORT'] = int(os.environ.get('MYSQL_PORT', 3306))

# CORS configurado correctamente
CORS(app, origins=['http://localhost:5173', 'http://localhost:3001'], 
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'])

api = Api(app)

# Encoder personalizado para Decimal y datetime
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app.json_encoder = CustomJSONEncoder

# Configurar Swagger
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec_1',
            "route": '/apispec_1.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api-docs/"
}
swagger = Swagger(app, config=swagger_config)

# --- Esquema Marshmallow para Producto ---
class ProductSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=lambda x: len(x) >= 2)
    price = fields.Float(required=True, validate=lambda x: x >= 0)
    stock = fields.Int(required=True, validate=lambda x: x >= 0)
    description = fields.Str(required=True)
    category = fields.Str(required=True)
    image_url = fields.Url(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

product_schema = ProductSchema()
products_schema = ProductSchema(many=True)

# --- Función de serialización mejorada ---
def serialize_product(product):
    """Convierte campos Decimal y datetime a tipos serializables en JSON."""
    if not product:
        return product

    if isinstance(product, list):
        return [serialize_product(p) for p in product]

    serialized = {}
    for key, value in product.items():
        if isinstance(value, Decimal):
            serialized[key] = float(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized

# --- Conexión a MySQL ---
def get_db_connection():
    try:
        connection = pymysql.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            password=app.config['MYSQL_PASSWORD'],
            database=app.config['MYSQL_DB'],
            port=app.config['MYSQL_PORT'],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a MySQL: {e}")
        return None

# --- Decoradores para autenticación y autorización CORREGIDOS ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            print("❌ No se encontró header Authorization")
            return {'success': False, 'message': 'Token requerido'}, 401
        
        try:
            # Limpiar el token
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
            else:
                token = auth_header
            
            print(f"🔍 Token recibido: {token[:20]}...")
            print(f"🔑 Usando JWT_SECRET: {JWT_SECRET[:10]}...")
            
            # Decodificar con el mismo secret que Backend 1
            user_data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            print(f"✅ Token decodificado exitosamente para usuario: {user_data.get('email')}")
            
            # CORREGIDO: Pasar user_data como primer argumento después de self
            return f(args[0], user_data, *args[1:], **kwargs)
            
        except jwt.ExpiredSignatureError:
            print("❌ Token expirado")
            return {'success': False, 'message': 'Token expirado', 'code': 'TOKEN_EXPIRED'}, 401
        except jwt.InvalidSignatureError:
            print("❌ Firma de token inválida - JWT_SECRET no coincide")
            return {'success': False, 'message': 'Token inválido - firma incorrecta', 'code': 'INVALID_SIGNATURE'}, 401
        except jwt.InvalidTokenError as e:
            print(f"❌ Token inválido: {e}")
            return {'success': False, 'message': f'Token inválido: {str(e)}', 'code': 'INVALID_TOKEN'}, 401
        except Exception as e:
            print(f"❌ Error general de autenticación: {e}")
            return {'success': False, 'message': f'Error de autenticación: {str(e)}'}, 401
            
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(self, current_user, *args, **kwargs):
        if current_user.get('role') != 'Administrador':
            return {'success': False, 'message': 'Permisos de administrador requeridos'}, 403
        return f(self, current_user, *args, **kwargs)
    return decorated

# --- Inicialización de la base de datos ---
def init_database():
    """Inicializa la base de datos y crea las tablas necesarias"""
    connection = get_db_connection()
    if not connection:
        print("❌ No se pudo conectar a la base de datos para inicialización")
        return False
    
    try:
        with connection.cursor() as cursor:
            # Crear tabla de productos
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    stock INT NOT NULL DEFAULT 0,
                    description TEXT,
                    category VARCHAR(100),
                    image_url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
            
            # Verificar si hay productos
            cursor.execute("SELECT COUNT(*) as count FROM products")
            result = cursor.fetchone()
            
            if result['count'] == 0:
                # Insertar productos de ejemplo
                sample_products = [
                    ("iPhone 14 Pro", 1299.99, 50, "Último modelo de iPhone con chip A16 Bionic", "Electrónica", "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg"),
                    ("Samsung Galaxy S23", 999.99, 75, "Smartphone Android con cámara de 200MP", "Electrónica", "https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"),
                    ("MacBook Pro 14", 2499.99, 30, "Laptop profesional con chip M2 Pro", "Electrónica", "https://images.pexels.com/photos/18105/pexels-photo.jpg"),
                    ("Camisa Casual", 49.99, 100, "Camisa de algodón 100% para uso diario", "Ropa", "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg"),
                    ("Jeans Premium", 89.99, 80, "Jeans de mezclilla premium con corte moderno", "Ropa", "https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg"),
                ]
                
                cursor.executemany("""
                    INSERT INTO products (name, price, stock, description, category, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, sample_products)
                
                print(f"✅ {len(sample_products)} productos de ejemplo insertados")
            
        connection.commit()
        print("✅ Base de datos inicializada correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error inicializando la base de datos: {e}")
        connection.rollback()
        return False
    finally:
        connection.close()

# --- Recursos de la API ---
class ProductListResource(Resource):
    def get(self):
        """Obtener todos los productos - No requiere autenticación"""
        connection = get_db_connection()
        if not connection:
            return {'success': False, 'message': 'Error de conexión a la base de datos'}, 500

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM products ORDER BY created_at DESC")
                products = cursor.fetchall()
                products = serialize_product(products)
                return {'success': True, 'data': products, 'count': len(products)}, 200
        except Exception as e:
            print(f"Error en GET /api/products: {e}")
            return {'success': False, 'message': str(e)}, 500
        finally:
            connection.close()

    @token_required
    @admin_required
    def post(self, current_user):
        """Crear nuevo producto - Requiere admin"""
        try:
            product_data = product_schema.load(request.json)
        except ValidationError as err:
            return {'success': False, 'message': 'Datos inválidos', 'errors': err.messages}, 400
        except Exception as e:
            return {'success': False, 'message': f'Error procesando el JSON de entrada: {e}'}, 400

        connection = get_db_connection()
        if not connection:
            return {'success': False, 'message': 'Error de conexión a la base de datos'}, 500

        try:
            with connection.cursor() as cursor:
                query = """
                    INSERT INTO products (name, price, stock, description, category, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
                cursor.execute(query, (
                    product_data['name'],
                    product_data['price'],
                    product_data['stock'],
                    product_data['description'],
                    product_data['category'],
                    product_data['image_url']
                ))
                product_id = cursor.lastrowid
                connection.commit()

                cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
                new_product = cursor.fetchone()
                serialized_product = serialize_product(new_product)

                return {
                    'success': True,
                    'message': 'Producto creado exitosamente',
                    'data': serialized_product
                }, 201
        except Exception as e:
            connection.rollback()
            print(f"Error en POST /api/products: {e}")
            return {'success': False, 'message': str(e)}, 500
        finally:
            connection.close()
    
class ProductResource(Resource):
    def get(self, id):
        """Obtener producto por ID - No requiere autenticación"""
        connection = get_db_connection()
        if not connection:
            return {'success': False, 'message': 'Error de conexión a la base de datos'}, 500
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM products WHERE id = %s", (id,))
                product = cursor.fetchone()
                if not product:
                    return {'success': False, 'message': 'Producto no encontrado'}, 404
                
                product = serialize_product(product)
                return {'success': True, 'data': product}
        except Exception as e:
            print(f"Error en GET /api/products/<id>: {e}")
            return {'success': False, 'message': str(e)}, 500
        finally:
            connection.close()

    @token_required
    @admin_required
    def put(self, current_user, id):
        """Actualizar producto - Requiere admin"""
        try:
            product_data = product_schema.load(request.json)
        except ValidationError as err:
            return {'success': False, 'message': 'Datos inválidos', 'errors': err.messages}, 400
        
        connection = get_db_connection()
        if not connection:
            return {'success': False, 'message': 'Error de conexión a la base de datos'}, 500
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM products WHERE id = %s", (id,))
                if not cursor.fetchone():
                    return {'success': False, 'message': 'Producto no encontrado'}, 404
                
                set_clauses = []
                values = []
                for key, value in product_data.items():
                    if key not in ['id', 'created_at', 'updated_at']:
                        set_clauses.append(f"{key} = %s")
                        values.append(value)
                
                if not set_clauses:
                    return {'success': False, 'message': 'No se proporcionaron campos para actualizar'}, 400
                
                query = f"UPDATE products SET {', '.join(set_clauses)} WHERE id = %s"
                values.append(id)
                cursor.execute(query, tuple(values))
                connection.commit()

                cursor.execute("SELECT * FROM products WHERE id = %s", (id,))
                updated_product = cursor.fetchone()
                updated_product = serialize_product(updated_product)

                return {'success': True, 'message': 'Producto actualizado exitosamente', 'data': updated_product}
        except Exception as e:
            connection.rollback()
            print(f"Error en PUT /api/products/<id>: {e}")
            return {'success': False, 'message': str(e)}, 500
        finally:
            connection.close()

    @token_required
    @admin_required
    def delete(self, current_user, id):
        """Eliminar producto - Requiere admin"""
        connection = get_db_connection()
        if not connection:
            return {'success': False, 'message': 'Error de conexión a la base de datos'}, 500
        try:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM products WHERE id = %s", (id,))
                if cursor.rowcount == 0:
                    return {'success': False, 'message': 'Producto no encontrado'}, 404
                connection.commit()
                return {'success': True, 'message': 'Producto eliminado exitosamente'}, 200
        except Exception as e:
            connection.rollback()
            print(f"Error en DELETE /api/products/<id>: {e}")
            return {'success': False, 'message': str(e)}, 500
        finally:
            connection.close()

# Recurso para disminuir stock - VERSIÓN FINAL CORREGIDA
class ProductDecreaseStockResource(Resource):
    @token_required
    def patch(self, current_user, id):
        """Disminuir stock de un producto - Requiere autenticación"""
        print(f"🔍 PATCH /api/products/{id}/decrease-stock iniciado")
        print(f"👤 Usuario autenticado: {current_user.get('email')} ({current_user.get('role')})")
        
        data = request.get_json() or {}
        quantity = data.get('quantity')
        
        print(f"📦 Cantidad solicitada: {quantity}")
        
        # Validación mejorada
        if not quantity or not isinstance(quantity, int) or quantity <= 0:
            return {
                'success': False,
                'message': 'La cantidad debe ser un entero positivo'
            }, 400

        connection = get_db_connection()
        if not connection:
            return {'success': False, 'message': 'Error de conexión a la base de datos'}, 500
        
        try:
            with connection.cursor() as cursor:
                # Obtener el producto actual
                cursor.execute("SELECT * FROM products WHERE id = %s", (id,))
                product = cursor.fetchone()
                if not product:
                    print(f"❌ Producto {id} no encontrado")
                    return {'success': False, 'message': 'Producto no encontrado'}, 404

                print(f"📦 Producto encontrado: {product['name']} (Stock actual: {product['stock']})")

                # Verificar stock suficiente
                if product['stock'] < quantity:
                    print(f"❌ Stock insuficiente: disponible {product['stock']}, solicitado {quantity}")
                    return {
                        'success': False,
                        'message': f'Stock insuficiente. Disponible: {product["stock"]}, Solicitado: {quantity}'
                    }, 400

                # Actualizar el stock
                new_stock = product['stock'] - quantity
                cursor.execute("UPDATE products SET stock = %s WHERE id = %s", (new_stock, id))
                connection.commit()
                
                print(f"✅ Stock actualizado: {product['stock']} → {new_stock}")
                
                # Obtener el producto actualizado
                cursor.execute("SELECT * FROM products WHERE id = %s", (id,))
                updated_product = cursor.fetchone()
                updated_product = serialize_product(updated_product)
                
                return {
                    'success': True,
                    'data': updated_product,
                    'message': f'Stock disminuido en {quantity} unidades. Nuevo stock: {new_stock}'
                }, 200
                
        except Exception as e:
            connection.rollback()
            print(f"❌ Error en PATCH /api/products/<id>/decrease-stock: {e}")
            return {'success': False, 'message': f'Error interno: {str(e)}'}, 500
        finally:
            connection.close()

# Ruta de salud
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'Backend 2 - Productos funcionando correctamente',
        'timestamp': datetime.now().isoformat(),
        'jwt_secret_length': len(JWT_SECRET)
    })

# Ruta de debug para JWT
@app.route('/debug/jwt')
def debug_jwt():
    return jsonify({
        'jwt_secret_configured': bool(JWT_SECRET),
        'jwt_secret_length': len(JWT_SECRET) if JWT_SECRET else 0,
        'jwt_secret_preview': JWT_SECRET[:10] + '...' if JWT_SECRET else None
    })

# Registrar recursos
api.add_resource(ProductListResource, '/api/products')
api.add_resource(ProductResource, '/api/products/<int:id>')
api.add_resource(ProductDecreaseStockResource, '/api/products/<int:id>/decrease-stock')

# Inicializar la base de datos al arrancar
with app.app_context():
    init_database()

if __name__ == '__main__':
    print("🚀 Iniciando Backend 2 - Flask + MySQL (VERSIÓN FINAL)")
    print(f"🔑 JWT Secret configurado: {JWT_SECRET[:10]}... (longitud: {len(JWT_SECRET)})")
    print(f"🗄️ Base de datos: {app.config['MYSQL_HOST']}:{app.config['MYSQL_PORT']}/{app.config['MYSQL_DB']}")
    app.run(host='127.0.0.1', port=5000, debug=True)