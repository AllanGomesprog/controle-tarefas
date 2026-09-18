import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DemoApp from './DemoApp.jsx';
import '../index.css';
import '../workspace.css';

createRoot(document.getElementById('root')).render(<StrictMode><DemoApp /></StrictMode>);
