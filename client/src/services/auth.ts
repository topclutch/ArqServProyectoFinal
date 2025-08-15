// src/services/auth.ts
import { backend1Api } from './api';

/**
 * Llama al endpoint POST /api/auth/refresh-token para renovar el JWT.
 * Si todo OK, guarda el nuevo token en localStorage y lo devuelve.
 * Si falla, limpia localStorage y devuelve null.
 */
export const refreshToken = async (): Promise<string | null> => {
  try {
    const response = await backend1Api.post('/api/auth/refresh-token');
    const newToken = response.data.token;
    localStorage.setItem('token', newToken);
    return newToken;
  } catch (error) {
    console.error('Error al refrescar token:', error);
    localStorage.removeItem('token');
    return null;
  }
};

/**
 * Verifica si el token actual es válido llamando GET /api/auth/verify-token.
 * Si recibe 401, elimina el token de localStorage.
 */
export const verifyTokenValidity = async (): Promise<boolean> => {
  try {
    await backend1Api.get('/api/auth/verify-token');
    return true;
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return false;
  }
};
