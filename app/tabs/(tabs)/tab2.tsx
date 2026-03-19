import EditScreenInfo from '@/components/EditScreenInfo';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Box } from '@/components/ui/box';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { app } from '../../../firebaseConfig';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon, EyeIcon, EyeOffIcon } from '@/components/ui/icon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
  FormControlErrorIcon,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { AlertCircleIcon } from '@/components/ui/icon';
import React from 'react';
import { Image } from '@/components/ui/image';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { reserveUsername } from '@/lib/usernames';

const isValidEmail = (value: string) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(value.trim());
};

export default function Tab2() {
  const auth = getAuth(app);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [isInvalid, setIsInvalid] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const iconImage = require('../../../assets/images/logo1.png');
  const [statusVariant, setStatusVariant] = React.useState<'error' | 'success' | null>(null);
  const isSignUpDisabled =
    !email.trim() ||
    !username.trim() ||
    !password.trim() ||
    !confirmPassword.trim();

  const handlestate = () => {
    setShowPassword((showState) => {
      return !showState;
    });
  };

  const handleSignUp = async () => {
    if (isSignUpDisabled) {
      return;
    }
    setStatusMessage(null);
    setStatusVariant(null);

    if (password.length < 6) {
      setIsInvalid(true);
      setStatusVariant('error');
      setStatusMessage('Password must be at least 6 characters.');
      return;
    }

    setIsInvalid(false);

    if (!isValidEmail(email)) {
      setStatusVariant('error');
      setStatusMessage('Please enter a valid email address.');
      return;
    }
    if (password !== confirmPassword) {
      setStatusVariant('error');
      setStatusMessage("Passwords don't match.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await updateProfile(user, {
        displayName: username,
      });
      // Create a Firestore user profile document so the app can search by email.
      try {
        const db = getFirestore(app);
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email ?? null,
          emailLowerCase: (user.email || '').toLowerCase(),
          username: username || null,
          displayName: username || null,
          createdAt: serverTimestamp(),
        });
        // Reserve the username mapping so users can be found by username.
        if (username) {
          try {
            await reserveUsername(db, username, user.uid);
          } catch (unErr: any) {
            // USERNAME_TAKEN is possible if the name was grabbed between checks; non-fatal.
            console.warn('Could not reserve username mapping:', unErr?.message ?? unErr);
          }
        }
      } catch (fireErr) {
        console.error('Failed to create user profile document:', fireErr);
        // Not fatal for signup flow; continue.
      }
      setStatusVariant('success');
      setStatusMessage('Account created successfully. Redirecting...');
      router.replace('/tasks'); // or '/main' if you want to auto-login
    } catch (error) {
      console.error('Sign up error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatusVariant('error');
      setStatusMessage(`Failed to create account. ${message}`);
    }
  };

  const resetForm = React.useCallback(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsInvalid(false);
    setStatusMessage(null);
    setStatusVariant(null);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        resetForm();
      };
    }, [resetForm])
  );

  return (
    
      <KeyboardAvoidingView
           style={{ flex: 1 }}
           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
           keyboardVerticalOffset={80}
         >
          <Center className="flex-1">
         
      <Text
        className="text-2xl text-bold"
        style={{ fontFamily: 'Poppins_600SemiBold' }}
      >
        Create Your Account
      </Text>
      <Divider className="my-[30px] w-[80%]" />

      <VStack space="md" className="w-[80%]">
        <FormControl
          isInvalid={isInvalid}
          size="lg"
          isDisabled={false}
          isReadOnly={false}
          isRequired={false}
        >
          <VStack space="md">
          <Input
            variant="rounded"
            size="xl"
            isDisabled={false}
            isInvalid={false}
            isReadOnly={false}
          >
            <InputField
              placeholder="E-mail"
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
            <InputField
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
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
            <InputField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              type={showPassword ? 'text' : 'password'} />
            <InputSlot className="pr-3" onPress={handlestate}>
              <InputIcon
                as={showPassword ? EyeIcon : EyeOffIcon}
                color={Colors[colorScheme ?? 'light'].text} />
            </InputSlot>
          </Input>
          <Input
            variant="rounded"
            size="xl"
            isDisabled={false}
            isInvalid={false}
            isReadOnly={false}
          >
            <InputField
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              type={showPassword ? 'text' : 'password'} />
            <InputSlot className="pr-3" onPress={handlestate}>
              <InputIcon
                as={showPassword ? EyeIcon : EyeOffIcon}
                color={Colors[colorScheme ?? 'light'].text} />
            </InputSlot>

          </Input>
          </VStack>
        </FormControl>
        {statusMessage && (
          <Text
            className={`mt-3 text-center text-sm ${statusVariant === 'error' ? 'text-error-600' : 'text-success-600'
              }`}
          >
            {statusMessage}
          </Text>
        )}
        <Box className='items-center w-full rounded-x1'>
          <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full"
            variant='solid'
            isDisabled={isSignUpDisabled}
            onPress={handleSignUp}
          >
            <ButtonText>  Sign Up  </ButtonText>
          </Button>
        </Box>

        <Box className='flex-row justify-center w-full'>
          <Text className='text-sm text-typography-700'>Already got an account?</Text>
          <Link onPress={() => router.push('/tabs/(tabs)/tab1')}>
            <LinkText className='text-sm text-primary-500'> Login</LinkText>
          </Link>
        </Box>

      </VStack>

    </Center>
        </KeyboardAvoidingView>
  );
}
