import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ToastProvider } from './state/toast';
import { MemoryTaskRepository } from './storage/taskRepository';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root が見つかりません');

const repository = new MemoryTaskRepository();

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <App repository={repository} />
    </ToastProvider>
  </StrictMode>,
);
