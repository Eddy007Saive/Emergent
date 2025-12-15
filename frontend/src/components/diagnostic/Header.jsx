import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Placeholder - Client will integrate their own logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">G</span>
            </div>
            <div>
              <span className="font-semibold text-foreground text-lg">Goodtime</span>
              <span className="text-accent font-semibold"> BnB</span>
            </div>
          </div>
          
          {/* Optional tagline */}
          <div className="hidden md:block">
            <span className="text-sm text-muted-foreground">Diagnostic Business</span>
          </div>
        </div>
      </div>
    </header>
  );
}
