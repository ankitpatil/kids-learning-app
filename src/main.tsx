import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FeedbackLayer } from './components/Feedback';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <FeedbackLayer />
  </React.StrictMode>,
);
