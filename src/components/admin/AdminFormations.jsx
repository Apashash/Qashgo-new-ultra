import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Edit, Trash2, BookOpen, Download, Award, Eye, EyeOff, FileText, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils/currency';

const AdminFormations = () => {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFormation, setEditingFormation] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    file_url: '',
    category: 'general',
    rewards_description: '',
    rewards_amount: 0,
    is_active: true
  });
  const { toast } = useToast();

  const categories = [
    { value: 'general', label: 'Général' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'business', label: 'Business' },
    { value: 'technical', label: 'Technique' },
    { value: 'finance', label: 'Finance' },
    { value: 'design', label: 'Design' },
    { value: 'development', label: 'Développement' }
  ];


  const getFileTypeIcon = () => {
    return FileText; // Always PDF
  };


  const fetchFormations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('formations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFormations(data || []);
    } catch (error) {
      console.error("Error fetching formations:", error);
      toast({ title: "Erreur", description: "Impossible de charger les formations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      file_url: '',
      category: 'general',
      rewards_description: '',
      rewards_amount: 0,
      is_active: true
    });
    setEditingFormation(null);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.file_url) {
      toast({ title: "Erreur", description: "Titre, description et URL du PDF sont requis.", variant: "destructive" });
      return;
    }

    try {
      const submissionData = {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url || null,
        file_url: formData.file_url,
        file_type: 'pdf', // Always PDF
        file_size: null, // Not needed for URL links
        category: formData.category,
        rewards_description: formData.rewards_description || null,
        rewards_amount: parseFloat(formData.rewards_amount) || 0,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingFormation) {
        const { error } = await supabase
          .from('formations')
          .update(submissionData)
          .eq('id', editingFormation.id);
        
        if (error) throw error;
        toast({ title: "Succès", description: "Formation mise à jour avec succès." });
      } else {
        const { error } = await supabase
          .from('formations')
          .insert(submissionData);
        
        if (error) throw error;
        toast({ title: "Succès", description: "Formation ajoutée avec succès." });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchFormations();
    } catch (error) {
      console.error("Error saving formation:", error);
      toast({ title: "Erreur", description: "Échec de l'enregistrement de la formation.", variant: "destructive" });
    }
  };

  const handleEdit = (formation) => {
    setFormData({
      title: formation.title || '',
      description: formation.description || '',
      image_url: formation.image_url || '',
      file_url: formation.file_url || '',
      category: formation.category || 'general',
      rewards_description: formation.rewards_description || '',
      rewards_amount: formation.rewards_amount || 0,
      is_active: formation.is_active
    });
    setEditingFormation(formation);
    setIsDialogOpen(true);
  };

  const handleDelete = async (formationId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation?')) return;
    
    try {
      const { error } = await supabase
        .from('formations')
        .delete()
        .eq('id', formationId);
      
      if (error) throw error;
      toast({ title: "Succès", description: "Formation supprimée avec succès." });
      fetchFormations();
    } catch (error) {
      console.error("Error deleting formation:", error);
      toast({ title: "Erreur", description: "Échec de la suppression de la formation.", variant: "destructive" });
    }
  };

  const toggleActive = async (formation) => {
    try {
      const { error } = await supabase
        .from('formations')
        .update({ 
          is_active: !formation.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', formation.id);
      
      if (error) throw error;
      toast({ 
        title: "Succès", 
        description: `Formation ${!formation.is_active ? 'activée' : 'désactivée'} avec succès.` 
      });
      fetchFormations();
    } catch (error) {
      console.error("Error toggling formation status:", error);
      toast({ title: "Erreur", description: "Échec de la mise à jour du statut.", variant: "destructive" });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Gestion des Formations</h1>
          <p className="text-amber-200/70">Gérer les formations et e-books disponibles</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }} 
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une Formation
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-amber-500/30">
            <DialogHeader>
              <DialogTitle className="text-amber-100">
                {editingFormation ? 'Modifier la Formation' : 'Ajouter une Nouvelle Formation'}
              </DialogTitle>
              <DialogDescription className="text-amber-200/70">
                Remplissez les informations de la formation ou e-book
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-amber-200">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="bg-slate-800 border-amber-500/30 text-white"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-amber-200">Catégorie</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="bg-slate-800 border-amber-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-amber-500/30">
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} className="text-white">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-amber-200">Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 bg-slate-800 border border-amber-500/30 rounded-md text-white min-h-[100px]"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image_url" className="text-amber-200">URL de l'image (optionnel)</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="bg-slate-800 border-amber-500/30 text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file_url" className="text-amber-200">URL du fichier PDF *</Label>
                <Input
                  id="file_url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                  className="bg-slate-800 border-amber-500/30 text-white"
                  placeholder="https://example.com/formation.pdf"
                  required
                />
                <p className="text-amber-300/60 text-xs">Lien direct vers le fichier PDF</p>
              </div>
              
              
              <div className="space-y-2">
                <Label htmlFor="rewards_description" className="text-amber-200">Description des récompenses</Label>
                <textarea
                  id="rewards_description"
                  value={formData.rewards_description}
                  onChange={(e) => setFormData({...formData, rewards_description: e.target.value})}
                  className="w-full p-3 bg-slate-800 border border-amber-500/30 rounded-md text-white min-h-[80px]"
                  placeholder="Ce que l'utilisateur gagne après avoir terminé..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rewards_amount" className="text-amber-200">Montant de la récompense (FCFA)</Label>
                  <Input
                    id="rewards_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rewards_amount}
                    onChange={(e) => setFormData({...formData, rewards_amount: e.target.value})}
                    className="bg-slate-800 border-amber-500/30 text-white"
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-amber-200">Formation active</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <span className="text-amber-300 text-sm">
                      {formData.is_active ? 'Visible aux utilisateurs' : 'Masquée aux utilisateurs'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 flex-1">
                  {editingFormation ? 'Mettre à jour' : 'Ajouter'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {formations.length === 0 ? (
        <Card className="glass-effect-darker border-amber-300/20">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-amber-100 mb-2">Aucune formation</h3>
            <p className="text-amber-200/70">Commencez par ajouter votre première formation ou e-book.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {formations.map((formation) => {
            const FileIcon = getFileTypeIcon();
            return (
              <motion.div key={formation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass-effect-darker border-amber-300/20 card-hover-amber">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-amber-900/50 to-orange-900/50 flex items-center justify-center flex-shrink-0">
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
                          <FileIcon className="h-8 w-8 text-amber-400" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-amber-100 text-lg">{formation.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={formation.is_active ? "default" : "secondary"} className={formation.is_active ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"}>
                                {formation.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                              <Badge variant="outline" className="text-amber-300 border-amber-300/30">
                                {categories.find(c => c.value === formation.category)?.label || formation.category}
                              </Badge>
                              <Badge variant="outline" className="text-amber-300 border-amber-300/30">
                                PDF
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-amber-200/80 text-sm mb-3 line-clamp-2">{formation.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-amber-300">Type: </span>
                            <span className="text-amber-200">PDF</span>
                          </div>
                          <div>
                            <span className="text-amber-300">Téléchargements: </span>
                            <span className="text-amber-200">{formation.download_count || 0}</span>
                          </div>
                          {formation.rewards_amount > 0 && (
                            <div>
                              <span className="text-amber-300">Récompense: </span>
                              <span className="text-amber-200">{formatCurrency(formation.rewards_amount, 'benin')}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-amber-300">Créé: </span>
                            <span className="text-amber-200">{new Date(formation.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        
                        {formation.rewards_description && (
                          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <Award className="h-3 w-3 text-amber-400" />
                              <span className="text-amber-300 font-medium">Récompenses:</span>
                            </div>
                            <p className="text-amber-200/90">{formation.rewards_description}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(formation)}
                          className="border-amber-300/30 text-amber-200 hover:bg-amber-500/20"
                        >
                          {formation.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(formation)}
                          className="border-sky-300/30 text-sky-200 hover:bg-sky-500/20"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(formation.id)}
                          className="border-red-300/30 text-red-200 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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

export default AdminFormations;