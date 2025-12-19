// ========================================
// CONFIGURACIÓN CENTRAL DE LA APLICACIÓN
// ========================================

const APP_CONFIG = {
  // URL de tu Google Apps Script
  API_URL: 'https://script.google.com/macros/s/AKfycbwUagbwJM4pjlGRtMcnUNLB2QTH1AZ9GhQdMjSjwmDLCCQYv2U41kjmRc04y_s7gBpc5A/exec',
  
  // Google OAuth Client ID
  GOOGLE_CLIENT_ID: '576598653306-fm5g5lo3lisp7fhq25h7222fdaqti70v.apps.googleusercontent.com',
  
  // Configuración de la app
  APP_NAME: 'Gestor de Cromos',
  VERSION: '1.0.0'
};

// NO EDITAR - Se exporta para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
}