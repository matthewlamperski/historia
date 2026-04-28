import { useState, useCallback, useRef } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { useToast } from './useToast';
import { postsService } from '../services';
import { useAuthStore } from '../store/authStore';

export interface SelectedMedia {
  uri: string;
  type: 'image' | 'video';
}

export interface UseImagePickerReturn {
  selectedImages: string[];           // legacy: image URIs only
  selectedMedia: SelectedMedia[];     // new: all selected media (images + videos)
  uploading: boolean;
  pickImages: () => Promise<void>;
  takePicture: () => Promise<void>;
  uploadImages: (images: string[]) => Promise<string[]>;
  uploadMedia: () => Promise<{ imageUrls: string[]; videoUrls: string[] }>;
  removeImage: (index: number) => void;
  removeMedia: (index: number) => void;
  clearImages: () => void;
}

const MAX_MEDIA = 10;
const MAX_VIDEOS = 3;

export const useImagePicker = (): UseImagePickerReturn => {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [uploading, setUploading] = useState(false);

  // Keep a ref in sync so callbacks can read current count without stale closures
  const selectedMediaRef = useRef<SelectedMedia[]>([]);
  selectedMediaRef.current = selectedMedia;

  const { showToast } = useToast();
  const { user } = useAuthStore();

  // Legacy compat: expose just image URIs
  const selectedImages = selectedMedia
    .filter(m => m.type === 'image')
    .map(m => m.uri);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Historia needs camera permission to take photos and videos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const pickImages = useCallback(async () => {
    const remaining = MAX_MEDIA - selectedMediaRef.current.length;

    if (remaining <= 0) {
      showToast(`You can only add up to ${MAX_MEDIA} photos/videos per post`, 'error');
      return;
    }

    const options = {
      mediaType: 'mixed' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8 as any,
      videoQuality: 'medium' as const,
      selectionLimit: remaining,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        if (response.errorMessage) {
          showToast('Error selecting media: ' + response.errorMessage, 'error');
        }
        return;
      }

      if (response.assets) {
        const newMedia: SelectedMedia[] = response.assets
          .filter(asset => asset.uri)
          .map(asset => ({
            uri: asset.uri!,
            type: asset.type?.startsWith('video/') ? 'video' : 'image',
          }));

        setSelectedMedia(current => {
          const slots = MAX_MEDIA - current.length;
          const videoCount = current.filter(m => m.type === 'video').length;
          let videoSlots = MAX_VIDEOS - videoCount;
          const accepted: SelectedMedia[] = [];
          let videoRejected = false;
          for (const m of newMedia.slice(0, slots)) {
            if (m.type === 'video') {
              if (videoSlots <= 0) {
                videoRejected = true;
                continue;
              }
              videoSlots -= 1;
            }
            accepted.push(m);
          }
          if (videoRejected) {
            showToast(`Up to ${MAX_VIDEOS} videos per post`, 'error');
          }
          return [...current, ...accepted];
        });
      }
    });
  }, [showToast]);

  const takePicture = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showToast('Camera permission is required', 'error');
      return;
    }

    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8 as any,
      saveToPhotos: true,
    };

    try {
      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          if (response.errorMessage) {
            showToast('Error taking picture: ' + response.errorMessage, 'error');
          }
          return;
        }

        if (response.assets && response.assets[0]?.uri) {
          setSelectedMedia(prev => {
            if (prev.length >= MAX_MEDIA) {
              showToast(`You can only add up to ${MAX_MEDIA} photos/videos per post`, 'error');
              return prev;
            }
            return [...prev, { uri: response.assets![0].uri!, type: 'image' }];
          });
        }
      });
    } catch (error) {
      showToast('Error accessing camera', 'error');
    }
  }, [showToast]);

  const showImagePicker = useCallback(async () => {
    Alert.alert(
      'Add Media',
      'Choose how you want to add photos or videos',
      [
        { text: 'Camera', onPress: () => takePicture() },
        { text: 'Photo/Video Library', onPress: () => pickImages() },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [takePicture, pickImages]);

  const uploadImages = useCallback(async (images: string[]): Promise<string[]> => {
    if (images.length === 0) return [];
    try {
      setUploading(true);
      const urls = await Promise.all(
        images.map((uri, i) =>
          postsService.uploadImage(uri, user?.id ?? '').catch(err => {
            console.error(`Error uploading image ${i}:`, err);
            throw err;
          })
        )
      );
      showToast(`Successfully uploaded ${urls.length} image(s)`, 'success');
      return urls;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload images';
      showToast(msg, 'error');
      throw error;
    } finally {
      setUploading(false);
    }
  }, [showToast, user?.id]);

  const uploadMedia = useCallback(async (): Promise<{ imageUrls: string[]; videoUrls: string[] }> => {
    const images = selectedMedia.filter(m => m.type === 'image');
    const videos = selectedMedia.filter(m => m.type === 'video');

    setUploading(true);
    try {
      const imageUrls = await Promise.all(
        images.map(m => postsService.uploadImage(m.uri, user?.id ?? ''))
      );
      const videoUrls = await Promise.all(
        videos.map(m => postsService.uploadVideo(m.uri, user?.id ?? ''))
      );
      return { imageUrls, videoUrls };
    } finally {
      setUploading(false);
    }
  }, [selectedMedia, user?.id]);

  const removeImage = useCallback((index: number) => {
    // Remove by index from images-only array (legacy compat)
    setSelectedMedia(prev => {
      const imageIndices = prev
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.type === 'image')
        .map(({ i }) => i);
      const globalIndex = imageIndices[index];
      return prev.filter((_, i) => i !== globalIndex);
    });
  }, []);

  const removeMedia = useCallback((index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setSelectedMedia([]);
  }, []);

  return {
    selectedImages,
    selectedMedia,
    uploading,
    pickImages: showImagePicker,
    takePicture,
    uploadImages,
    uploadMedia,
    removeImage,
    removeMedia,
    clearImages,
  };
};
