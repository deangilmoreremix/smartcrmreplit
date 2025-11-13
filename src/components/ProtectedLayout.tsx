import React from 'react';
import Sidebar from './Sidebar';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  onOpenPipelineModal?: () => void;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({
  children,
  onOpenPipelineModal = () => {}
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar onOpenPipelineModal={onOpenPipelineModal} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProtectedLayout;