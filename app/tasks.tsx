import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { ArrowLeftIcon } from 'lucide-react-native';
import {
  Checkbox,
  CheckboxGroup,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { CheckIcon } from '@/components/ui/icon';



const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const router = useRouter();
  const [showModal, setShowModal] = React.useState(false);
  const [showModal2, setShowModal2] = React.useState(false);
  const [showModal3, setShowModal3] = React.useState(false);
   const [values, setValues] = React.useState(['']);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
          <Box className="flex-row items-center justify-between mb-4">
            <Box className="items-start w-[56px]">
              <Sidebar />
            </Box>
            <Heading className="flex-1 text-center text-3xl font-bold text-typography-900">
              Tasks
            </Heading>
            <Box className="w-[56px]" />
          </Box>
          <Divider className="my-[1px] w-full" />
         <Fab
              placement='bottom right'
              size="xl"
              className="m-6"
              onPress={() => setShowModal(true)
                }>
                <FabIcon as={AddIcon} />
            </Fab>
           <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
        }}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader className="flex-col items-center gap-0.5">
            <Heading>Add New Task</Heading>
            
            <Divider className="my-[5px] w-[100%]" />
          </ModalHeader>
          <ModalBody className="mb-4">
            <Input
            variant="rounded"
            size="xl"
            isDisabled={false}
          >
            <InputField placeholder="Add it here.." />
          </Input>
        </ModalBody>
        <ModalFooter className="flex-col items-start">

              <Button
            size="lg"
            className="bg-primary-500 px-6 py-2 rounded-full items-center self-center"
            variant='solid'
            onPress={() => {
                setShowModal2(true);
              }}
          >
            <ButtonText>  Add It  </ButtonText>
          </Button>
           
            

           
            <Button
              variant="link"
              size="sm"
              onPress={() => {
                setShowModal(false);
              }}
              className="gap-1"
            >
              <ButtonIcon as={ArrowLeftIcon} />
              <ButtonText>Nevermind</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      </Box>
      
    </SafeAreaView>
  );
};

export default Main;
