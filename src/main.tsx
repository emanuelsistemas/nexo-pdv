import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Pré-carregar recursos essenciais
const preloadResources = () => {
  // Adiciona uma pequena função para pré-carregar recursos críticos
  // como imagens ou fontes que são necessárias imediatamente
  return Promise.resolve();
};

// Inicializar a aplicação apenas quando o DOM estiver completamente carregado
const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = createRoot(rootElement);
  
  // Em produção, removemos o StrictMode para evitar renderizações duplas
  // que podem impactar a performance inicial
  if (import.meta.env.DEV) {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } else {
    root.render(<App />);
  }
};

// Executar a sequência de inicialização
preloadResources().then(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
});
