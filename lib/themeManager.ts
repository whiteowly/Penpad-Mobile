type ColorMode = 'light' | 'dark';

let toggleHandler: (() => void) | undefined;
let getModeHandler: (() => ColorMode) | undefined;

export const registerThemeHandlers = (
  toggle: () => void,
  getMode: () => ColorMode
) => {
  toggleHandler = toggle;
  getModeHandler = getMode;
};

export const unregisterThemeHandlers = () => {
  toggleHandler = undefined;
  getModeHandler = undefined;
};

export const toggleTheme = () => {
  toggleHandler?.();
};

export const getCurrentTheme = () => getModeHandler?.();
