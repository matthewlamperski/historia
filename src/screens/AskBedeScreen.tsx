import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { BedeBubble, BedeTypingIndicator, Text } from '../components/ui';
import { theme } from '../constants/theme';
import { RootStackScreenProps, BedeMessage } from '../types';
import { useBedeChat, useRequireAuth } from '../hooks';
import { useAuthStore } from '../store/authStore';

const SUGGESTED_PROMPTS = [
  'When was this built, and by whom?',
  'Why is this landmark significant?',
  'What happened here historically?',
  'What should I look for when I visit?',
];

const ListItem = React.memo(({ item }: { item: BedeMessage }) => (
  <BedeBubble role={item.role} text={item.text} sources={item.sources} />
));

export const AskBedeScreen: React.FC = () => {
  const navigation =
    useNavigation<RootStackScreenProps<'AskBede'>['navigation']>();
  const route = useRoute<RootStackScreenProps<'AskBede'>['route']>();
  const { landmarkId, landmarkName } = route.params;
  const insets = useSafeAreaInsets();

  // Guard the deep-linked entry. The in-app entrypoints already gate via
  // useRequireAuth, but a `historia://landmark/:id/ask` link can drop an
  // anon user straight here.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const requireAuth = useRequireAuth();
  useEffect(() => {
    if (!isAuthenticated) {
      navigation.goBack();
      requireAuth();
    }
  }, [isAuthenticated, navigation, requireAuth]);

  const {
    messages,
    isSending,
    remainingToday,
    dailyLimit,
    isPremium,
    limitReached,
    limitMessage,
    send,
  } = useBedeChat(landmarkId);

  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<BedeMessage>>(null);

  // Track keyboard height directly. KeyboardAvoidingView is unreliable on
  // iOS 26 + Fabric — its frame measurement is short by ~safe-area-bottom.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Entrance animation — gentle fade-in so the warm cream feel lands softly.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fade]);

  // Hide the default nav bar; we render a custom header for more control.
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Scroll to bottom on new messages, when typing indicator toggles, or when
  // the keyboard opens (the input bar grows, the list shrinks — keep latest in view).
  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [messages.length, isSending, keyboardHeight]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft('');
    await send(text);
  }, [draft, isSending, send]);

  const handleSuggestion = useCallback(
    (prompt: string) => {
      setDraft('');
      send(prompt);
    },
    [send],
  );

  const renderItem = useCallback(
    ({ item }: { item: BedeMessage }) => <ListItem item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: BedeMessage) => item.id, []);

  const ListFooter = useMemo(() => {
    if (!isSending) return null;
    return <BedeTypingIndicator />;
  }, [isSending]);

  const ListEmpty = useMemo(() => {
    if (isSending) return null;
    return (
      <Animated.View style={[styles.emptyContainer, { opacity: fade }]}>
        <View style={styles.emptyAvatar}>
          <FontAwesome6
            name="feather-pointed"
            size={28}
            color={theme.colors.primary[600]}
            iconStyle="solid"
          />
        </View>
        <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
          Good day.
        </Text>
        <Text variant="body" color="gray.600" style={styles.emptyBody}>
          Ask me anything about <Text weight="semibold">{landmarkName}</Text> —
          when it was built, what happened here, who fought or lived or worked
          in its halls. I'll do my best.
        </Text>
        <View style={styles.suggestionList}>
          {SUGGESTED_PROMPTS.map(prompt => (
            <TouchableOpacity
              key={prompt}
              style={styles.suggestionChip}
              onPress={() => handleSuggestion(prompt)}
              activeOpacity={0.75}
            >
              <Text variant="caption" color="primary.700" style={styles.suggestionText}>
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  }, [isSending, fade, landmarkName, handleSuggestion]);

  const usageText =
    remainingToday == null || dailyLimit == null
      ? null
      : isPremium
        ? `Pro · ${remainingToday}/${dailyLimit} left today`
        : `${remainingToday}/${dailyLimit} free messages left today`;

  const canSend = draft.trim().length > 0 && !isSending && !limitReached;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Custom header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome6
            name="xmark"
            size={18}
            color={theme.colors.gray[600]}
            iconStyle="solid"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarOuter}>
            <View style={styles.headerAvatarInner}>
              <FontAwesome6
                name="feather-pointed"
                size={14}
                color={theme.colors.primary[600]}
                iconStyle="solid"
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" weight="bold" style={styles.headerTitle}>
              Bede
            </Text>
            <Text variant="caption" color="gray.500" numberOfLines={1}>
              Your guide to {landmarkName}
            </Text>
          </View>
        </View>

        <View style={styles.headerIconBtn} />
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && !isSending && styles.listContentEmpty,
          ]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Usage / error row */}
        {(usageText || limitMessage) && (
          <View style={styles.metaRow}>
            {limitMessage ? (
              <Text variant="caption" color="error.600" style={styles.metaText}>
                {limitMessage}
              </Text>
            ) : usageText ? (
              <Text variant="caption" color="gray.500" style={styles.metaText}>
                {usageText}
              </Text>
            ) : null}
          </View>
        )}

        {/* Input — paddingBottom dynamically clears the keyboard when shown
            (keyboardHeight already includes home-indicator area on iOS), or
            sits above the home indicator when hidden (insets.bottom). */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom:
                theme.spacing.sm +
                (keyboardHeight > 0 ? keyboardHeight : insets.bottom),
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={
              limitReached
                ? "Daily limit reached — come back tomorrow"
                : 'Ask Bede…'
            }
            placeholderTextColor={theme.colors.gray[400]}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!limitReached}
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            <FontAwesome6
              name="paper-plane"
              size={15}
              color={theme.colors.white}
              iconStyle="solid"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AskBedeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
    backgroundColor: theme.colors.white,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
  },
  headerAvatarOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 2,
    backgroundColor: theme.colors.warning[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInner: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.gray[900],
    fontSize: theme.fontSize.base,
  },

  // List
  listContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.xs,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  suggestionList: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  suggestionChip: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    borderRadius: 14,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  suggestionText: {
    lineHeight: 18,
  },

  // Meta row (usage / error)
  metaRow: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 4,
    paddingBottom: 2,
  },
  metaText: {
    textAlign: 'center',
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
    backgroundColor: theme.colors.white,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 22,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[900],
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.gray[300],
  },
});
