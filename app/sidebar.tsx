import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { Divider } from '@/components/ui/divider';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { Icon, MoonIcon, SunIcon, CalendarDaysIcon, CheckIcon } from '@/components/ui/icon';
import { User, Home, ShoppingCart, ClockIcon, LogOut, MenuIcon } from 'lucide-react-native';
import React from 'react';
import { Fab, FabIcon } from '@/components/ui/fab';
import { toggleTheme, getCurrentTheme } from '@/lib/themeManager';
import { onAuthStateChanged } from 'firebase/auth';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';


import {getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import { app } from '../firebaseConfig';


function Sidebar() {
  const [showDrawer, setShowDrawer] = React.useState(false);
  const currentTheme = getCurrentTheme() ?? 'light';

  const auth = getAuth(app);
    const [email, setEmail] = useState('');
    const [user, setUser] = useState(auth.currentUser);
     const displayName = user?.displayName ?? user?.email ?? '';
      const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const router = useRouter();

  return (
    <>
      
      <Fab
        placement="top left"
        size="xl"
        className="relative top-0 left-0 z-10"
        onPress={() => setShowDrawer(true)}
      >
        <FabIcon as={MenuIcon} />
      </Fab>
      <Drawer
        isOpen={showDrawer}
        onClose={() => {
          setShowDrawer(false);
        }}
      >
        <DrawerBackdrop />
  <DrawerContent className="w-[270px] md:w-[300px]">
          <DrawerHeader className="justify-center flex-col gap-2">

            <Fab
              className="m-6"
              size="lg"
              onPress={toggleTheme}
            >
              <FabIcon
                as={currentTheme === 'dark' ? SunIcon : MoonIcon}
              />
            </Fab>

            <Avatar size="2xl">
              <AvatarFallbackText>{displayName}</AvatarFallbackText>
              <AvatarImage
                source={{
                  uri: './assests/images/PFP.jpg'
                }}
              />
            </Avatar>
            <VStack className="justify-center items-center">
              <Text size="lg">{displayName}</Text>
              <Text size="sm" className="text-typography-600">
                {user?.email}
              </Text>
            </VStack>
          </DrawerHeader>
          <Divider className="my-4" />
          <DrawerBody contentContainerClassName="gap-2">
            <Pressable 
            className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md"
            onPress={() => {router.push('/profile'); setShowDrawer(false);}}>
              <Icon as={User} size="lg" className="text-typography-600" />
              <Text>My Profile</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md"
            onPress={() => {router.push('/tasks'); setShowDrawer(false);}}>
              <Icon as={Home} size="lg" className="text-typography-600" />
              <Text>Tasks</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md"
             onPress={() => {router.push('/profile'); setShowDrawer(false);}}>
              <Icon
                as={ClockIcon}
                size="lg"
                className="text-typography-600"
              />
              <Text>Reminders</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md"
            onPress={() => {router.push('/profile'); setShowDrawer(false);}}>
              <Icon as={CalendarDaysIcon} size="lg" className="text-typography-600" />
              <Text>Upcoming</Text>
            </Pressable>
          </DrawerBody>
          <DrawerFooter>
            
            
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default Sidebar;
