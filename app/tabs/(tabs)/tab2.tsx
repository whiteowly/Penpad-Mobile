import EditScreenInfo from '@/components/EditScreenInfo';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Link, LinkText } from '@/components/ui/link';
import { Box } from '@/components/ui/box';

export default function Tab2() {
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
          <InputField placeholder="E-mail" />
        </Input>
        <Input 
          variant="rounded"
          size= "xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField placeholder="Username" />
        </Input><Input 
          variant="rounded"
          size= "xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField placeholder="Password" />
        </Input><Input 
          variant="rounded"
          size= "xl"
          isDisabled={false}
          isInvalid={false}
          isReadOnly={false}
        >
          <InputField placeholder="Confirm Password" />
        </Input>
        
        <Text></Text>
        <Box className='items-center w-full rounded-x1'>
       <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full"
            variant='solid'
          >
            <ButtonText>  Sign Up  </ButtonText>
          </Button>
          
          </Box>
          
      </VStack>
    
    </Center>
  );
}
