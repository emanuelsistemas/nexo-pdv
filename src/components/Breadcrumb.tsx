
import { ChevronLeft, Home } from 'lucide-react';

export interface PathItem {
  id: string;
  title: string;
}

export interface BreadcrumbProps {
  currentPath: PathItem[];
  onNavigate: (pathItem: PathItem | null, index?: number) => void;
  onBack: () => void;
  onHome: () => void;
  className?: string;
}

export function Breadcrumb({
  currentPath,
  onNavigate,
  onBack,
  onHome,
  className = ''
}: BreadcrumbProps) {
  return (
    <div className={`flex items-center bg-slate-800 rounded-lg p-1 overflow-x-auto ${className}`}>
      <button
        onClick={onBack}
        disabled={currentPath.length === 0}
        className={`p-2 rounded-lg flex items-center justify-center ${
          currentPath.length === 0 
            ? 'text-slate-600 cursor-not-allowed' 
            : 'text-slate-300 hover:text-white hover:bg-slate-700'
        }`}
        title="Voltar"
      >
        <ChevronLeft size={18} />
      </button>
      
      <button
        onClick={onHome}
        className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center"
        title="Início"
      >
        <Home size={18} />
      </button>
      
      {/* Path segments */}
      {currentPath.map((pathItem, index) => (
        <div key={pathItem.id} className="flex items-center">
          <span className="text-slate-500 mx-1">/</span>
          <button
            onClick={() => onNavigate(pathItem, index)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700"
          >
            {pathItem.title}
          </button>
        </div>
      ))}
    </div>
  );
}
