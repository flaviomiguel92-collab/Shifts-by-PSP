import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function HomeScreen() {
  const modules = [
    {
      id: 'turnos',
      title: 'Turnos',
      description: 'Gestão de turnos',
      icon: 'calendar',
      color: '#3B82F6',
      href: '/(tabs)',
    },
    {
      id: 'ocorrencias',
      title: 'Ocorrências',
      description: 'Registo de eventos',
      icon: 'document-text',
      color: '#F59E0B',
      href: '/(tabs)/ocorrencias',
    },
    {
      id: 'painel',
      title: 'Painel',
      description: 'Estatísticas',
      icon: 'stats-chart',
      color: '#10B981',
      href: '/(tabs)/stats',
    },
    {
      id: 'perfil',
      title: 'Perfil',
      description: 'Configurações',
      icon: 'person',
      color: '#8B5CF6',
      href: '/(tabs)/profile',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shift Olama</Text>
          <Text style={styles.headerSubtitle}>Gestão de Turnos</Text>
        </View>

        {/* Grid de Cards */}
        <View style={styles.gridContainer}>
          {modules.map((module) => (
            <Link href={module.href} key={module.id} asChild>
              <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: module.color }]}>
                  <Ionicons name={module.icon as any} size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>{module.title}</Text>
                <Text style={styles.cardDescription}>{module.description}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Seleciona um módulo para começar</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});