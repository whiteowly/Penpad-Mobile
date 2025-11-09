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
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Icon, EyeIcon, EyeOffIcon } from '@/components/ui/icon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function Tab2() {
  const auth = getAuth(app);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();

  const handlestate = () => {
     setShowPassword((showState) => {
      return !showState;
     });
  };
   
  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      alert("Passwords don't match");
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
  router.replace('/tabs/tab1'); // or '/main' if you want to auto-login
    } catch (error) {
      console.error('Sign up error:', error);
      alert('Failed to create account. ' + (error as Error).message);
    }
  };

  return (
    <Center className="flex-1">
      <Heading className="font-bold text-2xl">Create Your Account</Heading>
      <Divider className="my-[30px] w-[80%]" />
      
      {/* <EditScreenInfo path="app/(app)/(tabs)/tab2.tsx" /> */}
    <VStack space="md" className="w-[80%]">
        <Input 
          variant="rounded"
          size= "xl"
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
          size= "xl"
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
        </Input><Input 
          variant="rounded"
          size= "xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            type={showPassword ? 'text' : 'password'}/>
            <InputSlot className="pr-3" onPress={handlestate}>
                <InputIcon
            as={showPassword ? EyeIcon : EyeOffIcon}
            color={Colors[colorScheme ?? 'light'].text}/>
            </InputSlot>
        </Input><Input 
          variant="rounded"
          size= "xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            type={showPassword ? 'text' : 'password'}/>
            <InputSlot className="pr-3" onPress={handlestate}>
                <InputIcon
            as={showPassword ? EyeIcon : EyeOffIcon}
            color={Colors[colorScheme ?? 'light'].text}/>
            </InputSlot>
          
        </Input>
        
        <Text></Text>
        <Box className='items-center w-full rounded-x1'>
       <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full"
            variant='solid'
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
  );
}
