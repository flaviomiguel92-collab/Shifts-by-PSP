import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ImprovementsInfo: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>As principais melhorias em relação ao atual:</Text>

      <View style={styles.item}>
        <Text style={styles.bullet}>•</Text>
        <View>
          <Text style={styles.itemTitle}>Fundo escuro por tipo de turno</Text>
          <Text style={styles.itemDescription}>
            — cada dia tem uma cor distinta e imersiva em vez de só um badge
          </Text>
        </View>
      </View>

      <View style={styles.item}>
        <Text style={styles.bullet}>•</Text>
        <View>
          <Text style={styles.itemTitle}>Barra de estatísticas</Text>
          <Text style={styles.itemDescription}>
            no topo com contagem rápida de cada tipo
          </Text>
        </View>
      </View>

      <View style={styles.item}>
        <Text style={styles.bullet}>•</Text>
        <View>
          <Text style={styles.itemTitle}>Fonte azul</Text>
          <Text style={styles.itemDescription}>
            para dias com extra registado
          </Text>
        </View>
      </View>

      <View style={styles.item}>
        <Text style={styles.bullet}>•</Text>
        <View>
          <Text style={styles.itemTitle}>Anel destacado</Text>
          <Text style={styles.itemDescription}>
            no dia de hoje
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  itemDescription: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 2,
  },
});
