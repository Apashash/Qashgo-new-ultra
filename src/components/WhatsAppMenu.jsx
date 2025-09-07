import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Phone, Clock, FileDown, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const WhatsAppMenu = () => {

  const [visibility, setVisibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  const fetchActiveVisibility = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_visibility')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setVisibility(data?.[0] || null);
    } catch (error) {
      console.error("Error fetching WhatsApp visibility:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = () => {
    if (!visibility?.end_time) return;
    
    const now = new Date();
    const end = new Date(visibility.end_time);
    const diff = end - now;
    
    if (diff <= 0) {
      setIsExpired(true);
      setTimeRemaining('Expiré');
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let timeString = '';
    if (days > 0) timeString += `${days}j `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s`;
    
    setTimeRemaining(timeString);
    setIsExpired(false);
  };

  useEffect(() => {
    fetchActiveVisibility();
  }, []);

  useEffect(() => {
    if (visibility) {
      calculateTimeRemaining();
      const interval = setInterval(calculateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [visibility]);

  const handleWhatsAppClick = () => {
    if (visibility?.whatsapp_link && !isExpired) {
      window.open(visibility.whatsapp_link, '_blank');
      toast({ 
        title: "Redirection", 
        description: "Ouverture du lien WhatsApp..." 
      });
    }
  };

  const handleVCFDownload = () => {
    if (visibility?.vcf_download_link && isExpired) {
      window.open(visibility.vcf_download_link, '_blank');
      toast({ 
        title: "Téléchargement", 
        description: "Téléchargement du fichier VCF..." 
      });
    }
  };

  const getStatusInfo = () => {
    if (!visibility) {
      return {
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        title: 'Non ouvert pour le moment',
        description: 'Aucune visibilité WhatsApp n\'est actuellement disponible. Revenez plus tard.'
      };
    }

    if (isExpired) {
      return {
        icon: Clock,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        title: 'Période expirée',
        description: visibility.vcf_download_link 
          ? 'La période est terminée. Vous pouvez maintenant télécharger le fichier VCF.'
          : 'La période est terminée et aucun fichier de contact n\'est disponible.'
      };
    }

    if (!visibility.whatsapp_link) {
      return {
        icon: AlertCircle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        title: 'Non ouvert pour le moment',
        description: 'Le lien WhatsApp n\'est pas encore disponible. Veuillez revenir plus tard.'
      };
    }

    return {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      title: 'Lien disponible',
      description: 'Vous pouvez maintenant enregistrer votre contact.'
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 mb-4">
          <Phone className="inline h-8 w-8 mr-2" />
          Visibilité WhatsApp
        </h1>
        <p className="text-slate-300 text-lg">
          {visibility?.title || 'Rejoignez notre communauté WhatsApp'}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto"
      >
        <Card className={`glass-effect ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <StatusIcon className={`h-16 w-16 ${statusInfo.color}`} />
            </div>
            <CardTitle className={`text-2xl ${statusInfo.color}`}>
              {statusInfo.title}
            </CardTitle>
            <CardDescription className="text-slate-300 text-lg">
              {statusInfo.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {visibility && !isExpired && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-amber-400" />
                  <span className="text-amber-300 font-medium">Temps restant</span>
                </div>
                <div className="text-3xl font-bold text-amber-400 font-mono bg-slate-800/50 py-4 px-6 rounded-lg border border-amber-500/30">
                  {timeRemaining}
                </div>
                <p className="text-slate-400 text-sm mt-2">
                  Le lien sera disponible jusqu'à expiration
                </p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {visibility?.whatsapp_link && !isExpired && (
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  size="lg"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Enregistrement
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}

              {visibility?.vcf_download_link && isExpired && (
                <Button 
                  onClick={handleVCFDownload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                  size="lg"
                >
                  <FileDown className="h-5 w-5 mr-2" />
                  Télécharger
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            {visibility && (
              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                <h3 className="text-slate-300 font-medium mb-2">Informations</h3>
                <div className="space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="capitalize text-slate-300">
                      {visibility.type === 'tiktok' ? 'TikTok' : visibility.type === 'whatsapp' ? 'WhatsApp' : visibility.type === 'youtube' ? 'YouTube' : 'Général'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut:</span>
                    <span className={`${statusInfo.color}`}>
                      {isExpired ? 'Expiré' : 'Actif'}
                    </span>
                  </div>
                  {visibility.start_time && (
                    <div className="flex justify-between">
                      <span>Début:</span>
                      <span className="text-slate-300">
                        {new Date(visibility.start_time).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {visibility.end_time && (
                    <div className="flex justify-between">
                      <span>Fin:</span>
                      <span className="text-slate-300">
                        {new Date(visibility.end_time).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default WhatsAppMenu;