import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  StatusBar,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome6';

const MAX_SCALE = 5;
const SPRING = { damping: 20, stiffness: 200 };

// ─── Per-image zoom component ────────────────────────────────────────────────

interface ZoomableImageProps {
  uri: string;
  onRequestClose: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ uri, onRequestClose }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withSpring(1, SPRING);
    savedScale.value = 1;
    tx.value = withSpring(0, SPRING);
    ty.value = withSpring(0, SPRING);
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(MAX_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate(e => {
      if (scale.value <= 1.05) {
        // Swipe down to dismiss when not zoomed in
        ty.value = Math.max(0, e.translationY);
        return;
      }
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(e => {
      if (scale.value <= 1.05) {
        if (e.translationY > 100) {
          runOnJS(onRequestClose)();
        } else {
          ty.value = withSpring(0, SPRING);
        }
        return;
      }
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      if (scale.value > 1) {
        resetZoom();
      } else {
        scale.value = withSpring(3, SPRING);
        savedScale.value = 3;
      }
    });

  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.Image
        source={{ uri }}
        style={[styles.image, animStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
};

// ─── Public modal component ───────────────────────────────────────────────────

export interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const goBack = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const goForward = useCallback(
    () => setIndex(i => Math.min(images.length - 1, i + 1)),
    [images.length],
  );

  const currentUri = images[index] ?? '';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" hidden />
      <View style={styles.container}>
        {/* key forces ZoomableImage to remount (reset zoom) when image changes */}
        <ZoomableImage
          key={`${index}-${currentUri}`}
          uri={currentUri}
          onRequestClose={onClose}
        />

        {/* Close button — positioned using explicit inset so it's never behind the notch */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="xmark" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Multi-image navigation */}
        {images.length > 1 && (
          <>
            {index > 0 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navLeft]}
                onPress={goBack}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Icon name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {index < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navRight]}
                onPress={goForward}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Icon name="chevron-right" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={[styles.dots, { bottom: insets.bottom + 20 }]}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: -20,
  },
  navLeft: { left: 12 },
  navRight: { right: 12 },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
  },
});
