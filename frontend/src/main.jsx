import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const savedTheme = localStorage.getItem('dhanam.webTheme') || 'system';
const initialDark = savedTheme === 'dark'
  || (savedTheme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark', initialDark);
document.documentElement.style.colorScheme = initialDark ? 'dark' : 'light';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
