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
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
// username reservation removed: no longer reserving usernames during signup.
import { app } from '../../../firebaseConfig';
import { useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon, EyeIcon, EyeOffIcon } from '@/components/ui/icon';
import { Colors } from '@/constants/Colors';
import { Platform } from 'react-native';
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
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { useColorScheme } from '@/components/useColorScheme';
import { Spinner } from '@/components/ui/spinner';

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
  const [isLoading, setIsLoading] = React.useState(false);
  const isSignUpDisabled =
    !email.trim() ||
    !username.trim() ||
    !password.trim() ||
    !confirmPassword.trim();

  // final sign-up guard: require basic fields and not currently loading
  const canSignUp = !isSignUpDisabled && !isLoading;

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

    setIsLoading(true);

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
      const trimmedEmail = email.trim();
      const normalizedEmail = trimmedEmail.toLowerCase();

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const user = userCredential.user;

      const db = getFirestore(app);

      // NOTE: username reservation removed — we no longer attempt to atomically
      // reserve usernames during signup. The username field will simply be
      // stored on the user doc below. If you want uniqueness guaranteed,
      // reintroduce server-side checks (callable function) or Firestore
      // reservation logic in a future change.

      // Update profile displayName now that username is reserved
      try {
        await updateProfile(user, {
          displayName: username,
        });
      } catch (profileErr) {
        console.error('Failed to update profile displayName:', profileErr);
        // cleanup: delete the created auth user if possible
        try {
          await user.delete();
        } catch (delErr) {
          console.error('Failed to delete user after profile update failure:', delErr);
        }
        setStatusVariant('error');
        setStatusMessage('Failed to set up account. Please try again.');
        setIsLoading(false);
        return;
      }

      try {
        // Store profile metadata so password reset checks can find this user.
        await setDoc(
          doc(db, 'users', user.uid),
          {
            email: trimmedEmail,
            emailLowerCase: normalizedEmail,
            username: username.trim(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (firestoreError) {
        console.error('Failed to persist user profile:', firestoreError);
        // cleanup: delete the created auth user if possible
        try {
          await user.delete();
        } catch (delErr) {
          console.error('Failed to delete user after firestore write failure:', delErr);
        }
        setStatusVariant('error');
        setStatusMessage('Failed to finish signup. Please try again.');
        setIsLoading(false);
        return;
      }

      setStatusVariant('success');
      setStatusMessage('Account created successfully. Redirecting...');
      router.replace('/generalTasks'); // or '/main' if you want to auto-login
    } catch (error) {
      console.error('Sign up error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatusVariant('error');
      setStatusMessage(`Failed to create account. ${message}`);
    } finally {
      setIsLoading(false);
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
  <Center className="flex-1">
      <Image
            source={iconImage}
            accessibilityLabel="PenPad logo"
            resizeMode="contain"
              size='2xl' 
              className="w-[300px] h-[220px] lg:w-[150px] lg:h-[150px] -mt-1 ml-10"
          />
      <Text
        className="text-2xl text-bold"
        style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
      >
        Create Your Account
      </Text>
      <Divider className="my-[20px] w-[80%]" />

      <VStack space="sm" className="w-[80%]">
        <FormControl
          isInvalid={isInvalid}
          size="lg"
          isDisabled={false}
          isReadOnly={false}
          isRequired={false}
        >
          <VStack space="sm">
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
              placeholder="Name"
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
                color={Colors[colorScheme].text} />
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
                color={Colors[colorScheme].text} />
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
            isDisabled={!canSignUp}
            onPress={handleSignUp}
          >
            {isLoading ? (
              <>
                <Spinner size="small" color={Colors[colorScheme].text} className="mr-2" />
                <ButtonText>Signing up...</ButtonText>
              </>
            ) : (
              <ButtonText>  Sign Up  </ButtonText>
            )}
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
