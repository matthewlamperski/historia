import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Input, Button } from '../components/ui';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps, Conversation } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useAuthStore } from '../store/authStore';
import { messagingService } from '../services';

type ParticipantDetail = Conversation['participantDetails'][number];

const GroupInfoScreen: React.FC<RootStackScreenProps<'GroupInfo'>> = ({
  route,
}) => {
  const { conversationId } = route.params;
  const navigation = useNavigation<RootStackScreenProps<'GroupInfo'>['navigation']>();
  const { user } = useAuthStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const loadConversation = useCallback(async () => {
    const conv = await messagingService.getConversation(conversationId);
    if (conv) {
      setConversation(conv);
      setEditName(conv.name ?? '');
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim() || editName.trim() === conversation?.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await messagingService.updateGroupInfo(conversationId, { name: editName.trim() });
      setConversation(prev => prev ? { ...prev, name: editName.trim() } : prev);
      setIsEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to update group name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editName, conversation, conversationId]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Group Info',
      headerRight: () =>
        isSaving ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginRight: 4 }} />
        ) : (
          <TouchableOpacity
            onPress={() => (isEditing ? handleSaveName() : setIsEditing(true))}
            disabled={isSaving}
            style={{ marginRight: 4 }}
          >
            <Text variant="label" weight="semibold" style={{ color: theme.colors.primary[500] }}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        ),
    });
  }, [isEditing, isSaving, handleSaveName, navigation]);

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will no longer receive messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setIsLeaving(true);
            try {
              await messagingService.leaveGroup(conversationId, user.id);
              navigation.popToTop();
            } catch {
              Alert.alert('Error', 'Failed to leave group. Please try again.');
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  const renderMember = useCallback(
    ({ item }: { item: ParticipantDetail }) => {
      const isCurrentUser = item.id === user?.id;
      return (
        <View style={styles.memberRow}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
              <Text variant="label" weight="bold" style={styles.memberInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.memberInfo}>
            <Text variant="label" weight="semibold" style={styles.memberName}>
              {item.name}
              {isCurrentUser ? (
                <Text variant="caption" color="gray.400"> (you)</Text>
              ) : null}
            </Text>
            {item.username && (
              <Text variant="caption" color="gray.500">
                @{item.username}
              </Text>
            )}
          </View>
        </View>
      );
    },
    [user?.id]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Text variant="body" color="gray.500">
            Group not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={conversation.participantDetails}
        keyExtractor={item => item.id}
        renderItem={renderMember}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.groupHeader}>
            {/* Group icon */}
            <View style={styles.groupIconWrap}>
              <Icon name="users" size={36} color={theme.colors.primary[500]} />
            </View>

            {/* Group name */}
            {isEditing ? (
              <Input
                value={editName}
                onChangeText={setEditName}
                autoFocus
                maxLength={50}
                containerStyle={styles.nameInput}
                style={styles.nameInputField}
                onSubmitEditing={handleSaveName}
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                activeOpacity={0.7}
                style={styles.nameRow}
              >
                <Text variant="h3" weight="semibold" style={styles.groupName}>
                  {conversation.name ?? 'Group'}
                </Text>
                <Icon
                  name="pen"
                  size={14}
                  color={theme.colors.gray[400]}
                  style={styles.penIcon}
                />
              </TouchableOpacity>
            )}

            <Text variant="caption" color="gray.500" style={styles.memberCount}>
              {conversation.participantDetails.length} members
            </Text>

            {/* Members section header */}
            <Text variant="label" weight="semibold" style={styles.sectionHeader}>
              Members
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              variant="ghost"
              fullWidth
              onPress={handleLeaveGroup}
              disabled={isLeaving}
              style={styles.leaveBtn}
            >
              {isLeaving ? (
                <ActivityIndicator size="small" color={theme.colors.error[500]} />
              ) : (
                <View style={styles.leaveBtnContent}>
                  <Icon name="arrow-right-from-bracket" size={16} color={theme.colors.error[500]} />
                  <Text variant="label" weight="semibold" style={styles.leaveBtnText}>
                    Leave Group
                  </Text>
                </View>
              )}
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupHeader: {
    alignItems: 'center',
    paddingTop: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  groupIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  groupName: {
    color: theme.colors.gray[900],
    textAlign: 'center',
  },
  penIcon: {
    marginTop: 2,
  },
  nameInput: {
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  nameInputField: {
    textAlign: 'center',
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
  },
  memberCount: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    alignSelf: 'flex-start',
    color: theme.colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarPlaceholder: {
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    color: theme.colors.primary[700],
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: theme.colors.gray[900],
    marginBottom: 2,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginLeft: theme.spacing.lg + 44 + theme.spacing.md,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
  },
  leaveBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error[200],
    borderRadius: theme.borderRadius.lg,
  },
  leaveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  leaveBtnText: {
    color: theme.colors.error[500],
  },
});

export default GroupInfoScreen;
