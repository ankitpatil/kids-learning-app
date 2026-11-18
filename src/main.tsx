import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FeedbackLayer } from './components/Feedback';
import { MotionLayer } from './components/MotionLayer';
// Self-hosted fonts (OFL), bundled and precached so they work offline (I1).
import '@fontsource-variable/nunito/wght.css';
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <FeedbackLayer />
    <MotionLayer />
  </React.StrictMode>,
);
