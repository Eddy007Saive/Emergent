import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
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
  CheckCircle2,
  ChevronRight,
  Euro,
  Clock,
  ArrowUpRight,
  BarChart3,
  Rocket,
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
    toast.info('Redirection vers le calendrier...', {
      description: 'Le lien du calendrier sera configuré par le client.',
    });
  };

  // Use AI analysis if available
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
        color: 'accent',
      };
    }
    if (seg === 'transition') {
      return {
        bg: 'bg-warm-light',
        border: 'border-warm',
        text: 'text-foreground',
        icon: TrendingUp,
        name: 'Entreprise en transition',
        color: 'warning',
      };
    }
    return {
      bg: 'bg-primary-light',
      border: 'border-primary/30',
      text: 'text-primary',
      icon: Target,
      name: 'Machine en devenir',
      color: 'success',
    };
  };

  const segmentStyles = getSegmentStyles();
  const SegmentIcon = segmentStyles.icon;

  // Get analysis content
  const diagSummary = aiAnalysis?.diagSummary || segment.message;
  const mainBlocker = aiAnalysis?.mainBlocker || 'Structuration insuffisante';
  const priority = aiAnalysis?.priority || segment.axis;
  const goodtimeRecommendation = aiAnalysis?.goodtimeRecommendation || '';
  const structureAnalysis = aiAnalysis?.structureAnalysis;
  const acquisitionAnalysis = aiAnalysis?.acquisitionAnalysis;
  const valueAnalysis = aiAnalysis?.valueAnalysis;
  const valorisation = aiAnalysis?.valorisation;
  const roadmap = aiAnalysis?.roadmap;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-muted-foreground mb-2">Résultats pour</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {userInfo.prenom} {userInfo.nom}
          </h1>
          <p className="text-muted-foreground">
            {userInfo.ville} • {userInfo.nombreLogements || aiAnalysis?.units} logements
          </p>
        </div>

        {/* Main Score Card */}
        <Card className={cn('mb-8 border-2 animate-fade-in', segmentStyles.border, segmentStyles.bg)}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Score */}
              <div className="flex-shrink-0 text-center md:text-left">
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-card shadow-card">
                  <div>
                    <span className={cn('text-4xl font-bold', segmentStyles.text)}>
                      {displayScore}
                    </span>
                    <span className="text-muted-foreground text-xl">/44</span>
                  </div>
                </div>
              </div>

              {/* Segment Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <SegmentIcon className={cn('w-6 h-6', segmentStyles.text)} />
                  <span className={cn('font-bold text-xl', segmentStyles.text)}>
                    {segmentStyles.name}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Structure: <strong className="text-foreground">{scores.structure}/20</strong></span>
                  <span>Acquisition: <strong className="text-foreground">{scores.acquisition}/18</strong></span>
                  <span>Valeur: <strong className="text-foreground">{scores.value}/6</strong></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostic Summary */}
        <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardContent className="p-6 md:p-8">
            <div className="prose prose-sm max-w-none text-foreground">
              {diagSummary.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 last:mb-0 leading-relaxed text-base">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Blocker & Priority */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-2 border-accent/20 bg-accent-light animate-fade-in" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide">Principal blocage</h4>
                  <p className="text-lg font-bold text-accent">{mainBlocker}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 bg-primary-light animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide">Priorité n°1 (90 jours)</h4>
                  <p className="text-foreground leading-relaxed">{priority}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-10" />

        {/* Detailed Analysis by Block */}
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Analyse détaillée par domaine
        </h2>

        {/* Structure Analysis */}
        {structureAnalysis && (
          <AnalysisBlock
            icon={Building2}
            title="Structure interne"
            score={structureAnalysis.score}
            percentage={structureAnalysis.percentage}
            status={structureAnalysis.status}
            diagnostic={structureAnalysis.diagnostic}
            quickWins={structureAnalysis.quickWins}
            color="primary"
            delay="250ms"
          />
        )}

        {/* Acquisition Analysis */}
        {acquisitionAnalysis && (
          <AnalysisBlock
            icon={TrendingUp}
            title="Moteur d'acquisition"
            score={acquisitionAnalysis.score}
            percentage={acquisitionAnalysis.percentage}
            status={acquisitionAnalysis.status}
            diagnostic={acquisitionAnalysis.diagnostic}
            quickWins={acquisitionAnalysis.quickWins}
            color="accent"
            delay="300ms"
          />
        )}

        {/* Value Analysis */}
        {valueAnalysis && (
          <AnalysisBlock
            icon={Target}
            title="Valeur & revendabilité"
            score={valueAnalysis.score}
            percentage={valueAnalysis.percentage}
            status={valueAnalysis.status}
            diagnostic={valueAnalysis.diagnostic}
            quickWins={valueAnalysis.quickWins}
            color="warm"
            delay="350ms"
          />
        )}

        <Separator className="my-10" />

        {/* Valorisation Section */}
        {valorisation && (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Euro className="w-6 h-6 text-primary" />
              Estimation de valorisation
            </h2>

            <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '400ms' }}>
              <CardContent className="p-6 md:p-8">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Valorisation actuelle estimée</p>
                    <p className="text-2xl font-bold text-foreground">{valorisation.actuelle}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary-light border-2 border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Valorisation potentielle</p>
                    <p className="text-2xl font-bold text-primary">{valorisation.potentielle}</p>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-accent-light border border-accent/20 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="w-5 h-5 text-accent" />
                    <span className="font-semibold text-accent">{valorisation.ecart}</span>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {valorisation.explication}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Roadmap Section */}
        {roadmap && (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-primary" />
              {roadmap.titre}
            </h2>

            <div className="space-y-4 mb-10">
              {roadmap.phases.map((phase, idx) => (
                <Card 
                  key={idx} 
                  className="shadow-card animate-fade-in" 
                  style={{ animationDelay: `${450 + idx * 50}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h4 className="font-bold text-foreground">{phase.periode}</h4>
                          <Badge variant="secondary" className="w-fit">{phase.objectif}</Badge>
                        </div>
                        <ul className="space-y-2">
                          {phase.actions.map((action, actionIdx) => (
                            <li key={actionIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Separator className="my-10" />

        {/* CTA Section - Goodtime */}
        <Card className="mb-8 border-2 border-primary shadow-primary animate-fade-in bg-gradient-to-br from-primary-light to-card" style={{ animationDelay: '600ms' }}>
          <CardContent className="p-6 md:p-8">
            <h3 className="font-bold text-2xl text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-primary" />
              Comment Goodtime peut t&apos;aider
            </h3>
            <div className="prose prose-sm max-w-none text-muted-foreground mb-6">
              {goodtimeRecommendation.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 last:mb-0 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            <Button size="lg" onClick={handleBookCall} className="w-full sm:w-auto">
              <Calendar className="w-5 h-5 mr-2" />
              Réserver un appel stratégique
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Email Option */}
        <Card className="mb-8 shadow-card animate-fade-in" style={{ animationDelay: '650ms' }}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Recevoir mon diagnostic complet par email</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Un récapitulatif détaillé avec toutes tes analyses et recommandations sera envoyé à {userInfo.email}.
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
          En validant ce diagnostic, j&apos;accepte que Goodtime me contacte à propos de ce sujet. 
          Mes données ne seront jamais revendues.
        </p>
      </div>
    </div>
  );
}

// Analysis Block Component
function AnalysisBlock({ icon: Icon, title, score, percentage, status, diagnostic, quickWins, color, delay }) {
  const getStatusBadge = () => {
    if (percentage >= 70) return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' };
    if (percentage >= 50) return { variant: 'default', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { variant: 'default', className: 'bg-red-100 text-red-800 border-red-200' };
  };

  const badgeStyle = getStatusBadge();

  return (
    <Card className="mb-6 shadow-card animate-fade-in" style={{ animationDelay: delay }}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge className={badgeStyle.className}>{status}</Badge>
            <span className="text-lg font-bold text-foreground">{score}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full mt-3">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="prose prose-sm max-w-none text-muted-foreground mb-6">
          {diagnostic.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="mb-3 last:mb-0 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {quickWins && quickWins.length > 0 && (
          <div className="p-4 rounded-lg bg-primary-light border border-primary/20">
            <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick wins à activer cette semaine
            </h5>
            <ul className="space-y-2">
              {quickWins.map((win, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
