import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { ColorModeProvider, useColorModeContext } from '../context/ColorModeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/Poppins-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ColorModeProvider>
      <AppProviders />
    </ColorModeProvider>
  );
}

function AppProviders() {
  const { colorMode } = useColorModeContext();
  const themeValue = colorMode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GluestackUIProvider mode={colorMode}>
      <ThemeProvider value={themeValue}>
        <Slot />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
