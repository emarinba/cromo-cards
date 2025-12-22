// ========================================
// CONFIGURACIÓN CENTRAL DE LA APLICACIÓN
// ========================================

const APP_CONFIG = {
  // URL de tu Google Apps Script
  API_URL: 'https://script.google.com/macros/s/AKfycbwUagbwJM4pjlGRtMcnUNLB2QTH1AZ9GhQdMjSjwmDLCCQYv2U41kjmRc04y_s7gBpc5A/exec',
  
  // Google OAuth Client ID - Cópialo EXACTAMENTE desde Google Cloud Console
  // Ejemplo: '123456789-abcdefg.apps.googleusercontent.com'
  GOOGLE_CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
  
  // Configuración de la app
  APP_NAME: 'Gestor de Cromos',
  VERSION: '1.0.0'
};

// NO EDITAR - Se exporta para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
}