import React, { createContext, useContext, useMemo, useState } from 'react';

export type ColorMode = 'light' | 'dark';

type ColorModeContextValue = {
  colorMode: ColorMode;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | undefined>(
  undefined
);

export const ColorModeProvider = ({
  children,
  initialMode = 'light',
}: {
  children: React.ReactNode;
  initialMode?: ColorMode;
}) => {
  const [colorMode, setColorMode] = useState<ColorMode>(initialMode);

  const value = useMemo(
    () => ({
      colorMode,
      toggleColorMode: () =>
        setColorMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [colorMode]
  );

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
};

export const useColorModeContext = () => {
  const context = useContext(ColorModeContext);

  if (!context) {
    throw new Error(
      'useColorModeContext must be used within a ColorModeProvider'
    );
  }

  return context;
};
