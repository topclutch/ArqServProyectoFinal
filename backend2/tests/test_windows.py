#!/usr/bin/env python3
"""
Script de prueba para Windows después del fix
"""
import os
import requests
import json
from dotenv import load_dotenv
import time

# Cargar variables de entorno
load_dotenv()

def test_after_fix():
    print("🧪 Prueba completa en Windows después del fix...\n")
    
    # Verificar JWT_SECRET
    jwt_secret = os.environ.get('JWT_SECRET')
    print(f"🔑 JWT_SECRET desde .env: {jwt_secret[:10] if jwt_secret else 'None'}... (longitud: {len(jwt_secret) if jwt_secret else 0})")
    
    if not jwt_secret:
        print("❌ JWT_SECRET no encontrado en variables de entorno")
        print("🔧 Solución: Ejecuta scripts\\fix_jwt_secrets.bat")
        return False
    
    # URLs de los backends
    backend1_url = "http://localhost:3001"
    backend2_url = "http://localhost:5000"
    
    try:
        # 1. Verificar que ambos backends respondan
        print("\n1. Verificando que ambos backends estén ejecutándose...")
        
        try:
            r1 = requests.get(f"{backend1_url}/health", timeout=5)
            print(f"✅ Backend 1 (Node.js): {r1.status_code} - {r1.json().get('message', 'OK')}")
        except requests.exceptions.ConnectionError:
            print("❌ Backend 1 no responde - ¿Está ejecutándose en puerto 3001?")
            print("🔧 Ejecuta: scripts\\start_backend1.bat")
            return False
        except Exception as e:
            print(f"❌ Error conectando a Backend 1: {e}")
            return False
        
        try:
            r2 = requests.get(f"{backend2_url}/health", timeout=5)
            print(f"✅ Backend 2 (Flask): {r2.status_code} - {r2.json().get('message', 'OK')}")
        except requests.exceptions.ConnectionError:
            print("❌ Backend 2 no responde - ¿Está ejecutándose en puerto 5000?")
            print("🔧 Ejecuta: scripts\\start_backend2.bat")
            return False
        except Exception as e:
            print(f"❌ Error conectando a Backend 2: {e}")
            return False
        
        # 2. Realizar login
        print("\n2. Realizando login...")
        login_data = {
            "email": "juan@ventas.com",
            "password": "vendedor123"
        }
        
        login_response = requests.post(f"{backend1_url}/api/auth/login", json=login_data, timeout=10)
        
        if login_response.status_code != 200:
            print(f"❌ Login falló: {login_response.status_code}")
            print(f"Respuesta: {login_response.text}")
            return False
            
        login_data = login_response.json()
        token = login_data['token']
        user = login_data['user']
        
        print(f"✅ Login exitoso para: {user['name']} ({user['role']})")
        print(f"🎫 Token obtenido: {token[:30]}...")
        
        # 3. Obtener productos
        print("\n3. Obteniendo productos...")
        products_response = requests.get(f"{backend2_url}/api/products", timeout=10)
        
        if products_response.status_code != 200:
            print(f"❌ Error obteniendo productos: {products_response.status_code}")
            return False
            
        products_data = products_response.json()
        products = products_data['data']
        
        print(f"✅ {len(products)} productos obtenidos")
        
        if not products:
            print("❌ No hay productos para probar decrease-stock")
            return False
            
        # Buscar un producto con stock > 0
        test_product = None
        for product in products:
            if product['stock'] > 0:
                test_product = product
                break
        
        if not test_product:
            print("❌ No hay productos con stock disponible")
            return False
            
        print(f"📦 Producto de prueba: {test_product['name']} (ID: {test_product['id']}, Stock: {test_product['stock']})")
        
        # 4. Probar decrease-stock (el endpoint que estaba fallando)
        print("\n4. Probando decrease-stock (endpoint que fallaba)...")
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        decrease_data = {'quantity': 1}
        
        decrease_response = requests.patch(
            f"{backend2_url}/api/products/{test_product['id']}/decrease-stock",
            json=decrease_data,
            headers=headers,
            timeout=10
        )
        
        if decrease_response.status_code == 200:
            result = decrease_response.json()
            print("✅ ¡Decrease-stock exitoso!")
            print(f"📦 Stock anterior: {test_product['stock']}")
            print(f"📦 Stock nuevo: {result['data']['stock']}")
            print(f"💬 Mensaje: {result['message']}")
        else:
            print(f"❌ Decrease-stock falló: {decrease_response.status_code}")
            print(f"Respuesta: {decrease_response.text}")
            return False
        
        # 5. Crear una venta completa
        print("\n5. Probando creación de venta completa...")
        
        sale_data = {
            "products": [
                {
                    "productId": test_product['id'],
                    "name": test_product['name'],
                    "quantity": 1,
                    "price": test_product['price']
                }
            ],
            "notes": "Venta de prueba desde Windows"
        }
        
        sale_response = requests.post(
            f"{backend1_url}/api/sales",
            json=sale_data,
            headers=headers,
            timeout=15
        )
        
        if sale_response.status_code == 201:
            sale_result = sale_response.json()
            print("✅ ¡Venta creada exitosamente!")
            print(f"💰 Total: ${sale_result['data']['total']}")
            print(f"📋 Estado: {sale_result['data']['status']}")
            print(f"🆔 ID de venta: {sale_result['data']['_id']}")
        else:
            print(f"❌ Creación de venta falló: {sale_response.status_code}")
            print(f"Respuesta: {sale_response.text}")
            return False
        
        print("\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!")
        print("✅ El sistema SOA está funcionando correctamente en Windows")
        print("✅ JWT_SECRET sincronizado entre backends")
        print("✅ Autenticación funcionando")
        print("✅ Decrease-stock funcionando")
        print("✅ Creación de ventas funcionando")
        
        return True
        
    except requests.exceptions.Timeout:
        print("❌ Timeout - Los servidores están tardando mucho en responder")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Error de conexión - Verifica que ambos backends estén ejecutándose")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

if __name__ == '__main__':
    success = test_after_fix()
    if not success:
        print("\n🔧 Pasos para solucionar:")
        print("1. Ejecuta: scripts\\fix_jwt_secrets.bat")
        print("2. Ejecuta: scripts\\kill_servers.bat")
        print("3. Terminal 1: scripts\\start_backend1.bat")
        print("4. Terminal 2: scripts\\start_backend2.bat")
        print("5. Ejecuta de nuevo: python backend2\\test_windows.py")
    
    input("\nPresiona Enter para continuar...")
