/**
 * Utilitários para gerenciar o estado de autenticação no sistema
 */

// Chave utilizada para armazenar o estado de login no localStorage
const LOGIN_STATE_KEY = 'nexo_pdv_login_state';

interface LoginState {
  isLoggedIn: boolean;
  email?: string;
  lastLogin?: number; // timestamp
}

/**
 * Salva o estado de login do usuário no localStorage
 * @param email Email do usuário logado
 */
export const saveLoginState = (email: string): void => {
  const loginState: LoginState = {
    isLoggedIn: true,
    email,
    lastLogin: Date.now()
  };
  
  try {
    localStorage.setItem(LOGIN_STATE_KEY, JSON.stringify(loginState));
  } catch (error) {
    console.error('Erro ao salvar estado de login:', error);
  }
};

/**
 * Verifica se o usuário está logado com base no localStorage
 * @returns Verdadeiro se houver um estado de login válido
 */
export const isUserLoggedIn = (): boolean => {
  try {
    const loginStateStr = localStorage.getItem(LOGIN_STATE_KEY);
    if (!loginStateStr) return false;
    
    const loginState = JSON.parse(loginStateStr) as LoginState;
    if (!loginState.isLoggedIn) return false;
    
    // Opcional: verificar se o login não expirou (24 horas)
    const loginExpirationTime = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
    const isLoginExpired = loginState.lastLogin 
      ? Date.now() - loginState.lastLogin > loginExpirationTime
      : true;
    
    return !isLoginExpired;
  } catch (error) {
    console.error('Erro ao verificar estado de login:', error);
    return false;
  }
};

/**
 * Limpa o estado de login ao fazer logout
 */
export const clearLoginState = (): void => {
  try {
    localStorage.removeItem(LOGIN_STATE_KEY);
    
    // Remover também o estado de verificação humana
    // para garantir que a verificação seja exibida em cada login
    localStorage.removeItem('humanVerified');
  } catch (error) {
    console.error('Erro ao limpar estado de login:', error);
  }
};
