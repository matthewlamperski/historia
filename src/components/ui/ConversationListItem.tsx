import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from './Text';
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
  // Get other participant (for direct messages)
  const otherUser = conversation.participantDetails.find(
    u => u.id !== currentUserId
  );

  const unreadCount = conversation.unreadCount[currentUserId] || 0;
  const hasUnread = unreadCount > 0;

  if (!otherUser) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(conversation.id)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {otherUser.avatar ? (
          <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {otherUser.name.charAt(0).toUpperCase()}
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
            {otherUser.name}
          </Text>
          <Text variant="caption" color="gray.500" style={styles.timestamp}>
            {formatDistanceToNow(conversation.lastMessageTimestamp)}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <Text
            variant="body"
            color={hasUnread ? 'gray.900' : 'gray.600'}
            weight={hasUnread ? 'medium' : 'normal'}
            style={styles.lastMessage}
            numberOfLines={1}
          >
            {conversation.lastMessageSenderId === currentUserId && 'You: '}
            {conversation.lastMessage}
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
    backgroundColor: theme.colors.error[500],
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
  },
  lastMessage: {
    flex: 1,
    fontSize: theme.fontSize.sm,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error[500],
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
  },
});
