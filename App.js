import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './src/context/AppContext';
import TabNavigator from './src/navigation/TabNavigator';
import { COLORS } from './src/constants/theme';

const font = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

const navTheme = {
  dark: true,
  colors: { primary: COLORS.primary, background: COLORS.bg, card: COLORS.card, text: COLORS.text, border: COLORS.border, notification: COLORS.red },
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
        <AppProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <TabNavigator />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}