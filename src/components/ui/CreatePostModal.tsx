import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '../ui';
import { theme } from '../../constants/theme';
import { useImagePicker } from '../../hooks';
import { CreatePostData } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { LocationPickerModal, PickedLocation } from './LocationPickerModal';
import { LandmarkPickerModal, PickedLandmark } from './LandmarkPickerModal';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (postData: CreatePostData) => Promise<void>;
  loading?: boolean;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading: _loading = false,
}) => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationData, setLocationData] = useState<PickedLocation | null>(null);
  const [landmarkPickerVisible, setLandmarkPickerVisible] = useState(false);
  const [landmarkData, setLandmarkData] = useState<PickedLandmark | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const {
    selectedMedia,
    uploading,
    pickImages,
    uploadMedia,
    removeMedia,
    clearImages,
  } = useImagePicker();

  const handleClose = () => {
    if (submitting || uploading) {
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setContent('');
    setLocationData(null);
    setLandmarkData(null);
    clearImages();
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedMedia.length === 0) {
      Alert.alert('Empty Post', 'Please add some content or media to your post.');
      return;
    }

    try {
      setSubmitting(true);

      let imageUrls: string[] = [];
      let videoUrls: string[] = [];
      if (selectedMedia.length > 0) {
        const result = await uploadMedia();
        imageUrls = result.imageUrls;
        videoUrls = result.videoUrls;
      }

      const location = locationData
        ? { latitude: locationData.latitude, longitude: locationData.longitude, city: locationData.city }
        : undefined;

      const postData: CreatePostData = {
        content: content.trim(),
        images: imageUrls,
        videos: videoUrls,
        location,
        landmarkId: landmarkData?.id,
      };

      await onSubmit(postData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = (content.trim() || selectedMedia.length > 0) && !submitting && !uploading;

  const renderHeader = () => (
    <View style={styles.header}>
      <Button variant="ghost" size="sm" onPress={handleClose}>
        <Text variant="label" color="gray.600">
          Cancel
        </Text>
      </Button>
      <Text variant="h3">New Post</Text>
      <Button
        variant="primary"
        size="sm"
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={submitting || uploading}
      >
        Post
      </Button>
    </View>
  );

  const renderSelectedImages = () => {
    if (selectedMedia.length === 0) return null;

    return (
      <View style={styles.imagesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedMedia.map((item, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: item.uri }} style={styles.selectedImage} />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <Icon name="play" size={18} color={theme.colors.white} />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeMedia(index)}
              >
                <Icon name="xmark" size={14} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionButton} onPress={pickImages}>
        <Icon name="image" size={20} color={theme.colors.primary[500]} />
        <Text variant="label" color="primary.500" style={styles.actionText}>
          Photos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setLocationPickerVisible(true)}
      >
        <Icon
          name="location-dot"
          size={20}
          color={locationData ? theme.colors.primary[500] : theme.colors.gray[500]}
        />
        <Text
          variant="label"
          color={locationData ? 'primary.500' : 'gray.500'}
          style={styles.actionText}
        >
          Location
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setLandmarkPickerVisible(true)}
      >
        <Icon
          name="landmark"
          size={20}
          color={landmarkData ? theme.colors.primary[500] : theme.colors.gray[500]}
        />
        <Text
          variant="label"
          color={landmarkData ? 'primary.500' : 'gray.500'}
          style={styles.actionText}
        >
          Landmark
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}

        <View style={[styles.content, { paddingBottom: keyboardHeight || insets.bottom }]}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.inputContainer}>
              <Input
                placeholder="What's on your mind?"
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
                maxLength={2000}
                style={styles.textInput}
                variant="filled"
              />

              {locationData && (
                <TouchableOpacity style={styles.tag} onPress={() => setLocationPickerVisible(true)}>
                  <Icon name="location-dot" size={14} color={theme.colors.primary[500]} />
                  <Text variant="label" color="primary.700" style={styles.tagLabel} numberOfLines={1}>
                    {locationData.city}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setLocationData(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="xmark" size={12} color={theme.colors.primary[400]} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {landmarkData && (
                <TouchableOpacity style={styles.tag} onPress={() => setLandmarkPickerVisible(true)}>
                  <Icon name="landmark" size={14} color={theme.colors.primary[500]} />
                  <Text variant="label" color="primary.700" style={styles.tagLabel} numberOfLines={1}>
                    {landmarkData.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setLandmarkData(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="xmark" size={12} color={theme.colors.primary[400]} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {renderSelectedImages()}
          {renderActions()}
        </View>
      </SafeAreaView>

      <LocationPickerModal
        visible={locationPickerVisible}
        initialLocation={locationData ?? undefined}
        onConfirm={loc => {
          setLocationData(loc);
          setLocationPickerVisible(false);
        }}
        onCancel={() => setLocationPickerVisible(false)}
      />

      <LandmarkPickerModal
        visible={landmarkPickerVisible}
        onConfirm={lm => {
          setLandmarkData(lm);
          setLandmarkPickerVisible(false);
        }}
        onCancel={() => setLandmarkPickerVisible(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  textInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.sm,
    gap: 4,
    maxWidth: '70%',
  },
  tagLabel: {
    fontSize: theme.fontSize.sm,
    flexShrink: 1,
  },
  imagesContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  selectedImage: {
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.error[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xl,
  },
  actionText: {
    marginLeft: theme.spacing.sm,
  },
});
