import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import SearchScreen from './src/screens/SearchScreen';
import UserBooksScreen from './src/screens/UserBooksScreen';

export default function App() {
  // 현재 선택된 탭 ('search' 또는 'userBooks')
  const [currentTab, setCurrentTab] = useState('search');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* 상단 헤더 영역 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentTab === 'search' ? '📖 도서 검색' : '📚 내 서재'}
        </Text>
      </View>

      {/* 메인 화면 영역 (두 화면을 모두 유지하고 display로 보임/숨김 처리) */}
      <View style={styles.content}>
        <View style={[styles.screenContainer, currentTab !== 'search' && styles.hidden]}>
          <SearchScreen />
        </View>
        <View style={[styles.screenContainer, currentTab !== 'userBooks' && styles.hidden]}>
          <UserBooksScreen />
        </View>
      </View>

      {/* 하단 탭 바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'search' && styles.activeTab]}
          onPress={() => setCurrentTab('search')}
        >
          <Text style={[styles.tabText, currentTab === 'search' && styles.activeTabText]}>
            도서 검색
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'userBooks' && styles.activeTab]}
          onPress={() => setCurrentTab('userBooks')}
        >
          <Text style={[styles.tabText, currentTab === 'userBooks' && styles.activeTabText]}>
            내 서재
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 25, // 상태바 간격
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  hidden: {
    display: 'none', // 숨겨진 탭은 메모리에 보존되면서 화면에만 안 보이게 설정
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    color: '#8e8e93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});