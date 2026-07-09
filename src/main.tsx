import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully intercept and dismiss benign WebSocket and HMR connection rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || (typeof reason === 'string' ? reason : '');
    if (msg && (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('failed to connect to websocket') ||
      msg.includes('closed without opened')
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message;
    if (msg && (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('failed to connect to websocket') ||
      msg.includes('closed without opened')
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

