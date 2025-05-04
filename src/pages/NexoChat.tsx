// Componente modular do Nexo Chat
import AdminSidebar from '../components/admin/AdminSidebar';

export default function NexoChat() {

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white">
      {/* Usar o componente AdminSidebar */}
      <AdminSidebar activeMenuItem="/admin/nexochat" />
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        <header className="bg-[#2A2A2A] p-4 border-b border-gray-800">
          <h1 className="text-xl font-semibold text-white">Nexo Chat (Modular)</h1>
          <p className="text-sm text-gray-400">Versão modular do chat com WhatsApp</p>
        </header>

        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-emerald-500 mb-4">Em desenvolvimento</h2>
            <p className="text-gray-400 max-w-md">
              O novo chat modular está sendo implementado gradualmente. 
              Em breve estará disponível com uma arquitetura mais eficiente e manutenível.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
