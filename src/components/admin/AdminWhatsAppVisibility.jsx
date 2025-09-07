import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Phone, Clock, FileDown, Trash2, Edit, Plus, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const AdminWhatsAppVisibility = () => {
  const [visibility, setVisibility] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    type: 'tiktok',
    title: '',
    whatsapp_link: '',
    vcf_download_link: '',
    duration_hours: 24,
    is_active: false,
    admin_notes: ''
  });

  const fetchVisibility = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_visibility')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVisibility(data || []);
    } catch (error) {
      console.error("Error fetching WhatsApp visibility:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisibility();
  }, []);

  const resetForm = () => {
    setFormData({
      type: 'tiktok',
      title: '',
      whatsapp_link: '',
      vcf_download_link: '',
      duration_hours: 24,
      is_active: false,
      admin_notes: ''
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({ title: "Erreur", description: "Le titre est requis.", variant: "destructive" });
      return;
    }

    try {
      const currentTime = new Date();
      const endTime = new Date(currentTime.getTime() + (formData.duration_hours * 60 * 60 * 1000));

      const submissionData = {
        type: formData.type,
        title: formData.title,
        whatsapp_link: formData.whatsapp_link || null,
        vcf_download_link: formData.vcf_download_link || null,
        duration_hours: parseInt(formData.duration_hours),
        start_time: formData.is_active ? currentTime.toISOString() : null,
        end_time: formData.is_active ? endTime.toISOString() : null,
        is_active: formData.is_active,
        admin_notes: formData.admin_notes || null,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase
          .from('whatsapp_visibility')
          .update(submissionData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        toast({ title: "Succès", description: "Visibilité WhatsApp mise à jour." });
      } else {
        const { error } = await supabase
          .from('whatsapp_visibility')
          .insert(submissionData);
        
        if (error) throw error;
        toast({ title: "Succès", description: "Visibilité WhatsApp créée." });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchVisibility();
    } catch (error) {
      console.error("Error saving WhatsApp visibility:", error);
      toast({ title: "Erreur", description: "Échec de l'enregistrement.", variant: "destructive" });
    }
  };

  const handleEdit = (item) => {
    setFormData({
      type: item.type || 'tiktok',
      title: item.title || '',
      whatsapp_link: item.whatsapp_link || '',
      vcf_download_link: item.vcf_download_link || '',
      duration_hours: item.duration_hours || 24,
      is_active: item.is_active || false,
      admin_notes: item.admin_notes || ''
    });
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette visibilité WhatsApp ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('whatsapp_visibility')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Succès", description: "Visibilité supprimée." });
      fetchVisibility();
    } catch (error) {
      console.error("Error deleting visibility:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  const toggleActive = async (item) => {
    try {
      const currentTime = new Date();
      const endTime = new Date(currentTime.getTime() + (item.duration_hours * 60 * 60 * 1000));

      const { error } = await supabase
        .from('whatsapp_visibility')
        .update({
          is_active: !item.is_active,
          start_time: !item.is_active ? currentTime.toISOString() : null,
          end_time: !item.is_active ? endTime.toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      
      if (error) throw error;
      toast({ title: "Succès", description: `Visibilité ${!item.is_active ? 'activée' : 'désactivée'}.` });
      fetchVisibility();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast({ title: "Erreur", description: "Impossible de modifier l'état.", variant: "destructive" });
    }
  };

  const getTimeRemaining = (endTime) => {
    if (!endTime) return 'Non défini';
    
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Expiré';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m restantes`;
  };

  const getStatusColor = (item) => {
    if (!item.is_active) return 'bg-gray-500';
    if (item.end_time && new Date() > new Date(item.end_time)) return 'bg-red-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Visibilité WhatsApp</h1>
          <p className="text-amber-200/70">Gérez les liens WhatsApp pour TikTok, WhatsApp et YouTube</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Visibilité
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-slate-800 border-amber-500/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-amber-300">
                {editingItem ? 'Modifier la Visibilité' : 'Nouvelle Visibilité WhatsApp'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-amber-200">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger className="bg-slate-800 border-amber-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-amber-600 text-white">
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-amber-200">Durée (heures) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({...formData, duration_hours: e.target.value})}
                    className="bg-slate-800 border-amber-500/30 text-white"
                    min="1"
                    max="168"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title" className="text-amber-200">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-slate-800 border-amber-500/30 text-white"
                  placeholder="ex: Rejoignez notre groupe WhatsApp TikTok"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp_link" className="text-amber-200">Lien VCF (avant l'expiration)</Label>
                <Input
                  id="whatsapp_link"
                  value={formData.whatsapp_link}
                  onChange={(e) => setFormData({...formData, whatsapp_link: e.target.value})}
                  className="bg-slate-800 border-amber-500/30 text-white"
                  placeholder="https://example.com/contact.vcf"
                />
                <p className="text-amber-300/60 text-xs">Lien VCF disponible pendant la durée active</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vcf_link" className="text-amber-200">Lien VCF (après expiration)</Label>
                <Input
                  id="vcf_link"
                  value={formData.vcf_download_link}
                  onChange={(e) => setFormData({...formData, vcf_download_link: e.target.value})}
                  className="bg-slate-800 border-amber-500/30 text-white"
                  placeholder="https://example.com/contact.vcf"
                />
                <p className="text-amber-300/60 text-xs">Lien de téléchargement VCF après expiration du timer</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-amber-200">Notes Admin</Label>
                <Input
                  id="notes"
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({...formData, admin_notes: e.target.value})}
                  className="bg-slate-800 border-amber-500/30 text-white"
                  placeholder="Notes internes..."
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="active" className="text-amber-200">Activer immédiatement</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-amber-500/30 text-amber-200">
                  Annuler
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
                  {editingItem ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-6">
        {visibility.length === 0 ? (
          <Card className="glass-effect border-amber-300/20">
            <CardContent className="p-8 text-center">
              <Phone className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-amber-100 mb-2">Aucune visibilité configurée</h3>
              <p className="text-amber-200/70">Créez votre première visibilité WhatsApp.</p>
            </CardContent>
          </Card>
        ) : (
          visibility.map((item) => (
            <Card key={item.id} className="glass-effect border-amber-300/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      {item.title}
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(item)}`}>
                        {item.type.toUpperCase()}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-amber-200/80 mt-2">
                      {item.admin_notes || 'Aucune note'}
                    </CardDescription>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={() => toggleActive(item)} size="sm" variant="outline" className="border-amber-500/30">
                      <Timer className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleEdit(item)} size="sm" variant="outline" className="border-amber-500/30">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(item.id)} size="sm" variant="outline" className="border-red-500/30 text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-amber-300 font-medium">Statut:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {item.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-amber-300 font-medium">Temps restant:</span>
                    <span className="ml-2 text-amber-200">{getTimeRemaining(item.end_time)}</span>
                  </div>
                  
                  <div>
                    <span className="text-amber-300 font-medium">Lien WhatsApp:</span>
                    <span className="ml-2 text-amber-200">{item.whatsapp_link ? '✓ Configuré' : '✗ Manquant'}</span>
                  </div>
                  
                  <div>
                    <span className="text-amber-300 font-medium">Lien VCF:</span>
                    <span className="ml-2 text-amber-200">{item.vcf_download_link ? '✓ Configuré' : '✗ Manquant'}</span>
                  </div>
                </div>
                
                {item.whatsapp_link && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 text-sm font-medium">Lien WhatsApp actif</span>
                    </div>
                    <p className="text-green-200/80 text-xs mt-1 break-all">{item.whatsapp_link}</p>
                  </div>
                )}
                
                {item.vcf_download_link && (
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-300 text-sm font-medium">Lien VCF configuré</span>
                    </div>
                    <p className="text-blue-200/80 text-xs mt-1 break-all">{item.vcf_download_link}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminWhatsAppVisibility;