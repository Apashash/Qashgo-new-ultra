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
import { Plus, Edit, Trash2, Youtube, Play, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils/currency';

const TikTokIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const AdminVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    platform: 'youtube',
    earnings: 50,
    is_active: true
  });
  const { toast } = useToast();

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({ title: "Erreur", description: "Impossible de charger les vidéos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url) {
      toast({ title: "Erreur", description: "Titre et URL sont requis.", variant: "destructive" });
      return;
    }

    try {
      if (editingVideo) {
        const { error } = await supabase
          .from('videos')
          .update({
            title: formData.title,
            url: formData.url,
            platform: formData.platform,
            earnings: parseFloat(formData.earnings),
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVideo.id);

        if (error) throw error;
        toast({ title: "Succès", description: "Vidéo mise à jour avec succès." });
      } else {
        const { error } = await supabase
          .from('videos')
          .insert({
            title: formData.title,
            url: formData.url,
            platform: formData.platform,
            earnings: parseFloat(formData.earnings),
            is_active: formData.is_active
          });

        if (error) throw error;
        toast({ title: "Succès", description: "Vidéo ajoutée avec succès." });
      }

      setIsDialogOpen(false);
      setEditingVideo(null);
      setFormData({ title: '', url: '', platform: 'youtube', earnings: 50, is_active: true });
      fetchVideos();
    } catch (error) {
      console.error("Error saving video:", error);
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde.", variant: "destructive" });
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      url: video.url,
      platform: video.platform,
      earnings: video.earnings,
      is_active: video.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (videoId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette vidéo ?")) return;

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      toast({ title: "Succès", description: "Vidéo supprimée." });
      fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast({ title: "Erreur", description: "Erreur lors de la suppression.", variant: "destructive" });
    }
  };

  const toggleVideoStatus = async (video) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_active: !video.is_active, updated_at: new Date().toISOString() })
        .eq('id', video.id);

      if (error) throw error;
      toast({ 
        title: "Succès", 
        description: `Vidéo ${!video.is_active ? 'activée' : 'désactivée'}.` 
      });
      fetchVideos();
    } catch (error) {
      console.error("Error toggling video status:", error);
      toast({ title: "Erreur", description: "Erreur lors du changement de statut.", variant: "destructive" });
    }
  };

  const extractVideoId = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : '';
    }
    return url;
  };

  const getPlatformIcon = (platform) => {
    return platform === 'youtube' ? <Youtube className="h-5 w-5" /> : <TikTokIcon />;
  };

  const getPlatformColor = (platform) => {
    return platform === 'youtube' ? 'bg-red-500' : 'bg-purple-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-100">Gestion des Vidéos</h1>
          <p className="text-sky-200/70">Gérez les vidéos YouTube et TikTok pour les utilisateurs</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingVideo(null);
                setFormData({ title: '', url: '', platform: 'youtube', earnings: 50, is_active: true });
              }}
              className="bg-sky-500 hover:bg-sky-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Vidéo
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md bg-slate-800 border-slate-600">
            <DialogHeader>
              <DialogTitle className="text-sky-100">
                {editingVideo ? 'Modifier Vidéo' : 'Ajouter Vidéo'}
              </DialogTitle>
              <DialogDescription className="text-sky-200/70">
                {editingVideo ? 'Modifiez les informations de la vidéo' : 'Ajoutez une nouvelle vidéo pour les utilisateurs'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sky-200">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Titre de la vidéo"
                  className="bg-slate-700 border-slate-600 text-sky-100"
                  required
                />
              </div>

              <div>
                <Label htmlFor="url" className="text-sky-200">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=... ou https://www.tiktok.com/..."
                  className="bg-slate-700 border-slate-600 text-sky-100"
                  required
                />
              </div>

              <div>
                <Label htmlFor="platform" className="text-sky-200">Plateforme</Label>
                <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-sky-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="youtube" className="text-sky-100">YouTube</SelectItem>
                    <SelectItem value="tiktok" className="text-sky-100">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="earnings" className="text-sky-200">Gains (FCFA)</Label>
                <Input
                  id="earnings"
                  type="number"
                  value={formData.earnings}
                  onChange={(e) => setFormData({...formData, earnings: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                  className="bg-slate-700 border-slate-600 text-sky-100"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active" className="text-sky-200">Vidéo active</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="border-slate-600 text-sky-200 hover:bg-slate-700"
                >
                  Annuler
                </Button>
                <Button type="submit" className="bg-sky-500 hover:bg-sky-600">
                  {editingVideo ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {videos.length === 0 ? (
        <Card className="glass-effect border-sky-300/20">
          <CardContent className="p-8 text-center">
            <Play className="h-12 w-12 text-sky-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-sky-100 mb-2">Aucune vidéo</h3>
            <p className="text-sky-200/70">Commencez par ajouter des vidéos pour vos utilisateurs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-effect border-sky-300/20 card-hover-sky">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${getPlatformColor(video.platform)}`}>
                        {getPlatformIcon(video.platform)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sky-100">{video.title}</h3>
                        <p className="text-sm text-sky-200/70 max-w-md truncate">{video.url}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {formatCurrency(video.earnings, 'benin')}
                          </Badge>
                          <Badge variant={video.is_active ? "default" : "secondary"} className="text-xs">
                            {video.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVideoStatus(video)}
                        className="border-sky-300/30 text-sky-200 hover:bg-sky-500/20"
                      >
                        {video.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(video)}
                        className="border-sky-300/30 text-sky-200 hover:bg-sky-500/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(video.id)}
                        className="border-red-300/30 text-red-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVideos;