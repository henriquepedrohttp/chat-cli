import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { api, Message } from './src/api';
import { encrypt, decrypt } from './src/crypto';
import { saveCredentials, getCredentials, clearCredentials } from './src/storage';

const API_URL = 'http://YOUR_SERVER_IP:3000';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const loadCredentials = useCallback(async () => {
    try {
      const creds = await getCredentials();
      if (creds) {
        api.setToken(creds.token);
        setUserId(creds.userId);
        setUserPassword(creds.password);
        setIsLoggedIn(true);
        await loadMessages();
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      syncMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const loadMessages = async () => {
    try {
      const msgs = await api.getMessages();
      setMessages(msgs.reverse());
    } catch (e) {
    }
  };

  const syncMessages = async () => {
    if (messages.length === 0) return;
    try {
      const lastId = messages[messages.length - 1]?.id;
      const newMsgs = await api.syncMessages(lastId);
      if (newMsgs.length > 0) {
        setMessages((prev) => [...prev, ...newMsgs]);
      }
    } catch (e) {
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Fill all fields');
      return;
    }
    try {
      setError('');
      const { token, user } = await api.login(email, password);
      api.setToken(token);
      await saveCredentials({ token, userId: user.id, email, password });
      setUserId(user.id);
      setUserPassword(password);
      setIsLoggedIn(true);
      await loadMessages();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !nickname) {
      setError('Fill all fields');
      return;
    }
    try {
      setError('');
      const { token, user } = await api.register(email, password, nickname);
      api.setToken(token);
      await saveCredentials({ token, userId: user.id, email, password });
      setUserId(user.id);
      setUserPassword(password);
      setIsLoggedIn(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed');
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      const { ciphertext, iv } = encrypt(newMessage, userPassword);
      await api.sendMessage(ciphertext, iv);
      setNewMessage('');
      await loadMessages();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
    }
    api.clearToken();
    await clearCredentials();
    setIsLoggedIn(false);
    setMessages([]);
    setEmail('');
    setPassword('');
    setUserId('');
    setUserPassword('');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncMessages();
    await loadMessages();
    setIsSyncing(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSent = item.senderId === userId;
    let text = '';
    try {
      text = decrypt({ ciphertext: item.content, iv: item.iv }, userPassword);
    } catch {
      text = '[decryption failed]';
    }
    return (
      <View style={[styles.messageBubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
        <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>{text}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B5B95" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.loginContainer}>
            <Text style={styles.title}>{isRegister ? 'Create Account' : 'Welcome'}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {isRegister && (
              <TextInput
                style={styles.input}
                placeholder="Nickname"
                value={nickname}
                onChangeText={setNickname}
              />
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isRegister ? handleRegister : handleLogin}
            >
              <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Login'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
            >
              <Text style={styles.switchText}>
                {isRegister ? 'Already have account? Login' : "Don't have account? Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        inverted={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity onPress={handleManualSync} style={styles.syncButton}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncIcon}>🐱</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#6B5B95' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 },
  primaryButton: { backgroundColor: '#6B5B95', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchButton: { alignItems: 'center' },
  switchText: { color: '#6B5B95', fontSize: 14 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#6B5B95' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoutButton: { padding: 5 },
  logoutText: { color: '#fff', fontSize: 14 },
  messageList: { padding: 15, flexGrow: 1 },
  messageBubble: { maxWidth: '80%', borderRadius: 15, padding: 12, marginBottom: 10 },
  sentBubble: { alignSelf: 'flex-end', backgroundColor: '#6B5B95' },
  receivedBubble: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  messageText: { fontSize: 16 },
  sentText: { color: '#fff' },
  receivedText: { color: '#333' },
  messageTime: { fontSize: 10, marginTop: 5, opacity: 0.7 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'flex-end' },
  messageInput: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, padding: 10, paddingRight: 50, maxHeight: 100 },
  syncButton: { position: 'absolute', right: 60, bottom: 15, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF9B71', justifyContent: 'center', alignItems: 'center' },
  syncIcon: { fontSize: 20 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B5B95', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendIcon: { color: '#fff', fontSize: 18 },
});