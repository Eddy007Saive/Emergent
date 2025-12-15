import React from 'react';
import { Button } from '../ui/button';
import { ArrowRight, Building2, TrendingUp, Target } from 'lucide-react';

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary-light text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Target className="w-4 h-4" />
            <span>Diagnostic en 22 questions</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
            As-tu une vraie entreprise
            <br />
            <span className="text-primary">ou juste un portefeuille de logements ?</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            15 minutes pour savoir si ta conciergerie est un actif revendable 
            ou un job qui te bouffe ton temps.
          </p>

          <Button size="xl" onClick={onStart} className="group">
            Commencer le diagnostic
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <ValueProp
            icon={Building2}
            title="Structure interne"
            description="Évalue ton organisation, tes process et ta capacité à te détacher de l'opérationnel."
            delay="0ms"
          />
          <ValueProp
            icon={TrendingUp}
            title="Moteur d'acquisition"
            description="Mesure ta capacité à attirer des propriétaires de façon régulière et prévisible."
            delay="100ms"
          />
          <ValueProp
            icon={Target}
            title="Valeur & revendabilité"
            description="Détermine si tu as construit un actif vendable ou un job amélioré."
            delay="200ms"
          />
        </div>

        {/* Trust Elements */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">Un diagnostic créé par</p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-warm-light border border-warm">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">G</span>
            </div>
            <span className="font-semibold text-foreground">
              Goodtime<span className="text-accent"> BnB</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueProp({ icon: Icon, title, description, delay }) {
  return (
    <div 
      className="p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow duration-300 animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
