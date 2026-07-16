// Bottom tabs: Learn | Train | Stats | Profile (line icons, mint accent).
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { t } from '../../src/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, base: string): IoniconName {
  return (focused ? base : `${base}-outline`) as IoniconName;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={icon(focused, 'map')} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: t('tabs.train'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={icon(focused, 'locate')} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={icon(focused, 'stats-chart')} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={icon(focused, 'person')} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
