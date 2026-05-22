import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Already running as installed PWA
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setPrompt(null);
      setDismissed(true);
    }
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="phone-portrait-outline" size={18} color="#60A5FA" />
      <Text style={styles.text}>Instalar como app no dispositivo</Text>
      <TouchableOpacity style={styles.installBtn} onPress={handleInstall} activeOpacity={0.8}>
        <Text style={styles.installText}>Instalar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 32, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  text: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  installBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  installText: {
    color: '#60A5FA',
    fontWeight: '500',
    fontSize: 12,
  },
  closeBtn: {
    padding: 2,
  },
});
