import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Alert, Modal, Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { COLORS as C, API_BASE, MINE_SESSION_S, MINE_PTS_HOUR, MINE_BOOST_PTS, MINE_MAX_BOOST } from '../../constants';

type MenuScreen = 'profile' | 'leaderboard' | 'referral' | 'announcements' | 'whitepaper' | 'security' | null;

export default function HomeScreen() {
  const { user, updateUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<MenuScreen>(null);
  const [mineActive, setMineActive] = useState(false);
  const [mineStart, setMineStart] = useState<number | null>(user?.mineStart || null);
  const [earnedSoFar, setEarnedSoFar] = useState(0);
  const [boostsLeft, setBoostsLeft] = useState(user?.boostsLeft ?? MINE_MAX_BOOST);
  const [mineComplete, setMineComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  const pts = user?.pts ?? 0;
  const tokens = user?.tokens ?? 0;
  const spinsLeft = user?.spinsLeft ?? 1;

  // Sync local state when user loads from storage or server
  useEffect(() => {
    setMineStart(user?.mineStart ?? null);
  }, [user?.mineStart]);

  useEffect(() => {
    if (user?.boostsLeft != null) setBoostsLeft(user.boostsLeft);
  }, [user?.boostsLeft]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!mineActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mineActive]);

  useEffect(() => {
    if (!mineStart) return;
    const iv = setInterval(() => {
      const elapsed = (Date.now() / 1000) - mineStart;
      const progress = Math.min(elapsed / MINE_SESSION_S, 1);
      const earned = Math.floor(progress * MINE_PTS_HOUR * 4);
      setEarnedSoFar(earned);
      if (elapsed >= MINE_SESSION_S) {
        setMineActive(false);
        setMineComplete(true);
        setTimeLeft('Complete!');
        clearInterval(iv);
      } else {
        setMineActive(true);
        setMineComplete(false);
        const remaining = MINE_SESSION_S - elapsed;
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = Math.floor(remaining % 60);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [mineStart]);

  const openScreen = async (screen: MenuScreen) => {
    setMenuOpen(false);
    setActiveScreen(screen);
    if (screen === 'announcements') {
      try {
        const r = await fetch(`${API_BASE}/api/announcements`);
        const d = await r.json();
        setAnnouncements(d.announcements || []);
      } catch {}
    }
    if (screen === 'leaderboard') {
      try {
        const r = await fetch(`${API_BASE}/api/leaderboard`);
        const d = await r.json();
        setLeaderboard(d.users || d.leaderboard || []);
      } catch {}
    }
    if (screen === 'referral') {
      try {
        const r = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(user?.email || '')}`);
        const d = await r.json();
        setReferrals(d.user?.refs || []);
      } catch {}
    }
  };

  const startMining = () => {
    const now = Date.now() / 1000;
    setMineStart(now);
    setMineActive(true);
    setMineComplete(false);
    setBoostsLeft(MINE_MAX_BOOST);
    setEarnedSoFar(0);
    updateUser({ mineStart: now, boostsLeft: MINE_MAX_BOOST });
    if (user) {
      fetch(`${API_BASE}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, email: user.email, mineStart: now }),
      }).catch(() => {});
    }
  };

  const claimMining = async () => {
    if (!user) return;
    const newPts = pts + earnedSoFar;
    updateUser({ pts: newPts, mineStart: undefined });
    setMineStart(null);
    setMineActive(false);
    setMineComplete(false);
    setEarnedSoFar(0);
    try {
      await fetch(`${API_BASE}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, email: user.email, pts: newPts, mineStart: null }),
      });
    } catch {}
    Alert.alert('🎉 Claimed!', `+${earnedSoFar.toLocaleString()} pts added!`);
  };

  const boostMining = () => {
    if (boostsLeft <= 0) { Alert.alert('No boosts left', 'Max 5 boosts per session.'); return; }
    Alert.alert('Watch Ad', 'Watch an ad to boost your mining?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Watch', onPress: () => {
          const newBoosts = boostsLeft - 1;
          setBoostsLeft(newBoosts);
          setEarnedSoFar(e => e + MINE_BOOST_PTS);
          updateUser({ boostsLeft: newBoosts });
        }
      },
    ]);
  };

  const menuItems = [
    { iconName: 'person-outline', label: 'Profile', screen: 'profile' as MenuScreen },
    { iconName: 'trophy-outline', label: 'Leader Board', screen: 'leaderboard' as MenuScreen },
    { iconName: 'people-outline', label: 'Referral Team', screen: 'referral' as MenuScreen },
    { iconName: 'notifications-outline', label: 'Announcement', screen: 'announcements' as MenuScreen },
    { iconName: 'document-text-outline', label: 'White Paper', screen: 'whitepaper' as MenuScreen },
    { iconName: 'help-circle-outline', label: 'Support Portal', screen: null, badge: 'SOON' },
    { iconName: 'shield-checkmark-outline', label: 'Security', screen: 'security' as MenuScreen },
  ];

  /* ── White Paper ── */
  if (activeScreen === 'whitepaper') {
    const whitepaperHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Wish Coin White Paper</title><style>:root{--gold:#F5C842;--purple:#7C3AED;--purple-light:#A855F7;--blue-neon:#38BDF8;--surface2:#141729;--border:rgba(124,58,237,0.18);--text:#D8D5EE;--muted:#696C88;}*{margin:0;padding:0;box-sizing:border-box;}body{background:#08090F;color:var(--text);font-family:system-ui,sans-serif;font-size:15px;line-height:1.78;padding:20px;}h1{font-size:28px;font-weight:900;background:linear-gradient(135deg,#F5C842,#A855F7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;}h2{font-size:20px;font-weight:700;color:#A855F7;margin:28px 0 10px;}h3{font-size:16px;font-weight:600;color:#F5C842;margin:16px 0 8px;}p{color:var(--text);margin-bottom:14px;}.tag{font-size:11px;color:#38BDF8;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}.hero{text-align:center;padding:30px 0 20px;border-bottom:1px solid var(--border);margin-bottom:24px;}.stats{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;}.stat{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px 16px;flex:1;min-width:120px;text-align:center;}.stat .v{font-size:18px;font-weight:800;color:#F5C842;}.stat .l{font-size:11px;color:var(--muted);margin-top:4px;}.card{background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;margin:10px 0;}.section{margin-bottom:32px;}.badge{display:inline-block;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);border-radius:20px;padding:4px 14px;font-size:12px;color:#A855F7;margin-bottom:20px;}.trow{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);}.trow:last-child{border:none;}.tval{color:#F5C842;font-weight:700;}</style></head><body><div class="hero"><div class="tag">Official Document</div><h1>Wish Coin</h1><div class="tag">$WISH · White Paper · Version 1.0</div><div class="badge">For Informational Purposes Only</div><div class="stats"><div class="stat"><div class="v">$WISH</div><div class="l">Ticker</div></div><div class="stat"><div class="v">950M</div><div class="l">Total Supply</div></div><div class="stat"><div class="v">Q4 2027</div><div class="l">Mining End</div></div><div class="stat"><div class="v">TBA</div><div class="l">Contract</div></div></div></div><div class="section"><div class="tag">01 · Introduction</div><h2>What Is Wish Coin?</h2><p>Wish Coin (<strong style="color:#A855F7">$WISH</strong>) is a community-driven digital currency designed to democratize access to cryptocurrency through mobile mining.</p><p>With a fixed total supply of <strong style="color:#F5C842">950,000,000 $WISH</strong>, the tokenomics are designed to balance accessibility during the mining phase with scarcity as the ecosystem matures.</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;"><div class="card" style="flex:1;min-width:140px;"><h3>🌐 Accessible</h3><p style="font-size:13px;">Mine $WISH directly from your smartphone.</p></div><div class="card" style="flex:1;min-width:140px;"><h3>🔒 Secure</h3><p style="font-size:13px;">Full on-chain deployment planned at contract launch.</p></div><div class="card" style="flex:1;min-width:140px;"><h3>⚡ Scarce</h3><p style="font-size:13px;">Hard cap of 950 million tokens ensures long-term value.</p></div><div class="card" style="flex:1;min-width:140px;"><h3>🤝 Community</h3><p style="font-size:13px;">Invite, grow, and earn together.</p></div></div></div><div class="section"><div class="tag">02 · Mission</div><h2>Built for the Billion</h2><p>Our mission is to put a mining-accessible cryptocurrency in the hands of millions.</p><div class="card"><h3>Decentralization</h3><p style="font-size:13px;">Power distributed across thousands of miners.</p></div><div class="card"><h3>Transparency</h3><p style="font-size:13px;">All token allocations and governance decisions are publicly documented.</p></div><div class="card"><h3>Inclusion</h3><p style="font-size:13px;">If you have a phone and internet, you can participate.</p></div></div><div class="section"><div class="tag">03 · Tokenomics</div><h2>Token Distribution</h2><div class="card"><div class="trow"><span>Community Mining</span><span class="tval">50% — 475M</span></div><div class="trow"><span>Ecosystem & Rewards</span><span class="tval">20% — 190M</span></div><div class="trow"><span>Team & Advisors</span><span class="tval">15% — 142.5M</span></div><div class="trow"><span>Reserve Fund</span><span class="tval">10% — 95M</span></div><div class="trow"><span>Liquidity Pool</span><span class="tval">5% — 47.5M</span></div></div></div><div class="section"><div class="tag">04 · Mining Model</div><h2>How Mining Works</h2><div class="card"><div class="trow"><span>Session Duration</span><span class="tval">4 Hours</span></div><div class="trow"><span>Points Per Hour</span><span class="tval">2,000 pts</span></div><div class="trow"><span>Max Per Session</span><span class="tval">8,000 pts</span></div><div class="trow"><span>Conversion Rate</span><span class="tval">1,000 pts = 1 WISH</span></div><div class="trow"><span>Daily Boosts</span><span class="tval">Up to 5x</span></div></div></div><div class="section"><div class="tag">05 · Roadmap</div><h2>Development Timeline</h2><div class="card"><h3>Phase 1 — Launch (2025)</h3><p style="font-size:13px;">App launch, community building, mobile mining activation.</p></div><div class="card"><h3>Phase 2 — Growth (2026)</h3><p style="font-size:13px;">Exchange listings, wallet integrations, expanded ecosystem.</p></div><div class="card"><h3>Phase 3 — Maturity (2027)</h3><p style="font-size:13px;">Smart contract deployment, on-chain token launch, DAO governance.</p></div></div><div class="section"><div class="tag">06 · Legal</div><h2>Disclaimer</h2><p>This white paper is for informational purposes only and does not constitute financial advice. © 2025 Wish Coin. All Rights Reserved.</p></div></body></html>`;

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.brand} />
            <Text style={{ color: C.brand, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>White Paper</Text>
          <View style={{ width: 70 }} />
        </View>
        <WebView source={{ html: whitepaperHTML }} style={{ flex: 1, backgroundColor: '#08090F' }} />
      </View>
    );
  }

  /* ── Announcements ── */
  if (activeScreen === 'announcements') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.brand} />
            <Text style={{ color: C.brand, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Announcements</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {announcements.length === 0
            ? <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No announcements yet</Text>
            : announcements.map((a: any) => (
              <View key={a.id} style={styles.annCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={styles.annIconBox}>
                    <Ionicons name="megaphone-outline" size={18} color={C.cyan} />
                  </View>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, flex: 1, marginLeft: 10 }}>{a.title}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>{a.body}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                  {new Date(a.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            ))
          }
        </ScrollView>
      </View>
    );
  }

  /* ── Leaderboard ── */
  if (activeScreen === 'leaderboard') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.brand} />
            <Text style={{ color: C.brand, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Leader Board</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {leaderboard.length === 0
            ? <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="trophy-outline" size={48} color={C.muted} />
                <Text style={{ color: C.muted, marginTop: 12 }}>Loading leaderboard...</Text>
              </View>
            : leaderboard.map((u: any, i: number) => (
              <View key={u.id || i} style={[styles.lbRow, i < 3 && { borderColor: ['#FFD700', '#C0C0C0', '#CD7F32'][i] }]}>
                <Text style={[styles.lbRank, { color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : C.muted }]}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </Text>
                <View style={styles.lbAvatar}>
                  <Text style={{ color: C.white, fontWeight: '800' }}>{(u.name || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: C.white, fontWeight: '700' }}>{u.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{u.country || '🌍'}</Text>
                </View>
                <Text style={{ color: C.gold, fontWeight: '800' }}>{(u.pts || 0).toLocaleString()} pts</Text>
              </View>
            ))
          }
        </ScrollView>
      </View>
    );
  }

  /* ── Referral ── */
  if (activeScreen === 'referral') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.brand} />
            <Text style={{ color: C.brand, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Referral Team</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.refCard}>
            <Ionicons name="gift-outline" size={32} color={C.gold} style={{ marginBottom: 8 }} />
            <Text style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Your Referral Code</Text>
            <Text style={{ color: C.gold, fontWeight: '900', fontSize: 28, marginTop: 6 }}>{user?.refCode || 'N/A'}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 6, textAlign: 'center' }}>Share this code to earn 2,000 pts per referral</Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Your Team ({referrals.length})
          </Text>
          {referrals.length === 0
            ? <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Ionicons name="people-outline" size={48} color={C.muted} />
                <Text style={{ color: C.muted, marginTop: 12 }}>No referrals yet. Share your code!</Text>
              </View>
            : referrals.map((r: any, i: number) => (
              <View key={i} style={styles.refRow}>
                <View style={styles.lbAvatar}>
                  <Text style={{ color: C.white, fontWeight: '800' }}>{(r.name || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: C.white, fontWeight: '600' }}>{r.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>Joined {r.joined}</Text>
                </View>
                <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>+2,000 pts</Text>
              </View>
            ))
          }
        </ScrollView>
      </View>
    );
  }

  /* ── Profile ── */
  if (activeScreen === 'profile') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.brand} />
            <Text style={{ color: C.brand, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>My Profile</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.profileBigCard}>
            <View style={styles.profileBigAvatar}>
              <Text style={{ fontSize: 40, fontWeight: '900', color: C.white }}>
                {(user?.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: C.white, fontWeight: '900', fontSize: 22, marginTop: 12 }}>{user?.name}</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{user?.email}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={styles.verBadge}><Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>✓✓ Verified</Text></View>
              <View style={styles.roleBadge}><Text style={{ color: C.brand, fontSize: 12, fontWeight: '700' }}>{user?.role || 'user'}</Text></View>
            </View>
          </View>
          {[
            { label: 'Full Name', value: user?.name, icon: 'person-outline' },
            { label: 'Email', value: user?.email, icon: 'mail-outline' },
            { label: 'Phone', value: user?.phone || 'Not set', icon: 'call-outline' },
            { label: 'Country', value: user?.country || '🌍', icon: 'globe-outline' },
            { label: 'Member Since', value: user?.joined || 'Mar 2026', icon: 'calendar-outline' },
            { label: 'Referral Code', value: user?.refCode || 'N/A', icon: 'gift-outline' },
            { label: 'Total Points', value: (user?.pts || 0).toLocaleString(), icon: 'star-outline' },
            { label: 'Wish Tokens', value: (user?.tokens || 0).toLocaleString(), icon: 'diamond-outline' },
          ].map((item, i) => (
            <View key={i} style={styles.profileRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={item.icon as any} size={16} color={C.brand} />
                <Text style={{ color: C.muted, fontSize: 13 }}>{item.label}</Text>
              </View>
              <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>{item.value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* ── Security ── */
  if (activeScreen === 'security') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setActiveScreen(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={C.brand} />
            <Text style={{ color: C.brand, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Security</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.secCard}>
            <Ionicons name="lock-closed-outline" size={36} color={C.brand} style={{ marginBottom: 12 }} />
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Account Security</Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
              Your account is secured with email verification. PIN and biometric authentication coming soon.
            </Text>
          </View>
          <View style={[styles.secCard, { marginTop: 12 }]}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 15, marginBottom: 14 }}>Security Tips</Text>
            {[
              { tip: 'Never share your password', icon: 'key-outline' },
              { tip: 'Use a strong unique password', icon: 'lock-closed-outline' },
              { tip: 'Enable 2FA when available', icon: 'shield-checkmark-outline' },
              { tip: 'Log out from shared devices', icon: 'log-out-outline' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name={item.icon as any} size={16} color={C.green} style={{ marginRight: 10 }} />
                <Text style={{ color: C.muted, fontSize: 13 }}>{item.tip}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ── Main Home Screen ── */
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ambientGlow, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }) }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
          {[0, 1, 2].map(i => <View key={i} style={[styles.menuLine, i === 1 && { width: 16 }]} />)}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wish Network</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileGlow} />
          <View style={styles.avatar}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: C.white }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Ionicons name="globe-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.profileSub}>· {user?.joined || 'Mar 2026'}</Text>
            </View>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-done" size={12} color={C.green} />
            <Text style={{ fontSize: 11, color: C.green, fontWeight: '700', marginLeft: 4 }}>Verified</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard icon="star" value={pts.toLocaleString()} label="Total Points" color={C.gold} glowColor="rgba(245,158,11,0.3)" />
          <StatCard logo value={tokens.toLocaleString()} label="Tokens" color={C.brand} glowColor="rgba(139,92,246,0.3)" />
          <StatCard icon="disc" value={String(spinsLeft)} label="Spins Left" color={C.cyan} glowColor="rgba(6,182,212,0.3)" />
        </View>

        {/* Mining Card */}
        <View style={styles.card}>
          <View style={styles.cardGlowTop} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={styles.mineIconBox}>
              <MaterialCommunityIcons name="pickaxe" size={24} color={C.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Start Mining</Text>
              <Text style={styles.cardSub}>2,000 pts/hr · 4 hr session</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <View style={[styles.miniCard, { flex: 1 }]}>
              <Text style={styles.miniLabel}>Earned So Far</Text>
              <Text style={[styles.miniValue, { color: C.brand }]}>{earnedSoFar.toLocaleString()} pts</Text>
            </View>
            <View style={[styles.miniCard, { flex: 1, borderColor: 'rgba(245,158,11,0.2)' }]}>
              <Text style={styles.miniLabel}>Boosts Left</Text>
              <Text style={[styles.miniValue, { color: C.gold }]}>{boostsLeft}/{MINE_MAX_BOOST}</Text>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>this session</Text>
            </View>
          </View>

          {mineActive && (
            <Animated.View style={[styles.activeBox, { transform: [{ scale: pulseAnim }] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="pickaxe" size={16} color={C.green} />
                <Text style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>Mining Active — {timeLeft} remaining</Text>
              </View>
            </Animated.View>
          )}

          {mineComplete && (
            <>
              <View style={styles.completeBox}>
                <Ionicons name="checkmark-circle" size={24} color={C.green} style={{ marginBottom: 6 }} />
                <Text style={{ color: C.green, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>Mining Complete!</Text>
                <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  +{earnedSoFar.toLocaleString()} pts ready to claim
                </Text>
              </View>
              <TouchableOpacity style={styles.claimBtn} onPress={claimMining}>
                <Ionicons name="download-outline" size={18} color={C.white} style={{ marginRight: 8 }} />
                <Text style={styles.claimBtnText}>Claim {earnedSoFar.toLocaleString()} pts</Text>
              </TouchableOpacity>
            </>
          )}

          {!mineActive && !mineComplete && (
            <TouchableOpacity style={styles.startBtn} onPress={startMining}>
              <MaterialCommunityIcons name="pickaxe" size={18} color={C.white} style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>Start Mining</Text>
            </TouchableOpacity>
          )}

          {(mineActive || mineComplete) && (
            <TouchableOpacity style={styles.boostBtn} onPress={boostMining}>
              <Ionicons name="flash" size={16} color={C.gold} style={{ marginRight: 6 }} />
              <Text style={styles.boostBtnText}>Boost Mining {boostsLeft}/{MINE_MAX_BOOST}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Slide-out Menu */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setMenuOpen(false)} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} style={styles.drawer}>
            <View style={styles.drawerGlow} />

            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Wish Network</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerUser}>
              <View style={styles.drawerAvatar}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>
                  {(user?.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>{user?.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuItem} onPress={() => item.screen ? openScreen(item.screen) : null}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.iconName as any} size={18} color={C.brandLt} />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
                {item.badge
                  ? <View style={styles.soonBadge}><Text style={{ fontSize: 10, color: C.brand, fontWeight: '700' }}>{item.badge}</Text></View>
                  : <Ionicons name="chevron-forward" size={16} color={C.muted} />
                }
              </TouchableOpacity>
            ))}

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                setMenuOpen(false);
                Alert.alert('Logout', 'Are you sure you want to logout?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Yes, Logout', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={C.gold} style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function StatCard({ icon, logo, value, label, color, glowColor }: any) {
  return (
    <View style={[styles.statCard, { borderColor: glowColor, shadowColor: color, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }]}>
      <View style={[styles.statGlow, { backgroundColor: glowColor }]} />
      {logo
        ? <Image source={require('../../assets/logo.png')} style={{ width: 28, height: 28, marginBottom: 6 }} resizeMode="contain" />
        : <Ionicons name={icon} size={24} color={color} style={{ marginBottom: 6 }} />
      }
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  ambientGlow: {
    position: 'absolute', top: -100, left: '50%', marginLeft: -150,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.2)',
    shadowColor: C.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.brand },
  menuBtn: { padding: 4, gap: 5 },
  menuLine: { width: 22, height: 2, backgroundColor: C.white, borderRadius: 1 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 20, padding: 18, overflow: 'hidden',
    backgroundColor: C.brand,
    shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  profileGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  profileName: { color: C.white, fontWeight: '900', fontSize: 18 },
  profileSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: C.s2, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, overflow: 'hidden',
  },
  statGlow: {
    position: 'absolute', top: -20, left: '50%', marginLeft: -30,
    width: 60, height: 60, borderRadius: 30, opacity: 0.3,
  },
  statValue: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: C.s2, borderRadius: 20, marginHorizontal: 16, marginBottom: 14,
    padding: 18, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', overflow: 'hidden',
    shadowColor: C.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  cardGlowTop: {
    position: 'absolute', top: -40, right: -20,
    width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(139,92,246,0.1)',
  },
  mineIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: C.white, fontWeight: '800', fontSize: 17 },
  cardSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  miniCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  miniLabel: { fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: '600' },
  miniValue: { fontSize: 20, fontWeight: '900' },
  activeBox: {
    borderRadius: 12, padding: 14, marginBottom: 10,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    alignItems: 'center',
  },
  completeBox: {
    borderRadius: 12, padding: 14, marginBottom: 10,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
    alignItems: 'center',
  },
  startBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: C.brand,
    flexDirection: 'row', justifyContent: 'center',
    shadowColor: C.brand, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
  },
  startBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },
  claimBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: C.green,
    flexDirection: 'row', justifyContent: 'center',
    shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10,
  },
  claimBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },
  boostBtn: {
    marginTop: 10, borderRadius: 14, padding: 14, alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    flexDirection: 'row', justifyContent: 'center',
  },
  boostBtnText: { color: C.gold, fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 300,
    backgroundColor: C.s1, paddingTop: 52, overflow: 'hidden',
    borderRightWidth: 1, borderRightColor: 'rgba(139,92,246,0.2)',
    shadowColor: C.brand, shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  drawerGlow: {
    position: 'absolute', top: -50, left: -50,
    width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(139,92,246,0.08)',
  },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20,
  },
  drawerTitle: { fontSize: 18, fontWeight: '900', color: C.brand },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  drawerUser: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, borderRadius: 14, padding: 14,
    backgroundColor: 'rgba(139,92,246,0.06)', marginBottom: 8,
  },
  drawerAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  divider: { height: 1, backgroundColor: 'rgba(139,92,246,0.15)', marginVertical: 10, marginHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuItemText: { color: C.white, flex: 1, fontSize: 14, fontWeight: '600' },
  soonBadge: {
    backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.border2,
  },
  logoutBtn: {
    margin: 16, borderRadius: 14, padding: 15,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center', marginBottom: 40, flexDirection: 'row', justifyContent: 'center',
  },
  logoutText: { fontSize: 15, color: C.gold, fontWeight: '800' },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.2)',
  },
  subHeaderTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  annCard: {
    backgroundColor: C.s2, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)', borderLeftWidth: 3, borderLeftColor: C.cyan,
  },
  annIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.1)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  lbRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.s2, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  lbRank: { fontSize: 18, fontWeight: '800', width: 40, textAlign: 'center' },
  lbAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  refCard: {
    backgroundColor: C.s2, borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', alignItems: 'center',
  },
  refRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.s2, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  profileBigCard: {
    backgroundColor: C.s2, borderRadius: 20, padding: 24, marginBottom: 16,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  profileBigAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  verBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  roleBadge: {
    backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.border2,
  },
  profileRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.s2, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  secCard: {
    backgroundColor: C.s2, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
});