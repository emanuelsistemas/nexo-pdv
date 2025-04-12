/**
 * Abre uma nova janela em modo quiosque/tela cheia direcionando para o dashboard
 * @param url URL para a qual a janela será direcionada
 * @returns A referência à nova janela
 */
export const openKioskWindow = (url: string): Window | null => {
  // Configurações da janela
  const windowFeatures = [
    'fullscreen=yes',
    'menubar=no',
    'status=no',
    'titlebar=no',
    'toolbar=no',
    'scrollbars=yes',
    'resizable=yes'
  ].join(',');

  // Abre a nova janela com tamanho máximo e recursos específicos
  const newWindow = window.open(url, '_blank', windowFeatures);
  
  // Verifica se a janela foi criada com sucesso
  if (newWindow) {
    // Tenta entrar em modo de tela cheia quando a janela for carregada
    newWindow.addEventListener('load', () => {
      try {
        // Tenta solicitar o modo de tela cheia
        if (newWindow.document.documentElement.requestFullscreen) {
          newWindow.document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.error('Erro ao tentar entrar em modo de tela cheia:', error);
      }
    });

    // Tenta maximizar a janela no caso de o modo de tela cheia não funcionar
    newWindow.moveTo(0, 0);
    newWindow.resizeTo(screen.width, screen.height);
  }

  return newWindow;
};
