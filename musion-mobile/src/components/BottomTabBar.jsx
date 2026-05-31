import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = [
  {
    key: 'home',
    route: 'Feed',
    icon: require('../../assets/homeicon.png'),
    size: 24,
  },
  {
    key: 'search',
    route: 'Search',
    icon: require('../../assets/searchicon.png'),
    size: 26,
  },
  {
    key: 'trending',
    route: 'Trending',
    icon: require('../../assets/fireicon.png'),
    size: 26,
  },
  {
    key: 'chat',
    route: 'Chat',
    iconName: 'chatbubble-outline',
    size: 24,
  },
];

export default function BottomTabBar({ state, navigation }) {
  const activeRouteName = state.routes[state.index]?.name;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  const handlePress = (tab) => {
    if (tab.route === activeRouteName) return;

    navigation.navigate(tab.route);
  };

  return (
    <View
      style={[
        styles.bottomBar,
        {
          height: 58 + bottomInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.route === activeRouteName;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handlePress(tab)}
          >
            {tab.icon ? (
              <Image
                source={tab.icon}
                style={[
                  styles.icon,
                  {
                    width: tab.size,
                    height: tab.size,
                    tintColor: isActive ? '#DEE0E8' : '#55565C',
                  },
                ]}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name={tab.iconName}
                size={tab.size}
                color={isActive ? '#DEE0E8' : '#55565C'}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#18191D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 25,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    shadowColor: '#e8dede',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  icon: {
    flexShrink: 0,
  },
});
