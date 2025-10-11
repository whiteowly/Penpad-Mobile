import EditScreenInfo from '@/components/EditScreenInfo';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Box } from '@/components/ui/box';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useColorScheme } from 'react-native';

import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import {getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import { app } from '../../../firebaseConfig';
import { Colors } from '@/constants/Colors';
import { Icon, EyeIcon, EyeOffIcon } from '@/components/ui/icon';

export default function Tab1() {
  const auth = getAuth(app);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(auth.currentUser);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [auth]);

  const handleState = () => {
    setShowPassword((showState) => {
      return !showState;
    });
  };

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate to tab1 page on successful sign-in
      router.replace('/tabs/tab1');
    } catch (error) {
      console.error(error);
      // Handle sign-in errors (e.g., show an alert)
    }
  };

  if (user) {
    router.replace('/tabs/tab1');
    return null; // Or a loading spinner
  }

  return (
    <Center className="flex-1">
      <VStack space="md" className="w-[80%]">
        <Heading className="font-bold text-2xl self-center">Login</Heading>
        <Divider className='my-[30px] w-[100%]'/>
        <Input 
          variant="rounded"
          size="xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField placeholder="Enter Email" value={email} onChangeText={setEmail} />
        </Input>
        <Input 
          variant="rounded"
          size="xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField placeholder="Enter Password" value={password} onChangeText={setPassword} type={showPassword ? 'text' : 'password'} />
            <InputSlot className="pr-3" onPress={handleState}>
                <InputIcon
                  as={showPassword ? EyeIcon : EyeOffIcon}
                  color={Colors[colorScheme ?? 'light'].text}
                />
            </InputSlot>
        </Input>
        <Box className="items-end w-full">
          <Link href="/modal">
            <LinkText className="text-primary-500 items-start">Forgot Password</LinkText>
          </Link>
        </Box>
        
        <Box className='items-center w-full rounded-xl'>
          <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full"
            variant='solid'
            onPress={handleSignIn}
          >
            <ButtonText>Sign In</ButtonText>
          </Button>
        </Box>
        
       
          
      </VStack>
    </Center>
  );
}
