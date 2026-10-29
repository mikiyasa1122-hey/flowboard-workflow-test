import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './pwa';
import { ToastProvider } from './state/toast';
import { IndexedDbTaskRepository } from './storage/indexedDbRepository';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root が見つかりません');

// 保存処理は UI から分離し、TaskRepository として渡す
const repository = IndexedDbTaskRepository.open();

// Service Worker を登録し、初回アクセス後はオフラインでも起動できるようにする
registerServiceWorker();

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <App repository={repository} />
    </ToastProvider>
  </StrictMode>,
);
