import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, ArrowRight, User, Mail, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function UserInfoForm({ initialValues, onSubmit, onBack }) {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    // French phone format or international
    return /^[+]?[0-9\s-]{10,}$/.test(phone.replace(/\s/g, ''));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }
    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!validatePhone(formData.telephone)) {
      newErrors.telephone = 'Numéro de téléphone invalide';
    }
    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-lg mx-auto">
        <Card className="shadow-card border-border animate-fade-in">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              Commençons par te connaître
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ces informations nous permettent de personnaliser ton diagnostic
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Prénom & Nom - Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="flex items-center gap-2 text-foreground">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Prénom
                  </Label>
                  <Input
                    id="prenom"
                    placeholder="Ton prénom"
                    value={formData.prenom}
                    onChange={(e) => handleChange('prenom', e.target.value)}
                    className={errors.prenom ? 'border-destructive' : ''}
                  />
                  {errors.prenom && (
                    <p className="text-xs text-destructive">{errors.prenom}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-foreground">
                    Nom
                  </Label>
                  <Input
                    id="nom"
                    placeholder="Ton nom"
                    value={formData.nom}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    className={errors.nom ? 'border-destructive' : ''}
                  />
                  {errors.nom && (
                    <p className="text-xs text-destructive">{errors.nom}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="telephone" className="flex items-center gap-2 text-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Téléphone
                </Label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className={errors.telephone ? 'border-destructive' : ''}
                />
                {errors.telephone && (
                  <p className="text-xs text-destructive">{errors.telephone}</p>
                )}
              </div>

              {/* Ville */}
              <div className="space-y-2">
                <Label htmlFor="ville" className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Ville / Zone géographique
                </Label>
                <Input
                  id="ville"
                  placeholder="Paris, Lyon, Marseille..."
                  value={formData.ville}
                  onChange={(e) => handleChange('ville', e.target.value)}
                  className={errors.ville ? 'border-destructive' : ''}
                />
                {errors.ville && (
                  <p className="text-xs text-destructive">{errors.ville}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button type="submit" className="flex-1">
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
