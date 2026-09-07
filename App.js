import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import SearchScreen from './src/screens/SearchScreen';
import MyScreen from './src/screens/MyScreen';
import LoginScreen from './src/screens/LoginScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 하단 탭 네비게이션
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2B2118',
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#A89F91',
        tabBarIcon: () => {
          let icon = '📖';
          if (route.name === '홈') icon = '🏠';
          else if (route.name === '모음집') icon = '📚';
          else if (route.name === '검색') icon = '🔍';
          else if (route.name === 'MY') icon = '👤';
          return <Text style={{ fontSize: 18 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="모음집" component={ArchiveScreen} />
      <Tab.Screen name="검색" component={SearchScreen} />
      <Tab.Screen name="MY" component={MyScreen} />
    </Tab.Navigator>
  );
}

// 전체 스택 네비게이션
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}