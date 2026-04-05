import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS as C, API_BASE, PTS_PER_TOKEN } from '../../constants';

export default function ConvertScreen() {
  const { user, updateUser } = useAuth();
  const [ptsInput, setPtsInput] = useState('');
  const [converting, setConverting] = useState(false);

  const pts = user?.pts ?? 0;
  const tokens = user?.tokens ?? 0;
  const inputPts = parseInt(ptsInput) || 0;
  const willReceive = Math.floor(inputPts / PTS_PER_TOKEN);
  const hasEnough = inputPts >= PTS_PER_TOKEN && inputPts <= pts;
  const progressPts = pts % PTS_PER_TOKEN;
  const progressPct = (progressPts / PTS_PER_TOKEN) * 100;

  const convert = async () => {
    if (!hasEnough) return;
    setConverting(true);
    const ptsToSpend = willReceive * PTS_PER_TOKEN;
    const newPts = pts - ptsToSpend;
    const newTokens = tokens + willReceive;
    updateUser({ pts: newPts, tokens: newTokens });
    setPtsInput('');
    try {
      await fetch(`${API_BASE}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user?.id, email: user?.email, pts: newPts, tokens: newTokens }),
      });
    } catch {}
    setConverting(false);
    Alert.alert('✅ Converted!', `+${willReceive} Wish Token${willReceive > 1 ? 's' : ''} added to your wallet!`);
  };

  const setMax = () => {
    const maxConvertable = Math.floor(pts / PTS_PER_TOKEN) * PTS_PER_TOKEN;
    setPtsInput(String(maxConvertable));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Wish Network</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Token Balance Card */}
        <View style={styles.tokenCard}>
          <View style={styles.tokenLogoCircle}>
            <Text style={{ fontSize: 36 }}>🦅</Text>
          </View>
          <Text style={styles.tokenLabel}>TOTAL WISH TOKENS</Text>
          <Text style={styles.tokenValue}>{tokens.toLocaleString()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 14 }}>🦅</Text>
            <Text style={styles.tokenSub}>Wish Tokens in your vault</Text>
          </View>
        </View>

        {/* Swap Card */}
        <View style={styles.swapCard}>
          {/* Spend */}
          <View style={styles.swapSide}>
            <Text style={styles.swapLabel}>YOU SPEND</Text>
            <TextInput
              value={ptsInput}
              onChangeText={setPtsInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
              style={styles.swapInput}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Text style={{ fontSize: 14 }}>⭐</Text>
              <Text style={styles.swapCurrency}>Points</Text>
            </View>
            <TouchableOpacity onPress={setMax} style={styles.maxBtn}>
              <Text style={{ color: C.brand, fontSize: 11, fontWeight: '700' }}>MAX</Text>
            </TouchableOpacity>
          </View>

          {/* Arrow */}
          <View style={styles.swapArrow}>
            <Text style={{ fontSize: 18, color: C.white }}>→</Text>
          </View>

          {/* Receive */}
          <View style={[styles.swapSide, { borderColor: C.gold + '40', borderWidth: 1 }]}>
            <Text style={[styles.swapLabel, { color: C.gold }]}>YOU RECEIVE</Text>
            <Text style={[styles.swapInput, { color: C.gold }]}>{willReceive}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Text style={{ fontSize: 14 }}>🦅</Text>
              <Text style={[styles.swapCurrency, { color: C.gold }]}>Tokens</Text>
            </View>
          </View>
        </View>

        {/* Rate */}
        <View style={styles.rateRow}>
          <Text style={{ fontSize: 14 }}>🦅</Text>
          <Text style={styles.rateTxt}>1,000 pts = 1 Wish Token</Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.progressLbl}>Progress to next token</Text>
          <Text style={[styles.progressLbl, { color: C.brand }]}>
            {progressPts.toLocaleString()} / {PTS_PER_TOKEN.toLocaleString()} pts
          </Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${progressPct}%` }]} />
        </View>

        {/* Convert Button */}
        <TouchableOpacity
          style={[styles.convertBtn, { opacity: hasEnough && !converting ? 1 : 0.5, marginTop: 20 }]}
          onPress={convert}
          disabled={!hasEnough || converting}
        >
          <Text style={styles.convertBtnText}>
            {!ptsInput
              ? 'Enter points amount'
              : !hasEnough
              ? 'Not enough points'
              : converting
              ? 'Converting…'
              : `Convert ${willReceive} Token${willReceive !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>

        {/* Balance Card */}
        <View style={styles.balCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
            <Text style={{ color: C.white, fontWeight: '700' }}>Your Points Balance</Text>
          </View>
          <Text style={{ color: C.gold, fontWeight: '800', fontSize: 20, marginTop: 8 }}>
            {pts.toLocaleString()} pts
          </Text>
          <Text style={styles.balSub}>= {Math.floor(pts / PTS_PER_TOKEN)} convertible tokens</Text>
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
  tokenCard: {
    backgroundColor: C.s2, borderRadius: 20, padding: 20, marginBottom: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  tokenLogoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 2, borderColor: C.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  tokenLabel: {
    color: C.muted, fontSize: 11, letterSpacing: 1.5,
    fontWeight: '700', textTransform: 'uppercase',
  },
  tokenValue: { color: C.gold, fontSize: 52, fontWeight: '900', marginTop: 4 },
  tokenSub: { color: C.muted, fontSize: 13 },
  swapCard: {
    backgroundColor: C.s2, borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  swapSide: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  swapLabel: {
    fontSize: 10, fontWeight: '700', color: C.muted,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  swapInput: { fontSize: 28, fontWeight: '900', color: C.white, marginTop: 4 },
  swapCurrency: { fontSize: 13, color: C.muted, fontWeight: '600' },
  maxBtn: {
    marginTop: 8, backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border2,
  },
  swapArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
  },
  rateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  rateTxt: { color: C.muted, fontSize: 12, fontWeight: '600' },
  progressLbl: { fontSize: 12, color: C.muted },
  bar: {
    height: 8, backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 4,
  },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: C.brand },
  convertBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: C.brand,
  },
  convertBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },
  balCard: {
    marginTop: 14, backgroundColor: C.s2, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  balSub: { color: C.muted, fontSize: 12, marginTop: 4 },
});