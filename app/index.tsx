import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';  
import { Image } from '@/components/ui/image';

const iconImage = require('../assets/images/icon.jpg');

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <Box className="flex-1 h-[100vh] bg-white">
        <Box className="flex flex-1 items-center mx-5 lg:my-24 lg:mx-32 py-safe">
          <Box className="flex-1 justify-center items-center h-[20px] w-[300px] lg:h-[160px] lg:w-[400px]">
            <VStack>
              <Image
              size="2xl"
              source={iconImage}
              accessibilityLabel="PenPad logo"
            />
              <Text className='font-bold text-5xl'>PenPad</Text>
            </VStack>
          </Box>
        </Box>
    </Box>
  );
}
