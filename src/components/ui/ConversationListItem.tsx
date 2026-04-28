import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from './Text';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { Conversation } from '../../types';
import { theme } from '../../constants/theme';
import { formatDistanceToNow } from '../../utils/formatters';

interface ConversationListItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: (conversationId: string) => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  currentUserId,
  onPress,
}) => {
  const isGroup = conversation.type === 'group';

  const participantDetails = Array.isArray(conversation.participantDetails)
    ? conversation.participantDetails
    : [];

  // Get other participant (for direct messages)
  const otherUser = isGroup
    ? null
    : participantDetails.find(u => u && u.id !== currentUserId);

  const unreadCount =
    (conversation.unreadCount && conversation.unreadCount[currentUserId]) || 0;
  const hasUnread = unreadCount > 0;

  // For direct messages, bail if other user not found
  if (!isGroup && !otherUser) {
    return null;
  }

  const otherUserName =
    typeof otherUser?.name === 'string' && otherUser.name.length > 0
      ? otherUser.name
      : 'User';
  const displayName = isGroup
    ? (conversation.name ?? 'Group')
    : otherUserName;
  const lastMessageTimestamp =
    conversation.lastMessageTimestamp instanceof Date
      ? conversation.lastMessageTimestamp
      : new Date();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(conversation.id)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {isGroup ? (
          <View style={[styles.avatar, styles.groupAvatarPlaceholder]}>
            <FontAwesome6
              name="users"
              size={20}
              color={theme.colors.primary[500]}
              iconStyle="solid"
            />
          </View>
        ) : otherUser!.avatar ? (
          <Image source={{ uri: otherUser!.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {otherUserName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {hasUnread && <View style={styles.unreadDot} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            variant="body"
            weight={hasUnread ? 'bold' : 'normal'}
            style={styles.name}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text variant="caption" color="gray.500" style={styles.timestamp}>
            {formatDistanceToNow(lastMessageTimestamp)}
          </Text>
        </View>

        <View style={styles.messageRow}>
          {conversation.lastMessageType === 'image' && (
            <FontAwesome6
              name="image"
              size={12}
              color={hasUnread ? theme.colors.gray[900] : theme.colors.gray[400]}
              iconStyle="solid"
              style={styles.mediaIcon}
            />
          )}
          <Text
            variant="body"
            color={hasUnread ? 'gray.900' : 'gray.600'}
            weight={hasUnread ? 'medium' : 'normal'}
            style={styles.lastMessage}
            numberOfLines={1}
          >
            {conversation.lastMessageSenderId === currentUserId && 'You: '}
            {conversation.lastMessage || 'Say hello!'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarPlaceholder: {
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2f80ed',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  name: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaIcon: {
    marginTop: 1,
  },
  lastMessage: {
    flex: 1,
    fontSize: theme.fontSize.sm,
  },
  unreadBadge: {
    backgroundColor: '#2f80ed',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  unreadText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    lineHeight: theme.fontSize.xs,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
