import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // Ionicons 아이콘 불러오기
import { COLORS } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import SearchScreen from '../screens/SearchScreen';
import MyScreen from '../screens/MyScreen';

// 임시 대체 컴포넌트
const TempCommunity = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>동네 독서 모임 커뮤니티 준비 중</Text>
  </View>
);

const TempSettings = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>설정 화면 준비 중</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary || '#5C3D2E',
        tabBarInactiveTintColor: '#999999',
        // tabBarIcon 옵션 추가로 엑스박스 아이콘 해결
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === '홈') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === '모음집') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === '검색') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === '커뮤니티') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'MY') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === '설정') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="모음집" component={ArchiveScreen} />
      <Tab.Screen name="검색" component={SearchScreen} />
      <Tab.Screen name="커뮤니티" component={TempCommunity} />
      <Tab.Screen name="MY" component={MyScreen} />
      <Tab.Screen name="설정" component={TempSettings} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.cardBackground || '#FFFFFF',
    borderTopColor: COLORS.border || '#EAE5D9',
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 5,
  },
});