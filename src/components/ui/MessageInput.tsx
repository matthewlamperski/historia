import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Text } from './Text';
import { Post } from '../../types';
import { SelectedMedia } from '../../hooks/useImagePicker';
import { theme } from '../../constants/theme';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';

interface MessageInputProps {
  text: string;
  onChangeText: (text: string) => void;
  selectedMedia: SelectedMedia[];
  onPickImages: () => void;
  onRemoveMedia: (index: number) => void;
  sharedPost?: Post | null;
  onClearSharedPost?: () => void;
  onSend: () => void;
  canSend: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  text,
  onChangeText,
  selectedMedia,
  onPickImages,
  onRemoveMedia,
  sharedPost,
  onClearSharedPost,
  onSend,
  canSend,
  placeholder = 'Type a message...',
  autoFocus = false,
}) => {
  return (
    <View style={styles.container}>
        {/* Shared post preview */}
        {sharedPost && (
          <View style={styles.sharedPostPreview}>
            <View style={styles.sharedPostHeader}>
              <FontAwesome6
                name="share-from-square"
                size={14}
                color={theme.colors.primary[500]}
                style={styles.sharedPostIcon}
              />
              <Text variant="caption" weight="medium" color="primary.500">
                Sharing post by {sharedPost.user.name}
              </Text>
            </View>
            <Text
              variant="body"
              color="gray.700"
              numberOfLines={2}
              style={styles.sharedPostContent}
            >
              {sharedPost.content}
            </Text>
            {sharedPost.images[0] && (
              <Image
                source={{ uri: sharedPost.images[0] }}
                style={styles.sharedPostImage}
              />
            )}
            <TouchableOpacity
              style={styles.clearSharedPostButton}
              onPress={onClearSharedPost}
            >
              <FontAwesome6
                name="xmark"
                size={16}
                color={theme.colors.gray[600]}
                iconStyle="solid"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Media previews (images + videos) */}
        {selectedMedia.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagePreviewScroll}
            contentContainerStyle={styles.imagePreviewContent}
          >
            {selectedMedia.map((media, idx) => (
              <View key={idx} style={styles.imagePreviewWrapper}>
                <Image source={{ uri: media.uri }} style={styles.imagePreview} />
                {media.type === 'video' && (
                  <View style={styles.videoOverlay}>
                    <FontAwesome6
                      name="play"
                      size={16}
                      color={theme.colors.white}
                      iconStyle="solid"
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => onRemoveMedia(idx)}
                >
                  <FontAwesome6
                    name="xmark"
                    size={12}
                    color={theme.colors.white}
                    iconStyle="solid"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          {/* Image picker button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onPickImages}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6
              name="image"
              size={22}
              color={theme.colors.primary[500]}
            />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.gray[400]}
            multiline
            maxLength={2000}
            autoFocus={autoFocus}
            style={styles.input}
          />

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={!canSend}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6
              name="paper-plane"
              size={20}
              iconStyle="solid"
              color={
                canSend ? theme.colors.primary[500] : theme.colors.gray[400]
              }
            />
          </TouchableOpacity>
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  sharedPostPreview: {
    margin: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    position: 'relative',
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sharedPostIcon: {
    marginRight: theme.spacing.xs,
  },
  sharedPostContent: {
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  sharedPostImage: {
    width: '100%',
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  clearSharedPostButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  imagePreviewScroll: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  imagePreviewContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: theme.borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[900],
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.xl,
    marginHorizontal: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
