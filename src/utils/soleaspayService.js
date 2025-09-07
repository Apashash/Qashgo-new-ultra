/**
 * Service d'intégration SoleasPay pour le traitement des paiements
 * Basé sur la documentation officielle SoleasPay
 */

const SOLEASPAY_BASE_URL = 'https://soleaspay.com';

// ========================================
// 🔑 CONFIGUREZ VOTRE CLÉ API SOLEASPAY ICI
// ========================================
// Remplacez la clé ci-dessous par votre vraie clé API SoleasPay
// Obtenez votre clé sur : https://soleaspay.com (tableau de bord)

const API_CONFIG = {
  API_KEY: 'CnKwsRD0pLYO2etn82SvBUy_TjeqbsJaRpUpNEHDP1s-AP', // 👈 MODIFIEZ CETTE CLÉ
  OPERATION_PAY_IN: 2, // Code pour collecte de paiement
  AMOUNT: 200, // Montant fixe d'activation
  CURRENCY: 'XAF' // Franc CFA
};

/**
 * Debug: Afficher les configurations API (sans exposer les secrets)
 */
function debugAPIConfig() {
  console.log('🔧 Configuration SoleasPay:', {
    baseUrl: SOLEASPAY_BASE_URL,
    hasApiKey: !!API_CONFIG.API_KEY,
    apiKeyLength: API_CONFIG.API_KEY ? API_CONFIG.API_KEY.length : 0,
    operation: API_CONFIG.OPERATION_PAY_IN,
    amount: API_CONFIG.AMOUNT,
    currency: API_CONFIG.CURRENCY
  });
}

/**
 * Note: Pour les endpoints /api/agent/*, nous n'avons besoin que de x-api-key
 * L'authentification Bearer token n'est nécessaire que pour /api/action/*
 * Nous supprimons donc cette fonction pour l'instant
 */

// Les fonctions de token Bearer ne sont pas nécessaires pour /api/agent/*

/**
 * Déterminer le code de service selon l'opérateur mobile money
 * Basé sur la documentation SoleasPay
 */
function getServiceCode(operator, country) {
  // Codes de service SoleasPay (selon la documentation)
  const SERVICE_CODES = {
    'mtn': 1,        // MTN Mobile Money
    'orange': 2,     // Orange Money  
    'moov': 3,       // Moov Money
    'wave': 4,       // Wave
    'airtel': 5,     // Airtel Money
    'tmoney': 6,     // T-Money
    'mpesa': 7,      // M-Pesa
    'vodacom': 8,    // Vodacom
    'expresso': 9,   // Expresso
    'wizall': 10,    // Wizall
    'free': 11       // Free Money
  };
  
  return SERVICE_CODES[operator.toLowerCase()] || 2; // Orange par défaut
}

/**
 * Créer une demande de paiement via l'API SoleasPay
 */
export async function createPaymentRequest(paymentData) {
  try {
    debugAPIConfig();
    
    const {
      user,
      phoneNumber,
      operator,
      country,
      callbackUrl,
      successUrl,
      failureUrl
    } = paymentData;

    // Génération d'un ID de commande unique
    const orderId = `QASHGO_${user.id}_${Date.now()}`;
    
    // Détermine le service selon l'opérateur
    const serviceCode = getServiceCode(operator, country);
    
    const headers = {
      'x-api-key': API_CONFIG.API_KEY,
      'operation': API_CONFIG.OPERATION_PAY_IN.toString(),
      'service': serviceCode.toString(),
      'Content-Type': 'application/json'
    };

    // Ajouter OTP header si Orange Money
    if (operator.toLowerCase() === 'orange') {
      // L'OTP peut être fourni ou géré par SoleasPay
      // headers['otp'] = otpCode; // Si nécessaire
    }

    const requestBody = {
      wallet: phoneNumber,
      amount: API_CONFIG.AMOUNT,
      currency: API_CONFIG.CURRENCY,
      order_id: orderId,
      description: `Activation compte QASHGO - ${user.name}`,
      payer: user.name,
      payerEmail: user.email,
      successUrl: successUrl,
      failureUrl: failureUrl
    };

    console.log('🚀 Création paiement SoleasPay:', { 
      orderId, 
      amount: API_CONFIG.AMOUNT, 
      service: serviceCode,
      operator,
      phoneNumber: phoneNumber ? phoneNumber.substring(0, 3) + '***' : 'MISSING'
    });
    
    console.log('📤 Headers de paiement:', {
      'x-api-key': headers['x-api-key'] ? headers['x-api-key'].substring(0, 10) + '...' : 'MISSING',
      'operation': headers['operation'],
      'service': headers['service'],
      'Content-Type': headers['Content-Type']
    });
    
    console.log('📤 Body de paiement:', {
      ...requestBody,
      wallet: requestBody.wallet ? requestBody.wallet.substring(0, 3) + '***' : 'MISSING',
      payerEmail: requestBody.payerEmail ? requestBody.payerEmail.substring(0, 3) + '***' : 'MISSING'
    });

    const response = await fetch(`${SOLEASPAY_BASE_URL}/api/agent/bills/v3`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Réponse paiement status:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('📥 Réponse paiement data:', result);
    
    if (result.success && result.data) {
      // Stocker les informations de la transaction pour suivi
      const transactionData = {
        orderId: orderId,
        reference: result.data.reference,
        external_reference: result.data.external_reference,
        amount: result.data.amount,
        currency: result.data.currency,
        status: result.status,
        created_at: result.created_at,
        user_id: user.id
      };
      
      // Sauvegarder localement pour le suivi
      localStorage.setItem(`soleaspay_transaction_${orderId}`, JSON.stringify(transactionData));
      
      console.log('✅ Paiement créé avec succès:', transactionData);
      
      return {
        success: true,
        orderId: orderId,
        reference: result.data.reference,
        status: result.status,
        message: result.message,
        transactionData: transactionData
      };
    }
    
    throw new Error(result.message || 'Erreur lors de la création du paiement');
    
  } catch (error) {
    console.error('❌ Erreur création paiement SoleasPay:', error);
    throw error;
  }
}

/**
 * Vérifier le statut d'une transaction
 */
export async function verifyPaymentStatus(orderId, paymentReference) {
  try {
    const headers = {
      'x-api-key': API_CONFIG.API_KEY,
      'operation': '2',
      'service': '1',
      'Content-Type': 'application/json'
    };

    const url = `${SOLEASPAY_BASE_URL}/api/agent/verif-pay?orderId=${orderId}&payId=${paymentReference}`;
    
    console.log('🔍 Vérification statut paiement:', { orderId, paymentReference });

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        status: result.status,
        data: result.data,
        message: result.message,
        isCompleted: result.status === 'SUCCESS' || result.data?.status === 'SUCCESS'
      };
    }
    
    return {
      success: false,
      message: result.message || 'Transaction non trouvée'
    };
    
  } catch (error) {
    console.error('Erreur vérification paiement:', error);
    throw error;
  }
}

/**
 * Obtenir les détails d'une transaction (fonction simplifiée)
 * Note: Cette fonction nécessite un Bearer token que nous n'implémentons pas pour l'instant
 */
export async function getTransactionDetails(transactionReference) {
  console.log('⚠️ getTransactionDetails non implémenté (nécessite Bearer token)');
  return { success: false, message: 'Fonction non implémentée' };
}

/**
 * Valider la signature du callback SoleasPay
 * Utilisé pour vérifier l'authenticité des notifications
 */
export function validateCallbackSignature(callbackData, receivedHash, secretKey) {
  // Note: La validation de signature devrait être faite côté serveur
  // Cette fonction est un exemple de la logique nécessaire
  const crypto = require('crypto');
  const expectedHash = crypto.createHash('sha512')
    .update(JSON.stringify(callbackData) + secretKey)
    .digest('hex');
  
  return expectedHash === receivedHash;
}

/**
 * Mapper les codes de pays aux opérateurs supportés
 */
export function getSupportedOperators(countryCode) {
  const COUNTRY_OPERATORS = {
    'benin': ['mtn', 'moov'],
    'burkina_faso': ['moov', 'orange'], 
    'cameroon': ['mtn', 'orange'],
    'congo_brazzaville': ['mtn', 'airtel'],
    'congo_kinshasa': ['orange', 'vodacom', 'airtel'],
    'cote_divoire': ['mtn', 'wave', 'moov', 'orange'],
    'mali': ['orange', 'moov'],
    'gabon': ['airtel'],
    'togo': ['moov', 'tmoney'],
    'kenya': ['mpesa'],
    'rwanda': ['mtn'],
    'senegal': ['free', 'wave', 'expresso', 'wizall', 'orange'],
    'uganda': ['mtn', 'airtel']
  };
  
  return COUNTRY_OPERATORS[countryCode] || ['mtn', 'orange'];
}

export default {
  createPaymentRequest,
  verifyPaymentStatus,
  getTransactionDetails,
  getSupportedOperators
};