import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { useTheme } from '../src/theme/themes';
import { TurnosLogo } from '../src/components/TurnosLogo';

export default function RegisterScreen() {
  const th = useTheme();
  const isLight = !th.isDark;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor preencha todos os campos');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar');
    } finally {
      setIsLoading(false);
    }
  };

  const C = isLight ? lightTokens : darkTokens;

  const fields = [
    { key: 'name', label: 'NOME COMPLETO', placeholder: 'João Silva',
      value: name, onChange: setName, icon: 'person-outline',
      secure: false, keyboardType: 'default' as const },
    { key: 'email', label: 'EMAIL', placeholder: 'seu@email.com',
      value: email, onChange: setEmail, icon: 'mail-outline',
      secure: false, keyboardType: 'email-address' as const },
    { key: 'pass', label: 'PALAVRA-PASSE', placeholder: '••••••••',
      value: password, onChange: setPassword, icon: 'lock-closed-outline',
      secure: !showPass, toggle: () => setShowPass(!showPass), showVal: showPass },
    { key: 'confirm', label: 'CONFIRMAR PALAVRA-PASSE', placeholder: '••••••••',
      value: confirmPassword, onChange: setConfirmPassword, icon: 'shield-checkmark-outline',
      secure: !showConfirm, toggle: () => setShowConfirm(!showConfirm), showVal: showConfirm },
  ] as any[];

  return (
    <View style={[styles.root, { backgroundColor: C.pageBg }]}>
      <View style={[styles.blob1, { backgroundColor: C.blob1 }]} />
      <View style={[styles.blob2, { backgroundColor: C.blob2 }]} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.wrapper}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.backBtnBg, borderColor: C.backBtnBorder }]}>
              <Ionicons name="arrow-back" size={18} color="#3b82f6" />
            </TouchableOpacity>

            <View style={styles.logoFloat} pointerEvents="none">
              <View style={styles.logoGlow} />
              <TurnosLogo size={220} />
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: C.cardBg, borderColor: C.cardBorder, shadowOpacity: C.cardShadow },
              ]}
            >
              {fields.map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={[styles.label, { color: C.label }]}>{f.label}</Text>
                  <View
                    style={[
                      styles.fieldWrap,
                      { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                      focused === f.key && {
                        borderColor: 'rgba(59,130,246,0.6)',
                        shadowColor: '#3B82F6',
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                      },
                    ]}
                  >
                    <Ionicons name={f.icon} size={16} color={focused === f.key ? '#3b82f6' : C.icon} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.fieldInput, { color: C.inputText, flex: 1 }]}
                      placeholder={f.placeholder}
                      placeholderTextColor={C.placeholder}
                      value={f.value}
                      onChangeText={f.onChange}
                      editable={!isLoading}
                      keyboardType={f.keyboardType || 'default'}
                      autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                      secureTextEntry={f.secure ?? false}
                      onFocus={() => setFocused(f.key)}
                      onBlur={() => setFocused('')}
                    />
                    {f.toggle && (
                      <TouchableOpacity onPress={f.toggle} style={styles.eyeBtn}>
                        <Ionicons name={f.showVal ? 'eye-outline' : 'eye-off-outline'} size={16} color={C.icon} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
                <LinearGradient colors={['#3b82f6', '#2563eb', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.btnText}>Registar</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={[styles.footerText, { color: C.footerText }]}>Já tem conta? </Text>
                <TouchableOpacity onPress={() => router.push('/login')} disabled={isLoading}>
                  <Text style={styles.footerLink}>Fazer Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const darkTokens = {
  pageBg: '#070b12',
  blob1: 'rgba(37,99,235,0.20)',
  blob2: 'rgba(99,102,241,0.13)',
  cardBg: 'rgba(255,255,255,0.045)',
  cardBorder: 'rgba(255,255,255,0.09)',
  cardShadow: 0.55,
  label: '#64748b',
  inputBg: 'rgba(255,255,255,0.055)',
  inputBorder: 'rgba(255,255,255,0.10)',
  inputText: '#f1f5f9',
  placeholder: '#2d3f55',
  icon: '#475569',
  footerText: '#475569',
  backBtnBg: 'rgba(59,130,246,0.10)',
  backBtnBorder: 'rgba(59,130,246,0.22)',
};

const lightTokens = {
  pageBg: '#eef2fb',
  blob1: 'rgba(37,99,235,0.10)',
  blob2: 'rgba(99,102,241,0.08)',
  cardBg: '#ffffff',
  cardBorder: 'rgba(15,23,42,0.06)',
  cardShadow: 0.10,
  label: '#94a3b8',
  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',
  inputText: '#0f172a',
  placeholder: '#cbd5e1',
  icon: '#94a3b8',
  footerText: '#94a3b8',
  backBtnBg: '#ffffff',
  backBtnBorder: 'rgba(15,23,42,0.06)',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  blob1: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -140,
    left: -100,
    opacity: 0.9,
  },
  blob2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -40,
    right: -80,
    opacity: 0.9,
  },
  wrapper: { width: '100%', maxWidth: 420, alignItems: 'center' },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoFloat: {
    width: 220,
    height: 253,
    marginBottom: -90,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.16)',
    top: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 108,
    paddingHorizontal: 24,
    paddingBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 50,
    elevation: 16,
    zIndex: 1,
  },
  field: { marginBottom: 14 },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: { fontSize: 14, backgroundColor: 'transparent' },
  eyeBtn: { padding: 4, marginLeft: 6, opacity: 0.6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 18,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 13 },
  footerLink: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
});
