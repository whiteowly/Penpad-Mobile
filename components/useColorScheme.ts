import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeName = 'light' | 'dark';

const resolveTheme = (value: ReturnType<typeof useNativeColorScheme>): ThemeName =>
	value === 'dark' ? 'dark' : 'light';

export const useColorScheme = (): ThemeName => {
	const scheme = useNativeColorScheme();
	return resolveTheme(scheme);
};

export { resolveTheme as resolveColorScheme };
