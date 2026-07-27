import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const analyticsWindow = window as typeof window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
analyticsWindow.gtag = (...args: unknown[]) => {
  analyticsWindow.dataLayer?.push(args);
};
analyticsWindow.gtag('js', new Date());
analyticsWindow.gtag('config', 'G-D3PR265G1K');

const analyticsScript = document.createElement('script');
analyticsScript.async = true;
analyticsScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-D3PR265G1K';
document.head.appendChild(analyticsScript);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
