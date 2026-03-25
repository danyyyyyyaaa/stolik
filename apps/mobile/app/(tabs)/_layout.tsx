import React, { useRef, useEffect } from 'react'
import { View, Animated, Platform, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../src/theme'
import { useLang } from '../../src/i18n'

// ─── Animated tab icon with spring dot indicator ──────────────────────────────

function TabIcon({
  name, color, focused, accent,
}: {
  name: React.ComponentProps<typeof Feather>['name']
  color: string
  focused: boolean
  accent: string
}) {
  const dotScale  = useRef(new Animated.Value(focused ? 1 : 0)).current
  const iconScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(dotScale, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        tension: 180,
        friction: 12,
      }),
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: focused ? 1.15 : 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
      ]),
    ]).start()
  }, [focused])

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Feather name={name} size={22} color={color} />
      </Animated.View>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: accent,
            transform: [{ scaleX: dotScale }],
            opacity: dotScale,
          },
        ]}
      />
    </View>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { th } = useTheme()
  const { t }  = useLang()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: th.navBg,
          borderTopColor:  th.navBorder,
          borderTopWidth:  1,
          paddingBottom:   Platform.OS === 'ios' ? 24 : 10,
          paddingTop:      10,
          height:          Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarActiveTintColor:   th.accent,
        tabBarInactiveTintColor: th.textMuted,
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          marginTop:  2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} accent={th.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.search_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} accent={th.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t.bookings_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bookmark" color={color} focused={focused} accent={th.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} accent={th.accent} />
          ),
        }}
      />
    </Tabs>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  iconWrap: {
    alignItems:    'center',
    justifyContent: 'center',
    width:         36,
    height:        30,
  },
  dot: {
    width:        18,
    height:       3,
    borderRadius: 2,
    marginTop:    4,
  },
})
