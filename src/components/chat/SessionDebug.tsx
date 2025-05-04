import React, { useEffect, useState } from 'react';

const SessionDebug: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const parsed = JSON.parse(adminSession);
        setSessionData(parsed);
        console.log('Session data estrutura completa:', parsed);
      } catch (error) {
        console.error('Erro ao parsear sessão:', error);
      }
    }
  }, []);

  return (
    <div className="bg-gray-800 text-white p-4 rounded-md mb-4 text-xs overflow-auto max-h-40">
      <h3 className="font-bold mb-2">Dados da Sessão (Debug)</h3>
      <pre>{JSON.stringify(sessionData, null, 2)}</pre>
    </div>
  );
};

export default SessionDebug;
