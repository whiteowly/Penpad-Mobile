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
import { useUserTodos, TodoItem } from '@/lib/useUserTodos';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';


const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;
  const router = useRouter();
  const [showModal, setShowModal] = React.useState(false);
  const [showModal2, setShowModal2] = React.useState(false);
  const [showModal3, setShowModal3] = React.useState(false);
  const [values, setValues] = React.useState(['']);

  // calendar state
  const [viewDate, setViewDate] = React.useState(() => new Date()); // month being viewed
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(() => new Date());

  // load user todos
  const { todos } = useUserTodos();

  // group todos by yyyy-mm-dd createdAt
  const todosByDate = React.useMemo(() => {
    const map: Record<string, TodoItem[]> = {};
    for (const t of todos || []) {
      const ts: any = t.createdAt ?? null;
      let d: Date | null = null;
      if (!ts) continue;
      if (typeof ts.toDate === 'function') d = ts.toDate();
      else if (typeof ts.toMillis === 'function') d = new Date(ts.toMillis());
      else d = ts instanceof Date ? ts : new Date(ts);
      if (!d || Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [todos]);

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const monthMatrix = React.useMemo(() => {
    const first = startOfMonth(viewDate);
    const startWeekDay = first.getDay(); // 0-6 Sun-Sat
    const daysInMonth = endOfMonth(viewDate).getDate();
    const rows: Array<Array<number | null>> = [];
    let cur = 1 - startWeekDay;
    while (cur <= daysInMonth) {
      const week: Array<number | null> = [];
      for (let i = 0; i < 7; i++, cur++) {
        if (cur < 1 || cur > daysInMonth) week.push(null);
        else week.push(cur);
      }
      rows.push(week);
    }
    return rows;
  }, [viewDate]);

  const formatKey = (y: number, m: number, d: number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
            <Box className="flex-row items-center mb-4">
          <Box className="items-start w-[56px]">
            <Sidebar />
          </Box>
          <Text
            className="text-xl text-bold"
            style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
          >
            Calendar
          </Text>
          <Box className="w-[56px]" />
        </Box>
          <Divider className="my-[1px] w-full" />
          <Box className="flex-1">
            <Box className="px-2 py-3">
              <HStack className="items-center justify-between">
                <Button variant="link" size="sm" onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                  <ButtonIcon as ={ChevronLeft} />
                </Button>
                <Text className="text-lg" style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}>{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
                <Button variant="link" size="sm" onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                  <ButtonIcon as ={ChevronRight} />
                </Button>
              </HStack>

              <HStack className="mt-3">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <Box key={d} className="flex-1 items-center">
                    <Text className="text-xs" style={{ color: Colors[colorScheme].text }}>{d}</Text>
                  </Box>
                ))}
              </HStack>

              <VStack space="none">
                {monthMatrix.map((week, wi) => (
                  <HStack key={wi} className="mb-2">
                    {week.map((day, di) => {
                      const isToday = day != null && (() => {
                        const d = new Date();
                        return viewDate.getFullYear() === d.getFullYear() && viewDate.getMonth() === d.getMonth() && day === d.getDate();
                      })();
                      const isSelected = selectedDate != null && day != null && selectedDate.getFullYear() === viewDate.getFullYear() && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getDate() === day;
                      const key = day == null ? '' : formatKey(viewDate.getFullYear(), viewDate.getMonth(), day);
                      const hasTodos = !!(day != null && todosByDate[key] && todosByDate[key].length > 0);
                      return (
                        <Pressable key={di} className="flex-1 items-center p-2" onPress={() => day && setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}>
                          <Box style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? Colors[colorScheme].tint : 'transparent' }}>
                            <Text style={{ color: isSelected ? Colors[colorScheme].background : (isToday ? Colors[colorScheme].tint : Colors[colorScheme].text) }}>{day ?? ''}</Text>
                          </Box>
                          {hasTodos && <Box className="mt-1" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors[colorScheme].tint }} />}
                        </Pressable>
                      );
                    })}
                  </HStack>
                ))}
              </VStack>
            </Box>

            <Divider />

            <Box className="px-4 py-3">
              <Text className="text-base" style={{ color: Colors[colorScheme].text, marginBottom: 8 }}>{selectedDate ? selectedDate.toDateString() : 'Select a date'}</Text>
              <VStack space="sm">
                {(selectedDate ? (todosByDate[formatKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())] || []) : []).map((t) => (
                  <Box key={t.id} className="bg-background-50 rounded-xl p-3 border-border-200">
                    <Text style={{ color: Colors[colorScheme].text }}>{t.text}</Text>
                  </Box>
                ))}
                {(!(selectedDate && todosByDate[formatKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())] && todosByDate[formatKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())].length > 0)) && (
                  <Text className="text-typography-500">No tasks for this date.</Text>
                )}
              </VStack>
            </Box>
          </Box>
         {/* <Fab
              placement='bottom right'
              size="xl"
              className="m-6"
              onPress={() => setShowModal(true)
                }>
                <FabIcon as={AddIcon} />
            </Fab> */}
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
            
            
            <Divider className="my-[5px] w-[100%]" />
          </ModalHeader>
          <ModalBody className="mb-4">
           <Text>Coming soon</Text>
        </ModalBody>
        <ModalFooter className="flex-col items-start">

             
           
            

           
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
