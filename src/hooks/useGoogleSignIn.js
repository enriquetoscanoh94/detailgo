import { useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { loginWithGoogleIdToken } from '@/services/authService';
import { AppError } from '@/utils/errors';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
const googleAuth = extra.googleAuth ?? {};

const clientIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? googleAuth.webClientId,
  androidClientId:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? googleAuth.androidClientId,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? googleAuth.iosClientId,
};

const hasPlatformClientId = () => {
  if (Platform.OS === 'android') return Boolean(clientIds.androidClientId);
  if (Platform.OS === 'ios') return Boolean(clientIds.iosClientId);
  return Boolean(clientIds.webClientId);
};

export function useGoogleSignIn() {
  const [request, , promptAsync] = Google.useAuthRequest({
    ...clientIds,
    clientId: clientIds.webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  return useCallback(async () => {
    if (!hasPlatformClientId()) {
      throw new AppError('error.googleConfigMissing');
    }
    if (!request) {
      throw new AppError('error.googleUnavailable');
    }

    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return null;
    }
    if (result.type !== 'success') {
      throw new AppError('error.googleSignInFailed');
    }

    const idToken = result.authentication?.idToken ?? result.params?.id_token;
    if (!idToken) throw new AppError('error.googleSignInFailed');

    return loginWithGoogleIdToken(idToken);
  }, [promptAsync, request]);
}

export default useGoogleSignIn;
