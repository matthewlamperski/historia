import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { theme } from '../../constants/theme';
import { ReportReason, ReportedType, CreateReportData } from '../../types';
import { moderationService } from '../../services/moderationService';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../hooks/useToast';
import Icon from 'react-native-vector-icons/FontAwesome6';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedId: string;
  reportedType: ReportedType;
  reportedUserId: string;
  contentSnapshot: {
    content?: string;
    images?: string[];
    userName?: string;
  };
}

const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'spam', label: 'Spam', icon: 'envelope' },
  { value: 'harassment', label: 'Harassment or bullying', icon: 'hand' },
  { value: 'hate_speech', label: 'Hate speech', icon: 'triangle-exclamation' },
  {
    value: 'inappropriate_content',
    label: 'Inappropriate content',
    icon: 'eye-slash',
  },
  { value: 'impersonation', label: 'Impersonation', icon: 'user-secret' },
  { value: 'other', label: 'Other', icon: 'circle-question' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  reportedId,
  reportedType,
  reportedUserId,
  contentSnapshot,
}) => {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !user?.id) return;

    setIsSubmitting(true);
    try {
      const reportData: CreateReportData = {
        reportedId,
        reportedType,
        reportedUserId,
        reason: selectedReason,
        description: description.trim() || undefined,
        contentSnapshot,
      };

      await moderationService.createReport(user.id, reportData);
      showToast('Report submitted. Thank you for helping keep Historia safe.', 'success');
      handleClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      showToast('Failed to submit report. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const getTypeLabel = () => {
    switch (reportedType) {
      case 'user':
        return 'user';
      case 'post':
        return 'post';
      case 'comment':
        return 'comment';
      case 'message':
        return 'message';
      default:
        return 'content';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Icon name="xmark" size={20} color={theme.colors.gray[600]} />
              </TouchableOpacity>
              <Text variant="h4" weight="semibold">
                Report {getTypeLabel()}
              </Text>
              <View style={styles.closeButton} />
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Description */}
              <Text variant="body" color="gray.600" style={styles.description}>
                Why are you reporting this {getTypeLabel()}? Your report is
                anonymous.
              </Text>

              {/* Reason Selection */}
              <View style={styles.reasons}>
                {REPORT_REASONS.map(reason => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonOption,
                      selectedReason === reason.value && styles.reasonSelected,
                    ]}
                    onPress={() => setSelectedReason(reason.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonLeft}>
                      <Icon
                        name={reason.icon}
                        size={18}
                        color={
                          selectedReason === reason.value
                            ? theme.colors.primary[500]
                            : theme.colors.gray[500]
                        }
                        style={styles.reasonIcon}
                      />
                      <Text
                        variant="body"
                        weight={
                          selectedReason === reason.value ? 'semibold' : 'normal'
                        }
                        color={
                          selectedReason === reason.value
                            ? 'primary.500'
                            : 'gray.900'
                        }
                      >
                        {reason.label}
                      </Text>
                    </View>
                    {selectedReason === reason.value && (
                      <Icon
                        name="check"
                        size={16}
                        color={theme.colors.primary[500]}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Additional Details */}
              {selectedReason && (
                <View style={styles.detailsSection}>
                  <Text variant="label" color="gray.700" style={styles.detailsLabel}>
                    Additional details (optional)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Provide any additional context..."
                    placeholderTextColor={theme.colors.gray[400]}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text variant="caption" color="gray.500" style={styles.charCount}>
                    {description.length}/500
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.footer}>
              <Button
                variant="primary"
                fullWidth
                onPress={handleSubmit}
                disabled={!selectedReason || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  'Submit Report'
                )}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  description: {
    marginBottom: theme.spacing.lg,
  },
  reasons: {
    marginBottom: theme.spacing.lg,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.gray[50],
  },
  reasonSelected: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonIcon: {
    marginRight: theme.spacing.md,
    width: 24,
  },
  detailsSection: {
    marginBottom: theme.spacing.md,
  },
  detailsLabel: {
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[900],
    minHeight: 100,
  },
  charCount: {
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    paddingBottom: theme.spacing.xl,
  },
});

export default ReportModal;
