import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../state/AuthProvider';
import LoginScreen from '../screens/LoginScreen';
import CoursesScreen from '../screens/CoursesScreen';
import SessionsScreen from '../screens/SessionsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SummaryScreen from '../screens/SummaryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Sessions" component={SessionsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) return null; // could render splash

  return (
    <NavigationContainer>
      {token ? (
        <AppTabs />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
