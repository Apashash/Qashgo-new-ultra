import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, Link as LinkIcon, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COUNTRIES_LIST, getCurrencyInfo } from '@/utils/currency';
import { getAffiliationFee } from '@/utils/referralSystem';

// Mapping des anciens codes vers nos nouveaux codes avec devises
const countryMapping = {
  'CM': { newCode: 'cameroon', dialCode: '+237' },
  'KE': { newCode: 'kenya', dialCode: '+254' },
  'RW': { newCode: 'rwanda', dialCode: '+250' },
  'CD': { newCode: 'drc-congo', dialCode: '+243' },
  'TG': { newCode: 'togo', dialCode: '+228' },
  'SN': { newCode: 'senegal', dialCode: '+221' },
  'CI': { newCode: 'cote-ivoire', dialCode: '+225' },
  'BJ': { newCode: 'benin', dialCode: '+229' },
  'BF': { newCode: 'burkina-faso', dialCode: '+226' },
  'GA': { newCode: 'gabon', dialCode: '+241' },
  'NE': { newCode: 'niger', dialCode: '+227' },
  'CG': { newCode: 'congo-brazza', dialCode: '+242' }
};

// Pays avec devises supportées uniquement
const supportedCountries = COUNTRIES_LIST.map(country => {
  const mapping = Object.entries(countryMapping).find(([oldCode, data]) => data.newCode === country.value);
  const oldCode = mapping ? mapping[0] : null;
  const dialCode = mapping ? mapping[1].dialCode : '+000';
  
  return {
    name: country.label,
    code: oldCode || country.value.toUpperCase(), 
    newCode: country.value,
    dialCode: dialCode,
    currency: country.currency,
    symbol: country.symbol
  };
}).filter(country => Object.values(countryMapping).some(mapping => mapping.newCode === country.newCode));


const RegisterForm = ({ onRegister }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const initialReferralCode = new URLSearchParams(location.search).get('ref') || '';
  const [affiliationFeeFcfa, setAffiliationFeeFcfa] = useState(4000);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    country: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: initialReferralCode,
  });
  const [selectedCountryDialCode, setSelectedCountryDialCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, referralCode: initialReferralCode }));
  }, [initialReferralCode]);

  // Récupérer les frais d'affiliation depuis la base de données
  useEffect(() => {
    const fetchAffiliationFee = async () => {
      try {
        const fee = await getAffiliationFee();
        setAffiliationFeeFcfa(fee);
      } catch (error) {
        console.error('Error fetching affiliation fee:', error);
        // Garder la valeur par défaut en cas d'erreur
      }
    };
    
    fetchAffiliationFee();
  }, []);

  const handleCountryChange = (value) => {
    const country = supportedCountries.find(c => c.code === value);
    if (country) {
      setFormData({ ...formData, country: value, phone: '' });
      setSelectedCountryDialCode(country.dialCode);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numericValue = value.replace(selectedCountryDialCode, '').replace(/\D/g, '');
      setFormData({ ...formData, [name]: `${selectedCountryDialCode}${numericValue}` });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = () => {
    if (!formData.username || !formData.name || !formData.country || !formData.phone || !formData.email || !formData.password) {
      toast({ title: t('error'), description: t('requiredField'), variant: "destructive" });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: t('error'), description: t('passwordsDontMatch'), variant: "destructive" });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ title: t('error'), description: t('passwordMinLength'), variant: "destructive" });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ title: t('error'), description: t('invalidEmail'), variant: "destructive" });
      return false;
    }
    if (!formData.phone.startsWith(selectedCountryDialCode) || formData.phone.length <= selectedCountryDialCode.length) {
        toast({ title: t('error'), description: t('invalidPhoneNumber'), variant: "destructive" });
        return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${formData.email},user_name.eq.${formData.username}`)
        .maybeSingle();

      if (existingUserError && existingUserError.code !== 'PGRST116') throw existingUserError;
      if (existingUser) {
        toast({ title: t('error'), description: t('emailOrUsernameTaken'), variant: "destructive" });
        setLoading(false);
        return;
      }

      const newUserReferralCode = formData.username.toUpperCase().replace(/\s+/g, '');

      // Obtenir les informations de devise pour le pays sélectionné
      const selectedCountry = supportedCountries.find(c => c.code === formData.country);
      const countryCode = selectedCountry ? selectedCountry.newCode : 'benin';
      const currencyInfo = getCurrencyInfo(countryCode);

      const newUserPayload = {
        user_name: formData.username,
        name: formData.name,
        country: formData.country, // Code ISO (CM, KE, etc.)
        country_code: countryCode, // Notre code (cameroon, kenya, etc.)
        currency: currencyInfo.currency, // XOF, KES, etc.
        phone: formData.phone,
        email: formData.email,
        password_hash: formData.password, 
        referral_code: newUserReferralCode, 
        referred_by_code: formData.referralCode || null,
        account_active: false,
        balance: 0,
        withdrawable_balance: 0,
        total_withdrawals: 0,
        youtube_balance: 0,
        tiktok_balance: 0,
        welcome_bonus: 0,
        affiliation_fee: affiliationFeeFcfa,
        referral_counts: { level1: 0, level2: 0, level3: 0 }
      };

      const { data: createdUser, error: createUserError } = await supabase
        .from('users')
        .insert(newUserPayload)
        .select()
        .single();

      if (createUserError) throw createUserError;

      // Traiter les commissions de parrainage si un code de parrainage a été utilisé
      if (formData.referralCode && createdUser.id) {
        try {
          await processReferralCommissions(formData.referralCode, createdUser.id);
          console.log('✅ Referral commissions processed successfully');
        } catch (commissionError) {
          console.error('❌ Error processing referral commissions:', commissionError);
          // Continue même si les commissions échouent
        }
      }

      toast({ title: t('registrationSuccess'), description: t('redirectToPayment') });
      setTimeout(() => onRegister(createdUser), 1500);

    } catch (error) {
      console.error("Registration error:", error);
      toast({ title: t('registrationError'), description: error.message || t('error'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-700 via-sky-800 to-sky-900 pattern-bg text-white">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Card className="glass-effect border-sky-300/20 card-hover-sky">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-sky-500 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-sky-400 to-red-400">{t('joinSuperearn')}</CardTitle>
            <CardDescription className="text-sky-200/80">{t('createAccountAndEarn')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="username" className="text-sky-200">{t('username')}</Label><Input id="username" name="username" value={formData.username} onChange={handleChange} placeholder={t('username')} className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50" /></div>
              <div><Label htmlFor="name" className="text-sky-200">{t('fullName')}</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('fullName')} className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50" /></div>
              <div>
                <Label htmlFor="country" className="text-sky-200">{t('country')}</Label>
                <Select value={formData.country} onValueChange={handleCountryChange}>
                  <SelectTrigger className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50"><SelectValue placeholder={t('selectCountry')} /></SelectTrigger>
                  <SelectContent className="bg-sky-800 border-sky-600 text-white">
                    {supportedCountries.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="hover:bg-sky-700 focus:bg-sky-700">
                        {c.name} ({c.dialCode}) - {c.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone" className="text-sky-200">{t('phoneNumber')}</Label>
                <p className="text-xs text-red-400 mb-1">{t('phoneForWithdrawals')}</p>
                <div className="flex">
                  {selectedCountryDialCode && <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-sky-300/30 bg-sky-600/20 text-sky-200 text-sm">{selectedCountryDialCode}</span>}
                  <Input id="phone" name="phone" type="tel" value={formData.phone.replace(selectedCountryDialCode, '')} onChange={handleChange} placeholder={t('phoneWithoutDialCode')} className={`bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50 ${selectedCountryDialCode ? 'rounded-l-none' : ''}`} disabled={!selectedCountryDialCode} />
                </div>
              </div>
              <div><Label htmlFor="email" className="text-sky-200">{t('emailAddress')}</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder={t('emailAddress')} className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50" /></div>
              <div>
                <Label htmlFor="referralCode" className="text-sky-200">{t('referralCode')} ({t('optional')})</Label>
                <div className="relative">
                    <Input id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleChange} placeholder={t('referrerCodePlaceholder')} className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50 pr-10" disabled={!!initialReferralCode} />
                    <LinkIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300/70" />
                </div>
                {initialReferralCode && <p className="text-xs text-green-400 mt-1">{t('referralCodeApplied')}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="text-sky-200">{t('password')}</Label>
                <div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder={t('password')} className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50 pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 text-sky-300 hover:bg-transparent hover:text-sky-100" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sky-200">{t('confirmPassword')}</Label>
                <div className="relative"><Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder={t('confirmPassword')} className="bg-sky-500/10 border-sky-300/30 text-white placeholder:text-sky-300/50 pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 text-sky-300 hover:bg-transparent hover:text-sky-100" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-sky-500 hover:from-green-600 hover:to-sky-600 text-white" disabled={loading}>{loading ? t('creatingAccount') : t('createMyAccount')}</Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('alreadyHaveAccount')}{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-primary flex items-center justify-center"
                  onClick={() => navigate('/login')}
                >
                  <LogIn className="h-4 w-4 mr-1" /> {t('login')}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterForm;