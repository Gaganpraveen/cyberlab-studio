import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { routeExternalLinksToBrowser } from '@/lib/desktop';
import { initSettings } from '@/lib/settings';

import '@/styles/index.css';

initSettings();
routeExternalLinksToBrowser();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
