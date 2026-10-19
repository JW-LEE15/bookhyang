import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import MainStackNavigator from './src/navigation/MainStackNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <MainStackNavigator />
    </NavigationContainer>
  );
}