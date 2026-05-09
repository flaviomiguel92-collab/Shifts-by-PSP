import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { PSPLogo } from '../src/components/PSPLogo';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../src/theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    console.log('[login] Login button clicked');
    if (!email || !password) {
      console.log('[login] Missing email or password');
      setError('Por favor preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[login] Calling login with email:', email);
      await login(email, password);
      console.log('[login] Login successful, navigating...');
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[login] Login failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo & Branding */}
      <View style={styles.logoSection}>
        <PSPLogo size={100} variant="badge" />
        <Text style={styles.appTitle}>PSP Turnos</Text>
        <Text style={styles.appSubtitle}>Gestão de Turnos Profissionais</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Email Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Palavra-Passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            secureTextEntry
          />
        </View>

        {/* Error Message */}
        {error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Aceder</Text>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Não tem conta?</Text>
          <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoading}>
            <Text style={styles.registerLink}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  appTitle: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  appSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  registerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});
}
