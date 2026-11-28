import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FeedbackLayer } from './components/Feedback';
import { MotionLayer } from './components/MotionLayer';
import { ScreenHeading } from './components/ScreenHeading';
// Self-hosted fonts (OFL), bundled and precached so they work offline (I1).
import '@fontsource-variable/nunito/wght.css';
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* One <main> landmark for every screen; the feedback and camera layers are overlays outside it (#30b). */}
    <main>
      <ScreenHeading />
      <App />
    </main>
    <FeedbackLayer />
    <MotionLayer />
  </React.StrictMode>,
);
