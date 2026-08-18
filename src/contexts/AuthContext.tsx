import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firebaseAuth, GoogleAuthProvider } from '../config/firebase';
import { signIn as credentialManagerSignIn, GoogleCredential } from 'react-native-credentials-manager';
import { GOOGLE_WEB_CLIENT_ID } from '../constants';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await firebaseAuth.createUserWithEmailAndPassword(email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const credential = (await credentialManagerSignIn(['google-signin'], {
        googleSignIn: {
          serverClientId: GOOGLE_WEB_CLIENT_ID,
          autoSelectEnabled: true,
          filterByAuthorizedAccounts: false, // show all Google accounts, not just previously-used ones
        },
      })) as GoogleCredential;

      if (!credential?.idToken) {
        throw new Error('No ID token returned from Google Sign-In');
      }

      const googleCredential = GoogleAuthProvider.credential(credential.idToken);
      await firebaseAuth.signInWithCredential(googleCredential);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  const signOut = async () => {
    try {
      await firebaseAuth.signOut();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await firebaseAuth.sendPasswordResetEmail(email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
