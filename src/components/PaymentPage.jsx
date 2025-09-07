
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Upload, CheckCircle, MessageSquare, Copy, Loader2, Phone, Zap } from 'lucide-react';
import { processReferralCommissions } from '@/utils/referralSystem';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { formatCurrency, convertFromFCFA } from '@/utils/currency';
import { createPaymentRequest, verifyPaymentStatus, getSupportedOperators } from '@/utils/soleaspayService';

const PaymentPage = ({ user, onPaymentComplete }) => {
  const { t } = useTranslation();
  const [showManualPaymentDialog, setShowManualPaymentDialog] = useState(false);
  const [showAutomaticPaymentDialog, setShowAutomaticPaymentDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [orderId, setOrderId] = useState('');
  const { login: authLogin } = useAuth();

  // Montant d'activation en FCFA (4000) et conversion selon le pays de l'utilisateur
  const ACTIVATION_FEE_FCFA = 4000;
  const userCountryCode = user.country_code || 'benin';
  const activationFeeFormatted = formatCurrency(ACTIVATION_FEE_FCFA, userCountryCode);
  const activationFeeConverted = convertFromFCFA(ACTIVATION_FEE_FCFA, userCountryCode);

  const supportWhatsappLink1 = "https://wa.me/qr/DBPMPKV6AXARN1";
  const supportWhatsappLink2 = "https://wa.me/qr/5HQBAXXEN6FIL1";
  const supportContactNumbers = "+237 698 357 887 / +237 6 95 64 51 69 (WhatsApp)";
  
  // Récupérer les opérateurs supportés selon le pays
  const supportedOperators = getSupportedOperators(userCountryCode);
  
  // Mapping des opérateurs pour l'affichage
  const operatorDisplayNames = {
    'mtn': 'MTN Mobile Money',
    'orange': 'Orange Money', 
    'moov': 'Moov Money',
    'wave': 'Wave',
    'airtel': 'Airtel Money',
    'tmoney': 'T-Money',
    'mpesa': 'M-Pesa',
    'vodacom': 'Vodacom',
    'expresso': 'Expresso',
    'wizall': 'Wizall',
    'free': 'Free Money'
  };

  const handleAutomaticPayment = () => {
    setShowAutomaticPaymentDialog(true);
    // Présélectionner le premier opérateur disponible
    if (supportedOperators.length > 0 && !selectedOperator) {
      setSelectedOperator(supportedOperators[0]);
    }
  };

  const handleManualPayment = () => {
    setShowManualPaymentDialog(true);
  };

  const openSupportChat = (link) => {
    window.open(link, '_blank');
  };

  const copySupportContact = () => {
    navigator.clipboard.writeText(supportContactNumbers);
    toast({ title: t('contactCopied'), description: t('supportContactCopied') });
  };

  // Fonction pour initier le paiement SoleasPay
  const initiateAutomaticPayment = async () => {
    if (!phoneNumber || !selectedOperator) {
      toast({
        title: t('missingInformation'),
        description: t('pleaseEnterPhoneAndOperator'),
        variant: 'destructive'
      });
      return;
    }

    setPaymentProcessing(true);
    setPaymentStatus('initializing');
    
    try {
      // URLs pour les callbacks (vous devriez les remplacer par vos vrais endpoints)
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payment/success`;
      const failureUrl = `${baseUrl}/payment/failure`;
      const callbackUrl = `${baseUrl}/api/payment/callback`;
      
      const paymentData = {
        user,
        phoneNumber,
        operator: selectedOperator,
        country: userCountryCode,
        callbackUrl,
        successUrl,
        failureUrl
      };

      console.log('🚀 Initiation paiement SoleasPay...', paymentData);
      
      const result = await createPaymentRequest(paymentData);
      
      if (result.success) {
        setOrderId(result.orderId);
        setTransactionRef(result.reference);
        setPaymentStatus('processing');
        
        toast({
          title: t('paymentInitiated'),
          description: t('checkYourPhoneForPaymentPrompt')
        });
        
        // Commencer le polling du statut de paiement
        startPaymentPolling(result.orderId, result.reference);
      } else {
        throw new Error(result.message || 'Erreur lors de l\'initialisation du paiement');
      }
    } catch (error) {
      console.error('Erreur paiement SoleasPay:', error);
      setPaymentStatus('error');
      toast({
        title: t('paymentError'),
        description: error.message || t('errorOccurred'),
        variant: 'destructive'
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Fonction pour vérifier périodiquement le statut du paiement
  const startPaymentPolling = (orderIdToCheck, referenceToCheck) => {
    console.log('🔄 Début polling paiement:', { orderIdToCheck, referenceToCheck });
    let pollCount = 0;
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      try {
        console.log(`🔍 Vérification #${pollCount} du statut paiement...`);
        const statusResult = await verifyPaymentStatus(orderIdToCheck, referenceToCheck);
        
        console.log('📋 Résultat vérification:', statusResult);
        
        if (statusResult.success) {
          if (statusResult.isCompleted) {
            console.log('🎉 PAIEMENT CONFIRMÉ ! Début activation automatique...');
            clearInterval(pollInterval);
            setPaymentStatus('success');
            
            // Activer automatiquement le compte
            await activateUserAccount('soleaspay_automatic', orderIdToCheck);
          } else {
            console.log('⏳ Paiement en attente... statut:', statusResult.status);
            setPaymentStatus('waiting');
          }
        } else {
          console.log('❌ Échec vérification:', statusResult.message);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        clearInterval(pollInterval);
        setPaymentStatus('verification_error');
      }
    }, 10000); // Vérifier toutes les 10 secondes
    
    // Arrêter le polling après 10 minutes
    setTimeout(() => {
      console.log('⏰ Timeout polling après 10 minutes');
      clearInterval(pollInterval);
      if (paymentStatus === 'processing' || paymentStatus === 'waiting') {
        setPaymentStatus('timeout');
      }
    }, 600000);
  };

  // Fonction pour activer le compte utilisateur après paiement confirmé
  const activateUserAccount = async (paymentMethod = 'soleaspay_automatic', transactionId = '') => {
    console.log('🔄 Début activation compte:', { paymentMethod, transactionId, userId: user.id });
    setLoading(true);
    try {
      const activatedAt = new Date().toISOString();
      console.log('📝 Mise à jour utilisateur en base...');
      
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
          account_active: true, 
          activated_at: activatedAt, 
          payment_method: paymentMethod,
          transaction_reference: transactionId
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erreur mise à jour utilisateur:', error);
        throw error;
      }
      
      console.log('✅ Utilisateur mis à jour:', updatedUser);
      
      // Traiter les commissions de parrainage
      if (updatedUser.referred_by_code) {
        console.log('💰 Traitement commissions parrainage:', updatedUser.referred_by_code);
        await processReferralCommissions(updatedUser.referred_by_code, updatedUser.id);
        console.log('✅ Commissions de parrainage traitées');
      }
      
      console.log('🔐 Mise à jour session utilisateur...');
      authLogin(updatedUser);
      
      console.log('✅ Activation automatique réussie !');
      toast({ 
        title: t('paymentSuccess'), 
        description: t('accountActivatedAutomatically') 
      });
      
      // Fermer la dialog et notifier le parent
      setShowAutomaticPaymentDialog(false);
      onPaymentComplete(updatedUser);
      
    } catch (error) {
      console.error("❌ Erreur activation compte:", error);
      toast({ 
        title: t('activationError'), 
        description: error.message || t('errorOccurred'), 
        variant: "destructive" 
      });
      setPaymentStatus('activation_error');
    } finally {
      setLoading(false);
    }
  };

  // This function for manual activation (fallback)
  const simulateAccountActivation = async () => {
    await activateUserAccount('manual_support');
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pattern-bg">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-2xl">
        <Card className="glass-effect border-white/10 card-hover">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl gradient-text">{t('activateYourAccount')}</CardTitle>
            <CardDescription>{t('payToActivate', { amount: activationFeeConverted })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{t('amountToPay')}</p><p className="text-2xl font-bold text-green-400">{activationFeeFormatted}</p></div>
                <div className="text-right"><p className="text-sm text-muted-foreground">{t('user')}</p><p className="font-semibold">{user.name}</p></div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Button onClick={handleAutomaticPayment} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                <Zap className="h-4 w-4 mr-2" />{t('automaticPayment')} - SoleasPay
              </Button>
              <Button onClick={handleManualPayment} variant="outline" className="border-white/20 hover:bg-white/5">
                <Upload className="h-4 w-4 mr-2" />{t('manualPayment')}
              </Button>
            </div>

            <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-lg font-semibold text-blue-300 mb-2">{t('clickToActivateManual')}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={() => openSupportChat(supportWhatsappLink1)} className="bg-green-500 hover:bg-green-600">
                        <MessageSquare className="h-4 w-4 mr-2" /> {t('contactSupportWhatsApp')} 1
                    </Button>
                     <Button onClick={() => openSupportChat(supportWhatsappLink2)} className="bg-green-500 hover:bg-green-600">
                        <MessageSquare className="h-4 w-4 mr-2" /> {t('contactSupportWhatsApp')} 2
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('support')}: {supportContactNumbers}</p>
            </div>

            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-lg font-semibold text-red-300 mb-2 uppercase">{t('ifAutoPaymentFails')}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={() => openSupportChat(supportWhatsappLink1)} className="bg-red-500 hover:bg-red-600">
                        <MessageSquare className="h-4 w-4 mr-2" /> {t('contactSupportWhatsApp')} 1
                    </Button>
                     <Button onClick={() => openSupportChat(supportWhatsappLink2)} className="bg-red-500 hover:bg-red-600">
                        <MessageSquare className="h-4 w-4 mr-2" /> {t('contactSupportWhatsApp')} 2
                    </Button>
                </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>💡 {t('automaticPaymentInstant')}</p>
              <p>📸 {t('manualPaymentVerification', { time: "2min max" })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dialog pour paiement automatique SoleasPay */}
        <Dialog open={showAutomaticPaymentDialog} onOpenChange={setShowAutomaticPaymentDialog}>
          <DialogContent className="glass-effect border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="gradient-text flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                {t('automaticPayment')} SoleasPay
              </DialogTitle>
              <DialogDescription>{t('enterPaymentDetails')}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Sélection de l'opérateur */}
              <div className="space-y-2">
                <Label htmlFor="operator">{t('selectOperator')}</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="bg-slate-800 border-white/20">
                    <SelectValue placeholder={t('chooseOperator')} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/20">
                    {supportedOperators.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {operatorDisplayNames[operator] || operator.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Numéro de téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneNumber')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="690000001"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-slate-800 border-white/20"
                  disabled={paymentProcessing}
                />
              </div>
              
              {/* Montant à payer */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('amountToPay')}:</span>
                  <span className="font-bold text-green-400">{activationFeeFormatted}</span>
                </div>
              </div>
              
              {/* Statut du paiement */}
              {paymentStatus && (
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border ${
                    paymentStatus === 'success' ? 'bg-green-500/10 border-green-500/20' :
                    paymentStatus === 'error' || paymentStatus === 'activation_error' || paymentStatus === 'timeout' ? 'bg-red-500/10 border-red-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {paymentProcessing || paymentStatus === 'processing' || paymentStatus === 'waiting' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : paymentStatus === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {paymentStatus === 'initializing' && t('initializingPayment')}
                        {paymentStatus === 'processing' && t('processingPayment')}
                        {paymentStatus === 'waiting' && t('waitingPaymentConfirmation')}
                        {paymentStatus === 'success' && t('paymentSuccessful')}
                        {paymentStatus === 'error' && t('paymentFailed')}
                        {paymentStatus === 'timeout' && t('paymentTimeout')}
                        {paymentStatus === 'verification_error' && t('verificationError')}
                        {paymentStatus === 'activation_error' && t('activationError')}
                      </span>
                    </div>
                    {(orderId || transactionRef) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {orderId && <div>ID: {orderId}</div>}
                        {transactionRef && <div>Ref: {transactionRef}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Boutons d'action */}
              <div className="flex gap-2">
                <Button 
                  onClick={initiateAutomaticPayment}
                  disabled={paymentProcessing || !selectedOperator || !phoneNumber || paymentStatus === 'success'}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
                >
                  {paymentProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4 mr-2" />
                  )}
                  {paymentProcessing ? t('processing') : t('payNow')}
                </Button>
                {(paymentStatus === 'error' || paymentStatus === 'timeout') && (
                  <Button 
                    onClick={() => {
                      setPaymentStatus('');
                      setOrderId('');
                      setTransactionRef('');
                    }}
                    variant="outline"
                    className="border-white/20"
                  >
                    {t('retry')}
                  </Button>
                )}
              </div>
              
              {/* Informations de sécurité */}
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>🔒 {t('securePaymentSoleasPay')}</p>
                <p>⚡ {t('instantActivation')}</p>
                <p>📞 {t('supportIfNeeded')}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog pour paiement manuel */}
        <Dialog open={showManualPaymentDialog} onOpenChange={setShowManualPaymentDialog}>
          <DialogContent className="glass-effect border-white/10">
            <DialogHeader><DialogTitle className="gradient-text">{t('manualPayment')}</DialogTitle><DialogDescription>{t('manualPaymentInstructionsTitle')}</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">{t('cameroonPaymentInstructions')}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('orangeMoneyInstructionsCM')} <strong className="text-yellow-300">#150*1*1*698357887*4000#</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('mtnMoneyInstructionsCM')} <strong className="text-yellow-300">*126#</strong>, {t('thenSelect')} 1, {t('enterNumber')} <strong className="text-yellow-300">673455996</strong>.
                </p>
                <p className="text-sm text-muted-foreground mt-3 font-semibold">{t('afterPaymentContactSupport')}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => openSupportChat(supportWhatsappLink1)} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                  <MessageSquare className="h-4 w-4 mr-2" />{t('contactSupportWhatsApp')} 1
                </Button>
                <Button onClick={() => openSupportChat(supportWhatsappLink2)} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                  <MessageSquare className="h-4 w-4 mr-2" />{t('contactSupportWhatsApp')} 2
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default PaymentPage;
