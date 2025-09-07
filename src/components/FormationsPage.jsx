import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { BookOpen, Download, Award, FileText, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';

const FormationsPage = ({ user }) => {
  const { updateUser: updateAuthContextUser } = useAuth();
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadedFormations, setDownloadedFormations] = useState(new Set());

  const getFileTypeIcon = () => {
    return FileText; // Always PDF
  };


  const fetchFormations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('formations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFormations(data || []);

      // Check which formations user has already downloaded
      if (data && data.length > 0) {
        const { data: downloadData } = await supabase
          .from('user_formations')
          .select('formation_id')
          .eq('user_id', user.id)
          .in('formation_id', data.map(f => f.id));
        
        if (downloadData) {
          setDownloadedFormations(new Set(downloadData.map(d => d.formation_id)));
        }
      }
    } catch (error) {
      console.error("Error fetching formations:", error);
      toast({ title: "Erreur", description: "Impossible de charger les formations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, [user.id]);

  const handleDownload = async (formation) => {
    try {
      // Record the download
      const { error: downloadError } = await supabase
        .from('user_formations')
        .insert({
          user_id: user.id,
          formation_id: formation.id,
          rewards_amount: formation.rewards_amount || 0
        });

      if (downloadError && !downloadError.message.includes('duplicate')) {
        throw downloadError;
      }

      // Update download count
      const { error: updateError } = await supabase
        .from('formations')
        .update({ 
          download_count: (formation.download_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', formation.id);

      if (updateError) {
        console.warn("Could not update download count:", updateError);
      }

      // Add rewards to user withdrawable balance if specified
      if (formation.rewards_amount > 0) {
        const newWithdrawableBalance = (user.withdrawable_balance || 0) + formation.rewards_amount;
        const { data: updatedUser, error: userError } = await supabase
          .from('users')
          .update({ 
            withdrawable_balance: newWithdrawableBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single();

        if (userError) throw userError;
        updateAuthContextUser(updatedUser);
        
        toast({ 
          title: "Succès!", 
          description: `Téléchargement démarré! Vous avez gagné ${formatCurrency(formation.rewards_amount, user.country_code || 'benin')}.` 
        });
      } else {
        toast({ 
          title: "Succès!", 
          description: "Téléchargement démarré!" 
        });
      }
      
      // Update downloaded formations set
      setDownloadedFormations(prev => new Set([...prev, formation.id]));
      
      // Open download link
      window.open(formation.file_url, '_blank');
      
    } catch (error) {
      console.error("Error downloading formation:", error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de télécharger la formation.", 
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 mb-4">
          <BookOpen className="inline h-8 w-8 mr-2" />
          Formations & E-books
        </h1>
        <p className="text-amber-200/80 text-lg">Téléchargez et apprenez avec nos ressources exclusives</p>
      </motion.div>

      {formations.length === 0 ? (
        <Card className="glass-effect border-amber-300/20">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-amber-100 mb-2">Aucune formation disponible</h3>
            <p className="text-amber-200/70">Aucune formation n'est disponible pour le moment. Revenez plus tard!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formations.map((formation) => {
            const FileIcon = getFileTypeIcon();
            const isDownloaded = downloadedFormations.has(formation.id);
            
            return (
              <motion.div key={formation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass-effect border-amber-300/20 card-hover-amber h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="aspect-video mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-red-900/50 flex items-center justify-center">
                      {formation.image_url ? (
                        <img 
                          src={formation.image_url} 
                          alt={formation.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${formation.image_url ? 'hidden' : ''}`}>
                        <FileIcon className="h-12 w-12 text-amber-400" />
                      </div>
                    </div>
                    <CardTitle className="text-amber-100 text-lg line-clamp-2">{formation.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-amber-300 capitalize">{formation.category}</span>
                      <span className="text-amber-400">•</span>
                      <span className="text-amber-300">PDF</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <CardDescription className="text-amber-200/80 mb-4 line-clamp-3 flex-1">
                      {formation.description}
                    </CardDescription>
                    
                    {formation.rewards_description && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Award className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-amber-300 text-sm font-medium">Ce que vous gagnez:</p>
                            <p className="text-amber-200/90 text-sm">{formation.rewards_description}</p>
                            {formation.rewards_amount > 0 && (
                              <p className="text-amber-400 text-sm font-semibold mt-1">
                                + {formatCurrency(formation.rewards_amount, user.country_code || 'benin')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => handleDownload(formation)}
                      disabled={isDownloaded}
                      className={`w-full ${isDownloaded 
                        ? 'bg-green-600 hover:bg-green-700 cursor-default' 
                        : 'bg-amber-500 hover:bg-amber-600'
                      } transition-colors`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isDownloaded ? 'Déjà téléchargé' : 'Télécharger'}
                    </Button>
                    
                    {formation.download_count > 0 && (
                      <p className="text-amber-300/60 text-xs text-center mt-2">
                        {formation.download_count} téléchargement{formation.download_count > 1 ? 's' : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormationsPage;