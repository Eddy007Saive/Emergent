import React, { useState, useCallback } from 'react';
import Header from '../components/diagnostic/Header';
import WelcomeScreen from '../components/diagnostic/WelcomeScreen';
import UserInfoForm from '../components/diagnostic/UserInfoForm';
import QuestionScreen from '../components/diagnostic/QuestionScreen';
import ResultsScreen from '../components/diagnostic/ResultsScreen';
import ProgressBar from '../components/diagnostic/ProgressBar';
import { questions, calculateScores, getSegment } from '../data/questions';
import { analyzeDiagnostic } from '../services/diagnosticService';
import { toast } from 'sonner';

const STEPS = {
  WELCOME: 'welcome',
  USER_INFO: 'userInfo',
  QUESTIONS: 'questions',
  LOADING: 'loading',
  RESULTS: 'results',
};

export default function DiagnosticPage() {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [userInfo, setUserInfo] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    ville: '',
    nombreLogements: '',
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sendEmail, setSendEmail] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const totalQuestions = questions.length;

  const handleStartDiagnostic = useCallback(() => {
    setCurrentStep(STEPS.USER_INFO);
  }, []);

  const handleUserInfoSubmit = useCallback((info) => {
    setUserInfo(info);
    setCurrentStep(STEPS.QUESTIONS);
  }, []);

  const handleAnswer = useCallback((questionId, value) => {
    const newAnswers = {
      ...answers,
      [questionId]: value,
    };
    setAnswers(newAnswers);

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Last question - trigger analysis with updated answers
        handleCompleteQuizWithAnswers(newAnswers);
      }
    }, 400);
  }, [currentQuestionIndex, totalQuestions, answers]);

  const handleCompleteQuizWithAnswers = useCallback(async (finalAnswers) => {
    setCurrentStep(STEPS.LOADING);
    
    const scores = calculateScores(finalAnswers);
    
    try {
      // Call AI analysis API
      const analysis = await analyzeDiagnostic(userInfo, finalAnswers, scores);
      setAiAnalysis(analysis);
      setCurrentStep(STEPS.RESULTS);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse. Affichage des résultats standards.');
      // Fall back to standard results without AI analysis
      setAiAnalysis(null);
      setCurrentStep(STEPS.RESULTS);
    }
  }, [userInfo]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      setCurrentStep(STEPS.USER_INFO);
    }
  }, [currentQuestionIndex]);

  const handleRestartDiagnostic = useCallback(() => {
    setCurrentStep(STEPS.WELCOME);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setAiAnalysis(null);
    setUserInfo({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      ville: '',
      nombreLogements: '',
    });
  }, []);

  const getProgress = () => {
    if (currentStep === STEPS.WELCOME) return 0;
    if (currentStep === STEPS.USER_INFO) return 5;
    if (currentStep === STEPS.QUESTIONS) {
      return 5 + ((currentQuestionIndex + 1) / totalQuestions) * 90;
    }
    if (currentStep === STEPS.LOADING) return 98;
    return 100;
  };

  const scores = calculateScores(answers);
  const segment = getSegment(scores.total);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {currentStep !== STEPS.WELCOME && currentStep !== STEPS.RESULTS && (
        <ProgressBar progress={getProgress()} />
      )}

      <main className="pb-16">
        {currentStep === STEPS.WELCOME && (
          <WelcomeScreen onStart={handleStartDiagnostic} />
        )}

        {currentStep === STEPS.USER_INFO && (
          <UserInfoForm
            initialValues={userInfo}
            onSubmit={handleUserInfoSubmit}
            onBack={() => setCurrentStep(STEPS.WELCOME)}
          />
        )}

        {currentStep === STEPS.QUESTIONS && (
          <QuestionScreen
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            selectedAnswer={answers[questions[currentQuestionIndex].id]}
            onAnswer={handleAnswer}
            onPrevious={handlePrevious}
            canGoPrevious={true}
          />
        )}

        {currentStep === STEPS.LOADING && (
          <LoadingScreen />
        )}

        {currentStep === STEPS.RESULTS && (
          <ResultsScreen
            userInfo={userInfo}
            scores={scores}
            segment={segment}
            answers={answers}
            sendEmail={sendEmail}
            onSendEmailChange={setSendEmail}
            onRestart={handleRestartDiagnostic}
            aiAnalysis={aiAnalysis}
          />
        )}
      </main>

      {/* Footer RGPD */}
      {currentStep !== STEPS.RESULTS && currentStep !== STEPS.LOADING && (
        <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-3">
          <div className="container mx-auto px-4">
            <p className="text-xs text-muted-foreground text-center">
              En validant ce diagnostic, j&apos;accepte que Goodtime me contacte à propos de ce sujet. 
              Mes données ne seront jamais revendues.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

// Loading Screen Component
function LoadingScreen() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-light flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Analyse en cours...
          </h2>
          <p className="text-muted-foreground">
            Notre IA analyse tes réponses pour te fournir des recommandations personnalisées.
          </p>
        </div>
        
        <div className="space-y-3">
          <LoadingStep text="Calcul des scores" done />
          <LoadingStep text="Analyse des points forts" done />
          <LoadingStep text="Identification des axes d'amélioration" loading />
          <LoadingStep text="Génération des recommandations" />
        </div>
      </div>
    </div>
  );
}

function LoadingStep({ text, done, loading }) {
  return (
    <div className="flex items-center gap-3 justify-center">
      {done ? (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : loading ? (
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-muted" />
      )}
      <span className={done ? 'text-foreground' : loading ? 'text-foreground' : 'text-muted-foreground'}>
        {text}
      </span>
    </div>
  );
}
