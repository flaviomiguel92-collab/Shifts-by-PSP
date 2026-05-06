import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

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
    <View style={{ flex: 1, backgroundColor: '#111827', padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' }}>
        GestPol
      </Text>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Email</Text>
        <TextInput
          style={{
            backgroundColor: '#1F2937',
            borderRadius: 8,
            padding: 12,
            color: '#fff',
            borderWidth: 1,
            borderColor: '#374151',
            fontSize: 16,
          }}
          placeholder="seu@email.com"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Senha</Text>
        <TextInput
          style={{
            backgroundColor: '#1F2937',
            borderRadius: 8,
            padding: 12,
            color: '#fff',
            borderWidth: 1,
            borderColor: '#374151',
            fontSize: 16,
          }}
          placeholder="••••••••"
          placeholderTextColor="#6B7280"
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          secureTextEntry
        />
      </View>

      {error && (
        <Text style={{ color: '#EF4444', marginBottom: 16, textAlign: 'center' }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        style={{
          backgroundColor: '#3B82F6',
          borderRadius: 8,
          padding: 14,
          alignItems: 'center',
          marginBottom: 16,
          opacity: isLoading ? 0.6 : 1,
        }}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Entrar</Text>
        )}
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <Text style={{ color: '#9CA3AF' }}>Não tem conta?</Text>
        <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoading}>
          <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
