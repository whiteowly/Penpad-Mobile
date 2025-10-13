import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import {getAuth} from 'firebase/auth';

const newtodo = () => {
  // ... inside a component or function ...
  const auth = getAuth();
const currentUser = auth.currentUser;


  return (
    <View>
      <Text>newtodo</Text>
    </View>
  )
}

export default newtodo

const styles = StyleSheet.create({})



