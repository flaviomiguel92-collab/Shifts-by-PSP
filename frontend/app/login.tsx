import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
const turnosLogo = require('../assets/images/icon.png');
import { useTheme } from '../src/theme/themes';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const login = useAuthStore((s) => s.login);
  const th = useTheme();
  const isLight = !th.isDark;
  const gradientColors = (isLight ? ['#F8FAFC', '#F1F5F9', '#E2E8F0'] : ['#050816', '#0B1120', '#111827']) as [string, string, string];
  const inputLight = isLight ? { color: th.textPrimary } : null;
  const placeholderLight = isLight ? th.textMuted : '#334155';

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor preencha todos os campos');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      // Navigation handled by _layout.tsx watching isAuthenticated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.logoSection}>
            <View style={styles.logoBadge}>
              <View style={styles.badgeGlow} />
              <Image source={turnosLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={[styles.appTitle, isLight && { color: th.textPrimary }]}>Turnos</Text>
            <Text style={[styles.appSubtitle, isLight && { color: th.textMuted }]}>Gestão de Turnos Profissionais</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
                <Ionicons name="mail-outline" size={17} color={emailFocused ? '#60A5FA' : '#475569'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, inputLight]}
                  placeholder="seu@email.com"
                  placeholderTextColor={placeholderLight}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PALAVRA-PASSE</Text>
              <View style={[styles.inputWrap, passFocused && styles.inputWrapFocused]}>
                <Ionicons name="lock-closed-outline" size={17} color={passFocused ? '#60A5FA' : '#475569'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, inputLight, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={placeholderLight}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={17} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Aceder</Text>
                    <Ionicons name="arrow-forward" size={17} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Não tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoading}>
                <Text style={styles.registerLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050816' },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  blob1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(59, 130, 246, 0.07)',
    top: -100,
    left: -100,
  },
  blob2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    bottom: 40,
    right: -60,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBadge: {
    position: 'relative',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  badgeGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(11, 17, 32, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.12)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 16,
  },
  field: { marginBottom: 18 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 8, 22, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapFocused: {
    borderColor: 'rgba(59, 130, 246, 0.45)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  eyeBtn: { padding: 4, marginLeft: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, flex: 1 },
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: { color: '#334155', fontSize: 13 },
  registerLink: { color: '#60A5FA', fontSize: 13, fontWeight: '600' },
});
