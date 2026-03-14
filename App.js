// App.js
import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WardrobeProvider } from './src/context/WardrobeContext';
import HomeScreen from './src/screens/HomeScreen';
import WardrobeScreen from './src/screens/WardrobeScreen';
import AnalyzingScreen from './src/screens/AnalyzingScreen';
import GarmentDetailScreen from './src/screens/GarmentDetailScreen';
import RecommendationScreen from './src/screens/RecommendationScreen';
import ResultScreen from './src/screens/ResultScreen';
import OutfitHistoryScreen from './src/screens/OutfitHistoryScreen';
import OutfitCalendarScreen from './src/screens/OutfitCalendarScreen';
import TryOnScreen from './src/screens/TryOnScreen';
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator();
const font = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

const navTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary, background: COLORS.bg, card: COLORS.card,
    text: COLORS.text, border: COLORS.border, notification: COLORS.red,
  },
  fonts: {
    regular: { fontFamily: font, fontWeight: '400' },
    medium: { fontFamily: font, fontWeight: '500' },
    bold: { fontFamily: font, fontWeight: '700' },
    heavy: { fontFamily: font, fontWeight: '800' },
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <WardrobeProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: COLORS.bg },
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
              <Stack.Screen name="Analyzing" component={AnalyzingScreen} options={{ gestureEnabled: false }} />
              <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
              <Stack.Screen name="Recommendation" component={RecommendationScreen} />
              <Stack.Screen name="Result" component={ResultScreen} />
              <Stack.Screen name="OutfitHistory" component={OutfitHistoryScreen} />
              <Stack.Screen name="OutfitCalendar" component={OutfitCalendarScreen} />
              <Stack.Screen name="TryOn" component={TryOnScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </WardrobeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}