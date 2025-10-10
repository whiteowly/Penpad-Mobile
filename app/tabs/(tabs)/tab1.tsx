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
        <Box className="items-start">
          <Link href="/modal">
            <LinkText className="text-primary-500">Forgot Password</LinkText>
          </Link>
        </Box>
        <Button
            size="xl"
            variant="solid"
            action="primary"
            isDisabled={false}
            isFocusVisible={false}
          >
            <ButtonText>Sign in</ButtonText>
          </Button>
      </VStack>
    </Center>
  );
}
