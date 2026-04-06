import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { COLORS as C, API_BASE } from '../../constants';
import { Image } from 'react-native';

export default function WalletScreen() {
  const { user, updateUser } = useAuth();
  const [screen, setScreen] = useState<'main' | 'send' | 'receive'>('main');
  const [wallet, setWallet] = useState<string | null>(user?.walletAddress || null);
  const [wishBal, setWishBal] = useState<number>(user?.tokens ?? 0);
  const [solBal, setSolBal] = useState<number | null>(null);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'assets' | 'activity'>('assets');
  const [creating, setCreating] = useState(false);
  const [balLoad, setBalLoad] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Send form
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');

  useEffect(() => {
    if (!user) return;
    loadTx();
    if (user?.walletAddress) {
      setWallet(user.walletAddress);
      loadBalances(user.walletAddress);
      return;
    }
    setCreating(true);
    fetch(`${API_BASE}/api/wallet?userId=${encodeURIComponent(user?.id || '')}`)
      .then(r => r.json())
      .then(d => {
        if (d.address) {
          setWallet(d.address);
          updateUser({ walletAddress: d.address });
          loadBalances(d.address);
        } else {
          setMsg(d.error || 'Could not create wallet');
        }
      })
      .catch(e => setMsg('Network error: ' + e.message))
      .finally(() => setCreating(false));
  }, []);

  const loadBalances = async (addr: string) => {
    setBalLoad(true);
    try {
      const r = await fetch(`${API_BASE}/api/walletBalance?address=${encodeURIComponent(addr)}`);
      const d = await r.json();
      if (!d.error) {
        setSolBal(d.sol);
        if (d.mintConfigured) {
          setWishBal(d.wish);
        } else {
          try {
            const ur = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(user?.email || '')}`);
            const ud = await ur.json();
            const fresh = ud.user?.tokens ?? user?.tokens ?? 0;
            setWishBal(fresh);
          } catch { setWishBal(user?.tokens ?? 0); }
        }
      }
    } catch {}
    finally { setBalLoad(false); }
  };

  const loadTx = () => {
    fetch(`${API_BASE}/api/walletTx?userId=${encodeURIComponent(user?.id || '')}`)
      .then(r => r.json())
      .then(d => { if (d.txs) setTxHistory(d.txs); })
      .catch(() => {});
  };

  const copyAddr = async () => {
    if (!wallet) return;
    await Clipboard.setStringAsync(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async () => {
    if (busy || !wallet || !sendTo.trim() || !sendAmt) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${API_BASE}/api/walletSend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, toAddress: sendTo.trim(), amount: Number(sendAmt) }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setWishBal(d.newBalance);
      updateUser({ tokens: d.newBalance });
      setMsg('✅ Sent successfully!');
      setSendTo(''); setSendAmt('');
      loadTx();
      setTimeout(() => { setMsg(''); setScreen('main'); }, 1800);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Send failed'));
    } finally { setBusy(false); }
  };

  // Loading
  if (!wallet && creating) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>🪙</Text>
        <Text style={{ color: C.white, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>Setting up your wallet…</Text>
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  // Send Screen
  if (screen === 'send') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setScreen('main'); setMsg(''); }} style={styles.backBtn}>
            <Text style={{ color: C.brand, fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Wish Coins</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Balance */}
          <View style={styles.balBadge}>
            <Text style={{ color: C.muted, fontSize: 12 }}>Available balance</Text>
            <Text style={{ color: C.gold, fontWeight: '800', fontSize: 18 }}>{wishBal} WISH</Text>
          </View>

          {/* Recipient */}
          <Text style={styles.inputLabel}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            value={sendTo}
            onChangeText={setSendTo}
            placeholder="Enter wallet address"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Amount */}
          <Text style={styles.inputLabel}>Amount (WISH)</Text>
          <TextInput
            style={styles.input}
            value={sendAmt}
            onChangeText={setSendAmt}
            placeholder="0"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
          />
          <TouchableOpacity onPress={() => setSendAmt(String(wishBal))} style={styles.maxBtn}>
            <Text style={{ color: C.brand, fontSize: 12, fontWeight: '700' }}>MAX</Text>
          </TouchableOpacity>

          {!!msg && (
            <Text style={{ color: msg.startsWith('✅') ? C.green : C.red, textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
              {msg}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.sendBtn, { opacity: busy || !sendTo || !sendAmt ? 0.6 : 1 }]}
            onPress={send}
            disabled={busy || !sendTo || !sendAmt}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>↑ Send Now</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Receive Screen
  if (screen === 'receive') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('main')} style={styles.backBtn}>
            <Text style={{ color: C.brand, fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive Wish Coins</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            Share your wallet address to receive Wish Coins
          </Text>

          {/* QR Code using a QR API */}
          <View style={styles.qrBox}>
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet}&bgcolor=191534&color=a78bfa&margin=10` }}
              style={{ width: 200, height: 200, borderRadius: 12 }}
            />
          </View>

          {/* Address */}
          <View style={styles.addrBox}>
            <Text style={styles.addrText} numberOfLines={2} selectable>{wallet}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={copyAddr}>
            <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : '📋 Copy Address'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: 'rgba(139,92,246,0.1)', marginTop: 10 }]}
            onPress={() => Share.share({ message: `My Wish Network wallet address: ${wallet}` })}
          >
            <Text style={[styles.copyBtnText, { color: C.brand }]}>↗ Share Address</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Main Wallet Screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Wish Network</Text>
        <TouchableOpacity onPress={() => wallet && loadBalances(wallet)} style={styles.refreshBtn}>
          <Text style={{ fontSize: 16 }}>{balLoad ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Wallet Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View style={styles.walletIcon}>
            <Image source={require('../../assets/logo.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.balLabel}>YOUR BALANCE</Text>
            <Text style={styles.walletTitle}>Wish Wallet</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={styles.coinLogo}>
              <Image source={require('../../assets/logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.coinLabel}>WISH COINS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={styles.coinValue}>{wishBal.toLocaleString()}</Text>
                <Text style={{ color: C.gold, fontWeight: '700', fontSize: 16 }}>WISH</Text>
              </View>
            </View>
          </View>

          {/* Address */}
          <TouchableOpacity style={styles.addrRow} onPress={copyAddr}>
            <Text style={{ fontSize: 12, color: C.muted }}>◇</Text>
            <Text style={styles.addrRowText} numberOfLines={1}>{wallet || 'Loading...'}</Text>
            <View style={styles.copySmallBtn}>
              <Text style={{ color: C.brand, fontWeight: '700', fontSize: 12 }}>{copied ? '✓' : 'Copy'}</Text>
            </View>
          </TouchableOpacity>

          {/* Send / Receive */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setScreen('send')}>
              <Text style={styles.actionBtnText}>↑ Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGhost]} onPress={() => setScreen('receive')}>
              <Text style={[styles.actionBtnText, { color: C.white }]}>↓ Receive</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'assets' && styles.tabBtnActive]} onPress={() => setTab('assets')}>
            <Text style={[styles.tabTxt, tab === 'assets' && styles.tabTxtActive]}>Assets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'activity' && styles.tabBtnActive]} onPress={() => setTab('activity')}>
            <Text style={[styles.tabTxt, tab === 'activity' && styles.tabTxtActive]}>Activity</Text>
          </TouchableOpacity>
        </View>

        {tab === 'assets' ? (
          <>
            <View style={styles.assetRow}>
              <View style={styles.assetIcon}>
                <Image source={require('../../assets/logo.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>Wish Coin</Text>
                <Text style={styles.assetSub}>WISH</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.gold, fontWeight: '800', fontSize: 18 }}>{wishBal.toLocaleString()}</Text>
                <Text style={styles.changeText}>▲ 0.00%</Text>
              </View>
            </View>

            {solBal !== null && (
              <View style={styles.assetRow}>
                <View style={[styles.assetIcon, { backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.3)' }]}>
                  <Text style={{ fontSize: 24 }}>◎</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>Solana</Text>
                  <Text style={styles.assetSub}>SOL</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 18 }}>{Number(solBal).toFixed(4)}</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {txHistory.length === 0 ? (
              <Text style={{ color: C.muted, textAlign: 'center', marginTop: 30 }}>No transactions yet</Text>
            ) : txHistory.map((tx: any, i: number) => (
              <View key={i} style={styles.actRow}>
                <View style={styles.actIcon}>
                  <Text style={{ fontSize: 20 }}>{tx.type === 'send' ? '↑' : '↓'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: C.white, fontWeight: '600', fontSize: 14 }}>
                    {tx.type === 'send' ? 'Sent' : 'Received'}
                  </Text>
                  <Text style={styles.assetSub} numberOfLines={1}>{tx.to || tx.from || ''}</Text>
                </View>
                <Text style={{ color: tx.type === 'send' ? C.red : C.green, fontWeight: '700', fontSize: 14 }}>
                  {tx.type === 'send' ? '-' : '+'}{tx.amount} WISH
                </Text>
              </View>
            ))}
          </>
        )}
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
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  walletIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: C.border2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  balLabel: { fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' },
  walletTitle: { color: C.white, fontWeight: '800', fontSize: 20 },
  balanceCard: {
    backgroundColor: C.s2, borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20,
  },
  coinLogo: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 2, borderColor: C.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  coinLabel: { fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' },
  coinValue: { fontSize: 42, fontWeight: '900', color: C.gold },
  addrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
    borderWidth: 1, borderColor: C.border,
  },
  addrRowText: { flex: 1, color: C.muted, fontSize: 12 },
  copySmallBtn: {
    backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.border2,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: C.brand, borderRadius: 12, padding: 12, alignItems: 'center' },
  actionBtnGhost: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border },
  actionBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
  tabRow: {
    flexDirection: 'row', backgroundColor: C.s2, borderRadius: 12, padding: 4,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: C.s3 },
  tabTxt: { color: C.muted, fontWeight: '600', fontSize: 14 },
  tabTxtActive: { color: C.white, fontWeight: '700' },
  assetRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.s2,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.gold,
  },
  assetIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: C.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  assetSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  changeText: { color: C.green, fontSize: 12, marginTop: 2 },
  actRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.s2,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  actIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  // Send screen
  balBadge: {
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', marginBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  inputLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(139,92,246,0.07)', borderWidth: 1.5, borderColor: C.border2,
    borderRadius: 13, padding: 14, fontSize: 14, color: C.white, marginBottom: 8,
  },
  maxBtn: {
    alignSelf: 'flex-end', backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border2, marginBottom: 20,
  },
  sendBtn: {
    backgroundColor: C.brand, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: C.brand, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 15,
  },
  sendBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },
  // Receive screen
  qrBox: {
    backgroundColor: C.s2, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border2, marginBottom: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  addrBox: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 16, width: '100%',
  },
  addrText: { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 20 },
  copyBtn: {
    backgroundColor: C.brand, borderRadius: 12, padding: 14,
    alignItems: 'center', width: '100%',
  },
  copyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
