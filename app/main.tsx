import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import { Center } from '@/components/ui/center';

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
          <Box className="flex-row items-center justify-between mb-4">
            <Box className="items-start w-[56px]">
              <Sidebar />
            </Box>
            <Heading className="flex-1 text-center text-3xl font-bold text-typography-900">
              Tasks
            </Heading>
            <Box className="w-[56px]" />
          </Box>
          <Divider className="my-[1px] w-full" />
         <Fab
              placement='bottom right'
              size="lg"
              className="m-6"
              onPress={() => {
                router.push('/newtodo');
              }}>
                <FabIcon as={AddIcon} />
            </Fab>
           
      </Box>
      
    </SafeAreaView>
  );
};

export default Main;
