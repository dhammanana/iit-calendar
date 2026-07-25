import React, { createContext, useContext, useState } from 'react';


interface UIContextType {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <UIContext.Provider value={{ showSettings, setShowSettings }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
