import React from 'react';

interface EnabledSectors {
  suporte: boolean;
  comercial: boolean;
  administrativo: boolean;
}

interface SectorFilterProps {
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  enabledSectors: EnabledSectors;
}

const SectorFilter: React.FC<SectorFilterProps> = ({ 
  selectedSector, 
  onSectorChange, 
  enabledSectors 
}) => {
  return (
    <div className="px-4 py-2">
      <select
        id="sector"
        value={selectedSector}
        onChange={(e) => onSectorChange(e.target.value)}
        className="w-full p-2.5 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="all">Todos os setores</option>
        {enabledSectors.suporte && <option value="suporte">Suporte Técnico</option>}
        {enabledSectors.comercial && <option value="comercial">Comercial</option>}
        {enabledSectors.administrativo && <option value="administrativo">Administrativo</option>}
      </select>
    </div>
  );
};

export default SectorFilter;
