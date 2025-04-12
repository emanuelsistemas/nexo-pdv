import React from 'react';

interface LogoutOverlayProps {
  visible: boolean;
}

const LogoutOverlay: React.FC<LogoutOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50 transition-all duration-300">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-white mb-4"></div>
        <h2 className="text-white text-2xl font-bold mb-2">Saindo do Sistema</h2>
        <p className="text-gray-300">Encerrando sua sessão...</p>
      </div>
    </div>
  );
};

export default LogoutOverlay;
