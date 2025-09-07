
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Youtube as YoutubeIcon, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currency';

const WATCH_TIME_REQUIREMENT = 30; // 30 seconds as requested

const YoutubeVideoPlayer = ({ video, onWatched, user, t }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WATCH_TIME_REQUIREMENT);
  const [isEligible, setIsEligible] = useState(false);
  const [hasEarned, setHasEarned] = useState(false);
  const intervalRef = useRef(null);
  const iframeRef = useRef(null);

  const extractVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  const videoId = extractVideoId(video.url);

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
      toast({ title: t('success'), description: t('earnedAmount', {amount: video.earnings}) });
    } catch (error) {
      console.error("Error claiming earning:", error);
      toast({ title: t('error'), description: error.message || "Failed to claim earning.", variant: 'destructive' });
      setHasEarned(false); // Allow retry
    }
  };

  const onReady = (event) => setPlayer(event.target);

  return (
    <Card className="glass-effect border-sky-300/20 card-hover-sky">
      <CardContent className="p-4">
        <h3 className="font-semibold text-sky-100 mb-2">{video.title}</h3>
        <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-red-900 via-red-950 to-black relative">
          {isPlaying ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900/80 via-red-950/80 to-black/80">
              <div className="text-center">
                <YoutubeIcon className="h-16 w-16 text-red-400 mx-auto mb-4 animate-pulse" />
                <p className="text-white text-lg font-medium">Regardez dans l'onglet YouTube</p>
                <p className="text-red-300 text-sm">Temps restant: {timeLeft}s</p>
                <div className="w-32 bg-gray-700 rounded-full h-2 mt-3 mx-auto">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((WATCH_TIME_REQUIREMENT - timeLeft) / WATCH_TIME_REQUIREMENT) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : videoId ? (
            <div className="w-full h-full bg-gradient-to-br from-red-900/50 via-red-950/50 to-black/50 flex items-center justify-center">
              <div className="text-center">
                <YoutubeIcon className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Vidéo YouTube prête</p>
                <p className="text-red-300 text-xs">Cliquez pour ouvrir et commencer</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-sky-300">
              Vidéo non disponible
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
              <Button onClick={handleStartWatching} disabled={isPlaying || !videoId} className="w-full bg-sky-500 hover:bg-sky-600">
                <YoutubeIcon className="h-4 w-4 mr-2" /> 
                {timeLeft < WATCH_TIME_REQUIREMENT && timeLeft > 0 ? 'Continuer' : 'Commencer à regarder'}
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


const YoutubeVideosPage = ({ user }) => {
  const { updateUser: updateAuthContextUser } = useAuth();
  const { t } = useTranslation();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchedVideos, setWatchedVideos] = useState(new Set());

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('platform', 'youtube')
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
      console.log('🎬 Enregistrement vue vidéo YouTube:', { videoId, amount, userId: user.id });
      
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
      
      console.log('✅ Vue vidéo YouTube enregistrée dans l\'historique');

      // Update user balances
      const newYoutubeBalance = (user.youtube_balance || 0) + amount;
      const newBalance = (user.balance || 0) + amount;
      let newWithdrawableBalance = user.withdrawable_balance || 0;
      if (newYoutubeBalance >= 500) { 
          newWithdrawableBalance += amount; 
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
            youtube_balance: newYoutubeBalance,
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
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 mb-4">
          <YoutubeIcon className="inline-block h-10 w-10 mr-2 text-red-500" />
          Vidéos YouTube
        </h1>
        <p className="text-sky-200/80 text-lg">Regardez et gagnez de l'argent avec YouTube</p>
      </motion.div>

      {videos.length === 0 ? (
        <Card className="glass-effect border-sky-300/20">
          <CardContent className="p-8 text-center">
            <Play className="h-12 w-12 text-sky-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-sky-100 mb-2">Aucune vidéo disponible</h3>
            <p className="text-sky-200/70">Aucune vidéo YouTube n'est disponible pour le moment. Revenez plus tard!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {videos.filter(video => !watchedVideos.has(video.id)).map((video) => (
            <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <YoutubeVideoPlayer video={video} onWatched={handleVideoWatched} user={user} t={t} />
            </motion.div>
          ))}
        </div>
      )}
      
      <Card className="glass-effect border-red-400/30">
        <CardHeader>
          <CardTitle className="text-red-300">Seuil de retrait</CardTitle>
          <CardDescription className="text-red-200/80">Solde YouTube: {formatCurrency(user.youtube_balance || 0, user.country_code || 'benin')}. Minimum: {formatCurrency(500, user.country_code || 'benin')}</CardDescription>
        </CardHeader>
        <CardContent>
           {user.youtube_balance >= 500 ? (
             <div className="flex items-center text-green-400">
               <CheckCircle className="h-5 w-5 mr-2" />
               <span>Seuil atteint, vous pouvez retirer!</span>
             </div>
           ) : (
             <div className="flex items-center text-orange-400">
               <AlertCircle className="h-5 w-5 mr-2" />
               <span>Gagnez encore {formatCurrency(500 - (user.youtube_balance || 0), user.country_code || 'benin')} pour retirer</span>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YoutubeVideosPage;
