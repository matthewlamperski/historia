import { useState, useMemo, useCallback } from 'react';
import { Post } from '../types';
import { useImagePicker } from './useImagePicker';

export interface UseMessageInputReturn {
  text: string;
  setText: (text: string) => void;
  isEmojiOnly: boolean;
  selectedImages: string[];
  pickImages: () => Promise<void>;
  takePicture: () => Promise<void>;
  removeImage: (index: number) => void;
  clearImages: () => void;
  sharedPost: Post | null;
  setSharedPost: (post: Post | null) => void;
  clearAll: () => void;
  canSend: boolean;
}

export const useMessageInput = (): UseMessageInputReturn => {
  const [text, setText] = useState('');
  const [sharedPost, setSharedPost] = useState<Post | null>(null);
  const {
    selectedImages,
    pickImages,
    takePicture,
    removeImage,
    clearImages,
  } = useImagePicker();

  // Check if text is emoji-only
  const isEmojiOnly = useMemo(() => {
    const emojiRegex = /^[\p{Emoji}\s]+$/u;
    return text.trim().length > 0 && emojiRegex.test(text.trim());
  }, [text]);

  // Check if message can be sent
  const canSend =
    text.trim().length > 0 || selectedImages.length > 0 || sharedPost !== null;

  // Clear all input state
  const clearAll = useCallback(() => {
    setText('');
    clearImages();
    setSharedPost(null);
  }, [clearImages]);

  return {
    text,
    setText,
    isEmojiOnly,
    selectedImages,
    pickImages,
    takePicture,
    removeImage,
    clearImages,
    sharedPost,
    setSharedPost,
    clearAll,
    canSend,
  };
};
