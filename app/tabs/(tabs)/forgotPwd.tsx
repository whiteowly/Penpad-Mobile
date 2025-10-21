import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Box } from '@/components/ui/box';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import {
  fetchSignInMethodsForEmail,
  getAuth,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { app } from '../../../firebaseConfig';
import { Image } from '@/components/ui/image';
import {  useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function ForgotPassword() {
  const auth = getAuth(app);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusVariant, setStatusVariant] = useState<'error' | 'success' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isResetDisabled = !email.trim();
  const iconImage = require('../../../assets/images/logo1.png');
  const colorScheme = useColorScheme();

  const isValidEmail = (value: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim());
  };

  const handlePasswordReset = async () => {
    if (isResetDisabled) {
      return;
    }

    setStatusMessage(null);
    setStatusVariant(null);

    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setStatusVariant('error');
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = trimmedEmail.toLowerCase();
      const signInMethods = await fetchSignInMethodsForEmail(
        auth,
        normalizedEmail
      );

      if (!signInMethods.length) {
        setStatusVariant('error');
        setStatusMessage('No account found for that email.');
        return;
      }

      await sendPasswordResetEmail(auth, normalizedEmail);
      setStatusVariant('success');
      setStatusMessage('Password reset link sent! Check your email spam.');
    } catch (error) {
      console.error('Password reset error:', error);
      setStatusVariant('error');
      setStatusMessage('Unable to send reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <Center className="flex-1">
        <VStack space="xs" className="w-[80%]">
          <Image
            source={iconImage}
            accessibilityLabel="PenPad logo"
            resizeMode="contain"
            size='2xl'
            className="w-[300px] h-[220px] lg:w-[150px] lg:h-[150px] -mt-1 ml-10"
          />
          <Text
            className="text-3xl self-center text-bold"
            style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
          >
            Reset Password
          </Text>

          <Divider className='my-[20px] w-[100%]'/>
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
              keyboardType="email-address"
            />
          </Input>

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
            <Text className=' text-center text-xs'>
              
            </Text>
            <Button
              size="lg"
              className="bg-primary-500 px-6 py-2 rounded-full"
              variant='solid'
              isDisabled={isResetDisabled || isSubmitting}
              onPress={handlePasswordReset}
            >
              <ButtonText> Send Reset Link </ButtonText>
            </Button>
          </Box>
          <Box className='flex-row justify-center w-full'>
            <Text className='text-sm text-typography-700'>Remember your password? </Text>
            <Link onPress={() => router.push('/tabs/(tabs)/tab1')}>
              <LinkText className='text-sm text-primary-500'>Login</LinkText>
            </Link>
          </Box>

        </VStack>
      </Center>
    </KeyboardAvoidingView>
  );
}
