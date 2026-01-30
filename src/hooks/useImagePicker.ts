import { useState, useCallback } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import { useToast } from './useToast';
import { postsService } from '../services';

export interface UseImagePickerReturn {
  selectedImages: string[];
  uploading: boolean;
  pickImages: () => Promise<void>;
  takePicture: () => Promise<void>;
  uploadImages: (images: string[]) => Promise<string[]>;
  removeImage: (index: number) => void;
  clearImages: () => void;
}

export const useImagePicker = (): UseImagePickerReturn => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { showToast } = useToast();

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Historia needs camera permission to take photos',
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

  const showImagePicker = useCallback(() => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: () => takePicture() },
        { text: 'Photo Library', onPress: () => pickImages() },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, []);

  const pickImages = useCallback(async () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 5, // Allow multiple selection
    };

    try {
      launchImageLibrary(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          if (response.errorMessage) {
            showToast('Error selecting images: ' + response.errorMessage, 'error');
          }
          return;
        }

        if (response.assets) {
          const newImages = response.assets
            .filter(asset => asset.uri)
            .map(asset => asset.uri!);
          
          setSelectedImages(prev => [...prev, ...newImages]);
        }
      });
    } catch (error) {
      showToast('Error accessing photo library', 'error');
    }
  }, [showToast]);

  const takePicture = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showToast('Camera permission is required', 'error');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
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
          setSelectedImages(prev => [...prev, response.assets[0].uri!]);
        }
      });
    } catch (error) {
      showToast('Error accessing camera', 'error');
    }
  }, [showToast]);

  const uploadImages = useCallback(async (images: string[]): Promise<string[]> => {
    if (images.length === 0) return [];

    try {
      setUploading(true);
      
      // Upload images sequentially to avoid overwhelming the server
      const uploadPromises = images.map(async (imageUri, index) => {
        try {
          const userId = 'mock-user-id'; // In real app, get from auth
          return await postsService.uploadImage(imageUri, userId);
        } catch (error) {
          console.error(`Error uploading image ${index}:`, error);
          throw error;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      showToast(`Successfully uploaded ${uploadedUrls.length} image(s)`, 'success');
      
      return uploadedUrls;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';
      showToast(errorMessage, 'error');
      throw error;
    } finally {
      setUploading(false);
    }
  }, [showToast]);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  return {
    selectedImages,
    uploading,
    pickImages: showImagePicker,
    takePicture,
    uploadImages,
    removeImage,
    clearImages,
  };
};