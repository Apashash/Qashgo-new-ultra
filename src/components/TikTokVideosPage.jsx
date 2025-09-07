import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, Play, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';

const WATCH_TIME_REQUIREMENT = 30; // 30 seconds as requested

const TikTokIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.10z"/>
  </svg>
);

const TikTokVideoPlayer = ({ video, onWatched, user, t }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WATCH_TIME_REQUIREMENT);
  const [isEligible, setIsEligible] = useState(false);
  const [hasEarned, setHasEarned] = useState(false);
  const intervalRef = useRef(null);

  const getTikTokEmbedId = (url) => {
    // Try to extract video ID from various TikTok URL formats
    let match = url.match(/tiktok\.com\/@[^/]+\/video\/(\w+)/);
    if (!match) {
      match = url.match(/vm\.tiktok\.com\/(\w+)/);
    }
    if (!match) {
      match = url.match(/tiktok\.com\/t\/(\w+)/);
    }
    return match ? match[1] : null;
  };

  const embedId = getTikTokEmbedId(video.url);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft <= 0 && !hasEarned) {
      setIsPlaying(false);
      setIsEligible(true);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, timeLeft, hasEarned]);

  const handleStartWatching = () => {
    if (!hasEarned && timeLeft > 0) {
      // Use exact URL from admin panel  
      console.log('Opening exact admin URL:', video.url);
      window.open(video.url, '_blank');
      // Start timer immediately
      setIsPlaying(true);
    }
  };

  const claimEarning = async () => {
    if (!isEligible || hasEarned) return;
    try {
      setHasEarned(true);
      await onWatched(video.id, video.earnings);
      toast({ title: 'Succès', description: `Vous avez gagné ${formatCurrency(video.earnings, user.country_code || 'benin')}` });
    } catch (error) {
      console.error("Error claiming earning:", error);
      toast({ title: 'Erreur', description: error.message || "Échec de réclamation.", variant: 'destructive' });
      setHasEarned(false); 
    }
  };

  return (
    <Card className="glass-effect border-sky-300/20 card-hover-sky">
      <CardContent className="p-4">
        <h3 className="font-semibold text-sky-100 mb-2">{video.title}</h3>
        <div className="aspect-[9/16] sm:aspect-video mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-pink-900 via-purple-900 to-black relative">
          {isPlaying ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-900/80 via-purple-900/80 to-black/80">
              <div className="text-center">
                <TikTokIcon className="h-16 w-16 text-pink-400 mx-auto mb-4 animate-pulse" />
                <p className="text-white text-lg font-medium">Regardez dans l'app TikTok</p>
                <p className="text-pink-300 text-sm">Temps restant: {timeLeft}s</p>
                <div className="w-32 bg-gray-700 rounded-full h-2 mt-3 mx-auto">
                  <div 
                    className="bg-pink-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((WATCH_TIME_REQUIREMENT - timeLeft) / WATCH_TIME_REQUIREMENT) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-900/50 via-purple-900/50 to-black/50">
              <div className="text-center">
                <TikTokIcon className="h-12 w-12 text-pink-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Vidéo TikTok prête</p>
                <p className="text-pink-300 text-xs">Cliquez pour ouvrir et commencer</p>
              </div>
            </div>
          )}
        </div>
        {!hasEarned && (
          <>
            <p className="text-sm text-sky-200/80 mb-2">Regarder pendant 30 secondes pour gagner {formatCurrency(video.earnings, user.country_code || 'benin')}</p>
            {isPlaying && timeLeft > 0 && (
              <div className="flex items-center text-orange-400 mb-2">
                <Clock className="h-4 w-4 mr-1" />
                <span>Temps restant: {timeLeft}s</span>
              </div>
            )}
            {isEligible ? (
              <Button onClick={claimEarning} className="w-full bg-green-500 hover:bg-green-600">
                <CheckCircle className="h-4 w-4 mr-2" /> Réclamer {formatCurrency(video.earnings, user.country_code || 'benin')}
              </Button>
            ) : (
              <Button onClick={handleStartWatching} disabled={isPlaying} className="w-full bg-pink-500 hover:bg-pink-600">
                <TikTokIcon /> <span className="ml-2">{timeLeft < WATCH_TIME_REQUIREMENT && timeLeft > 0 ? 'Continuer' : 'Commencer à regarder'}</span>
              </Button>
            )}
          </>
        )}
        {hasEarned && (
          <div className="text-center p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-1" />
            <p className="text-green-300 font-semibold">Vous avez gagné {formatCurrency(video.earnings, user.country_code || 'benin')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TikTokVideosPage = ({ user }) => {
  const { updateUser: updateAuthContextUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchedVideos, setWatchedVideos] = useState(new Set());

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('platform', 'tiktok')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);

      // Check which videos user has already watched
      if (data && data.length > 0) {
        const { data: watchData } = await supabase
          .from('video_watches')
          .select('video_id')
          .eq('user_id', user.id)
          .in('video_id', data.map(v => v.id));
        
        if (watchData) {
          setWatchedVideos(new Set(watchData.map(w => w.video_id)));
        }
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({ title: "Erreur", description: "Impossible de charger les vidéos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [user.id]);

  const handleVideoWatched = async (videoId, amount) => {
    try {
      console.log('🎬 Enregistrement vue vidéo TikTok:', { videoId, amount, userId: user.id });
      
      // Record the watch in history
      const { error: watchError } = await supabase
        .from('video_watches')
        .insert({
          user_id: user.id,
          video_id: videoId,
          earnings_claimed: amount
        });

      if (watchError) {
        console.error('❌ Erreur enregistrement vue vidéo:', watchError);
        throw watchError;
      }
      
      console.log('✅ Vue vidéo TikTok enregistrée dans l\'historique');

      // Update user balances
      const newTiktokBalance = (user.tiktok_balance || 0) + amount;
      const newBalance = (user.balance || 0) + amount;
      let newWithdrawableBalance = user.withdrawable_balance || 0;

      if (newTiktokBalance >= 500) {
          newWithdrawableBalance += amount;
      }
      
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
            tiktok_balance: newTiktokBalance,
            balance: newBalance,
            withdrawable_balance: newWithdrawableBalance,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      updateAuthContextUser(updatedUser);
      
      // Update watched videos set
      setWatchedVideos(prev => new Set([...prev, videoId]));
    } catch (error) {
      console.error("Error processing video watch:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-pink-500 to-purple-500 mb-4">
          <TikTokIcon /> <span className="ml-2">Vidéos TikTok</span>
        </h1>
        <p className="text-sky-200/80 text-lg">Regardez et gagnez de l'argent avec TikTok</p>
      </motion.div>

      {videos.length === 0 ? (
        <Card className="glass-effect border-sky-300/20">
          <CardContent className="p-8 text-center">
            <Play className="h-12 w-12 text-sky-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-sky-100 mb-2">Aucune vidéo disponible</h3>
            <p className="text-sky-200/70">Aucune vidéo TikTok n'est disponible pour le moment. Revenez plus tard!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {videos.filter(video => !watchedVideos.has(video.id)).map((video) => (
            <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <TikTokVideoPlayer video={video} onWatched={handleVideoWatched} user={user} t={t} />
            </motion.div>
          ))}
        </div>
      )}
      
      <Card className="glass-effect border-purple-400/30">
        <CardHeader>
          <CardTitle className="text-purple-300">Seuil de retrait</CardTitle>
          <CardDescription className="text-purple-200/80">Solde TikTok: {formatCurrency(user.tiktok_balance || 0, user.country_code || 'benin')}. Minimum: {formatCurrency(500, user.country_code || 'benin')}</CardDescription>
        </CardHeader>
        <CardContent>
           {user.tiktok_balance >= 500 ? (
             <div className="flex items-center text-green-400">
               <CheckCircle className="h-5 w-5 mr-2" />
               <span>Seuil atteint, vous pouvez retirer!</span>
             </div>
           ) : (
             <div className="flex items-center text-orange-400">
               <AlertCircle className="h-5 w-5 mr-2" />
               <span>Gagnez encore {formatCurrency(500 - (user.tiktok_balance || 0), user.country_code || 'benin')} pour retirer</span>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TikTokVideosPage;