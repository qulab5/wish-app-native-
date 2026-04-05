import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  Alert, ScrollView, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS as C, API_BASE, SPIN_PTS } from '../../constants';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width - 64, 280);
const R = WHEEL_SIZE / 2 - 8;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;

const SEGS = [
  { v: '500', c: '#8b5cf6' },
  { v: '1K', c: '#06b6d4' },
  { v: '1.5K', c: '#10b981' },
  { v: '2K', c: '#ec4899' },
  { v: '2.5K', c: '#f97316' },
  { v: '3K', c: '#6366f1' },
  { v: '3.5K', c: '#84cc16' },
  { v: '20K', c: '#FFD700' },
];

function SpinWheelSvg({ rotation }: { rotation: Animated.Value }) {
  const n = SEGS.length;
  const segAngle = (2 * Math.PI) / n;

  const paths = SEGS.map((seg, i) => {
    const a1 = segAngle * i - Math.PI / 2;
    const a2 = segAngle * (i + 1) - Math.PI / 2;
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY + R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY + R * Math.sin(a2);
    const ma = (a1 + a2) / 2;
    const tx = CX + R * 0.62 * Math.cos(ma);
    const ty = CY + R * 0.62 * Math.sin(ma);
    const d = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`;
    return { d, c: seg.c, label: seg.v, tx, ty };
  });

  const animStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[{ width: WHEEL_SIZE, height: WHEEL_SIZE }, animStyle]}>
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
        {paths.map((p, i) => (
          <G key={i}>
            <Path d={p.d} fill={p.c} opacity={0.85} />
            <SvgText
              x={p.tx} y={p.ty}
              textAnchor="middle"
              fill="#fff"
              fontSize={10}
              fontWeight="800"
            >
              {p.label}
            </SvgText>
          </G>
        ))}
        <Circle cx={CX} cy={CY} r={18} fill={C.s1} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
        <SvgText x={CX} y={CY + 4} textAnchor="middle" fill="#fff" fontSize={13}>🎯</SvgText>
      </Svg>
    </Animated.View>
  );
}

export default function EarnScreen() {
  const { user, updateUser } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(user?.spinsLeft ?? 1);
  const [lastWin, setLastWin] = useState<number | null>(null);

  // Sync spinsLeft when user loads from storage or server
  useEffect(() => {
    if (user?.spinsLeft != null) setSpinsLeft(user.spinsLeft);
  }, [user?.spinsLeft]);
  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  const spin = () => {
    if (spinning || spinsLeft <= 0) {
      if (spinsLeft <= 0) Alert.alert('No spins left', 'Come back later or watch an ad for a free spin!');
      return;
    }

    const winIndex = Math.floor(Math.random() * SPIN_PTS.length);
    const winPts = SPIN_PTS[winIndex];

    const segDeg = 360 / SEGS.length;
    const extraSpins = 5 * 360;
    const targetAngle = currentRotation.current + extraSpins + (360 - winIndex * segDeg - segDeg / 2);

    setSpinning(true);
    setLastWin(null);

    Animated.timing(rotation, {
      toValue: targetAngle,
      duration: 3800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current = targetAngle % 360;
      setSpinning(false);
      setLastWin(winPts);
      const newSpins = spinsLeft - 1;
      setSpinsLeft(newSpins);
      const newPts = (user?.pts ?? 0) + winPts;
      updateUser({ pts: newPts, spinsLeft: newSpins });
      try {
        fetch(`${API_BASE}/api/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user?.id, email: user?.email, pts: newPts, spinsLeft: newSpins }),
        });
      } catch {}
      Alert.alert('🎉 You Won!', `+${winPts.toLocaleString()} points added!`);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Wish Network</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 22, marginRight: 8 }}>🎡</Text>
            <Text style={styles.cardTitle}>Spin Now</Text>
            <View style={styles.spinsBadge}>
              <Text style={{ color: C.white, fontSize: 12, fontWeight: '700' }}>
                {spinsLeft} spin{spinsLeft !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <Text style={[styles.subGreen, { marginBottom: 2 }]}>
            {spinsLeft > 0 ? 'Free spin ready!' : 'No spins left'}
          </Text>
          <Text style={styles.sub}>Win 500 – 20,000 pts per spin!</Text>

          {/* Pointer */}
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: -8, zIndex: 2 }}>
            <View style={styles.pointer} />
          </View>

          {/* Wheel */}
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <SpinWheelSvg rotation={rotation} />
          </View>

          {lastWin !== null && (
            <View style={styles.winBadge}>
              <Text style={{ color: C.gold, fontWeight: '800', fontSize: 15 }}>
                🎉 You won {lastWin.toLocaleString()} pts!
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.spinBtn, { opacity: spinning || spinsLeft <= 0 ? 0.6 : 1 }]}
            onPress={spin}
            disabled={spinning}
          >
            <Text style={styles.spinBtnText}>{spinning ? 'Spinning…' : 'Spin Now!'}</Text>
          </TouchableOpacity>
        </View>

        {/* Earn More Spins */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Earn More Spins</Text>
          <Text style={styles.sub}>Complete tasks and watch ads to earn more spin chances</Text>

          <TouchableOpacity style={[styles.earnRow, { marginTop: 12 }]}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>📺</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontWeight: '600' }}>Watch Ad</Text>
              <Text style={styles.sub}>Earn 1 free spin</Text>
            </View>
            <View style={styles.rewardBadge}>
              <Text style={{ color: C.gold, fontWeight: '700', fontSize: 12 }}>+1 SPIN</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.brand },
  card: {
    backgroundColor: C.s2, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { color: C.white, fontWeight: '800', fontSize: 17, flex: 1 },
  sub: { color: C.muted, fontSize: 12 },
  subGreen: { color: C.green, fontSize: 13, fontWeight: '600' },
  spinsBadge: {
    backgroundColor: C.s3, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border2,
  },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 20,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: C.gold,
  },
  spinBtn: {
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16,
    backgroundColor: C.gold,
  },
  spinBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },
  winBadge: {
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginTop: 8,
  },
  earnRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  rewardBadge: {
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
});