import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';  
import { Image } from '@/components/ui/image';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { useRouter } from 'expo-router';

const iconImage = require('../assets/images/logo.jpg');

export default function Home() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
  });

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Box className="flex-1 h-[100vh] bg-white">
      <Box className="flex flex-1 mx-5 lg:my-24 lg:mx-32 py-safe">
        
        <Box className="flex-1 justify-center items-center">
            <Image
            source={iconImage}
            accessibilityLabel="PenPad logo"
            resizeMode="contain"
              size='5xl' 
              className="w-[350px] h-[220px] lg:w-[200px] lg:h-[200px] -mt-8 ml-8"
          />
        </Box>
      </Box>
    </Box>
  );
}
