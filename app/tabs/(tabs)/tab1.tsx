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

export default function Tab2() {
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
        <Text></Text>
        <Box className='items-center w-full rounded-x1'>
        <Button
            className='w-[50%]'
            size="lg"
            variant="outline"
            action="primary"
            isDisabled={false}
            isFocusVisible={false}
            
          >
            <ButtonText>Sign in</ButtonText>
          </Button>
          
          </Box>
          
      </VStack>
      
    </Center>
  );
}
