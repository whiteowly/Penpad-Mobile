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
import { Icon } from '@/components/ui/icon';
import {
  User,
  Home,
  ShoppingCart,
  Wallet,
  LogOut,
  MenuIcon,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Fab, FabIcon } from '@/components/ui/fab';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import { app } from '../firebaseConfig';

function Sidebar() {
  const [showDrawer, setShowDrawer] = useState(false);
  const auth = getAuth(app);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, [auth]);

  const displayName = user?.displayName ?? user?.email ?? 'Guest';

  return (
    <>
      <Fab
        placement="top right"
        size="lg"
        className="top-6 right-6"
        onPress={() => setShowDrawer(true)}
      >
        <FabIcon as={MenuIcon} />
      </Fab>
      <Drawer isOpen={showDrawer} onClose={() => setShowDrawer(false)}>
        <DrawerBackdrop />
        <DrawerContent className="w-[270px] md:w-[300px]">
          <DrawerHeader className="justify-center flex-col gap-2">
            <Avatar size="2xl">
              <AvatarFallbackText>User Image</AvatarFallbackText>
              <AvatarImage
                source={{
                  uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=687&q=80',
                }}
              />
            </Avatar>
            <VStack className="justify-center items-center">
              <Text className="font-bold" size="lg">
                {displayName}
              </Text>
              {user?.email ? (
                <Text size="sm" className="text-typography-600">
                  {user.email}
                </Text>
              ) : null}
            </VStack>
          </DrawerHeader>
          <Divider className="my-4" />
          <DrawerBody contentContainerClassName="gap-2">
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
              <Icon as={User} size="lg" className="text-typography-600" />
              <Text>My Profile</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
              <Icon as={Home} size="lg" className="text-typography-600" />
              <Text>Saved Address</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
              <Icon as={ShoppingCart} size="lg" className="text-typography-600" />
              <Text>Orders</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center hover:bg-background-50 p-2 rounded-md">
              <Icon as={Wallet} size="lg" className="text-typography-600" />
              <Text>Saved Cards</Text>
            </Pressable>
          </DrawerBody>
          <DrawerFooter>
            <Button className="w-full gap-2" variant="outline" action="secondary">
              <ButtonText>Logout</ButtonText>
              <ButtonIcon as={LogOut} />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default Sidebar;
