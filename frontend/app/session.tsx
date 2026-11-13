import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../src/store/authStore';

export default function SessionScreen() {
  const checking = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.sessionError);
  return (
    <View style={styles.container}>
      {checking ? <ActivityIndicator size="large" color="#60A5FA" /> : null}
      <Text style={styles.text}>{checking ? 'A recuperar a sessão…' : error}</Text>
      {!checking && (
        <Pressable style={styles.button} accessibilityRole="button" onPress={() => { void useAuthStore.getState().checkAuth(); }}>
          <Text style={styles.text}>Tentar novamente</Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  text: { color: '#F1F5F9', textAlign: 'center', fontSize: 16 },
  button: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
});
