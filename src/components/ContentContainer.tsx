import { ReactNode } from 'react';

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
  paddingX?: number; // Padding horizontal
  paddingTop?: number; // Padding superior
  paddingBottom?: number; // Padding inferior
}

export function ContentContainer({
  children,
  className = '',
  paddingX = 4, // Padrão: 1rem
  paddingTop = 4, // Padrão: 1rem
  paddingBottom = 0, // Padrão: 0
}: ContentContainerProps) {
  // Gera as classes de padding com base nos valores fornecidos
  const paddingClasses = `px-${paddingX} pt-${paddingTop} pb-${paddingBottom}`;
  
  return (
    <div className={`${paddingClasses} ${className}`}>
      {children}
    </div>
  );
}
