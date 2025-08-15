import { API_CONFIG } from '../config/constants';
import { backend1Api } from '../services/api';

export const debugApiRequest = async (payload: any) => {
  try {
    const response = await backend1Api.post('/api/sales', payload);
    
    // MEJORA: Manejo de respuesta más robusto
    if (response.data && (response.data.success || response.data._id)) {
      return {
        success: true,
        data: response.data,
        message: 'Venta creada exitosamente'
      };
    }
    
    // Si la respuesta no tiene el formato esperado
    throw new Error(response.data.message || 'Respuesta inesperada del servidor');
  } catch (error: any) {
    console.error('Full error:', {
      message: error.message,
      payload,
      response: error.response?.data
    });
    
    // MEJORA: Propagar el error con más contexto
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Error desconocido al crear venta';
    
    throw new Error(errorMessage);
  }
};