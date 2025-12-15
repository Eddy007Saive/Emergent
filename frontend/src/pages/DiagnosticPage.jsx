import React, { useState, useCallback } from 'react';
import Header from '../components/diagnostic/Header';
import WelcomeScreen from '../components/diagnostic/WelcomeScreen';
import UserInfoForm from '../components/diagnostic/UserInfoForm';
import QuestionScreen from '../components/diagnostic/QuestionScreen';
import ResultsScreen from '../components/diagnostic/ResultsScreen';
import ProgressBar from '../components/diagnostic/ProgressBar';
import { questions, calculateScores, getSegment } from '../data/questions';

const STEPS = {
  WELCOME: 'welcome',
  USER_INFO: 'userInfo',
  QUESTIONS: 'questions',
  RESULTS: 'results',
};

export default function DiagnosticPage() {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [userInfo, setUserInfo] = useState({
    prenom: '',
    email: '',
    ville: '',
    nombreLogements: '',
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sendEmail, setSendEmail] = useState(true);

  const totalQuestions = questions.length;

  const handleStartDiagnostic = useCallback(() => {
    setCurrentStep(STEPS.USER_INFO);
  }, []);

  const handleUserInfoSubmit = useCallback((info) => {
    setUserInfo(info);
    setCurrentStep(STEPS.QUESTIONS);
  }, []);

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        setCurrentStep(STEPS.RESULTS);
      }
    }, 400);
  }, [currentQuestionIndex, totalQuestions]);

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
    setUserInfo({
      prenom: '',
      email: '',
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

        {currentStep === STEPS.RESULTS && (
          <ResultsScreen
            userInfo={userInfo}
            scores={scores}
            segment={segment}
            answers={answers}
            sendEmail={sendEmail}
            onSendEmailChange={setSendEmail}
            onRestart={handleRestartDiagnostic}
          />
        )}
      </main>

      {/* Footer RGPD */}
      {currentStep !== STEPS.RESULTS && (
        <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-3">
          <div className="container mx-auto px-4">
            <p className="text-xs text-muted-foreground text-center">
              En validant ce diagnostic, j'accepte que Goodtime me contacte à propos de ce sujet. 
              Mes données ne seront jamais revendues.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
