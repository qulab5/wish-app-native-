import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS as C } from '../../constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.s1,
          borderTopColor: 'rgba(139,92,246,0.2)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          tabBarLabel: 'Earn',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'play-circle' : 'play-circle-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="convert"
        options={{
          tabBarLabel: 'Convert',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons name="swap-horizontal" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}