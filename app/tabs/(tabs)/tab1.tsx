import EditScreenInfo from '@/components/EditScreenInfo';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Box } from '@/components/ui/box';

import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { useEffect } from 'react';

export default function Tab2() {
  useEffect(() => {
    const checkUser = () => {
      const user = auth.currentUser;
      if (user) {
        console.log('Firebase user is signed in:', user.uid);
        // You can navigate to a different screen or show authenticated content
      } else {
        console.log('No Firebase user is signed in.');
      }
    };

    checkUser();

    // Optional: Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        console.log('Auth state changed: User signed in', user.uid);
      } else {
        console.log('Auth state changed: User signed out');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <Center className="flex-1">
      <Heading className="font-bold text-2xl">Welcome Back, Jerbear</Heading>
      <Divider className="my-[30px] w-[80%]" />
    
      {/*<EditScreenInfo path="app/(app)/(tabs)/tab1.tsx" />*/}
      <VStack space="md" className="w-[80%]">
        <Input 
          variant="rounded"
          size= "xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField placeholder="Enter Password" />
        </Input>
        <Box className="items-end w-full">
          <Link href="/modal">
            <LinkText className="text-primary-500 items-start">Forgot Password</LinkText>
          </Link>
        </Box>
        
        <Box className='items-center w-full rounded-x1'>
        {/*<Button
            className='w-[50%] rounded-x1'
            size="lg"
            variant="solid"
            action="primary"
            isDisabled={false}
            isFocusVisible={false}
            
          >
            <ButtonText>Sign in</ButtonText>
          </Button>*/}
          <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full"
            variant='solid'
          >
            <ButtonText>  Sign In  </ButtonText>
          </Button>
          
          </Box>
          
      </VStack>
      
    </Center>
  );
}
