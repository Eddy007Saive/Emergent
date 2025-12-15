import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BLOCKS } from '../../data/questions';
import { cn } from '../../lib/utils';

export default function QuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswer,
  onPrevious,
  canGoPrevious,
}) {
  const block = BLOCKS[question.block.toUpperCase()];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Question Header */}
        <div className="mb-8 animate-fade-in">
          {/* Block Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={cn('block-badge', block?.badgeClass)}>
              {block?.name}
            </span>
            <span className="text-sm text-muted-foreground">
              Question {questionNumber}/{totalQuestions}
            </span>
          </div>

          {/* Question Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            {question.title}
          </h2>
          {question.subtitle && (
            <p className="text-muted-foreground">{question.subtitle}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {question.options.map((option, index) => (
            <OptionCard
              key={option.value}
              option={option}
              index={index}
              isSelected={selectedAnswer === option.value}
              onClick={() => onAnswer(question.id, option.value)}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {canGoPrevious ? (
            <Button variant="ghost" onClick={onPrevious}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          ) : (
            <div />
          )}
          
          <p className="text-sm text-muted-foreground">
            Sélectionne une réponse pour continuer
          </p>
        </div>
      </div>
    </div>
  );
}

function OptionCard({ option, index, isSelected, onClick }) {
  const labels = ['A', 'B', 'C'];
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'option-card w-full text-left',
        isSelected && 'selected',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4 w-full">
        {/* Letter Badge */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground'
          )}
        >
          {labels[index]}
        </div>

        {/* Option Text */}
        <p className="flex-1 text-foreground pt-1 leading-relaxed">
          {option.label}
        </p>

        {/* Check Icon */}
        {isSelected && (
          <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
