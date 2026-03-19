import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';  
import { Image } from '@/components/ui/image';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const iconImage = require('../assets/images/logo.jpg');

export default function Home() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
  });
  const [userState, setUserState] = React.useState<any>(undefined);

  React.useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUserState(user);
      // Backfill profile doc for users who signed up before it was created,
      // or who were already logged in when the rule was first deployed.
      if (user) {
        try {
          const db = getFirestore(app);
          await setDoc(
            doc(db, 'users', user.uid),
            {
              email: user.email ?? null,
              emailLowerCase: (user.email ?? '').toLowerCase(),
              displayName: user.displayName ?? null,
              username: user.displayName ?? null,
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Profile backfill failed (non-fatal):', e);
        }
      }
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    // Wait until fonts load and auth finishes checking
    if (!fontsLoaded || userState === undefined) return;

    const timeoutId = setTimeout(() => {
      if (userState) {
        router.replace('/tasks' as any);
      } else {
        router.replace('/tabs/tab1');
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [router, fontsLoaded, userState]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Box className="flex-1 h-[100vh] bg-white">
      <Box className="flex flex-1 mx-5 lg:my-24 lg:mx-32 py-safe">
        
        <Box className="flex-1 justify-center items-center">
            <Image
            source={iconImage}
            accessibilityLabel="PenPad logo"
            resizeMode="contain"
              size='5xl' 
              className="w-[350px] h-[220px] lg:w-[200px] lg:h-[200px] -mt-8 ml-8"
          />
        </Box>
      </Box>
    </Box>
  );
}
