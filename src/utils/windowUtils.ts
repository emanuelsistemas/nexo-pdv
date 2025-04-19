/**
 * Utilitários para manipulação de janelas do navegador
 */

/**
 * Abre uma nova janela em modo quiosque
 * @param url URL a ser aberta na nova janela
 * @returns Referência para a janela aberta ou null se não foi possível abrir
 */
export const openKioskWindow = (url: string): Window | null => {
  try {
    // Configurações para o modo quiosque
    const windowFeatures = 
      'width=' + window.screen.width + 
      ',height=' + window.screen.height + 
      ',top=0,left=0' +
      ',fullscreen=yes' +
      ',menubar=no' +
      ',toolbar=no' +
      ',location=no' +
      ',status=no' +
      ',scrollbars=yes';
    
    // Tenta abrir a janela
    const newWindow = window.open(url, '_blank', windowFeatures);
    
    // Verifica se a janela foi aberta com sucesso
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.warn('Não foi possível abrir a janela em modo quiosque. Bloqueador de pop-ups ativo?');
      return null;
    }
    
    // Tenta colocar a janela em foco
    newWindow.focus();
    
    return newWindow;
  } catch (error) {
    console.error('Erro ao abrir janela em modo quiosque:', error);
    return null;
  }
};

/**
 * Fecha a janela atual
 */
export const closeWindow = (): void => {
  try {
    // Tenta fechar a janela atual
    window.close();
    
    // Se a janela não fechar (por restrições do navegador), redireciona para a página inicial
    setTimeout(() => {
      if (!window.closed) {
        window.location.href = '/';
      }
    }, 100);
  } catch (error) {
    console.error('Erro ao fechar janela:', error);
    // Fallback: redireciona para a página inicial
    window.location.href = '/';
  }
};