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
  AlertCircle,
  Zap,
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
  aiAnalysis,
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

  // Use AI analysis if available, otherwise fall back to static segment data
  const displaySegment = aiAnalysis?.segment || segment.id;
  const displayScore = aiAnalysis?.score || scores.total;
  
  const getSegmentStyles = () => {
    const seg = displaySegment;
    if (seg === 'artisanal' || seg === 'fragile') {
      return {
        bg: 'bg-accent-light',
        border: 'border-accent/30',
        text: 'text-accent',
        icon: AlertTriangle,
        name: 'Conciergerie artisanale fragile',
      };
    }
    if (seg === 'transition') {
      return {
        bg: 'bg-warm-light',
        border: 'border-warm',
        text: 'text-foreground',
        icon: TrendingUp,
        name: 'Entreprise en transition',
      };
    }
    // machine
    return {
      bg: 'bg-primary-light',
      border: 'border-primary/30',
      text: 'text-primary',
      icon: Target,
      name: 'Machine en devenir',
    };
  };

  const segmentStyles = getSegmentStyles();
  const SegmentIcon = segmentStyles.icon;

  // Get analysis content - prefer AI, fall back to static
  const diagSummary = aiAnalysis?.diagSummary || segment.message;
  const mainBlocker = aiAnalysis?.mainBlocker || 'Structuration insuffisante';
  const priority = aiAnalysis?.priority || segment.axis;
  const goodtimeRecommendation = aiAnalysis?.goodtimeRecommendation || 
    `Goodtime accompagne les conciergeries à passer d'un modèle artisanal à une entreprise structurée avec un moteur d'acquisition local qui fait tomber des lits chaque mois. Si tu veux qu'on regarde ensemble ce qu'il faut structurer en priorité, réserve un créneau.`;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-muted-foreground mb-2">Résultats pour</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {userInfo.prenom} {userInfo.nom}
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
                      {displayScore}
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
                    {segmentStyles.name}
                  </span>
                </div>
                <p className="text-foreground leading-relaxed">
                  {diagSummary}
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
            score={aiAnalysis?.structureScore || scores.structure}
            maxScore={BLOCKS.STRUCTURE.maxScore}
            badgeClass="block-badge-structure"
            delay="0ms"
          />
          <ScoreCard
            icon={TrendingUp}
            title="Acquisition"
            score={aiAnalysis?.acquisitionScore || scores.acquisition}
            maxScore={BLOCKS.ACQUISITION.maxScore}
            badgeClass="block-badge-acquisition"
            delay="100ms"
          />
          <ScoreCard
            icon={Target}
            title="Valeur"
            score={aiAnalysis?.valueScore || scores.value}
            maxScore={BLOCKS.VALUE.maxScore}
            badgeClass="block-badge-value"
            delay="200ms"
          />
        </div>

        {/* Main Blocker - NEW */}
        <Card className="mb-6 border-2 border-accent/20 bg-accent-light animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Principal blocage identifié</h4>
                <p className="text-lg font-medium text-accent">{mainBlocker}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority - NEW */}
        <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Priorité n°1 sur 90 jours</h4>
                <p className="text-muted-foreground leading-relaxed">{priority}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis - Only show if no AI analysis (fallback) */}
        {!aiAnalysis && (
          <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '350ms' }}>
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
        )}

        <Separator className="my-8" />

        {/* CTA Section - Goodtime */}
        <Card className="mb-8 border-2 border-primary/20 bg-primary-light shadow-primary animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardContent className="p-6 md:p-8">
            <h3 className="font-bold text-xl text-foreground mb-4">
              Prochaine étape
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {goodtimeRecommendation}
            </p>
            <Button size="lg" onClick={handleBookCall} className="w-full sm:w-auto">
              <Calendar className="w-5 h-5 mr-2" />
              Réserver un créneau
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Email Option */}
        <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '500ms' }}>
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

        {/* JSON Export - For debugging/integration */}
        {aiAnalysis && (
          <Card className="mb-8 shadow-card animate-fade-in bg-muted/30" style={{ animationDelay: '550ms' }}>
            <CardContent className="p-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                  Voir le JSON complet du diagnostic
                </summary>
                <pre className="mt-4 p-4 bg-card rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(aiAnalysis, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Restart */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '600ms' }}>
          <Button variant="ghost" onClick={onRestart}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refaire le diagnostic
          </Button>
        </div>

        {/* RGPD Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          En validant ce diagnostic, j&apos;accepte que Goodtime me contacte à propos de ce sujet. 
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
