#!/usr/bin/env python3
"""
Script para debuggear problemas de JWT entre backends
"""
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

def debug_token():
    # Token de ejemplo que deberías obtener del login
    # Reemplaza este token con uno real de tu login
    sample_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzU5YjE2ZjQyMzQ1Njc4OTBhYmNkZWYiLCJlbWFpbCI6Imp1YW5AdmVudGFzLmNvbSIsInJvbGUiOiJWZW5kZWRvciIsIm5hbWUiOiJWZW5kZWRvciBKdWFuIiwiaWF0IjoxNzMzNTI5ODk4LCJleHAiOjE3MzM2MTYyOTh9"
    
    jwt_secret = os.environ.get('JWT_SECRET')
    
    print("🔍 Debug de JWT Token")
    print(f"JWT_SECRET desde .env: {jwt_secret}")
    print(f"Longitud del secret: {len(jwt_secret) if jwt_secret else 'None'}")
    print(f"Token de ejemplo: {sample_token[:50]}...")
    
    if not jwt_secret:
        print("❌ JWT_SECRET no encontrado en variables de entorno")
        return
    
    try:
        # Intentar decodificar el token
        decoded = jwt.decode(sample_token, jwt_secret, algorithms=['HS256'])
        print("✅ Token decodificado exitosamente:")
        print(f"   Usuario ID: {decoded.get('userId')}")
        print(f"   Email: {decoded.get('email')}")
        print(f"   Rol: {decoded.get('role')}")
        print(f"   Nombre: {decoded.get('name')}")
        
    except jwt.ExpiredSignatureError:
        print("⚠️ Token expirado (esto es normal si es un token viejo)")
        
    except jwt.InvalidSignatureError:
        print("❌ Firma inválida - JWT_SECRET no coincide")
        print("🔧 Soluciones:")
        print("   1. Verifica que JWT_SECRET sea idéntico en ambos backends")
        print("   2. Reinicia ambos servidores después de cambiar .env")
        print("   3. Verifica que no haya espacios extra en JWT_SECRET")
        
    except jwt.InvalidTokenError as e:
        print(f"❌ Token inválido: {e}")
        
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == '__main__':
    debug_token()
