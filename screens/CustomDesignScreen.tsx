/**
 * Custom Design Screen
 *
 * 3-step wizard for custom jewelry design
 * Port from: web/src/pages/CustomDesignPage.jsx (simplified)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, ArrowLeft, ShoppingCart, Sparkles } from 'lucide-react-native';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCartStore } from '../stores/cartStore';

// Step components (simplified placeholders)
import MountingSelectorStep from '../components/custom-design/MountingSelectorStep';
import StoneSelectorStep from '../components/custom-design/StoneSelectorStep';
import CustomizerStep from '../components/custom-design/CustomizerStep';

enum Step {
  SELECT_MOUNTING = 1,
  SELECT_STONE = 2,
  CUSTOMIZE = 3
}

export default function CustomDesignScreen({ navigation }: any) {
  const { theme } = useTheme();
  const user = auth.currentUser;
  const addToCart = useCartStore((state: any) => state.addItem);

  const [currentStep, setCurrentStep] = useState<Step>(Step.SELECT_MOUNTING);
  const [selectedMounting, setSelectedMounting] = useState<any>(null);
  const [selectedStone, setSelectedStone] = useState<any>(null);
  const [selectedMetal, setSelectedMetal] = useState<string>('14K White Gold');
  const [loading, setLoading] = useState(false);

  const canProceedToStone = selectedMounting !== null;
  const canProceedToCustomize = selectedMounting !== null && selectedStone !== null;

  const handleNextStep = () => {
    if (currentStep === Step.SELECT_MOUNTING && !canProceedToStone) {
      Alert.alert('Error', 'Please select a mounting first');
      return;
    }
    if (currentStep === Step.SELECT_STONE && !canProceedToCustomize) {
      Alert.alert('Error', 'Please select a stone first');
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > Step.SELECT_MOUNTING) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add to cart');
      navigation.navigate('Login');
      return;
    }

    if (!selectedMounting || !selectedStone) {
      Alert.alert('Error', 'Please complete all steps');
      return;
    }

    setLoading(true);

    try {
      // Save design to custom_designs collection
      const designsRef = collection(db, 'custom_designs');
      const designDoc = await addDoc(designsRef, {
        userId: user.uid,
        userName: user.displayName || user.email,
        userRole: 'retailer',
        mountingId: selectedMounting.id,
        stoneId: selectedStone.id,
        selectedMetal,
        mountingPrice: selectedMounting.basePrice || 0,
        stonePrice: selectedStone.totalPrice || 0,
        totalPrice: (selectedMounting.basePrice || 0) + (selectedStone.totalPrice || 0),
        status: 'finalized',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add to cart as combo item
      const comboItem = {
        id: `combo-${designDoc.id}-${Date.now()}`,
        itemType: 'combo',
        designId: designDoc.id,
        mountingData: {
          id: selectedMounting.id,
          name: selectedMounting.name,
          category: selectedMounting.category
        },
        stoneData: {
          id: selectedStone.id,
          shape: selectedStone.shape,
          carat: selectedStone.carat,
          color: selectedStone.color,
          clarity: selectedStone.clarity
        },
        selectedMetal,
        mountingPrice: selectedMounting.basePrice || 0,
        stonePrice: selectedStone.totalPrice || 0,
        totalPrice: (selectedMounting.basePrice || 0) + (selectedStone.totalPrice || 0)
      };

      await addToCart(comboItem);
      Alert.alert('Success', 'Design added to cart!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = {
    [Step.SELECT_MOUNTING]: 'Select Mounting',
    [Step.SELECT_STONE]: 'Select Stone',
    [Step.CUSTOMIZE]: 'Customize Design'
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Sparkles size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Custom Design</Text>
        </View>
      </View>

      {/* Step Indicator */}
      <View style={[styles.stepIndicator, { backgroundColor: theme.backgroundCard }]}>
        {[Step.SELECT_MOUNTING, Step.SELECT_STONE, Step.CUSTOMIZE].map((step, index) => (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                {
                  backgroundColor:
                    currentStep === step ? theme.primary :
                    currentStep > step ? theme.success :
                    theme.border
                }
              ]}>
                <Text style={[styles.stepNumber, { color: currentStep >= step ? '#fff' : theme.textSecondary }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>
                {stepTitles[step as Step]}
              </Text>
            </View>
            {index < 2 && <View style={[styles.stepLine, { backgroundColor: theme.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentStep === Step.SELECT_MOUNTING && (
          <MountingSelectorStep
            selectedMounting={selectedMounting}
            onSelect={setSelectedMounting}
            theme={theme}
          />
        )}

        {currentStep === Step.SELECT_STONE && (
          <StoneSelectorStep
            selectedStone={selectedStone}
            onSelect={setSelectedStone}
            theme={theme}
          />
        )}

        {currentStep === Step.CUSTOMIZE && (
          <CustomizerStep
            mounting={selectedMounting}
            stone={selectedStone}
            selectedMetal={selectedMetal}
            onMetalChange={setSelectedMetal}
            theme={theme}
          />
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.footer, { backgroundColor: theme.backgroundCard, borderTopColor: theme.border }]}>
        {currentStep > Step.SELECT_MOUNTING && (
          <TouchableOpacity
            style={[styles.button, styles.backButton, { borderColor: theme.border }]}
            onPress={handlePrevStep}
          >
            <ArrowLeft size={20} color={theme.textPrimary} />
            <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < Step.CUSTOMIZE ? (
          <TouchableOpacity
            style={[styles.button, styles.nextButton, { backgroundColor: theme.primary }]}
            onPress={handleNextStep}
            disabled={
              (currentStep === Step.SELECT_MOUNTING && !canProceedToStone) ||
              (currentStep === Step.SELECT_STONE && !canProceedToCustomize)
            }
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>Next</Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.addButton, { backgroundColor: theme.success }]}
            onPress={handleAddToCart}
            disabled={loading || !canProceedToCustomize}
          >
            <ShoppingCart size={20} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              {loading ? 'Adding...' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  backBtn: {
    marginRight: 12
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16
  },
  stepItem: {
    alignItems: 'center'
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  stepLabel: {
    fontSize: 11
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8
  },
  backButton: {
    borderWidth: 1
  },
  nextButton: {
    // backgroundColor set dynamically
  },
  addButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
