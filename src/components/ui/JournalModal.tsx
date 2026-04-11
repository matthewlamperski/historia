import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './Text';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/FontAwesome6';

const MAX_CHARS = 1000;

const PROMPTS =
  "What are you grateful for about this place?\n\n" +
  "What did you notice here that you won't forget?\n\n" +
  "How did visiting this landmark make you feel?";

interface JournalModalProps {
  visible: boolean;
  landmarkName: string;
  initialEntry: string;
  loading: boolean;
  saving: boolean;
  onSave: (text: string) => Promise<void>;
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  visible,
  landmarkName,
  initialEntry,
  loading,
  saving,
  onSave,
  onClose,
}) => {
  const [text, setText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);

  // Reset local state every time the modal opens
  useEffect(() => {
    if (visible) {
      setText(initialEntry);
      setIsDirty(false);
      setSavedThisSession(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTextChange = (t: string) => {
    setText(t);
    setIsDirty(t !== initialEntry);
    setSavedThisSession(false);
  };

  const handleSave = async () => {
    await onSave(text);
    setIsDirty(false);
    setSavedThisSession(true);
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const canSave = !saving && isDirty;
  const nearLimit = text.length > MAX_CHARS * 0.9;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerSideBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Icon name="book-open" size={14} color={theme.colors.primary[600]} />
            <Text variant="label" weight="semibold" style={styles.headerTitle}>
              Gratitude Journal
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text
                variant="label"
                weight="semibold"
                style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Body ────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Journal page card */}
            <View style={styles.page}>
              {/* Red margin line — the classic journal look */}
              <View style={styles.marginLine} />

              <View style={styles.pageContent}>
                {/* Entry meta: location + date */}
                <View style={styles.entryMeta}>
                  <View style={styles.locationRow}>
                    <Icon name="location-dot" size={11} color={theme.colors.primary[400]} />
                    <Text
                      variant="caption"
                      style={styles.locationText}
                      numberOfLines={2}
                    >
                      {landmarkName}
                    </Text>
                  </View>
                  <Text variant="caption" style={styles.dateText}>{today}</Text>
                </View>

                <View style={styles.pageDivider} />

                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={theme.colors.primary[400]} />
                    <Text
                      variant="caption"
                      style={styles.loadingText}
                    >
                      Loading your entry…
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    editable
                    style={styles.input}
                    value={text}
                    onChangeText={handleTextChange}
                    placeholder={PROMPTS}
                    placeholderTextColor={theme.colors.primary[300]}
                    multiline
                    maxLength={MAX_CHARS}
                    textAlignVertical="top"
                    scrollEnabled={false}
                    autoFocus
                  />
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Footer ──────────────────────────────────── */}
        <View style={styles.footer}>
          {savedThisSession ? (
            <View style={styles.savedRow}>
              <Icon name="check" size={11} color={theme.colors.success[500]} />
              <Text variant="caption" style={styles.savedText}>Saved</Text>
            </View>
          ) : (
            <View style={styles.footerSpacer} />
          )}
          <Text
            variant="caption"
            style={[styles.charCount, nearLimit && styles.charCountWarn]}
          >
            {text.length} / {MAX_CHARS}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.primary[50],
  },
  flex: { flex: 1 },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  headerSideBtn: {
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: theme.colors.primary[800],
    fontSize: theme.fontSize.sm,
  },
  cancelText: {
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.sm,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    minWidth: 64,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: theme.colors.primary[200],
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
  },
  saveBtnTextDisabled: {
    color: theme.colors.primary[400],
  },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },

  // ── Journal page card
  page: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    minHeight: 420,
    shadowColor: theme.colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Classic red margin line
  marginLine: {
    width: 2,
    backgroundColor: theme.colors.error[300],
    opacity: 0.45,
  },
  pageContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },

  // Entry meta (location + date)
  entryMeta: {
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    color: theme.colors.primary[600],
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  dateText: {
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.xs,
    marginLeft: 15,
  },
  pageDivider: {
    height: 1,
    backgroundColor: theme.colors.primary[100],
    marginBottom: theme.spacing.md,
  },

  // Text input
  input: {
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[800],
    lineHeight: 26,
    minHeight: 280,
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.gray[400],
  },

  // ── Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  footerSpacer: { width: 60 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    color: theme.colors.success[600],
    fontSize: theme.fontSize.xs,
  },
  charCount: {
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.xs,
  },
  charCountWarn: {
    color: theme.colors.error[400],
  },
});
