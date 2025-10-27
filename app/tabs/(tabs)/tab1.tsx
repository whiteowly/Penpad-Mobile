import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Box } from '@/components/ui/box';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { Platform } from 'react-native';

import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import {getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import { app } from '../../../firebaseConfig';
import { Colors } from '@/constants/Colors';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { useColorScheme } from '@/components/useColorScheme';
import { Spinner } from '@/components/ui/spinner';


export default function Tab1() {
  const auth = getAuth(app);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(auth.currentUser);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusVariant, setStatusVariant] = useState<'error' | 'success' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSignInDisabled = !email.trim() || !password.trim();
  const iconImage = require('../../../assets/images/logo1.png');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser?.email) {
        setEmail(currentUser.email);
      }
    });

    return unsubscribe;
  }, [auth]);

  const handleState = () => {
    setShowPassword((showState) => {
      return !showState;
    });
  };

  const handleSignIn = async () => {
    if (isSignInDisabled) {
      return;
    }
    setStatusMessage(null);
    setStatusVariant(null);

    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword('');
      setStatusVariant('success');
      setStatusMessage('Signed in successfully. Redirecting...');
      router.replace('/tasks');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatusVariant('error');
      setStatusMessage('Login failed.');
    }
    finally {
      setIsLoading(false);
    }
  };

  const displayName = user?.displayName ?? user?.email ?? '';
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <Center className="flex-1">
        <VStack space="sm" className="w-[80%]">
          <Image
            source={iconImage}
            accessibilityLabel="PenPad logo"
            resizeMode="contain"
            size='2xl'
            className="w-[300px] h-[220px] lg:w-[150px] lg:h-[150px] -mt-1 ml-10"
          />
          <Text
            className="text-3xl self-center text-bold"
            style={{ color: Colors[colorScheme].text }}
          >
            {user ? `Heyy, ${displayName}` : 'Login'}
          </Text>

          <Divider className='my-[20px] w-[100%]'/>
          {!user && (
          <Input 
            variant="rounded"
            size="xl"
            isDisabled={false}
            isInvalid={false}
            isReadOnly={false}
          >
            <InputField
              placeholder="Enter Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </Input>
          )}
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
                  color={Colors[colorScheme].text}
                />
            </InputSlot>
        </Input>
        <Box className="items-end w-full">
          <Link onPress={() => router.push('/tabs/(tabs)/forgotPwd')}>
            <LinkText className="text-primary-500 items-start">Forgot Password</LinkText>
          </Link>
        </Box>
        
        <Box className='items-center w-full rounded-xl'>
          {statusMessage && (
            <Text
              className={`mb-3 text-center text-sm ${
                statusVariant === 'error' ? 'text-error-600' : 'text-success-600'
              }`}
            >
              {statusMessage}
            </Text>
          )}
          <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full"
            variant='solid'
            isDisabled={isSignInDisabled || isLoading}
            onPress={handleSignIn}
          >
            {isLoading ? (
              <>
                <Spinner size="small" color={Colors[colorScheme].text} className="mr-2" />
                <ButtonText>Signing in...</ButtonText>
              </>
            ) : (
              <ButtonText> Sign In </ButtonText>
            )}
          </Button>
        </Box>
        <Box className='flex-row justify-center w-full'>
          <Text className='text-sm text-typography-700'>New here? </Text>
          <Link onPress={() => router.push('/tabs/(tabs)/tab2')}>
            <LinkText className='text-sm text-primary-500'>Sign Up</LinkText>
          </Link>
        </Box>

      </VStack>
    </Center>
    </KeyboardAvoidingView>
  );
}
