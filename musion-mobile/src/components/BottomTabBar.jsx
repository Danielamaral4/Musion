import React from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

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
    key: 'notifications',
    route: 'Notifications',
    icon: require('../../assets/notificon.png'),
    size: 24,
  },
];

export default function BottomTabBar({ state, navigation }) {
  const activeRouteName = state.routes[state.index]?.name;

  const handlePress = (tab) => {
    if (tab.route === activeRouteName) return;

    navigation.navigate(tab.route);
  };

  return (
    <View style={styles.bottomBar}>
      {tabs.map((tab) => {
        const isActive = tab.route === activeRouteName;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handlePress(tab)}
          >
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
    height: Platform.OS === 'android' ? 85 : 80,
    paddingBottom: Platform.OS === 'android' ? 30 : 25,
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
