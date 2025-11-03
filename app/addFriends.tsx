import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, SearchIcon, ShareIcon, ArrowLeftIcon, TrashIcon } from '@/components/ui/icon';
import { router } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';

import { app, auth } from '../firebaseConfig';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { normalizeUsername } from '@/lib/usernames';
import { useEffect, useMemo, useState } from 'react';

type FriendDoc = { uid: string; displayName?: string; username?: string; createdAt?: any };

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;

  const db = useMemo(() => getFirestore(app), []);
  const uid = auth.currentUser?.uid ?? null;

  const [searchText, setSearchText] = useState('');
  const [searchResult, setSearchResult] = useState<{ uid: string; username?: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [emailSearchText, setEmailSearchText] = useState('');
  const [emailSearchResult, setEmailSearchResult] = useState<{ uid: string; email?: string; username?: string } | null>(null);
  const [isEmailSearching, setIsEmailSearching] = useState(false);

  const [incomingRequests, setIncomingRequests] = useState<Array<any>>([]);
  const [friends, setFriends] = useState<FriendDoc[]>([]);

  // listen to incoming friend requests
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'friendRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setIncomingRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [db, uid]);

  // listen to friends list
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'friends'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFriends(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [db, uid]);

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const key = normalizeUsername(searchText || '');
      if (!key) {
        setIsSearching(false);
        return;
      }
      const ref = doc(db, 'usernames', key);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setSearchResult(null);
      } else {
        const data = snap.data() as any;
        if (data?.uid && data.uid !== uid) {
          setSearchResult({ uid: data.uid, username: key });
        } else {
          // found self or missing uid
          setSearchResult(null);
        }
      }
    } catch (err) {
      console.error('Search failed', err);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEmailSearch = async () => {
    setIsEmailSearching(true);
    setEmailSearchResult(null);
    try {
      const trimmed = (emailSearchText || '').trim().toLowerCase();
      if (!trimmed) {
        setIsEmailSearching(false);
        return;
      }
      // query users collection by lowercased email stored at signup
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('emailLowerCase', '==', trimmed));
      const snaps = await getDocs(q);
      if (snaps.empty) {
        setEmailSearchResult(null);
      } else {
        // take first match
        const docSnap = snaps.docs[0];
        const data = docSnap.data() as any;
        if (docSnap.id !== uid) {
          setEmailSearchResult({ uid: docSnap.id, email: data?.email ?? trimmed, username: data?.username ?? undefined });
        } else {
          setEmailSearchResult(null);
        }
      }
    } catch (err) {
      console.error('Email search failed', err);
      setEmailSearchResult(null);
    } finally {
      setIsEmailSearching(false);
    }
  };

  const sendFriendRequest = async (targetUid: string) => {
    if (!uid) return;
    try {
      const requestRef = doc(db, 'users', targetUid, 'friendRequests', uid);
      await setDoc(requestRef, {
        fromUid: uid,
        fromDisplayName: auth.currentUser?.displayName ?? auth.currentUser?.email ?? null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to send friend request', err);
    }
  };

  const acceptRequest = async (requestId: string, fromUid: string, fromDisplayName?: string) => {
    if (!uid) return;
    try {
      // create friend doc s for both users (bi-directional)
      const mineRef = doc(db, 'users', uid, 'friends', fromUid);
      const theirRef = doc(db, 'users', fromUid, 'friends', uid);
      await setDoc(mineRef, { uid: fromUid, displayName: fromDisplayName ?? null, createdAt: serverTimestamp() });
      await setDoc(theirRef, { uid, displayName: auth.currentUser?.displayName ?? null, createdAt: serverTimestamp() });

      // remove the request
      await deleteDoc(doc(db, 'users', uid, 'friendRequests', requestId));
    } catch (err) {
      console.error('Failed to accept friend request', err);
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'friendRequests', requestId));
    } catch (err) {
      console.error('Failed to reject friend request', err);
    }
  };

  const removeFriend = async (friendUid: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'friends', friendUid));
      await deleteDoc(doc(db, 'users', friendUid, 'friends', uid));
    } catch (err) {
      console.error('Failed to remove friend', err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
        <Box className="flex-row items-center mb-4">
          <Box className="items-start w-[56px]">
            <Button
              size="xl"
              variant='link'
              onPress={() => { router.back(); }}>
              <ButtonIcon as={ArrowLeftIcon} />
            </Button>
          </Box>
          <Text
            className="text-3xl text-bold"
            style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
          >
            New
          </Text>
          <Box className="w-[56px]" />
        </Box>
        <Divider className="my-4 w-full" />

        <Box className="mt-4">
          <Text size="lg" className="mb-2">Find a friend by email</Text>
          <Box className="flex-0 items-center gap-2">
            <Input variant="rounded" size="md">
              <InputField
                placeholder="email@example.com"
                value={emailSearchText}
                onChangeText={setEmailSearchText}
                autoCapitalize="none"
              />
            </Input>
            <Button onPress={handleEmailSearch}>
              <ButtonText>{isEmailSearching ? '...' : 'Search'}</ButtonText>
            </Button>
          </Box>

          <Box className="mt-3">
            {emailSearchResult ? (
              <Box className="flex-row items-center justify-between">
                <Text>{emailSearchResult.username ? `@${emailSearchResult.username}` : emailSearchResult.email}</Text>
                <Button onPress={() => sendFriendRequest(emailSearchResult.uid)}>
                  <ButtonText>Send Request</ButtonText>
                </Button>
              </Box>
            ) : (
              emailSearchText ? <Text>No user found with that email</Text> : null
            )}
          </Box>
        </Box>

        <Divider className="my-4 w-full" />

        <Box>
          <Text size="lg" className="mb-2">Incoming Requests</Text>
          {incomingRequests.length === 0 ? (
            <Text className="text-muted">No incoming requests</Text>
          ) : (
            incomingRequests.map((r) => (
              <Box key={r.id} className="flex-row items-center justify-between py-2">
                <Text>@{r.fromDisplayName ?? r.fromUid}</Text>
                <Box className="flex-row gap-2">
                  <Button onPress={() => acceptRequest(r.id, r.fromUid, r.fromDisplayName)}>
                    <ButtonText>Accept</ButtonText>
                  </Button>
                  <Button onPress={() => rejectRequest(r.id)}>
                    <ButtonText>Reject</ButtonText>
                  </Button>
                </Box>
              </Box>
            ))
          )}
        </Box>

        <Divider className="my-4 w-full" />

       

        
      </Box>
    </SafeAreaView>
  );
};

export default Main;
