import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Graphs from './components/grade/Graphs.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Graphs />
  </StrictMode>,
);
