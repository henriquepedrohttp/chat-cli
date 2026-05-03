import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@chat_token',
  USER_ID: '@chat_user_id',
  EMAIL: '@chat_email',
  PASSWORD: '@chat_password',
};

export async function saveCredentials(data: {
  token: string;
  userId: string;
  email: string;
  password: string;
}): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.TOKEN, data.token],
    [KEYS.USER_ID, data.userId],
    [KEYS.EMAIL, data.email],
    [KEYS.PASSWORD, data.password],
  ]);
}

export async function getCredentials(): Promise<{
  token: string;
  userId: string;
  email: string;
  password: string;
} | null> {
  const values = await AsyncStorage.multiGet([KEYS.TOKEN, KEYS.USER_ID, KEYS.EMAIL, KEYS.PASSWORD]);
  const [token, userId, email, password] = values.map((v) => v[1]);

  if (token && userId && email && password) {
    return { token, userId, email, password };
  }
  return null;
}

export async function clearCredentials(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER_ID, KEYS.EMAIL, KEYS.PASSWORD]);
}