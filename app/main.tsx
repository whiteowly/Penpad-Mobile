import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon, FabLabel } from '@/components/ui/fab';
import { AddIcon, MenuIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import {Button, ButtonText, ButtonIcon} from '@/components/ui/button'; 
import { Divider } from '@/components/ui/divider';
import { MenuItem } from '@/components/ui/menu';
import Sidebar from './sidebar';

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
  <Sidebar />
        <Heading className="text-3xl font-bold mb-2 text-typography-900">
           
        </Heading>
        <Divider className='my-[10px] w-[100%]' />
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
  