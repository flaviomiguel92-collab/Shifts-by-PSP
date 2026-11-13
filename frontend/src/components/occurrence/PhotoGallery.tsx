import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { photoUri, validatePhotos } from '../../utils/photos';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => Promise<void> | void;
  hint?: string;
  onBusyChange?: (busy: boolean) => void;
}

export function PhotoGallery({ photos, onChange, hint, onBusyChange }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const photo = selected === null ? null : photos[selected];

  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível guardar a alteração.'); }
    finally { locked.current = false; setBusy(false); onBusyChange?.(false); }
  };

  const pick = (index: number | null) => run(async () => {
    if (index === null) validatePhotos([...photos, '']);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const image = await ImageManipulator.manipulateAsync(asset.uri,
      asset.width > 1200 ? [{ resize: { width: 1200 } }] : [],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    try {
      if (!image.base64) throw new Error('Não foi possível processar a fotografia.');
      const value = `data:image/jpeg;base64,${image.base64}`;
      const next = index === null ? [...photos, value] : photos.map((old, i) => i === index ? value : old);
      validatePhotos(next);
      if (!mounted.current) return;
      await onChange(next);
      setImageFailed(false);
    } finally {
      if (Platform.OS !== 'web' && image.uri.startsWith(FileSystem.cacheDirectory || 'unavailable:')) {
        await FileSystem.deleteAsync(image.uri, { idempotent: true }).catch(() => {});
      }
      if (Platform.OS !== 'web' && asset.uri !== image.uri && asset.uri.startsWith(FileSystem.cacheDirectory || 'unavailable:')) {
        await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
      }
    }
  });

  const save = () => run(async () => {
    if (!photo) return;
    const uri = photoUri(photo);
    const mime = uri.slice(5, uri.indexOf(';'));
    const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    const name = `fotografia-${Date.now()}.${extension}`;
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) {
        throw new Error('Não é possível guardar/partilhar neste dispositivo.');
      }
      const file = FileSystem.cacheDirectory + name;
      try {
        await FileSystem.writeAsStringAsync(file, uri.slice(uri.indexOf(',') + 1), { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(file, { mimeType: mime, dialogTitle: 'Guardar ou partilhar fotografia' });
      } finally {
        await FileSystem.deleteAsync(file, { idempotent: true });
      }
    }
  });

  return (
    <View style={styles.gallery}>
      <Pressable disabled={busy} accessibilityRole="button" style={styles.button} onPress={() => { void pick(null); }}>
        <Text style={styles.text}>Adicionar fotografia</Text>
      </Pressable>
      {hint && <Text style={styles.muted}>{hint}</Text>}
      {busy && <ActivityIndicator color="#60A5FA" />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <ScrollView horizontal>
        {photos.map((value, index) => (
          <Pressable key={index} disabled={busy} accessibilityRole="button" accessibilityLabel={`Abrir fotografia ${index + 1}`}
            onPress={() => { setSelected(index); setError(''); setImageFailed(false); setConfirmRemove(false); }}>
            <Image source={{ uri: photoUri(value) }} style={styles.thumbnail} />
          </Pressable>
        ))}
      </ScrollView>
      {!photos.length && <Text style={styles.muted}>Sem fotografias</Text>}
      <Modal visible={!!photo} animationType="slide" onRequestClose={() => { if (!busy) setSelected(null); }}>
        <View style={styles.viewer}>
          <Pressable disabled={busy} style={styles.button} onPress={() => setSelected(null)} accessibilityRole="button">
            <Text style={styles.text}>Fechar</Text>
          </Pressable>
          {photo && <Image source={{ uri: photoUri(photo) }} resizeMode="contain" style={styles.image} onError={() => setImageFailed(true)} />}
          {imageFailed && <Text style={styles.error}>Não foi possível abrir esta fotografia. Pode substituí-la ou removê-la.</Text>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {busy && <ActivityIndicator color="#60A5FA" />}
          <View style={styles.actions}>
            <Pressable disabled={busy} style={styles.button} onPress={() => { void save(); }} accessibilityRole="button"><Text style={styles.text}>Guardar / partilhar</Text></Pressable>
            <Pressable disabled={busy} style={styles.button} onPress={() => { void pick(selected); }} accessibilityRole="button"><Text style={styles.text}>Substituir</Text></Pressable>
            <Pressable disabled={busy} style={styles.button} onPress={() => setConfirmRemove(true)} accessibilityRole="button"><Text style={styles.text}>Remover</Text></Pressable>
          </View>
          {confirmRemove && <View style={styles.actions}>
            <Text style={styles.text}>Remover esta fotografia?</Text>
            <Pressable disabled={busy} style={styles.button} onPress={() => setConfirmRemove(false)}><Text style={styles.text}>Cancelar</Text></Pressable>
            <Pressable disabled={busy} style={styles.button} onPress={() => { void run(async () => {
              await onChange(photos.filter((_, i) => i !== selected));
              setConfirmRemove(false);
              setSelected(null);
            }); }}><Text style={styles.text}>Confirmar remoção</Text></Pressable>
          </View>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: 12 }, viewer: { flex: 1, backgroundColor: '#0F172A', padding: 24, paddingTop: 48, gap: 12 },
  image: { flex: 1, width: '100%' }, thumbnail: { width: 80, height: 80, marginRight: 8, borderRadius: 8 },
  button: { padding: 12, backgroundColor: '#2563EB', borderRadius: 8, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  text: { color: '#FFFFFF' }, muted: { color: '#94A3B8' }, error: { color: '#F87171' },
});
