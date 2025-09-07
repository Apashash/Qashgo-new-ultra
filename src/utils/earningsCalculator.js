import { supabase } from '../lib/supabaseClient';

/**
 * Calcule le total de tous les gains d'un utilisateur
 * Sources : TikTok, YouTube, Welcome Bonus, Formations, Parrainage
 */
export const calculateTotalEarnings = async (userId) => {
  if (!userId) return 0;

  try {
    // 1. Récupérer les balances directes de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tiktok_balance, youtube_balance, welcome_bonus')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // 2. Récupérer les gains de formation
    let formationEarnings = 0;
    try {
      const { data: formationData, error: formationError } = await supabase
        .from('user_formations')
        .select('rewards_amount')
        .eq('user_id', userId);

      if (formationError && !formationError.message?.includes('does not exist')) {
        throw formationError;
      }

      if (formationData && formationData.length > 0) {
        formationEarnings = formationData.reduce((sum, formation) => 
          sum + (formation.rewards_amount || 0), 0);
      }
    } catch (formationErr) {
      console.warn('Table user_formations not found, skipping formation earnings');
    }

    // 3. Récupérer les gains de parrainage
    let referralEarnings = 0;
    try {
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('commission')
        .eq('referrer_id', userId)
        .eq('paid', true);

      if (referralError && !referralError.message?.includes('does not exist')) {
        throw referralError;
      }

      if (referralData && referralData.length > 0) {
        referralEarnings = referralData.reduce((sum, referral) => 
          sum + (referral.commission || 0), 0);
      }
    } catch (referralErr) {
      console.warn('Table referrals not found, skipping referral earnings');
    }

    // 4. Calculer le total
    const totalEarnings = 
      (userData.tiktok_balance || 0) +
      (userData.youtube_balance || 0) + 
      (userData.welcome_bonus || 0) +
      formationEarnings +
      referralEarnings;

    console.log('Total earnings breakdown:', {
      tiktok: userData.tiktok_balance || 0,
      youtube: userData.youtube_balance || 0,
      welcome: userData.welcome_bonus || 0,
      formations: formationEarnings,
      referrals: referralEarnings,
      total: totalEarnings
    });

    return totalEarnings;

  } catch (error) {
    console.error('Error calculating total earnings:', error);
    return 0;
  }
};

/**
 * Récupère le détail de tous les gains pour affichage
 */
export const getEarningsBreakdown = async (userId) => {
  if (!userId) return null;

  try {
    const totalEarnings = await calculateTotalEarnings(userId);
    
    const { data: userData } = await supabase
      .from('users')
      .select('tiktok_balance, youtube_balance, welcome_bonus')
      .eq('id', userId)
      .single();

    return {
      total: totalEarnings,
      breakdown: {
        tiktok: userData?.tiktok_balance || 0,
        youtube: userData?.youtube_balance || 0,
        welcome: userData?.welcome_bonus || 0,
        formations: 0, // Sera calculé si nécessaire
        referrals: 0   // Sera calculé si nécessaire
      }
    };
  } catch (error) {
    console.error('Error getting earnings breakdown:', error);
    return { total: 0, breakdown: {} };
  }
};