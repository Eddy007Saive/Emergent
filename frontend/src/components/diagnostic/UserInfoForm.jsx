import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, ArrowRight, User, Mail, MapPin, Home } from 'lucide-react';
import { toast } from 'sonner';

const LOGEMENTS_OPTIONS = [
  { value: '1-5', label: '1 à 5 logements' },
  { value: '6-15', label: '6 à 15 logements' },
  { value: '16-30', label: '16 à 30 logements' },
  { value: '31-50', label: '31 à 50 logements' },
  { value: '51-100', label: '51 à 100 logements' },
  { value: '100+', label: 'Plus de 100 logements' },
];

export default function UserInfoForm({ initialValues, onSubmit, onBack }) {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    }
    if (!formData.nombreLogements) {
      newErrors.nombreLogements = 'Le nombre de logements est requis';
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
              Avant de commencer
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ces informations nous permettent de personnaliser ton diagnostic
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Prénom */}
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
                  <p className="text-sm text-destructive">{errors.prenom}</p>
                )}
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
                  <p className="text-sm text-destructive">{errors.email}</p>
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
                  <p className="text-sm text-destructive">{errors.ville}</p>
                )}
              </div>

              {/* Nombre de logements */}
              <div className="space-y-2">
                <Label htmlFor="nombreLogements" className="flex items-center gap-2 text-foreground">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  Nombre de logements gérés
                </Label>
                <Select
                  value={formData.nombreLogements}
                  onValueChange={(value) => handleChange('nombreLogements', value)}
                >
                  <SelectTrigger 
                    id="nombreLogements"
                    className={errors.nombreLogements ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Sélectionne une tranche" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGEMENTS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.nombreLogements && (
                  <p className="text-sm text-destructive">{errors.nombreLogements}</p>
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
