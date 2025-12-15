import React from 'react';

export default function ProgressBar({ progress }) {
  return (
    <div className="sticky top-[73px] z-40 bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="progress-goodtime">
              <div
                className="progress-goodtime-indicator"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-primary min-w-[50px] text-right">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
