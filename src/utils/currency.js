// Système de devises par pays pour QASHGO
export const COUNTRY_CURRENCIES = {
  'benin': { 
    currency: 'XOF', 
    symbol: 'FCFA', 
    rate: 1, // Base currency
    label: '🇧🇯 Bénin'
  },
  'burkina-faso': { 
    currency: 'XOF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇧🇫 Burkina Faso'
  },
  'cameroon': { 
    currency: 'XAF', 
    symbol: 'FCFA', 
    rate: 1, // Même valeur que XOF
    label: '🇨🇲 Cameroun'
  },
  'congo-brazza': { 
    currency: 'XAF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇨🇬 Congo-Brazzaville'
  },
  'drc-congo': { 
    currency: 'CDF', 
    symbol: 'FC', 
    rate: 5.0283, // 1 FCFA = 5.0283 CDF (taux réel sept 2025)
    label: '🇨🇩 RDC (Congo Kinshasa)'
  },
  'cote-ivoire': { 
    currency: 'XOF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇨🇮 Côte d\'Ivoire'
  },
  'gabon': { 
    currency: 'XAF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇬🇦 Gabon'
  },
  'togo': { 
    currency: 'XOF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇹🇬 Togo'
  },
  'kenya': { 
    currency: 'KES', 
    symbol: 'KSh', 
    rate: 0.2255, // 1 FCFA = 0.2255 KES (taux réel sept 2025)
    label: '🇰🇪 Kenya'
  },
  'rwanda': { 
    currency: 'RWF', 
    symbol: 'RWF', 
    rate: 2.47, // 1 FCFA = 2.47 RWF (taux réel sept 2025)
    label: '🇷🇼 Rwanda'
  },
  'senegal': { 
    currency: 'XOF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇸🇳 Sénégal'
  },
  'niger': { 
    currency: 'XOF', 
    symbol: 'FCFA', 
    rate: 1,
    label: '🇳🇪 Niger'
  }
};

// Fonction pour convertir un montant FCFA vers la devise du pays
export const convertFromFCFA = (amountFCFA, countryCode) => {
  const country = COUNTRY_CURRENCIES[countryCode];
  if (!country) return amountFCFA;
  
  return Math.round(amountFCFA * country.rate);
};

// Fonction pour convertir un montant local vers FCFA (pour les calculs internes)
export const convertToFCFA = (localAmount, countryCode) => {
  const country = COUNTRY_CURRENCIES[countryCode];
  if (!country) return localAmount;
  
  return Math.round(localAmount / country.rate);
};

// Fonction pour formater un montant selon la devise du pays
export const formatCurrency = (amountFCFA, countryCode, options = {}) => {
  const country = COUNTRY_CURRENCIES[countryCode];
  if (!country) {
    return `${amountFCFA.toLocaleString()} FCFA`;
  }
  
  const convertedAmount = convertFromFCFA(amountFCFA, countryCode);
  const { showCountryFlag = false } = options;
  
  if (showCountryFlag) {
    const flag = country.label.split(' ')[0];
    return `${flag} ${convertedAmount.toLocaleString()} ${country.symbol}`;
  }
  
  return `${convertedAmount.toLocaleString()} ${country.symbol}`;
};

// Fonction pour obtenir la devise d'un pays
export const getCurrencyInfo = (countryCode) => {
  return COUNTRY_CURRENCIES[countryCode] || COUNTRY_CURRENCIES['benin'];
};

// Liste des pays pour les sélecteurs
export const COUNTRIES_LIST = Object.entries(COUNTRY_CURRENCIES).map(([key, value]) => ({
  value: key,
  label: value.label,
  currency: value.currency,
  symbol: value.symbol
}));