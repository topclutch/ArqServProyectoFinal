#!/usr/bin/env python3
"""
Script rápido para probar JWT después del fix
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def quick_test():
    print("🧪 Prueba rápida después del fix de JWT...\n")
    
    # Verificar JWT_SECRET
    jwt_secret = os.environ.get('JWT_SECRET')
    print(f"🔑 JWT_SECRET cargado: {jwt_secret[:10]}... (longitud: {len(jwt_secret) if jwt_secret else 0})")
    
    if not jwt_secret:
        print("❌ JWT_SECRET no encontrado en .env")
        return
    
    # URLs
    backend1_url = "http://localhost:3001"
    backend2_url = "http://localhost:5000"
    
    try:
        # 1. Verificar que ambos backends respondan
        print("\n1. Verificando backends...")
        r1 = requests.get(f"{backend1_url}/health", timeout=5)
        r2 = requests.get(f"{backend2_url}/health", timeout=5)
        print(f"✅ Backend 1: {r1.status_code}")
        print(f"✅ Backend 2: {r2.status_code}")
        
        # 2. Login
        print("\n2. Realizando login...")
        login_data = {
            "email": "juan@ventas.com",
            "password": "vendedor123"
        }
        login_response = requests.post(f"{backend1_url}/api/auth/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ Login falló: {login_response.status_code}")
            print(login_response.text)
            return
            
        token = login_response.json()['token']
        print(f"✅ Token obtenido: {token[:30]}...")
        
        # 3. Obtener productos
        print("\n3. Obteniendo productos...")
        products_response = requests.get(f"{backend2_url}/api/products")
        products = products_response.json()['data']
        
        if not products:
            print("❌ No hay productos para probar")
            return
            
        test_product = products[0]
        print(f"📦 Producto de prueba: {test_product['name']} (Stock: {test_product['stock']})")
        
        # 4. Probar decrease-stock
        print("\n4. Probando decrease-stock...")
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        decrease_data = {'quantity': 1}
        
        decrease_response = requests.patch(
            f"{backend2_url}/api/products/{test_product['id']}/decrease-stock",
            json=decrease_data,
            headers=headers
        )
        
        if decrease_response.status_code == 200:
            result = decrease_response.json()
            print("✅ ¡Decrease-stock exitoso!")
            print(f"📦 Nuevo stock: {result['data']['stock']}")
            print(f"💬 {result['message']}")
            print("\n🎉 ¡JWT_SECRET sincronizado correctamente!")
        else:
            print(f"❌ Decrease-stock falló: {decrease_response.status_code}")
            print(decrease_response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Error de conexión - ¿Están ambos backends ejecutándose?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    quick_test()
