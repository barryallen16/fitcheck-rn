import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AnalyzingScreen from '../screens/AnalyzingScreen';
import GarmentDetailScreen from '../screens/GarmentDetailScreen';
import StyleScreen from '../screens/StyleScreen';
import RecommendationScreen from '../screens/RecommendationScreen';
import ResultScreen from '../screens/ResultScreen';
import OutfitHistoryScreen from '../screens/OutfitHistoryScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';
import OutfitCalendarScreen from '../screens/OutfitCalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TryOnScreen from '../screens/TryOnScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const opts = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: COLORS.bg },
};

function WardrobeStack() {
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="WardrobeMain" component={WardrobeScreen} />
      <Stack.Screen name="Analyzing" component={AnalyzingScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
    </Stack.Navigator>
  );
}

function StyleStack() {
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="StyleMain" component={StyleScreen} />
      <Stack.Screen name="Recommendation" component={RecommendationScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="OutfitHistory" component={OutfitHistoryScreen} />
      <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
      <Stack.Screen name="OutfitCalendar" component={OutfitCalendarScreen} />
      <Stack.Screen name="TryOn" component={TryOnScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarLabelStyle: { fontSize: TYPE.xs, fontWeight: '600' },
        tabBarIcon: ({ color }) => {
          const map = { Home: 'home-outline', Wardrobe: 'shirt-outline', Style: 'sparkles-outline', Me: 'person-outline' };
          return <Ionicons name={map[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wardrobe" component={WardrobeStack} />
      <Tab.Screen name="Style" component={StyleStack} />
      <Tab.Screen name="Me" component={ProfileStack} />
    </Tab.Navigator>
  );
}