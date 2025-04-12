/**
 * Abre uma nova janela em modo quiosque/tela cheia direcionando para o dashboard
 * @param url URL para a qual a janela será direcionada
 * @returns A referência à nova janela
 */
export const openKioskWindow = (url: string): Window | null => {
  // Inicializa o documento HTML com script inline para entrar em tela cheia imediatamente
  const fullscreenHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecionando...</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #0f172a;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: sans-serif;
        }
        .loader {
          border: 5px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          border-top: 5px solid #3498db;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-right: 15px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div style="display: flex; align-items: center;">
        <div class="loader"></div>
        <div>Carregando seu dashboard...</div>
      </div>
      
      <script>
        // Função para solicitar tela cheia
        function requestFullscreen() {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) { 
            document.documentElement.webkitRequestFullscreen();
          } else if (document.documentElement.msRequestFullscreen) { 
            document.documentElement.msRequestFullscreen();
          }
        }

        // Tenta solicitar tela cheia imediatamente
        requestFullscreen();
        
        // Configura um evento de clique para solicitar tela cheia novamente (alguns navegadores precisam de interação do usuário)
        document.addEventListener('click', requestFullscreen);
        
        // Redireciona para o dashboard após tentar entrar em tela cheia
        setTimeout(function() {
          window.location.href = '${url}';
        }, 800);
      </script>
    </body>
    </html>
  `;
  
  // Configurações da janela
  const windowFeatures = [
    'fullscreen=yes',
    'menubar=no',
    'status=no',
    'titlebar=no',
    'toolbar=no',
    'scrollbars=yes',
    'resizable=yes',
    `width=${screen.width}`,
    `height=${screen.height}`,
    'left=0',
    'top=0'
  ].join(',');

  // Abre a nova janela com tamanho máximo
  const newWindow = window.open('', '_blank', windowFeatures);
  
  // Verifica se a janela foi criada com sucesso
  if (newWindow) {
    // Escreve o HTML com o script de tela cheia
    newWindow.document.write(fullscreenHtml);
    newWindow.document.close();
    
    // Tenta maximizar a janela como fallback
    try {
      newWindow.moveTo(0, 0);
      newWindow.resizeTo(screen.width, screen.height);
    } catch (error) {
      console.error('Erro ao tentar maximizar a janela:', error);
    }
  }

  return newWindow;
};

/**
 * Fecha a janela atual e encerra a aplicação
 * Esta função deve ser usada para fechar a janela no modo quiosque
 */
export const closeWindow = (): void => {
  try {
    // Tenta sair do modo de tela cheia, se estiver ativo
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.error('Erro ao sair do modo de tela cheia:', error);
      });
    }
    
    // Fecha a janela atual
    window.close();
    
    // Caso o window.close() não funcione (por limitações de segurança)
    // alertamos o usuário
    setTimeout(() => {
      if (!window.closed) {
        alert('Por favor, feche esta janela manualmente.');
      }
    }, 500);
  } catch (error) {
    console.error('Erro ao tentar fechar a janela:', error);
    alert('Não foi possível fechar a janela automaticamente. Por favor, feche-a manualmente.');
  }
};
