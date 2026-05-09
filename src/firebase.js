import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDDHct1gEr_U_Xpl7lK2H695medrt6SxLI',
  authDomain: 'emileworkout.firebaseapp.com',
  projectId: 'emileworkout',
  storageBucket: 'emileworkout.firebasestorage.app',
  messagingSenderId: '165724051204',
  appId: '1:165724051204:web:6b4bd0828787cec4442251',
  measurementId: 'G-V0V1RSFPCH',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
