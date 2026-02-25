import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ArrowLeft, ArrowRight, Target, Euro, Clock, TrendingUp, MapPin, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const LOGEMENTS_ACTUELS_OPTIONS = [
  { value: '1-5', label: '1 à 5 logements' },
  { value: '6-15', label: '6 à 15 logements' },
  { value: '16-30', label: '16 à 30 logements' },
  { value: '31-50', label: '31 à 50 logements' },
  { value: '51-100', label: '51 à 100 logements' },
  { value: '100+', label: 'Plus de 100 logements' },
];

const OBJECTIF_12_MOIS_OPTIONS = [
  { value: 'stable', label: 'Maintenir mon portefeuille actuel' },
  { value: '+5-10', label: '+5 à 10 logements' },
  { value: '+10-20', label: '+10 à 20 logements' },
  { value: '+20-50', label: '+20 à 50 logements' },
  { value: '+50', label: '+50 logements ou plus' },
];

const COMMISSION_OPTIONS = [
  { value: '<1500', label: 'Moins de 1 500 €' },
  { value: '1500-2500', label: '1 500 € à 2 500 €' },
  { value: '2500-4000', label: '2 500 € à 4 000 €' },
  { value: '4000-6000', label: '4 000 € à 6 000 €' },
  { value: '>6000', label: 'Plus de 6 000 €' },
];

const DELAI_REPONSE_OPTIONS = [
  { value: '<1h', label: 'Moins d\'1 heure' },
  { value: '1-4h', label: '1 à 4 heures' },
  { value: '4-24h', label: '4 à 24 heures' },
  { value: '24-48h', label: '24 à 48 heures' },
  { value: '>48h', label: 'Plus de 48 heures' },
  { value: 'variable', label: 'Variable / pas de suivi' },
];

const BUDGET_OPTIONS = [
  { value: '0', label: '0 € - Je ne veux pas investir' },
  { value: '500-1000', label: 'De 500 € à 1 000 €' },
  { value: '1000-3000', label: 'De 1 000 € à 3 000 €' },
  { value: '3000-5000', label: 'De 3 000 € à 5 000 €' },
  { value: '>5000', label: '+ de 5 000 €' },
];

const GMB_OPTIONS = [
  { value: 'non', label: 'Non, je n\'ai pas de fiche' },
  { value: 'oui-0', label: 'Oui, mais 0 avis' },
  { value: 'oui-1-10', label: 'Oui, 1 à 10 avis' },
  { value: 'oui-10-30', label: 'Oui, 10 à 30 avis' },
  { value: 'oui-30+', label: 'Oui, plus de 30 avis' },
];

const CLOSING_OPTIONS = [
  { value: 'moi', label: 'Moi uniquement' },
  { value: 'moi-equipe', label: 'Moi + un membre de l\'équipe' },
  { value: 'equipe', label: 'Un membre de l\'équipe dédié' },
  { value: 'personne', label: 'Personne de dédié / au fil de l\'eau' },
];

export default function QualificationForm({ initialValues, onSubmit, onBack }) {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.logementsActuels) {
      newErrors.logementsActuels = 'Ce champ est requis';
    }
    if (!formData.objectif12Mois) {
      newErrors.objectif12Mois = 'Ce champ est requis';
    }
    if (!formData.commissionMoyenne) {
      newErrors.commissionMoyenne = 'Ce champ est requis';
    }
    if (!formData.delaiReponse) {
      newErrors.delaiReponse = 'Ce champ est requis';
    }
    if (!formData.budgetMensuel) {
      newErrors.budgetMensuel = 'Ce champ est requis';
    }
    if (!formData.googleBusiness) {
      newErrors.googleBusiness = 'Ce champ est requis';
    }
    if (!formData.closing) {
      newErrors.closing = 'Ce champ est requis';
    }
    if (!formData.engagement12Mois) {
      newErrors.engagement12Mois = 'Ce champ est requis';
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
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-card border-border animate-fade-in">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              Quelques précisions sur ta conciergerie
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ces informations nous aident à personnaliser ton diagnostic
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logements actuels + Objectif */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Logements actuels
                  </Label>
                  <Select
                    value={formData.logementsActuels}
                    onValueChange={(value) => handleChange('logementsActuels', value)}
                  >
                    <SelectTrigger className={errors.logementsActuels ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Sélectionne" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGEMENTS_ACTUELS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.logementsActuels && (
                    <p className="text-xs text-destructive">{errors.logementsActuels}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    Objectif à 12 mois
                  </Label>
                  <Select
                    value={formData.objectif12Mois}
                    onValueChange={(value) => handleChange('objectif12Mois', value)}
                  >
                    <SelectTrigger className={errors.objectif12Mois ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Sélectionne" />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIF_12_MOIS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.objectif12Mois && (
                    <p className="text-xs text-destructive">{errors.objectif12Mois}</p>
                  )}
                </div>
              </div>

              {/* Commission moyenne */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Euro className="w-4 h-4 text-muted-foreground" />
                  Commission moyenne par logement / an
                </Label>
                <Select
                  value={formData.commissionMoyenne}
                  onValueChange={(value) => handleChange('commissionMoyenne', value)}
                >
                  <SelectTrigger className={errors.commissionMoyenne ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionne une fourchette" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.commissionMoyenne && (
                  <p className="text-xs text-destructive">{errors.commissionMoyenne}</p>
                )}
              </div>

              {/* Délai de réponse */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Délai de réponse aux leads aujourd'hui
                </Label>
                <Select
                  value={formData.delaiReponse}
                  onValueChange={(value) => handleChange('delaiReponse', value)}
                >
                  <SelectTrigger className={errors.delaiReponse ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionne" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAI_REPONSE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.delaiReponse && (
                  <p className="text-xs text-destructive">{errors.delaiReponse}</p>
                )}
              </div>

              {/* Budget mensuel */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Budget mensuel prêt à investir pour la croissance
                </Label>
                <Select
                  value={formData.budgetMensuel}
                  onValueChange={(value) => handleChange('budgetMensuel', value)}
                >
                  <SelectTrigger className={errors.budgetMensuel ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionne une fourchette" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.budgetMensuel && (
                  <p className="text-xs text-destructive">{errors.budgetMensuel}</p>
                )}
              </div>

              {/* Google Business */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Avez-vous une fiche Google Business ? Combien d'avis ?
                </Label>
                <Select
                  value={formData.googleBusiness}
                  onValueChange={(value) => handleChange('googleBusiness', value)}
                >
                  <SelectTrigger className={errors.googleBusiness ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionne" />
                  </SelectTrigger>
                  <SelectContent>
                    {GMB_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.googleBusiness && (
                  <p className="text-xs text-destructive">{errors.googleBusiness}</p>
                )}
              </div>

              {/* Closing */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Qui s'occupe du closing ?
                </Label>
                <Select
                  value={formData.closing}
                  onValueChange={(value) => handleChange('closing', value)}
                >
                  <SelectTrigger className={errors.closing ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Sélectionne" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOSING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.closing && (
                  <p className="text-xs text-destructive">{errors.closing}</p>
                )}
              </div>

              {/* Engagement 12 mois */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Prêt à t'engager sur 12 mois pour structurer ta conciergerie ?
                </Label>
                <RadioGroup
                  value={formData.engagement12Mois}
                  onValueChange={(value) => handleChange('engagement12Mois', value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oui" id="engagement-oui" />
                    <Label htmlFor="engagement-oui" className="cursor-pointer font-normal">
                      Oui, je suis prêt
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non" id="engagement-non" />
                    <Label htmlFor="engagement-non" className="cursor-pointer font-normal">
                      Non, pas pour l'instant
                    </Label>
                  </div>
                </RadioGroup>
                {errors.engagement12Mois && (
                  <p className="text-xs text-destructive">{errors.engagement12Mois}</p>
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
