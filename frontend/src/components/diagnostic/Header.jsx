import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Goodtime Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo-goodtime.png" 
              alt="Goodtime" 
              className="h-12 w-auto"
            />
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
