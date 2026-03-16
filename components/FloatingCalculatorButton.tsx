/**
 * Floating Draggable Calculator Button
 * User can drag and position anywhere on screen
 * Position is saved to AsyncStorage
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { Calculator } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import CalculatorScreen from '../screens/CalculatorScreen';

const BUTTON_SIZE = 56;
const STORAGE_KEY = '@calculator_button_position';

export default function FloatingCalculatorButton() {
  const { theme } = useTheme();
  const [showCalculator, setShowCalculator] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Default position (bottom-right corner)
  const DEFAULT_POSITION = {
    x: dimensions.width - BUTTON_SIZE - 20,
    y: dimensions.height - BUTTON_SIZE - 200, // Higher up to avoid tab bar
  };

  // Animated position
  const pan = useRef(new Animated.ValueXY(DEFAULT_POSITION)).current;

  // Update dimensions on screen size change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Load saved position on mount
  useEffect(() => {
    console.log('🧮 [FloatingCalculator] Component mounted!');
    console.log('📍 [FloatingCalculator] Default position:', DEFAULT_POSITION);
    console.log('📏 [FloatingCalculator] Screen dimensions:', dimensions);

    // Set initial position
    pan.setValue(DEFAULT_POSITION);

    // Then load saved position (will override if exists)
    loadPosition();
  }, []);

  const loadPosition = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const position = JSON.parse(saved);
        pan.setValue(position);
      }
    } catch (error) {
      console.error('[FloatingCalculator] Error loading position:', error);
    }
  };

  const savePosition = async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
    } catch (error) {
      console.error('[FloatingCalculator] Error saving position:', error);
    }
  };

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('[FloatingCalculator] Touch started');
        return true;
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        console.log('[FloatingCalculator] Dragging started');
        setIsDragging(true);
        // Set offset to current position
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [
          null,
          {
            dx: pan.x,
            dy: pan.y,
          },
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        console.log('[FloatingCalculator] Dragging ended', {
          dx: gesture.dx,
          dy: gesture.dy,
        });
        setIsDragging(false);
        pan.flattenOffset();

        // Get final position
        const finalX = (pan.x as any)._value;
        const finalY = (pan.y as any)._value;

        // Constrain to screen bounds
        const constrainedX = Math.max(
          0,
          Math.min(dimensions.width - BUTTON_SIZE, finalX)
        );
        const constrainedY = Math.max(
          0,
          Math.min(dimensions.height - BUTTON_SIZE - 150, finalY) // 150px from bottom for tab bar and safe area
        );

        // Snap to nearest edge (left or right) if dragged
        const shouldSnapToEdge = Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
        const snappedX = shouldSnapToEdge
          ? constrainedX < dimensions.width / 2
            ? 20 // Snap to left
            : dimensions.width - BUTTON_SIZE - 20 // Snap to right
          : constrainedX;

        console.log('[FloatingCalculator] Final position:', {
          snappedX,
          constrainedY,
          shouldSnapToEdge,
        });

        // Animate to final position
        Animated.spring(pan, {
          toValue: { x: snappedX, y: constrainedY },
          useNativeDriver: false,
          friction: 7,
        }).start(() => {
          // Save position after animation
          savePosition(snappedX, constrainedY);
        });

        // Open calculator if not dragged (just tapped)
        if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          console.log('[FloatingCalculator] Opening calculator modal');
          setShowCalculator(true);
        }
      },
    })
  ).current;

  console.log('🎨 [FloatingCalculator] Rendering draggable button');

  return (
    <>
      {/* Floating Button - Draggable */}
      <Animated.View
        style={[
          styles.containerDraggable,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            opacity: isDragging ? 0.8 : 1,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.button,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}
        >
          <Calculator size={28} color="#fff" />
        </View>
      </Animated.View>

      {/* Calculator Modal */}
      <Modal
        visible={showCalculator}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCalculator(false)}
      >
        <CalculatorScreen
          navigation={{
            goBack: () => setShowCalculator(false),
          }}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  containerDraggable: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 999999,
    elevation: 999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 999,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
