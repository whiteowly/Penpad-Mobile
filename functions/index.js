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
