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
import { KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';

import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../../../firebaseConfig';
import { Colors } from '@/constants/Colors';
import { Icon, EyeIcon, EyeOffIcon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';


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

  // If user is signed in, immediately redirect to the general tasks page.
  useEffect(() => {
    if (user) {
      try {
        router.replace('/generalTasks' as any);
      } catch (e) {
        // ignore navigation errors
      }
    }
  }, [user, router]);

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

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword('');
      setStatusVariant('success');
      setStatusMessage('Signed in successfully. Redirecting...');
      router.replace('/generalTasks' as any);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatusVariant('error');
      setStatusMessage(`Check email or password. `);
    }
  };

  const displayName = user?.displayName ?? user?.email ?? '';
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Center className="flex-1">
          <VStack space="sm" className="w-[80%]">
        
        <Text
          className="text-3xl self-center text-bold" 
        >
          {user ? `Heyy, ${displayName}` : 'Login'}
        </Text>
        
        <Divider className='my-[20px] w-[100%]'/>
        {!user ? (
          <>
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
              <Link onPress={() => router.push('/tabs/(tabs)/tab3')}>
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
                isDisabled={isSignInDisabled}
                onPress={handleSignIn}
              >
                <ButtonText> Sign In </ButtonText>
              </Button>
            </Box>
            <Box className='flex-row justify-center w-full'>
              <Text className='text-sm text-typography-700'>New here? </Text>
              <Link onPress={() => router.push('/tabs/(tabs)/tab2')}>
                <LinkText className='text-sm text-primary-500'>Sign Up</LinkText>
              </Link>
            </Box>
          </>
        ) : null}

          </VStack>
        </Center>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
