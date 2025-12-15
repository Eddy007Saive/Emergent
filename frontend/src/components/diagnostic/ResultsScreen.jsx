import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  Calendar,
  Mail,
  RefreshCw,
  TrendingUp,
  Building2,
  Target,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { BLOCKS } from '../../data/questions';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const CALENDAR_LINK = '{{LIEN_CALENDRIER}}';

export default function ResultsScreen({
  userInfo,
  scores,
  segment,
  sendEmail,
  onSendEmailChange,
  onRestart,
}) {
  const handleSendEmail = () => {
    toast.success('Diagnostic envoyé par email !', {
      description: `Un récapitulatif a été envoyé à ${userInfo.email}`,
    });
  };

  const handleBookCall = () => {
    // In production, this would redirect to the calendar link
    toast.info('Redirection vers le calendrier...', {
      description: 'Le lien du calendrier sera configuré par le client.',
    });
  };

  const getScoreColor = (score, max) => {
    const percentage = (score / max) * 100;
    if (percentage < 40) return 'text-accent';
    if (percentage < 70) return 'text-warning';
    return 'text-success';
  };

  const getSegmentStyles = () => {
    switch (segment.id) {
      case 'fragile':
        return {
          bg: 'bg-accent-light',
          border: 'border-accent/30',
          text: 'text-accent',
          icon: AlertTriangle,
        };
      case 'transition':
        return {
          bg: 'bg-warm-light',
          border: 'border-warm',
          text: 'text-foreground',
          icon: TrendingUp,
        };
      case 'machine':
        return {
          bg: 'bg-primary-light',
          border: 'border-primary/30',
          text: 'text-primary',
          icon: Target,
        };
      default:
        return {
          bg: 'bg-secondary',
          border: 'border-border',
          text: 'text-foreground',
          icon: Target,
        };
    }
  };

  const segmentStyles = getSegmentStyles();
  const SegmentIcon = segmentStyles.icon;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-muted-foreground mb-2">Résultats pour</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {userInfo.prenom}
          </h1>
          <p className="text-muted-foreground">
            {userInfo.ville} • {userInfo.nombreLogements} logements
          </p>
        </div>

        {/* Main Score Card */}
        <Card className={cn('mb-8 border-2 animate-fade-in', segmentStyles.border, segmentStyles.bg)}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Score */}
              <div className="flex-shrink-0 text-center md:text-left">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-card shadow-card">
                  <div>
                    <span className={cn('text-3xl font-bold', segmentStyles.text)}>
                      {scores.total}
                    </span>
                    <span className="text-muted-foreground text-lg">/44</span>
                  </div>
                </div>
              </div>

              {/* Segment Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <SegmentIcon className={cn('w-5 h-5', segmentStyles.text)} />
                  <span className={cn('font-semibold text-lg', segmentStyles.text)}>
                    {segment.name}
                  </span>
                </div>
                <p className="text-foreground font-medium mb-2">
                  {segment.message}
                </p>
                <p className="text-muted-foreground text-sm">
                  {segment.risks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <ScoreCard
            icon={Building2}
            title="Structure"
            score={scores.structure}
            maxScore={BLOCKS.STRUCTURE.maxScore}
            badgeClass="block-badge-structure"
            delay="0ms"
          />
          <ScoreCard
            icon={TrendingUp}
            title="Acquisition"
            score={scores.acquisition}
            maxScore={BLOCKS.ACQUISITION.maxScore}
            badgeClass="block-badge-acquisition"
            delay="100ms"
          />
          <ScoreCard
            icon={Target}
            title="Valeur"
            score={scores.value}
            maxScore={BLOCKS.VALUE.maxScore}
            badgeClass="block-badge-value"
            delay="200ms"
          />
        </div>

        {/* Detailed Analysis */}
        <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <h3 className="font-semibold text-lg text-foreground">Analyse détaillée</h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {segment.detailedAnalysis.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 last:mb-0 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Axis */}
        <div className="advice-box mb-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-warm-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-warm-foreground mb-2">Axe prioritaire</h3>
              <p className="text-warm-foreground/90 leading-relaxed">{segment.axis}</p>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* CTA Section - Goodtime */}
        <Card className="mb-8 border-2 border-primary/20 bg-primary-light shadow-primary animate-fade-in" style={{ animationDelay: '500ms' }}>
          <CardContent className="p-6 md:p-8">
            <h3 className="font-bold text-xl text-foreground mb-4">
              Prochaine étape
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Goodtime accompagne les conciergeries à passer d&apos;un modèle artisanal à une 
              entreprise structurée avec un moteur d&apos;acquisition local qui fait tomber des 
              lits chaque mois.
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Si tu veux qu&apos;on regarde ensemble, à partir de tes résultats, ce qu&apos;il faut 
              structurer en priorité et à quoi pourrait ressembler ton système idéal sur 
              12 mois, tu peux réserver un créneau ici :
            </p>
            <Button size="lg" onClick={handleBookCall} className="w-full sm:w-auto">
              <Calendar className="w-5 h-5 mr-2" />
              Réserver un créneau
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Email Option */}
        <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '600ms' }}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Recevoir mon diagnostic par email</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Un récapitulatif complet avec tes scores et recommandations sera envoyé à {userInfo.email}.
                </p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="sendEmail"
                    checked={sendEmail}
                    onCheckedChange={onSendEmailChange}
                  />
                  <Label htmlFor="sendEmail" className="text-sm text-foreground cursor-pointer">
                    Oui, envoyez-moi le diagnostic par email
                  </Label>
                </div>
              </div>
              <Button variant="outline" onClick={handleSendEmail} disabled={!sendEmail}>
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Restart */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '700ms' }}>
          <Button variant="ghost" onClick={onRestart}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refaire le diagnostic
          </Button>
        </div>

        {/* RGPD Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          En validant ce diagnostic, j'accepte que Goodtime me contacte à propos de ce sujet. 
          Mes données ne seront jamais revendues.
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ icon: Icon, title, score, maxScore, badgeClass, delay }) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <Card 
      className="shadow-card animate-fade-in" 
      style={{ animationDelay: delay }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={cn('block-badge', badgeClass)}>
            <Icon className="w-3.5 h-3.5" />
            {title}
          </span>
        </div>
        <div className="flex items-end gap-1 mb-2">
          <span className="text-2xl font-bold text-foreground">{score}</span>
          <span className="text-muted-foreground mb-0.5">/{maxScore}</span>
        </div>
        <div className="progress-goodtime">
          <div
            className="progress-goodtime-indicator"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
