import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import { Center } from '@/components/ui/center';


const profile = () => {
     const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const router = useRouter();
  return (
    <View>
      <Text>profile</Text>
    </View>
  )
}

export default profile

const styles = StyleSheet.create({})