import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { COLORS as C } from '../constants';
import * as Updates from 'expo-updates';

const { width, height } = Dimensions.get('window');

function SplashScreen({ onDone }: { onDone: () => void }) {
  const scaleAnim = new Animated.Value(0.6);
  const opacityAnim = new Animated.Value(0);
  const swingAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swingAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(swingAnim, { toValue: -1, duration: 1500, useNativeDriver: true }),
          Animated.timing(swingAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    });
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);

  const rotate = swingAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <View style={splash.container}>
      {Array.from({ length: 30 }).map((_, i) => (
        <View
          key={i}
          style={[
            splash.star,
            {
              top: Math.random() * height,
              left: Math.random() * width,
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              opacity: Math.random() * 0.6 + 0.2,
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          splash.logoWrap,
          {
            transform: [{ scale: scaleAnim }, { rotate }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={splash.ring} />
        <View style={splash.logoBox}>
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 120, height: 120, borderRadius: 20 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
      <View style={splash.dots}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[splash.dot, i === 0 && splash.dotActive]} />
        ))}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    async function checkUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    }
    checkUpdate();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      {!splashDone
        ? <SplashScreen onDone={() => setSplashDone(true)} />
        : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        )
      }
    </AuthProvider>
  );
}

const splash = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0915', alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 2 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 60 },
  ring: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 2, borderColor: 'rgba(139,92,246,0.5)',
  },
  logoBox: {
    width: 160, height: 160, borderRadius: 36,
    backgroundColor: 'rgba(13,11,30,0.9)',
    borderWidth: 2, borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { position: 'absolute', bottom: 80, flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: C.gold },
});