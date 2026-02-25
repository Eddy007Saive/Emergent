import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { 
  ArrowLeft, 
  CheckCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Home,
  Target,
  Euro,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Loader2,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

export default function ValidationScreen({ 
  userInfo, 
  qualification,
  scores,
  onValidate,
  onBack,
  isLoading 
}) {
  const [acceptConditions, setAcceptConditions] = useState(true);

  const handleValidate = () => {
    if (!acceptConditions) {
      toast.error('Veuillez accepter les conditions pour continuer');
      return;
    }
    onValidate();
  };

  const getLogementsLabel = (value) => {
    // Now it's a direct number
    return `${value} logements`;
  };

  const getObjectifLabel = (value) => {
    // Now it's a direct number
    return `${value} logements`;
  };

  const getCommissionLabel = (value) => {
    const labels = {
      '<1500': 'Moins de 1 500 €',
      '1500-2500': '1 500 € à 2 500 €',
      '2500-4000': '2 500 € à 4 000 €',
      '4000-6000': '4 000 € à 6 000 €',
      '>6000': 'Plus de 6 000 €',
    };
    return labels[value] || value;
  };

  const getDelaiLabel = (value) => {
    const labels = {
      '<1h': 'Moins d\'1 heure',
      '1-4h': '1 à 4 heures',
      '4-24h': '4 à 24 heures',
      '24-48h': '24 à 48 heures',
      '>48h': 'Plus de 48 heures',
      'variable': 'Variable / pas de suivi',
    };
    return labels[value] || value;
  };

  const getBudgetLabel = (value) => {
    const labels = {
      '0': '0 € - Pas d\'investissement',
      '100-300': '100 € à 300 € / mois',
      '300-500': '300 € à 500 € / mois',
      '500-1000': '500 € à 1 000 € / mois',
      '>1000': 'Plus de 1 000 € / mois',
    };
    return labels[value] || value;
  };

  const getGMBLabel = (value) => {
    const labels = {
      'non': 'Pas de fiche',
      'oui-0': 'Oui, 0 avis',
      'oui-1-10': 'Oui, 1 à 10 avis',
      'oui-10-30': 'Oui, 10 à 30 avis',
      'oui-30+': 'Oui, plus de 30 avis',
    };
    return labels[value] || value;
  };

  const getClosingLabel = (value) => {
    const labels = {
      'moi': 'Moi uniquement',
      'moi-equipe': 'Moi + équipe',
      'equipe': 'Membre dédié',
      'personne': 'Personne de dédié',
    };
    return labels[value] || value;
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-card border-border animate-fade-in">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Récapitulatif avant diagnostic
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Vérifie tes informations avant de valider
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Informations personnelles */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Informations personnelles
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <InfoRow icon={User} label="Nom" value={`${userInfo.prenom} ${userInfo.nom}`} />
                <InfoRow icon={Mail} label="Email" value={userInfo.email} />
                <InfoRow icon={Phone} label="Téléphone" value={userInfo.telephone} />
                <InfoRow icon={MapPin} label="Ville" value={userInfo.ville} />
              </div>
            </div>

            <Separator />

            {/* Informations conciergerie */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                Ta conciergerie
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <InfoRow 
                  icon={Home} 
                  label="Logements actuels" 
                  value={getLogementsLabel(qualification.logementsActuels)} 
                />
                <InfoRow 
                  icon={Target} 
                  label="Objectif 12 mois" 
                  value={getObjectifLabel(qualification.objectif12Mois)} 
                />
                <InfoRow 
                  icon={Euro} 
                  label="Commission moyenne" 
                  value={getCommissionLabel(qualification.commissionMoyenne)} 
                />
                <InfoRow 
                  icon={Clock} 
                  label="Délai de réponse leads" 
                  value={getDelaiLabel(qualification.delaiReponse)} 
                />
                <InfoRow 
                  icon={TrendingUp} 
                  label="Budget croissance" 
                  value={getBudgetLabel(qualification.budgetMensuel)} 
                />
                <InfoRow 
                  icon={MapPin} 
                  label="Google Business" 
                  value={getGMBLabel(qualification.googleBusiness)} 
                />
                <InfoRow 
                  icon={Users} 
                  label="Closing" 
                  value={getClosingLabel(qualification.closing)} 
                />
                <InfoRow 
                  icon={Calendar} 
                  label="Engagement 12 mois" 
                  value={qualification.engagement12Mois === 'oui' ? 'Oui' : 'Non'} 
                  highlight={qualification.engagement12Mois === 'oui'}
                />
              </div>
            </div>

            <Separator />

            {/* Score preview */}
            <div className="bg-primary-light rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Ton score diagnostic
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Basé sur tes 22 réponses au questionnaire
              </p>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-primary">
                  {scores.total}<span className="text-lg text-muted-foreground">/44</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Structure: {scores.structure}/20 • 
                  Acquisition: {scores.acquisition}/18 • 
                  Valeur: {scores.value}/6
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="flex items-start gap-3 p-4 bg-warm-light rounded-lg border border-warm">
              <Checkbox
                id="conditions"
                checked={acceptConditions}
                onCheckedChange={setAcceptConditions}
                className="mt-0.5"
              />
              <Label htmlFor="conditions" className="text-sm text-warm-foreground cursor-pointer leading-relaxed">
                En validant ce diagnostic, j'accepte que Goodtime me contacte à propos de ce sujet. 
                Mes données ne seront jamais revendues.
              </Label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button 
                onClick={handleValidate} 
                disabled={isLoading || !acceptConditions}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Valider et voir mon diagnostic
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-card">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-muted-foreground">{label}:</span>{' '}
        <span className={highlight ? 'font-semibold text-primary' : 'font-medium text-foreground'}>
          {value}
        </span>
      </div>
    </div>
  );
}
