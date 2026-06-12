import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const DEFAULT_AVATAR = 'https://i.stack.imgur.com/l60Hf.png';

const getUserName = (user) => user?.displayName || user?.username || 'Usuário';

const formatTime = (value) => {
  if (!value) return '';

  try {
    return new Date(value).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function ChatScreen({ route }) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(route?.params?.user || null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);

    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data || []);
    } catch (error) {
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (user) => {
    if (!user?.id) return;

    setLoadingMessages(true);

    try {
      const response = await api.get(`/chat/messages/${user.id}`);
      setMessages(response.data || []);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();

      if (selectedUser?.id) {
        loadMessages(selectedUser);
      }
    }, [loadConversations, loadMessages, selectedUser])
  );

  useEffect(() => {
    const cleanSearch = search.trim();

    if (!cleanSearch) {
      setUserResults([]);
      setLoadingUsers(false);
      return undefined;
    }

    setLoadingUsers(true);

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/chat/users', {
          params: { q: cleanSearch },
        });
        setUserResults(response.data || []);
      } catch (error) {
        setUserResults([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (route?.params?.user?.id) {
      setSelectedUser(route.params.user);
    }
  }, [route?.params?.user]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedUser?.id) {
      loadMessages(selectedUser);
    }
  }, [loadMessages, selectedUser]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const openConversation = (user) => {
    setSelectedUser(user);
    setSearch('');
    setUserResults([]);
  };

  const closeConversation = () => {
    setSelectedUser(null);
    setMessages([]);
    setMessageText('');
    loadConversations();
  };

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!text || !selectedUser?.id || sending) return;

    const optimisticMessage = {
      id: `local-${Date.now()}`,
      text,
      isMine: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageText('');
    setSending(true);

    try {
      const response = await api.post(`/chat/messages/${selectedUser.id}`, {
        text,
      });

      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticMessage.id ? response.data : message
        )
      );
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  };

  const renderUserRow = ({ item }) => {
    const user = item.user || item;
    const lastMessage = item.lastMessage;

    return (
      <TouchableOpacity
        style={styles.userRow}
        activeOpacity={0.78}
        onPress={() => openConversation(user)}
      >
        <Image
          source={{ uri: user.avatarUrl || DEFAULT_AVATAR }}
          style={styles.avatar}
        />

        <View style={styles.userContent}>
          <View style={styles.userTitleRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {getUserName(user)}
            </Text>
            {lastMessage?.createdAt ? (
              <Text style={styles.timeText}>{formatTime(lastMessage.createdAt)}</Text>
            ) : null}
          </View>

          <Text style={styles.username} numberOfLines={1}>
            @{user.username}
          </Text>

          {lastMessage ? (
            <Text style={styles.previewText} numberOfLines={1}>
              {lastMessage.isMine ? 'Você: ' : ''}
              {lastMessage.text}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    const isMine = item.isMine;

    return (
      <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const listData = search.trim() ? userResults : conversations;
  const bottomInset = Math.max(insets.bottom, 12);
  const bottomTabHeight = 58 + bottomInset;
  const inputBottomPadding = keyboardVisible ? Math.max(insets.bottom, 14) : 12;
  const inputBottomMargin = keyboardVisible ? 0 : bottomTabHeight;

  if (selectedUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['transparent', 'rgba(222, 224, 232, 0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', '#18191D']}
            start={{ x: 0.5, y: 0.02 }}
            end={{ x: 0.5, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatTopBar}>
            <TouchableOpacity style={styles.roundButton} onPress={closeConversation}>
              <Ionicons name="arrow-back" size={22} color="#DEE0E8" />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedUser.avatarUrl || DEFAULT_AVATAR }}
              style={styles.topAvatar}
            />

            <View style={styles.chatUserInfo}>
              <Text style={styles.title} numberOfLines={1}>
                {getUserName(selectedUser)}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                @{selectedUser.username}
              </Text>
            </View>
          </View>

          {loadingMessages ? (
            <View style={styles.centerContent}>
              <ActivityIndicator color="#DEE0E8" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Envie a primeira mensagem.</Text>
              }
            />
          )}

          <View
            style={[
              styles.inputBar,
              {
                paddingBottom: inputBottomPadding,
                marginBottom: inputBottomMargin,
              },
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Mensagem..."
              placeholderTextColor="rgba(222, 224, 232, 0.38)"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}
              activeOpacity={0.78}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#18191D" />
              ) : (
                <Ionicons name="send" size={18} color="#18191D" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['transparent', 'rgba(222, 224, 232, 0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', '#18191D']}
          start={{ x: 0.5, y: 0.02 }}
          end={{ x: 0.5, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Chat</Text>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="rgba(222, 224, 232, 0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuário..."
            placeholderTextColor="rgba(222, 224, 232, 0.38)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(222, 224, 232, 0.45)" />
            </TouchableOpacity>
          ) : null}
        </View>

        {(loadingConversations && !search) || loadingUsers ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color="#DEE0E8" />
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              (item.user?.id || item.id || index).toString()
            }
            renderItem={renderUserRow}
            contentContainerStyle={[
              styles.usersList,
              { paddingBottom: bottomTabHeight + 24 },
            ]}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {search.trim()
                  ? 'Nenhum usuário encontrado.'
                  : 'Busque um usuário para iniciar uma conversa.'}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.06)',
  },
  chatTopBar: {
    height: 66,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#DEE0E8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(222, 224, 232, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  topAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginHorizontal: 8,
  },
  chatUserInfo: {
    flex: 1,
  },
  searchWrapper: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    backgroundColor: '#18191D',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DEE0E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    height: '100%',
    paddingHorizontal: 10,
  },
  usersList: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.06)',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#282A30',
    marginRight: 12,
  },
  userContent: {
    flex: 1,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    flex: 1,
    color: '#DEE0E8',
    fontSize: 15,
    fontWeight: '700',
  },
  username: {
    color: 'rgba(222, 224, 232, 0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  previewText: {
    color: 'rgba(222, 224, 232, 0.7)',
    fontSize: 13,
    marginTop: 5,
  },
  timeText: {
    color: 'rgba(222, 224, 232, 0.42)',
    fontSize: 11,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(222, 224, 232, 0.45)',
    textAlign: 'center',
    marginTop: 34,
    fontSize: 14,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 18,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  theirBubble: {
    backgroundColor: 'rgba(222, 224, 232, 0.07)',
    borderTopLeftRadius: 4,
  },
  myBubble: {
    backgroundColor: '#DEE0E8',
    borderTopRightRadius: 4,
  },
  messageText: {
    color: '#DEE0E8',
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#18191D',
    fontWeight: '600',
  },
  messageTime: {
    color: 'rgba(222, 224, 232, 0.4)',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
  },
  myMessageTime: {
    color: 'rgba(24, 25, 29, 0.55)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 104 : 96,
    borderTopWidth: 1,
    borderTopColor: 'rgba(222, 224, 232, 0.06)',
    backgroundColor: '#18191D',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    borderRadius: 22,
    color: '#DEE0E8',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    backgroundColor: 'rgba(222, 224, 232, 0.04)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DEE0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
