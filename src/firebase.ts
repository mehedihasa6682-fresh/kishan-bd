import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to handle potential network restrictions
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true, // Helps with connectivity in restricted environments
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);

// Connectivity check as per requirements
async function testConnection() {
  try {
    // Attempt to get the connection test doc
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firebase connection established.");
  } catch (error) {
    // Be silent if it's just a permission error (the doc might not exist)
    // or if the client is intentionally offline
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      console.warn("Firestore is operating in offline mode. Check your internet connection.");
    } else if (message.includes('permission-denied')) {
      // Permission denied is actually a "success" in terms of connectivity 
      // because we reached the server to get the denial
      console.log("Firebase server reached (Permission Check OK).");
    } else {
      console.error("Firebase connection test failed:", message);
    }
  }
}

testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
