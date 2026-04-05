import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Dimensions, Modal, FlatList, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS as C, API_BASE, APP_NAME, APP_TAGLINE, COUNTRIES, DEMO_USERS, REF_SIGNUP_BONUS } from '../constants';

// Auto-redirect hook: if a saved session exists, skip the login screen
function useAutoRedirect() {
  const { user, loaded } = useAuth();
  useEffect(() => {
    if (loaded && user) {
      router.replace('/(tabs)/home');
    }
    // Only run when loaded flips to true — not on every background server sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  return { loaded, user };
}

const { width, height } = Dimensions.get('window');

export default function SignInScreen() {
  const { setUser } = useAuth();
  const { loaded } = useAutoRedirect();
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [form, setForm] = useState({
    name: '', username: '', email: '', phone: '',
    countryCode: '+1', pass: '', conf: '', refCode: '', country: '',
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // OTP
  const [otpStep, setOtpStep] = useState(false);
  const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
  const [otpErr, setOtpErr] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [resendT, setResendT] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  // ✅ FIXED — no hooks in loops
  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const ref4 = useRef<TextInput>(null);
  const ref5 = useRef<TextInput>(null);
  const otpRefs = [ref0, ref1, ref2, ref3, ref4, ref5];

  // Country picker
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  useEffect(() => {
    if (!otpStep) return;
    setResendT(60);
    setCanResend(false);
    const iv = setInterval(() => {
      setResendT(t => {
        if (t <= 1) { setCanResend(true); clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [otpStep]);

  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const sendOtp = async (nu: any) => {
    setPendingUser(nu);
    setOtpStep(true);
    setOtpInputs(['', '', '', '', '', '']);
    setOtpErr('');
    setOtpSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nu.email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpToken(data.token);
      } else {
        setOtpErr(typeof data.error === 'string' ? data.error : 'Failed to send code');
      }
    } catch (e: any) {
      setOtpErr('Network error: ' + e.message);
    } finally {
      setOtpSending(false);
    }
  };

  const resendOtp = async () => {
    if (!canResend) return;
    setOtpInputs(['', '', '', '', '', '']);
    setOtpErr('');
    setOtpSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingUser.email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpToken(data.token);
        setResendT(60);
        setCanResend(false);
      } else {
        setOtpErr(typeof data.error === 'string' ? data.error : 'Failed to resend');
      }
    } catch {
      setOtpErr('Network error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const nv = [...otpInputs];
    nv[idx] = val;
    setOtpInputs(nv);
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
    if (!val && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const verifyOtp = async () => {
    const entered = otpInputs.join('');
    if (entered.length < 6) { setOtpErr('Please enter 6-digit code'); return; }
    if (!otpToken) { setOtpErr('Session expired. Request a new code.'); return; }
    setOtpSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpToken, otp: entered }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          await fetch(`${API_BASE}/api/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...pendingUser,
              joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              pts: 0, tokens: 0, tasksDone: {},
              refCode: pendingUser.refCode || null,
              refBy: pendingUser.refBy || null,
              refPts: 0, refs: [],
            }),
          });
        } catch {}
        if (pendingUser.refBy) {
          try {
            const rr = await fetch(`${API_BASE}/api/user?refCode=${encodeURIComponent(pendingUser.refBy)}`);
            const rd = await rr.json();
            if (rd.user) {
              await fetch(`${API_BASE}/api/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: rd.user.id, email: rd.user.email, pts: (rd.user.pts || 0) + REF_SIGNUP_BONUS }),
              });
            }
          } catch {}
        }
        setUser({ ...pendingUser, pts: 0, tokens: 0 });
        router.replace('/(tabs)/home');
      } else {
        setOtpErr(typeof data.error === 'string' ? data.error : 'Invalid code');
      }
    } catch {
      setOtpErr('Network error. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'register') {
      if (!form.name.trim()) e.name = 'Required';
      if (!form.username.trim()) e.username = 'Required';
    }
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Invalid email';
    if (form.pass.length < 6) e.pass = 'Min 6 characters';
    if (mode === 'register' && form.pass !== form.conf) e.conf = "Passwords don't match";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    if (mode === 'login') {
      const normEmail = form.email.trim().toLowerCase();
      const normPass = form.pass.trim();
      let found: any = DEMO_USERS.find(u => u.email === normEmail && u.pass === normPass) || null;
      if (!found) {
        try {
          const r = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(normEmail)}`);
          const d = await r.json();
          if (d.user && d.user.pass === normPass) found = d.user;
        } catch {}
      } else if (!found.isAdmin) {
        try {
          const r = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(normEmail)}`);
          const d = await r.json();
          if (d.user) found = { ...found, ...d.user };
        } catch {}
      }
      setLoading(false);
      if (found) {
        setUser(found);
        router.replace('/(tabs)/home');
      } else {
        setErrs({ pass: 'Invalid credentials' });
      }
    } else {
      const regEmail = form.email.trim().toLowerCase();
      if (DEMO_USERS.find(x => x.email === regEmail)) {
        setLoading(false); setErrs({ email: 'Account already exists' }); return;
      }
      try {
        const r = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(regEmail)}`);
        const d = await r.json();
        if (d.user) { setLoading(false); setErrs({ email: 'Account already exists' }); return; }
      } catch {}
      const fullPhone = selectedCountry.code + form.phone;
      const _uid = 'u' + Date.now();
      const _rc = form.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) + String(Math.floor(Math.random() * 90) + 10);
      const nu = {
        id: _uid, name: form.name, username: form.username,
        email: regEmail, phone: fullPhone, pass: form.pass,
        pts: 0, tokens: 0, joined: 'Now', country: selectedCountry.flag,
        isAdmin: false, active: true, role: 'user',
        refCode: _rc, refBy: form.refCode.trim().toLowerCase() || null,
        walletAddress: 'ukpKw2...' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      };
      setLoading(false);
      sendOtp(nu);
    }
  };

  // While AsyncStorage is loading, show nothing to avoid login screen flash
  if (!loaded) {
    return <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.brand} size="large" /></View>;
  }

  // ── OTP Screen ──
  if (otpStep) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.centered} keyboardShouldPersistTaps="handled">
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 36 }}>📧</Text>
          </View>
          <Text style={styles.h1}>Verify Email</Text>
          <Text style={styles.subtitle}>
            A 6-digit code was sent to{'\n'}
            <Text style={{ color: C.brandLt, fontWeight: '600' }}>{form.email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otpInputs.map((v, i) => (
              <TextInput
                key={i}
                ref={otpRefs[i]}
                value={v}
                onChangeText={val => handleOtpChange(i, val)}
                maxLength={1}
                keyboardType="number-pad"
                style={[styles.otpBox, v ? styles.otpBoxFilled : otpErr ? styles.otpBoxErr : {}]}
              />
            ))}
          </View>

          <Text style={{ color: resendT > 0 ? C.gold : C.red, marginBottom: 12, fontSize: 13 }}>
            {resendT > 0 ? `⏰ Code expires in ${resendT}s` : '⏰ Code expired!'}
          </Text>

          {!!otpErr && <Text style={styles.errText}>⚠ {otpErr}</Text>}
          {otpSending && <ActivityIndicator color={C.brand} style={{ marginBottom: 12 }} />}

          <TouchableOpacity
            style={[styles.btnBrand, { opacity: otpSending || otpInputs.some(v => !v) ? 0.5 : 1 }]}
            onPress={verifyOtp}
            disabled={otpSending || otpInputs.some(v => !v)}
          >
            <Text style={styles.btnText}>✓ Verify & Continue</Text>
          </TouchableOpacity>

          <Text style={[styles.muted, { textAlign: 'center', marginTop: 12 }]}>
            Didn't receive the code?{' '}
            <Text style={{ color: canResend ? C.brandLt : C.muted, fontWeight: '700' }} onPress={resendOtp}>
              {resendT > 0 ? `Resend in ${resendT}s` : 'Resend Code'}
            </Text>
          </Text>

          <TouchableOpacity onPress={() => { setOtpStep(false); setPendingUser(null); }} style={{ marginTop: 16 }}>
            <Text style={styles.muted}>← Change Email</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Welcome Screen ──
  if (mode === 'welcome') {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.logoBox}>
            <Image
              source={require('../assets/logo.png')}
              style={{ width: 70, height: 70, borderRadius: 18 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>

          <View style={{ width: '100%', maxWidth: 360, gap: 12, marginTop: 32 }}>
            <TouchableOpacity style={styles.btnBrand} onPress={() => setMode('login')}>
              <Text style={styles.btnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setMode('register')}>
              <Text style={styles.btnText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.badges}>
            {['🌍 International', '🔒 Secure', '📱 Mobile'].map((b, i) => (
              <Text key={i} style={styles.badge}>{b}</Text>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Login / Register Form ──
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setMode('welcome')} style={{ marginBottom: 32 }}>
          <Text style={styles.muted}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>{mode === 'login' ? 'Welcome Back!' : 'Join Wish Network Today'}</Text>
        <Text style={[styles.muted, { marginBottom: 28 }]}>
          {mode === 'login' ? 'Sign in to continue mining' : 'Create your free account'}
        </Text>

        {mode === 'register' && (
          <>
            <InputField label="Full Name" icon="👤" value={form.name} onChange={f('name')} placeholder="Your full name" err={errs.name} />
            <InputField label="Username" icon="@" value={form.username} onChange={f('username')} placeholder="username" err={errs.username} />
          </>
        )}

        <InputField label="Email Address" icon="📧" value={form.email} onChange={f('email')} placeholder="you@email.com" keyboardType="email-address" err={errs.email} />

        {mode === 'register' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.input, { width: 110, justifyContent: 'center' }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={{ color: C.white, fontSize: 14 }}>{selectedCountry.flag} {selectedCountry.code}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1, color: C.white }]}
                value={form.phone}
                onChangeText={f('phone')}
                placeholder="Phone number"
                placeholderTextColor={C.muted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        <InputField
          label="Password" icon="🔒" value={form.pass} onChange={f('pass')}
          placeholder="Min 6 characters" secureTextEntry={!showPass} err={errs.pass}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPass(p => !p)}>
              <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          }
        />

        {mode === 'register' && (
          <>
            <InputField
              label="Confirm Password" icon="🔒" value={form.conf} onChange={f('conf')}
              placeholder="Repeat password" secureTextEntry={!showConf} err={errs.conf}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConf(p => !p)}>
                  <Text style={{ fontSize: 16 }}>{showConf ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              }
            />
            <InputField label="Referral Code (optional)" icon="🎁" value={form.refCode} onChange={f('refCode')} placeholder="Enter referral code" />
          </>
        )}

        <TouchableOpacity
          style={[styles.btnBrand, { marginTop: 8, opacity: loading ? 0.7 : 1 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.muted}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: C.brandLt, fontWeight: '700' }}>
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>

        <Modal visible={showCountryPicker} animationType="slide" transparent>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCountryPicker(false)} activeOpacity={1}>
            <View style={styles.modalSheet}>
              <Text style={[styles.h1, { marginBottom: 16 }]}>Select Country</Text>
              <FlatList
                data={COUNTRIES}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.countryItem}
                    onPress={() => { setSelectedCountry(item); setShowCountryPicker(false); }}
                  >
                    <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                    <Text style={{ color: C.white, flex: 1, marginLeft: 12 }}>{item.name}</Text>
                    <Text style={{ color: C.muted }}>{item.code}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({ label, icon, value, onChange, placeholder, secureTextEntry, keyboardType, err, rightIcon }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', borderColor: err ? C.red : C.border2 }]}>
        {icon && <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, color: C.white, fontSize: 14 }}
        />
        {rightIcon}
      </View>
      {!!err && <Text style={styles.errText}>⚠ {err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoBox: {
    width: 90, height: 90, borderRadius: 26,
    backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  iconBox: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  appName: { fontSize: 42, fontWeight: '900', color: C.white, marginBottom: 8 },
  tagline: { fontSize: 15, color: C.muted, fontWeight: '500', marginBottom: 8 },
  h1: { fontSize: 26, fontWeight: '900', color: C.white, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(139,92,246,0.07)', borderWidth: 1.5, borderColor: C.border2,
    borderRadius: 13, padding: 13, fontSize: 14,
  },
  btnBrand: {
    width: '100%', backgroundColor: C.brand, borderRadius: 13, padding: 16, alignItems: 'center',
  },
  btnGhost: {
    width: '100%', borderWidth: 1.5, borderColor: C.border2, borderRadius: 13, padding: 16,
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnText: { color: C.white, fontSize: 15, fontWeight: '700' },
  muted: { color: C.muted, fontSize: 13 },
  errText: { color: C.red, fontSize: 11, marginTop: 4, fontWeight: '600' },
  badges: { flexDirection: 'row', gap: 16, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { fontSize: 11, color: C.muted },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: {
    width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: '800', color: C.white,
    backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.22)', borderRadius: 13,
  },
  otpBoxFilled: { borderColor: C.brand },
  otpBoxErr: { borderColor: 'rgba(239,68,68,0.4)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.s1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: height * 0.7,
  },
  countryItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
});