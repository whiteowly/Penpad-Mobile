import React from 'react';
import Gradient from '@/assets/icons/Gradient';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { ImageBackground } from '@/components/ui/image-background';

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <ImageBackground
      source={require('@/assets/images/background.jpg')}
      resizeMode="cover"
      className='flex-1'
    >
       <Box className="flex-1 bg-background-300 h-[100vh]">
        <Box className="absolute h-[500px] w-[500px] lg:w-[700px] lg:h-[700px]">
          
        </Box>
    
        <Box className="flex flex-1 items-center mx-5 lg:my-24 lg:mx-32 py-safe">
          <Box className="flex-1 justify-center items-center h-[20px] w-[300px] lg:h-[160px] lg:w-[400px]">
            <Text className='font-bold text-5xl'>PenPad</Text>
          </Box>
        </Box>
      
    </Box>
    </ImageBackground>
    
  );
}
