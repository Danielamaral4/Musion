import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { LoginScreen } from './src/screens/LoginScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { AddReviewScreen } from './src/screens/AddReviewScreen';
import ProfilePage from './src/screens/ProfilePage';
import { TrendingScreen } from './src/screens/TrendingScreen';
import { AlbumDetailsScreen } from './src/screens/AlbumDetailsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PostScreen from './src/screens/PostScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VirtualLedScreen from './src/screens/VirtualLedScreen';
import BlockedUsersScreen from './src/screens/BlockedUsersScreen';
import BottomTabBar from './src/components/BottomTabBar';
import { preloadTrendingData } from './src/services/trendingPreload';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: 'shift',
      }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Trending" component={TrendingScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    preloadTrendingData().catch(() => {});

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/splash-icon.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <KeyboardProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="Feed"
            component={MainTabs}
            options={{
              animationEnabled: false,
              cardStyleInterpolator: () => ({}),
            }}
          />
          <Stack.Screen name="AddReview" component={AddReviewScreen} />
          <Stack.Screen name="Profile" component={ProfilePage} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="VirtualLed" component={VirtualLedScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
          <Stack.Screen name="PostScreen" component={PostScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18191D',
  },
  splashImage: {
    width: 180,
    height: 180,
  },
});
