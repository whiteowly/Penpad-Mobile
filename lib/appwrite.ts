import {Client, Account, Avatars} from 'react-native-appwrite';

export const client = new Client()
  .setProject('68dc1f8c002b40670129') // Your project ID
  .setPlatform('com.jer.todolisss'); // Your app package name

export const account = new Account(client);
export const avatars = new Avatars(client);