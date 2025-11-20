const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
// Callable function to check username availability. Uses Admin SDK so it bypasses client Firestore rules.
exports.checkUsername = functions.https.onCall(async (data, context) => {
  const raw = (data && data.username) ? String(data.username) : '';
  const username = raw.trim().toLowerCase();
  if (!username) {
    return { available: false };
  }
  const key = username.replace(/[^a-z0-9]/g, '');
  try {
    const docSnap = await db.collection('usernames').doc(key).get();
    return { available: !docSnap.exists() };
  } catch (err) {
    console.error('checkUsername error', err);
    throw new functions.https.HttpsError('internal', 'Unable to check username');
  }
});

// Callable function to find a user UID by email (server-side). This uses
// the Admin SDK so it bypasses client Firestore rules. It requires the
// caller to be authenticated (context.auth present) to avoid anonymous
// abuse. Returns minimal profile information: uid, email, username if found.
exports.findUserByEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('permission-denied', 'Authentication required');
  }
  const raw = (data && data.email) ? String(data.email).trim().toLowerCase() : '';
  if (!raw) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }
  try {
    const usersRef = db.collection('users');
    const q = usersRef.where('emailLowerCase', '==', raw).limit(1);
    const snaps = await q.get();
    if (snaps.empty) {
      return { found: false };
    }
    const doc = snaps.docs[0];
    const dataOut = doc.data();
    return {
      found: true,
      uid: doc.id,
      email: dataOut.email || null,
      username: dataOut.username || null,
    };
  } catch (err) {
    console.error('findUserByEmail error', err);
    throw new functions.https.HttpsError('internal', 'Unable to lookup user');
  }
});
