import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import Root from './app/Root';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><HashRouter><Root /></HashRouter></StrictMode>,
);
