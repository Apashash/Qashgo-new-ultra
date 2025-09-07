import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currency';
import { 
  TrendingUp, 
  DollarSign, 
  Gift, 
  Youtube, 
  BookOpen, 
  Users, 
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Calendar,
  Search
} from 'lucide-react';
import { Input } from "@/components/ui/input";

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.528 8.528c3.056 0 4.664 2.112 4.664 4.664S15.584 17.856 12.528 17.856s-4.664-2.112-4.664-4.664c0-.048.016-.08.016-.128.08-2.336 1.856-4.416 4.648-4.528Z"/>
    <path d="M17.192 8.528V4.8H20.8v6.464A4.656 4.656 0 0 1 16.144 16H8.256V4.8h3.632v3.728"/>
  </svg>
);

const TransactionHistory = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const userCountryCode = user?.country_code || 'benin';

  useEffect(() => {
    if (user && user.id) {
      fetchTransactionHistory();
    }
  }, [user]);

  const fetchTransactionHistory = async () => {
    setLoading(true);
    try {
      const allTransactions = [];

      // 1. Récupérer les bonus réclamés
      try {
        const { data: bonusData, error: bonusError } = await supabase
          .from('claimed_bonuses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bonusError && !bonusError.message?.includes('does not exist')) {
          throw bonusError;
        }

        if (bonusData) {
          bonusData.forEach(bonus => {
            allTransactions.push({
              id: `bonus-${bonus.id}`,
              type: 'bonus',
              subtype: bonus.type,
              amount: bonus.amount,
              description: bonus.type === 'welcome' ? t('welcomeBonusClaimed') : t('bonusClaimed'),
              date: new Date(bonus.created_at),
              status: 'completed',
              icon: Gift
            });
          });
        }
      } catch (error) {
        console.warn('Table claimed_bonuses not found');
      }

      // 2. Récupérer les gains de parrainage
      try {
        const { data: referralData, error: referralError } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .eq('paid', true)
          .order('created_at', { ascending: false });

        if (referralError && !referralError.message?.includes('does not exist')) {
          throw referralError;
        }

        if (referralData) {
          referralData.forEach(referral => {
            allTransactions.push({
              id: `referral-${referral.id}`,
              type: 'referral',
              subtype: `level${referral.level}`,
              amount: referral.commission,
              description: t('referralCommission', { level: referral.level }),
              date: new Date(referral.created_at),
              status: 'completed',
              icon: Users
            });
          });
        }
      } catch (error) {
        console.warn('Table referrals not found');
      }

      // 3. Récupérer les gains de formations
      try {
        const { data: formationData, error: formationError } = await supabase
          .from('user_formations')
          .select('*, formations(title)')
          .eq('user_id', user.id)
          .gt('rewards_amount', 0)
          .order('created_at', { ascending: false });

        if (formationError && !formationError.message?.includes('does not exist')) {
          throw formationError;
        }

        if (formationData) {
          formationData.forEach(formation => {
            allTransactions.push({
              id: `formation-${formation.id}`,
              type: 'formation',
              subtype: 'download',
              amount: formation.rewards_amount,
              description: t('formationDownloadReward', { title: formation.formations?.title || 'Formation' }),
              date: new Date(formation.created_at),
              status: 'completed',
              icon: BookOpen
            });
          });
        }
      } catch (error) {
        console.warn('Table user_formations not found');
      }

      // 4. Récupérer TOUTES les vues vidéo (YouTube et TikTok) avec titres
      try {
        // Récupérer toutes les vidéos d'abord
        const { data: allVideos } = await supabase.from('videos').select('*');
        
        // Puis récupérer les vues de l'utilisateur
        const { data: videoData, error: videoError } = await supabase
          .from('video_watches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (videoError) {
          console.warn('Erreur récupération video_watches:', videoError);
        } else if (videoData && videoData.length > 0) {
          videoData.forEach(watch => {
            // Trouver les infos vidéo en matchant video_id avec id
            const videoInfo = allVideos?.find(v => v.id.toString() === watch.video_id.toString());
            const platform = videoInfo?.platform || 'youtube';
            const isYouTube = platform === 'youtube';
            const videoTitle = videoInfo?.title || `Vidéo ${isYouTube ? 'YouTube' : 'TikTok'}`;
            
            // Afficher toutes les vues avec gains
            const hasEarnings = watch.earnings_claimed && watch.earnings_claimed > 0;
            const description = hasEarnings 
              ? `Bonus vidéo: ${videoTitle} (+${watch.earnings_claimed} FCFA)`
              : `Vidéo vue: ${videoTitle}`;
            
            allTransactions.push({
              id: `video-${watch.id}`,
              type: isYouTube ? 'youtube' : 'tiktok',
              subtype: hasEarnings ? 'earned' : 'watched',
              amount: watch.earnings_claimed || 0,
              description: description,
              date: new Date(watch.created_at),
              status: hasEarnings ? 'completed' : 'viewed',
              icon: isYouTube ? Youtube : TikTokIcon
            });
          });
        }
      } catch (error) {
        console.warn('Table video_watches not found');
      }

      // 5. Récupérer les retraits
      try {
        const { data: withdrawalData, error: withdrawalError } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (withdrawalError && !withdrawalError.message?.includes('does not exist')) {
          throw withdrawalError;
        }

        if (withdrawalData) {
          withdrawalData.forEach(withdrawal => {
            allTransactions.push({
              id: `withdrawal-${withdrawal.id}`,
              type: 'withdrawal',
              subtype: withdrawal.status,
              amount: -withdrawal.amount, // Négatif pour les retraits
              description: t('withdrawalTo', { operator: withdrawal.operator }),
              date: new Date(withdrawal.created_at),
              status: withdrawal.status,
              icon: ArrowDownCircle
            });
          });
        }
      } catch (error) {
        console.warn('Table withdrawals not found');
      }

      // Trier par date (plus récent en premier)
      allTransactions.sort((a, b) => b.date - a.date);
      setTransactions(allTransactions);

    } catch (error) {
      console.error('Error fetching transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type, subtype) => {
    const labels = {
      bonus: t('bonus'),
      referral: t('referralCommission'),
      formation: t('formation'),
      youtube: 'YouTube',
      tiktok: 'TikTok',
      withdrawal: t('withdrawal')
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      confirmed: 'success'
    };
    return variants[status] || 'secondary';
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-green-400 to-yellow-400 mb-2">
          {t('transactionHistory')}
        </h1>
        <p className="text-sky-200 text-lg">
          {t('viewAllTransactions')}
        </p>
      </div>

      {/* Filtres et recherche */}
      <Card className="glass-effect border-sky-300/20">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                {t('all')}
              </Button>
              <Button 
                variant={filter === 'bonus' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('bonus')}
              >
                {t('bonus')}
              </Button>
              <Button 
                variant={filter === 'referral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('referral')}
              >
                {t('referrals')}
              </Button>
              <Button 
                variant={filter === 'formation' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('formation')}
              >
                {t('formations')}
              </Button>
              <Button 
                variant={filter === 'youtube' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('youtube')}
              >
                YouTube
              </Button>
              <Button 
                variant={filter === 'tiktok' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('tiktok')}
              >
                TikTok
              </Button>
              <Button 
                variant={filter === 'withdrawal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('withdrawal')}
              >
                {t('withdrawals')}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-sky-400" />
                <Input
                  placeholder={t('searchTransactions')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchTransactionHistory}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Liste des transactions */}
      <Card className="glass-effect border-sky-300/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('transactions')} ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sky-300">{t('noTransactionsFound')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const Icon = transaction.icon;
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {getTypeLabel(transaction.type, transaction.subtype)}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <span className={transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount, userCountryCode)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(transaction.status)}>
                          {t(transaction.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.date.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TransactionHistory;