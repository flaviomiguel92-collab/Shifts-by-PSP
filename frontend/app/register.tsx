import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#111827' }} contentContainerStyle={{ padding: 20, justifyContent: 'center', minHeight: '100%' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' }}>
        Criar Conta
      </Text>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Nome</Text>
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
          placeholder="Seu nome"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
        />
      </View>

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

      <View style={{ marginBottom: 20 }}>
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

      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Confirmar Senha</Text>
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
          value={confirmPassword}
          onChangeText={setConfirmPassword}
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
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Registar</Text>
        )}
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <Text style={{ color: '#9CA3AF' }}>Já tem conta?</Text>
        <TouchableOpacity onPress={() => router.push('/login')} disabled={isLoading}>
          <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
