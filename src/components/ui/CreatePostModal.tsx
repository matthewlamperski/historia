import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Input } from '../ui';
import { theme } from '../../constants/theme';
import { useImagePicker } from '../../hooks';
import { CreatePostData } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome6';

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
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  
  const {
    selectedImages,
    uploading,
    pickImages,
    uploadImages,
    removeImage,
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
    setIncludeLocation(false);
    clearImages();
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      Alert.alert('Empty Post', 'Please add some content or images to your post.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload images if any
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(selectedImages);
      }

      // Get location if enabled (mock for now)
      let location;
      if (includeLocation) {
        // In a real app, you'd use geolocation here
        location = {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'San Francisco, CA',
        };
      }

      const postData: CreatePostData = {
        content: content.trim(),
        images: imageUrls,
        location,
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

  const canSubmit = (content.trim() || selectedImages.length > 0) && !submitting && !uploading;

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
    if (selectedImages.length === 0) return null;

    return (
      <View style={styles.imagesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedImages.map((uri: string, index: number) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
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
        onPress={() => setIncludeLocation(!includeLocation)}
      >
        <Icon
          name="location-dot"
          size={20}
          color={includeLocation ? theme.colors.primary[500] : theme.colors.gray[500]}
        />
        <Text
          variant="label"
          color={includeLocation ? 'primary.500' : 'gray.500'}
          style={styles.actionText}
        >
          Location
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
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              
              {includeLocation && (
                <View style={styles.locationTag}>
                  <Icon name="location-dot" size={14} color={theme.colors.primary[500]} />
                  <Text variant="caption" color="primary.500" style={styles.locationText}>
                    San Francisco, CA
                  </Text>
                </View>
              )}
            </View>

            {renderSelectedImages()}
          </ScrollView>
          
          {renderActions()}
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  locationText: {
    marginLeft: theme.spacing.xs,
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
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
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