import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { Gift, Save, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/currency';

const AdminBonusSettings = () => {
  const [settings, setSettings] = useState({
    welcome_bonus_amount: 700,
    referral_target: 15,
    bonus_enabled: true,
    affiliation_fee_fcfa: 4000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBonusSettings();
  }, []);

  const fetchBonusSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bonus_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          welcome_bonus_amount: data.welcome_bonus_amount,
          referral_target: data.referral_target,
          bonus_enabled: data.bonus_enabled,
          affiliation_fee_fcfa: data.affiliation_fee_fcfa || 4000
        });
      }
    } catch (error) {
      console.error("Error fetching bonus settings:", error);
      toast({ title: "Erreur", description: "Impossible de charger les paramètres de bonus.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // D'abord, vérifier si un enregistrement existe
      const { data: existingData, error: selectError } = await supabase
        .from('bonus_settings')
        .select('id')
        .limit(1)
        .single();

      console.log("Existing data:", existingData, "Select error:", selectError);

      let result;
      if (existingData && existingData.id) {
        // Mettre à jour l'enregistrement existant
        result = await supabase
          .from('bonus_settings')
          .update({
            welcome_bonus_amount: parseFloat(settings.welcome_bonus_amount),
            referral_target: parseInt(settings.referral_target),
            bonus_enabled: settings.bonus_enabled,
            affiliation_fee_fcfa: parseFloat(settings.affiliation_fee_fcfa),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
      } else {
        // Créer un nouvel enregistrement
        result = await supabase
          .from('bonus_settings')
          .insert({
            welcome_bonus_amount: parseFloat(settings.welcome_bonus_amount),
            referral_target: parseInt(settings.referral_target),
            bonus_enabled: settings.bonus_enabled,
            affiliation_fee_fcfa: parseFloat(settings.affiliation_fee_fcfa),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      console.log("Save result:", result);

      if (result.error) {
        console.error("Detailed error:", result.error);
        throw result.error;
      }

      toast({ 
        title: "Succès", 
        description: "Paramètres de bonus sauvegardés avec succès.",
        duration: 3000
      });
    } catch (error) {
      console.error("Error saving bonus settings:", error);
      // Message d'erreur plus détaillé pour le debugging
      const errorMsg = error?.message || error?.details || "Erreur inconnue";
      toast({ 
        title: "Erreur", 
        description: `Impossible de sauvegarder: ${errorMsg}`, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-green-400 to-yellow-400 mb-4">
          Paramètres de Bonus & Affiliation
        </h1>
        <p className="text-sky-200/80 text-lg">
          Gérez les paramètres du système de bonus de bienvenue et des frais d'affiliation
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="glass-effect border-sky-300/20 card-hover-sky">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-sky-300">
              <Settings className="h-6 w-6" />
              <span>Configuration du Bonus de Bienvenue & Affiliation</span>
            </CardTitle>
            <CardDescription className="text-sky-200/70">
              Configurez le montant, les conditions du bonus et les frais d'affiliation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* État du système de bonus */}
            <div className="flex items-center justify-between p-4 bg-sky-500/10 rounded-lg border border-sky-300/30">
              <div className="space-y-1">
                <Label className="text-sky-100 font-semibold">Système de Bonus</Label>
                <p className="text-sm text-sky-200/80">
                  {settings.bonus_enabled ? "Le système de bonus est activé" : "Le système de bonus est désactivé"}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {settings.bonus_enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <Switch
                  checked={settings.bonus_enabled}
                  onCheckedChange={(checked) => handleInputChange('bonus_enabled', checked)}
                />
              </div>
            </div>

            {/* Montant du bonus */}
            <div className="space-y-2">
              <Label htmlFor="bonus-amount" className="text-sky-100 font-semibold">
                Montant du Bonus (FCFA)
              </Label>
              <Input
                id="bonus-amount"
                type="number"
                value={settings.welcome_bonus_amount}
                onChange={(e) => handleInputChange('welcome_bonus_amount', e.target.value)}
                className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50"
                min="0"
                step="50"
                disabled={!settings.bonus_enabled}
              />
              <p className="text-sm text-sky-200/80">
                Montant en FCFA que les utilisateurs recevront comme bonus de bienvenue
              </p>
              {settings.welcome_bonus_amount && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-300 font-semibold">Aperçu des montants par pays :</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>Bénin/Togo: <span className="font-mono">{formatCurrency(settings.welcome_bonus_amount, 'benin')}</span></div>
                    <div>RDC Congo: <span className="font-mono">{formatCurrency(settings.welcome_bonus_amount, 'drc-congo')}</span></div>
                    <div>Kenya: <span className="font-mono">{formatCurrency(settings.welcome_bonus_amount, 'kenya')}</span></div>
                    <div>Rwanda: <span className="font-mono">{formatCurrency(settings.welcome_bonus_amount, 'rwanda')}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Cible de parrainages */}
            <div className="space-y-2">
              <Label htmlFor="referral-target" className="text-sky-100 font-semibold">
                Nombre de Parrainages Requis
              </Label>
              <Input
                id="referral-target"
                type="number"
                value={settings.referral_target}
                onChange={(e) => handleInputChange('referral_target', e.target.value)}
                className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50"
                min="1"
                max="100"
                disabled={!settings.bonus_enabled}
              />
              <p className="text-sm text-sky-200/80">
                Nombre de parrainages directs actifs requis pour débloquer le bonus
              </p>
            </div>


            {/* Frais d'affiliation */}
            <div className="space-y-2">
              <Label htmlFor="affiliation-fee" className="text-sky-100 font-semibold">
                Frais d'Affiliation (FCFA)
              </Label>
              <Input
                id="affiliation-fee"
                type="number"
                value={settings.affiliation_fee_fcfa}
                onChange={(e) => handleInputChange('affiliation_fee_fcfa', e.target.value)}
                className="bg-purple-500/10 border-purple-300/30 text-white placeholder:text-sky-300/50"
                min="0"
                step="100"
              />
              <p className="text-sm text-sky-200/80">
                Montant en FCFA payé lors de l'inscription (stocké dans user.affiliation_fee)
              </p>
              {settings.affiliation_fee_fcfa && (
                <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-sm text-purple-300 font-semibold">Aperçu des frais par pays :</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>Bénin/Togo: <span className="font-mono">{formatCurrency(settings.affiliation_fee_fcfa, 'benin')}</span></div>
                    <div>RDC Congo: <span className="font-mono">{formatCurrency(settings.affiliation_fee_fcfa, 'drc-congo')}</span></div>
                    <div>Kenya: <span className="font-mono">{formatCurrency(settings.affiliation_fee_fcfa, 'kenya')}</span></div>
                    <div>Rwanda: <span className="font-mono">{formatCurrency(settings.affiliation_fee_fcfa, 'rwanda')}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Résumé */}
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="h-5 w-5 text-green-400" />
                <span className="font-semibold text-green-300">Résumé de la Configuration</span>
              </div>
              <div className="space-y-1 text-sm text-sky-200/90">
                <p>• État: <span className={`font-semibold ${settings.bonus_enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {settings.bonus_enabled ? 'Activé' : 'Désactivé'}
                </span></p>
                <p>• Bonus bienvenue: <span className="font-semibold text-yellow-400">
                  {formatCurrency(settings.welcome_bonus_amount, 'benin')}
                </span></p>
                <p>• Frais d'affiliation: <span className="font-semibold text-purple-400">
                  {formatCurrency(settings.affiliation_fee_fcfa, 'benin')}
                </span></p>
                <p>• Parrainages requis: <span className="font-semibold text-blue-400">
                  {settings.referral_target} personnes
                </span></p>
              </div>
            </div>

            {/* Bouton de sauvegarde */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les Paramètres
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminBonusSettings;