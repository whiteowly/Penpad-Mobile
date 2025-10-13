import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sidebar from './sidebar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { app } from '../firebaseConfig';
import { VStack } from '@/components/ui/vstack';
import { Icon, RepeatIcon, SlashIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/pressable';
import { LockIcon, LogOutIcon } from 'lucide-react-native';
import { Footer } from '@expo/html-elements';

import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';



const Profile = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const auth = getAuth(app);
  const router = useRouter();

  const [user, setUser] = useState(auth.currentUser);

  const currentUser = auth.currentUser;
  const joinDate = currentUser?.metadata?.creationTime;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, [auth]);

  const displayName = user?.displayName ?? user?.email ?? 'User';
  const resolvedAvatar = user?.photoURL ?? null;
  const [showModal, setShowModal] = React.useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
        <Box className="flex-row items-center justify-between mb-4">
          <Box className="items-start w-[56px]">
            <Sidebar />
          </Box>
          <Heading className="flex-1 text-center text-3xl font-bold text-typography-900">
            Profile
          </Heading>
          <Box className="w-[56px]" />
        </Box>
        <Divider className="my-[1px] w-full" />

        <Box className="items-center mt-12">
            
            <VStack className="justify-center items-center">
          <Avatar size="2xl">
            {resolvedAvatar ? (
              <AvatarImage source={{ uri: resolvedAvatar }} alt="Profile avatar" />
            ) : (
              <AvatarFallbackText>{displayName}</AvatarFallbackText>
            )}
          </Avatar>
              <Text size="3xl">{displayName}</Text>
              <Text size="sm" className="text-typography-600">
                {user?.email}
              </Text>
            </VStack>
         
            </Box>
            <Box>
          <VStack>
            <Text></Text>
            <Text size="2xl" 
              
               className="text-center mt-4 mb-2 font-bold text-typography-600">
              Account Management
            </Text>
            <Divider className="my-[10px] w-[100%]" />
              <Pressable 
            className="gap-3 flex-row items-center p-2 rounded-md"
            onPress={() => {router.push('/profile'); ;}}>
              <Icon as={LockIcon} size="lg" className="text-typography-600" />
              <Text size="lg">Change Password</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center p-2 rounded-md"
            onPress={() => {router.push('/tasks'); }}>
              <Icon as={RepeatIcon} size="lg" className="text-typography-600" />
              <Text size="lg">Update Email Address</Text>
            </Pressable>
            <Pressable className="gap-3 flex-row items-center p-2 rounded-md"
             onPress={() => {router.push('/profile'); }}>
              <Icon
                as={SlashIcon}
                size="lg"
                className="text-typography-600"
              />
              <Text size="lg">Delete Account</Text>
            </Pressable>
          </VStack>
        </Box>
        <Box>
            <Text></Text>
            <Text size="2xl" 
              
               className="text-center mt-4 mb-2 font-bold text-typography-600">
              Usage Statistics
            </Text>
            <Divider className="my-[10px] w-[100%]" />
            <Text size="lg">Join Date: {joinDate} </Text>
            <Text size="lg">Total Tasks Created: </Text>
            <Text size="lg">Active Tasks: </Text>
        </Box>
        <Footer
          style={{ width: '100%' }}
          className="mt-6"
        >
          <Button
            className="w-full gap-2"
            variant="outline"
            action="secondary"
            onPress={() => setShowModal(true)}
          >
            <ButtonText>Logout</ButtonText>
            <ButtonIcon as={LogOutIcon} />
          </Button>
          <Modal 
          isOpen={showModal}
          onClose={() => {
          setShowModal(false);
        }}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>     
            <Heading size="lg">Modal Title</Heading>
            
          </ModalHeader>
          <ModalBody>
            <Text>You sure?</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              className="mr-3"
              onPress={() => {
                setShowModal(false);
              }}
            >
              <ButtonText>Nah</ButtonText>
            </Button>
            <Button
              onPress={() => {
                setShowModal(false);
              }}
            >
              <ButtonText>Yuh</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </Footer>
      </Box>
    </SafeAreaView>
  );
};

export default Profile;
