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

export default function RegisterScreen() {
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
      // Navigation handled by _layout.tsx watching isAuthenticated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar');
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    {
      key: 'name', label: 'NOME COMPLETO', placeholder: 'João Silva',
      value: name, onChange: setName, icon: 'person-outline',
      secure: false, keyboardType: 'default',
    },
    {
      key: 'email', label: 'EMAIL', placeholder: 'seu@email.com',
      value: email, onChange: setEmail, icon: 'mail-outline',
      secure: false, keyboardType: 'email-address',
    },
    {
      key: 'pass', label: 'PALAVRA-PASSE', placeholder: '••••••••',
      value: password, onChange: setPassword, icon: 'lock-closed-outline',
      secure: !showPass, toggle: () => setShowPass(!showPass), showVal: showPass,
    },
    {
      key: 'confirm', label: 'CONFIRMAR PALAVRA-PASSE', placeholder: '••••••••',
      value: confirmPassword, onChange: setConfirmPassword, icon: 'shield-checkmark-outline',
      secure: !showConfirm, toggle: () => setShowConfirm(!showConfirm), showVal: showConfirm,
    },
  ] as any[];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#050816', '#0B1120', '#111827']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#60A5FA" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Criar Conta</Text>
              <Text style={styles.subtitle}>PSP Turnos</Text>
            </View>
          </View>

          <View style={styles.card}>
            {fields.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <View style={[styles.inputWrap, focused === f.key && styles.inputWrapFocused]}>
                  <Ionicons name={f.icon} size={17} color={focused === f.key ? '#60A5FA' : '#475569'} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={f.placeholder}
                    placeholderTextColor="#334155"
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
                      <Ionicons name={f.showVal ? 'eye-outline' : 'eye-off-outline'} size={17} color="#475569" />
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
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Registar</Text>
                    <Ionicons name="arrow-forward" size={17} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Já tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/login')} disabled={isLoading}>
                <Text style={styles.loginLink}>Fazer Login</Text>
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
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(59, 130, 246, 0.07)', top: -100, left: -100,
  },
  blob2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(139, 92, 246, 0.06)', bottom: 40, right: -60,
  },
  header: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
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
  field: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700', color: '#475569', letterSpacing: 1.2, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 8, 22, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapFocused: {
    borderColor: 'rgba(59, 130, 246, 0.45)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputIcon: { marginRight: 10 },
  input: { color: '#F1F5F9', fontSize: 15, backgroundColor: 'transparent' },
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
    marginBottom: 18,
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
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#334155', fontSize: 13 },
  loginLink: { color: '#60A5FA', fontSize: 13, fontWeight: '600' },
});
