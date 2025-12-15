import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DiagnosticPage from './pages/DiagnosticPage';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<DiagnosticPage />} />
        </Routes>
        <Toaster position="top-center" />
      </div>
    </Router>
  );
}

export default App;
