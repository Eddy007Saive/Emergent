import React, { useState, useCallback } from 'react';
import Header from '../components/diagnostic/Header';
import WelcomeScreen from '../components/diagnostic/WelcomeScreen';
import UserInfoForm from '../components/diagnostic/UserInfoForm';
import QualificationForm from '../components/diagnostic/QualificationForm';
import QuestionScreen from '../components/diagnostic/QuestionScreen';
import ValidationScreen from '../components/diagnostic/ValidationScreen';
import ResultsScreen from '../components/diagnostic/ResultsScreen';
import ProgressBar from '../components/diagnostic/ProgressBar';
import { questions, calculateScores, getSegment } from '../data/questions';
import { analyzeDiagnostic } from '../services/diagnosticService';
import { toast } from 'sonner';

const STEPS = {
  WELCOME: 'welcome',
  USER_INFO: 'userInfo',
  QUALIFICATION: 'qualification',
  QUESTIONS: 'questions',
  VALIDATION: 'validation',
  RESULTS: 'results',
};

const WEBHOOK_URL = 'https://n8n.srv903010.hstgr.cloud/webhook/emergent';

export default function DiagnosticPage() {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [userInfo, setUserInfo] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    ville: '',
  });
  const [qualification, setQualification] = useState({
    logementsActuels: '',
    objectif12Mois: '',
    commissionMoyenne: '',
    delaiReponse: '',
    budgetMensuel: '',
    googleBusiness: '',
    closing: '',
    engagement12Mois: '',
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sendEmail, setSendEmail] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const totalQuestions = questions.length;

  const handleStartDiagnostic = useCallback(() => {
    setCurrentStep(STEPS.USER_INFO);
  }, []);

  const handleUserInfoSubmit = useCallback((info) => {
    setUserInfo(info);
    setCurrentStep(STEPS.QUALIFICATION);
  }, []);

  const handleQualificationSubmit = useCallback((data) => {
    setQualification(data);
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
        // Last question - go to validation screen
        setCurrentStep(STEPS.VALIDATION);
      }
    }, 400);
  }, [currentQuestionIndex, totalQuestions, answers]);

  // Send data to webhook during validation
  const handleValidation = useCallback(async () => {
    setIsValidating(true);
    
    const scores = calculateScores(answers);
    
    try {
      // Get AI analysis from backend
      const analysis = await analyzeDiagnostic(
        { ...userInfo, nombreLogements: qualification.logementsActuels },
        answers,
        scores
      );
      setAiAnalysis(analysis);
      
      // Build questions with answers for webhook
      const questionsWithAnswers = questions.map((q) => {
        const selectedValue = answers[q.id];
        const selectedOption = q.options.find(opt => opt.value === selectedValue);
        return {
          questionId: q.id,
          block: q.block,
          question: q.title,
          subtitle: q.subtitle || null,
          selectedValue: selectedValue,
          selectedAnswer: selectedOption ? selectedOption.label : null,
        };
      });
      
      // Prepare webhook payload
      const webhookPayload = {
        // User info
        firstName: userInfo.prenom,
        lastName: userInfo.nom,
        email: userInfo.email,
        phone: userInfo.telephone,
        city: userInfo.ville,
        
        // Qualification data
        units: qualification.logementsActuels,
        objectif12Mois: qualification.objectif12Mois,
        commissionMoyenne: qualification.commissionMoyenne,
        delaiReponse: qualification.delaiReponse,
        budgetMensuel: qualification.budgetMensuel,
        googleBusiness: qualification.googleBusiness,
        closing: qualification.closing,
        engagement12Mois: qualification.engagement12Mois,
        
        // Scores
        segment: analysis?.segment || getSegment(scores.total).id,
        score: scores.total,
        structureScore: scores.structure,
        acquisitionScore: scores.acquisition,
        valueScore: scores.value,
        
        // Analysis
        diagSummary: analysis?.diagSummary || '',
        mainBlocker: analysis?.mainBlocker || '',
        priority: analysis?.priority || '',
        goodtimeRecommendation: analysis?.goodtimeRecommendation || '',
        
        // Questions with full text and answers
        questionsAndAnswers: questionsWithAnswers,
        
        // Metadata
        timestamp: new Date().toISOString(),
      };
      
      // Send to webhook
      try {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });
        
        if (response.ok) {
          console.log('Webhook: Data sent successfully');
        } else {
          console.warn('Webhook: Response not OK', response.status);
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
        // Don't block the user if webhook fails
      }
      
      setCurrentStep(STEPS.RESULTS);
      
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erreur lors de l\'analyse. Réessaie.');
    } finally {
      setIsValidating(false);
    }
  }, [userInfo, qualification, answers]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      setCurrentStep(STEPS.QUALIFICATION);
    }
  }, [currentQuestionIndex]);

  const handleBackFromValidation = useCallback(() => {
    setCurrentQuestionIndex(totalQuestions - 1);
    setCurrentStep(STEPS.QUESTIONS);
  }, [totalQuestions]);

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
    });
    setQualification({
      logementsActuels: '',
      objectif12Mois: '',
      commissionMoyenne: '',
      delaiReponse: '',
      budgetMensuel: '',
      googleBusiness: '',
      closing: '',
      engagement12Mois: '',
    });
  }, []);

  const getProgress = () => {
    if (currentStep === STEPS.WELCOME) return 0;
    if (currentStep === STEPS.USER_INFO) return 3;
    if (currentStep === STEPS.QUALIFICATION) return 8;
    if (currentStep === STEPS.QUESTIONS) {
      return 10 + ((currentQuestionIndex + 1) / totalQuestions) * 80;
    }
    if (currentStep === STEPS.VALIDATION) return 95;
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

        {currentStep === STEPS.QUALIFICATION && (
          <QualificationForm
            initialValues={qualification}
            onSubmit={handleQualificationSubmit}
            onBack={() => setCurrentStep(STEPS.USER_INFO)}
          />
        )}

        {currentStep === STEPS.QUESTIONS && currentQuestionIndex < questions.length && (
          <QuestionScreen
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            selectedAnswer={answers[questions[currentQuestionIndex]?.id]}
            onAnswer={handleAnswer}
            onPrevious={handlePrevious}
            canGoPrevious={true}
          />
        )}

        {currentStep === STEPS.VALIDATION && (
          <ValidationScreen
            userInfo={userInfo}
            qualification={qualification}
            scores={scores}
            onValidate={handleValidation}
            onBack={handleBackFromValidation}
            isLoading={isValidating}
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
            aiAnalysis={aiAnalysis}
          />
        )}
      </main>

      {/* Footer RGPD */}
      {currentStep !== STEPS.RESULTS && currentStep !== STEPS.VALIDATION && (
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
