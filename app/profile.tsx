import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sidebar from './sidebar';
import {
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { PieChart } from 'react-native-svg-charts';
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
import { View } from 'react-native';
import { ArrowLeftIcon, EyeOffIcon, EyeIcon } from '@/components/ui/icon';
import {Input, InputField, InputIcon, InputSlot} from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { useUserTodos } from '@/lib/useUserTodos';


import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { HStack } from '@/components/ui/hstack';


 

const Profile = () => {
 
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;
  const auth = getAuth(app);
  const router = useRouter();

  const [showModal4, setShowModal4] = React.useState(false);
  const [showModal2, setShowModal2] = React.useState(false);

  const [user, setUser] = useState(auth.currentUser);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  

  const currentUser = auth.currentUser;
  const joinDate = currentUser?.metadata?.creationTime;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/tabs/tab1');
    } catch (error) {
      console.error('Sign Out Error', error);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, [auth]);

  const displayName = user?.displayName ?? user?.email ?? 'User';
  const resolvedAvatar = user?.photoURL ?? null;
  const [showModal, setShowModal] = React.useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal3, setShowModal3] = React.useState(false);
  const { remainingCount, completedCount, totalCount } = useUserTodos();
  

  const handleState = () => {
    setShowPassword((showState) => {
      return !showState;
    });
  };

  const handleDeletePasswordToggle = () => {
    setShowDeletePassword((prev) => !prev);
  };

  const handlePasswordChange = async () => {
    if (!user || !user.email) {
      alert('You must be signed in to change your password.');
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      alert('Please enter your current password and the new password twice.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      

      setShowModal4(false);
      setShowModal2(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      alert('Password updated successfully.');
    } catch (error) {
      console.error('Failed to update password', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Password update failed. ${message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      alert('You must be signed in to delete your account.');
      return;
    }
    if (!deletePassword) {
      alert('Please enter your password to confirm deletion.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      await user.delete();
      setShowModal3(false);
      setDeletePassword('');
  setShowDeletePassword(false);
      router.replace('/tabs/tab1');
    } catch (error) {
      console.error('Delete Account Error', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Account deletion failed. ${message}`);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
        <Box className="flex-row items-center mb-4">
          <Box className="items-start w-[56px]">
           <Button
            size="xl"
            variant='link'
            onPress={() => {router.back(); }}>
            <ButtonIcon as={ArrowLeftIcon} />
           </Button>
          </Box>
          <Text
                  className="text-3xl text-bold"
                  style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
                >
                  Profile
                </Text>
          <Box className="w-[56px]" />
        </Box>
       

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
            <Text
                    className="text-2xl text-bold "
                    style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
                  >
                    Account Management
                  </Text>
            <Divider className="my-[10px] w-[100%]" />
              <Pressable 
            className="gap-3 flex-row items-center p-2 rounded-md"
            onPress={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmNewPassword('');
              setShowModal4(true);
            }}>
              <Icon as={LockIcon} size="lg" className="text-typography-600" />
              <Text size="lg">Change Password</Text>
            </Pressable>
            

        <Modal
        isOpen={showModal4}
        onClose={() => {
          setShowModal4(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        }}
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader className="flex-col items-center gap-0.5">
                        <Text style = {{fontFamily: 'Poppins_600SemiBold'}}
                        size="xl"
                        >Enter Current Password</Text>
                         
                         
                        <Divider className="my-[5px] w-full" />
                      </ModalHeader>
          <ModalBody className="mb-4">
            <Input>
              <InputField
                placeholder="Current password"
                secureTextEntry={!showPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <InputSlot className="pr-3" onPress={handleState}>
                <InputIcon
                  as={showPassword ? EyeIcon : EyeOffIcon}
                  color={Colors[colorScheme].text}
                />
            </InputSlot>
            </Input>
          </ModalBody>
          <ModalFooter className="flex-col items-start">
            <Button
              onPress={() => {
                setShowModal4(false);
                setNewPassword('');
                setConfirmNewPassword('');
                setShowModal2(true);
              }}
              className="w-full"
              isDisabled={!currentPassword || isUpdatingPassword}
            >
              <ButtonText>Confirm Password</ButtonText>
            </Button>
            <Button
              variant="link"
              size="sm"
              onPress={() => {
                setShowModal4(false);
              }}
              className="gap-1"
            >
              <ButtonIcon as={ArrowLeftIcon} />
              <ButtonText>So ummmm</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={showModal2}
        onClose={() => {
          setShowModal2(false);
          setNewPassword('');
          setConfirmNewPassword('');
        }}
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader className="flex-col items-center gap-0.5">
                        <Text style = {{fontFamily: 'Poppins_600SemiBold'}}
                        size="xl"
                        >Enter your new password</Text>
                         
                         
                        <Divider className="my-[5px] w-full" />
                      </ModalHeader>
          <ModalBody className="mb-4">
            <VStack space="3">
              <Input>
                <InputField
                  placeholder="New password"
                  
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <InputSlot className="pr-3" onPress={handleState}>
                <InputIcon
            as={showPassword ? EyeIcon : EyeOffIcon}
            color={Colors[colorScheme].text}/>
            </InputSlot>
              </Input>
              <Text size='sm'></Text>
              <Input>
                <InputField
                  placeholder="Confirm new password"
                 
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                   secureTextEntry={!showPassword}
                />
                <InputSlot className="pr-3" onPress={handleState}>
                <InputIcon
            as={showPassword ? EyeIcon : EyeOffIcon}  
            color={Colors[colorScheme].text}/>
               </InputSlot>
              </Input>
            </VStack>
          </ModalBody>
          <ModalFooter className="flex-col items-start ">
            <Button
              onPress={handlePasswordChange}
              className="w-full"
              isDisabled={isUpdatingPassword}
            >
              <ButtonText>
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </ButtonText>
            </Button>

            <Button
              variant="link"
              size="sm"
              onPress={() => {
                setShowModal2(false);
                setNewPassword('');
                setConfirmNewPassword('');
                setShowModal4(false);
              }}
              className="gap-1"
              isDisabled={isUpdatingPassword}
            >
              <ButtonIcon as={ArrowLeftIcon} />
              <ButtonText>I change my mind</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
            <Pressable className="gap-3 flex-row items-center p-2 rounded-md"
             onPress={() => {
              setDeletePassword('');
              setShowDeletePassword(false);
              setShowModal3(true);
            }}>
              <Icon
                as={SlashIcon}
                size="lg"
                className="text-typography-600"
                
              />
              <Text size="lg">Delete Account</Text>
            </Pressable>
             <Modal 
          isOpen={showModal3}
          onClose={() => {
          setShowModal3(false);
          setDeletePassword('');
          setIsDeletingAccount(false);
          setShowDeletePassword(false);
        }}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>     
            <Heading size="lg">Delete Account?</Heading>
            
          </ModalHeader>
          <ModalBody>
            <Text className="mb-4">Enter your password to confirm.</Text>
            <Input>
              <InputField
                placeholder="Current password"
                secureTextEntry={!showDeletePassword}
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
              <InputSlot className="pr-3" onPress={handleDeletePasswordToggle}>
                <InputIcon
                  as={showDeletePassword ? EyeIcon : EyeOffIcon}
                  color={Colors[colorScheme].text}
                />
              </InputSlot>
            </Input>
          </ModalBody>
          <ModalFooter className= 'flex-col items-start'>
            <HStack space='4xl'>
                <Button
              variant="link"
              size="sm"
              onPress={() => {
                setShowModal2(false);
                setDeletePassword('');
                setShowModal3(false);
              }}
              className="gap-1"
              isDisabled={isDeletingAccount}
            >
              <ButtonIcon as={ArrowLeftIcon} />
              <ButtonText>I change my mind</ButtonText>
            </Button>
            <Button
              
              onPress={handleDeleteAccount}
              isDisabled={isDeletingAccount}
            >
              <ButtonText>{isDeletingAccount ? 'Deleting...' : 'Delete'}</ButtonText>
            </Button>
          
            </HStack>
            
            
          </ModalFooter>
        </ModalContent>
      </Modal>
          </VStack>
        </Box>
        <Box>
            <Text></Text>
           <Text
                   className="text-2xl text-bold"
                   style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
                 >
                    Usage Statistics
                 </Text>
            <Divider className="my-[10px] w-[100%]" />
            

            {/* Pie chart: completed vs remaining. totalCount is shown as label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <PieChart
                  style={{ height: 160, width: 160 }}
                  data={[
                    { key: 'completed', value: Number(completedCount) || 0, svg: { fill: '#868585' } },
                    { key: 'remaining', value: Number(remainingCount) || 0, svg: { fill: '#4d4d4d' } },
                  ]}
                />
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text size="lg">Total</Text>
                  <Text size="xl" style={{ fontFamily: 'Poppins_600SemiBold' }}>{totalCount}</Text>
                </View>
              </View>

              <View style={{ marginLeft: 16 }}>
                <HStack className="items-center mb-2">
                  <View style={{ width: 12, height: 12, backgroundColor: '#868585', borderRadius: 3, marginRight: 8 }} />
                  <Text>Completed: {completedCount}</Text>
                </HStack>
                <HStack className="items-center">
                  <View style={{ width: 12, height: 12, backgroundColor: '#4d4d4d', borderRadius: 3, marginRight: 8 }} />
                  <Text>Active: {remainingCount}</Text>
                </HStack>
              </View>
            </View>
           
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
          <ModalHeader className="flex-col items-center gap-0.5">
                        <Text style = {{fontFamily: 'Poppins_600SemiBold'}}
                        size="xl"
                        >Log Out</Text>
                         
                         
                        <Divider className="my-[5px] w-full" />
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
                handleLogout();
              }}
            >
              <ButtonText>Yuh</ButtonText>
            </Button>
            <Button
              onPress={() => {
                setShowModal(false);
              }}
            >
              <ButtonText>Nuh</ButtonText>
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
