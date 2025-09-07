
import { supabase } from '@/lib/supabaseClient'; 

export const generateReferralCode = (username) => {
  return username.toUpperCase().replace(/\s+/g, '');
};

export const generateReferralLink = (referralCode) => {
  return `${window.location.origin}/register?ref=${referralCode}`;
};

export const calculateCommissions = (level, amount = 4000) => {
  const commissions = {
    1: 1800, 
    2: 900,  
    3: 500   
  };
  return commissions[level] || 0;
};

export const processReferralCommissions = async (referrerCode, newUserId) => {
  if (!referrerCode) return;

  try {
    const { data: referrerL1, error: referrerL1Error } = await supabase
      .from('users')
      .select('id, referred_by_code, balance, withdrawable_balance, referral_code') // Added referral_code for L1
      .eq('referral_code', referrerCode) 
      .single();

    if (referrerL1Error || !referrerL1) {
      console.error('Referrer L1 not found or error:', referrerL1Error);
      return;
    }

    const commissionL1 = calculateCommissions(1);
    await supabase.from('referrals').insert({
      referrer_id: referrerL1.id,
      referred_id: newUserId,
      level: 1,
      commission: commissionL1,
      paid: true 
    });
    await supabase.from('users').update({
      balance: (referrerL1.balance || 0) + commissionL1,
      withdrawable_balance: (referrerL1.withdrawable_balance || 0) + commissionL1
    }).eq('id', referrerL1.id);


    if (referrerL1.referred_by_code) {
      const { data: referrerL2, error: referrerL2Error } = await supabase
        .from('users')
        .select('id, referred_by_code, balance, withdrawable_balance, referral_code') // Added referral_code for L2
        .eq('referral_code', referrerL1.referred_by_code)
        .single();

      if (referrerL2 && !referrerL2Error) {
        const commissionL2 = calculateCommissions(2);
        await supabase.from('referrals').insert({
          referrer_id: referrerL2.id,
          referred_id: newUserId, 
          level: 2,
          commission: commissionL2,
          paid: true
        });
        await supabase.from('users').update({
          balance: (referrerL2.balance || 0) + commissionL2,
          withdrawable_balance: (referrerL2.withdrawable_balance || 0) + commissionL2
        }).eq('id', referrerL2.id);

        if (referrerL2.referred_by_code) {
          const { data: referrerL3, error: referrerL3Error } = await supabase
            .from('users')
            .select('id, balance, withdrawable_balance') // L3 doesn't need to refer further for this chain
            .eq('referral_code', referrerL2.referred_by_code)
            .single();
          
          if (referrerL3 && !referrerL3Error) {
            const commissionL3 = calculateCommissions(3);
            await supabase.from('referrals').insert({
              referrer_id: referrerL3.id,
              referred_id: newUserId, 
              level: 3,
              commission: commissionL3,
              paid: true
            });
            await supabase.from('users').update({
              balance: (referrerL3.balance || 0) + commissionL3,
              withdrawable_balance: (referrerL3.withdrawable_balance || 0) + commissionL3
            }).eq('id', referrerL3.id);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing referral commissions:', error);
  }
};


export const getUserReferrals = async (userId) => {
  try {
    return await getUserReferralsManual(userId);
  } catch (error) {
    console.error('Error fetching user referrals:', error);
    return [];
  }
};

const getUserReferralsManual = async (userId) => {
  try {
    // Get referrals first
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refError || !referrals) return [];

    // Get user details for each referral
    const enrichedReferrals = [];
    
    for (const referral of referrals) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, name, email, account_active')
        .eq('id', referral.referred_id)
        .single();
        
      if (!userError && user) {
        enrichedReferrals.push({
          ...referral,
          referred_user: user
        });
      } else {
        enrichedReferrals.push({
          ...referral,
          referred_user: { 
            id: referral.referred_id,
            name: `User ${referral.referred_id}`,
            username: `user${referral.referred_id}`,
            account_active: false
          }
        });
      }
    }
    
    return enrichedReferrals;
    
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return [];
  }
};

// Récupérer les paramètres de bonus depuis la base de données
export const getBonusSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('bonus_settings')
      .select('*')
      .limit(1)
      .single();
    
    // Si la table n'existe pas ou est vide, utiliser les valeurs par défaut
    if (error && (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation "bonus_settings" does not exist'))) {
      console.warn('Table bonus_settings not found, using default values');
      return {
        bonusAmount: 700,
        targetReferrals: 15,
        bonusEnabled: true,
        affiliationFeeFcfa: 4000
      };
    }
    
    if (error) throw error;
    
    return {
      bonusAmount: data?.welcome_bonus_amount || 700,
      targetReferrals: data?.referral_target || 15,
      bonusEnabled: data?.bonus_enabled !== false,
      affiliationFeeFcfa: data?.affiliation_fee_fcfa || 4000
    };
  } catch (error) {
    console.warn('Error fetching bonus settings, using defaults:', error.message);
    // Valeurs par défaut si erreur
    return {
      bonusAmount: 700,
      targetReferrals: 15,
      bonusEnabled: true,
      affiliationFeeFcfa: 4000
    };
  }
};

// Récupérer uniquement les frais d'affiliation
export const getAffiliationFee = async () => {
  try {
    const settings = await getBonusSettings();
    return settings.affiliationFeeFcfa;
  } catch (error) {
    console.warn('Error fetching affiliation fee, using default:', error.message);
    return 4000; // Valeur par défaut
  }
};

export const calculateBonusEligibility = async (userId) => {
  try {
    // Récupérer les paramètres de bonus
    const bonusSettings = await getBonusSettings();
    
    if (!bonusSettings.bonusEnabled) {
      return {
        currentReferrals: 0,
        bonusEligible: false,
        bonusAmount: bonusSettings.bonusAmount,
        remainingReferrals: bonusSettings.targetReferrals,
        targetReferrals: bonusSettings.targetReferrals,
        bonusDisabled: true
      };
    }
    
    const userReferrals = await getUserReferrals(userId);
    const directActiveReferrals = userReferrals.filter(r => r.level === 1 && r.referredUser?.account_active);
    
    return {
      currentReferrals: directActiveReferrals.length,
      bonusEligible: directActiveReferrals.length >= bonusSettings.targetReferrals,
      bonusAmount: bonusSettings.bonusAmount,
      remainingReferrals: Math.max(0, bonusSettings.targetReferrals - directActiveReferrals.length),
      targetReferrals: bonusSettings.targetReferrals,
      bonusDisabled: false
    };
  } catch (error) {
    console.error('Error calculating bonus eligibility:', error);
    // Valeurs par défaut en cas d'erreur
    const defaultSettings = await getBonusSettings();
    return {
      currentReferrals: 0,
      bonusEligible: false,
      bonusAmount: defaultSettings.bonusAmount,
      remainingReferrals: defaultSettings.targetReferrals,
      targetReferrals: defaultSettings.targetReferrals,
      bonusDisabled: false
    };
  }
};

export const getActiveReferralCounts = async (userId) => {
  try {
    console.log('🔍 getActiveReferralCounts appelée avec userId:', userId);
    
    if (!userId) {
      return { level1: 0, level2: 0, level3: 0 };
    }
    
    // Solution JavaScript pure avec jointure
    const { data: referralsWithUsers, error } = await supabase
      .from('referrals')
      .select(`
        level,
        referred_id,
        users!referrals_referred_id_fkey(account_active)
      `)
      .eq('referrer_id', userId);
    
    console.log('🔍 Données reçues:', { referralsWithUsers, error, userId });
    
    if (error) {
      console.error('🔍 Erreur requête referrals:', error);
      return { level1: 0, level2: 0, level3: 0 };
    }
    
    if (!referralsWithUsers || referralsWithUsers.length === 0) {
      console.log('🔍 Aucun parrainage trouvé');
      return { level1: 0, level2: 0, level3: 0 };
    }
    
    console.log('🔍 Nombre de parrainages:', referralsWithUsers.length);
    
    // Compter les parrainages actifs par niveau
    const counts = { level1: 0, level2: 0, level3: 0 };
    
    referralsWithUsers.forEach((referral, index) => {
      console.log(`🔍 Parrainage ${index}:`, referral);
      console.log(`🔍 users data:`, referral.users);
      console.log(`🔍 account_active:`, referral.users?.account_active);
      
      // Vérifier si l'utilisateur référé est actif
      const isActive = referral.users?.account_active === true;
      console.log(`🔍 isActive:`, isActive, 'level:', referral.level);
      
      if (isActive) {
        console.log(`🔍 Utilisateur actif trouvé! Level ${referral.level}`);
        switch (referral.level) {
          case 1:
            counts.level1++;
            console.log(`🔍 Level1 incrémenté:`, counts.level1);
            break;
          case 2:
            counts.level2++;
            console.log(`🔍 Level2 incrémenté:`, counts.level2);
            break;
          case 3:
            counts.level3++;
            console.log(`🔍 Level3 incrémenté:`, counts.level3);
            break;
        }
      }
    });
    
    console.log('🔍 RÉSULTAT FINAL:', counts);
    return counts;
    
  } catch (error) {
    console.error('🔍 Erreur dans getActiveReferralCounts:', error);
    return { level1: 0, level2: 0, level3: 0 };
  }
};

