import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createPolyAppClient } from '@polyapp/api-client';

import { API_URL, DEV_EMAIL } from './src/config';
import { describeError, loadProjects, type ProjectRow } from './src/projects';

export default function App() {
  const [email, setEmail] = useState(DEV_EMAIL);
  const [tenantId, setTenantId] = useState('');
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLoad() {
    setLoading(true);
    setError(null);
    try {
      const anonymous = createPolyAppClient({ baseUrl: API_URL });
      const token = await anonymous.devToken(email.trim());
      const client = createPolyAppClient({ baseUrl: API_URL, token });
      setRows(await loadProjects(client, tenantId.trim()));
    } catch (e) {
      setRows([]);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.heading}>PolyApp projects</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={tenantId}
        onChangeText={setTenantId}
        placeholder="Tenant ID"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onLoad}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Load</Text>
      </Pressable>

      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : <Text style={styles.empty}>No projects loaded yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginVertical: 8,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  empty: {
    color: '#6b7280',
    marginTop: 16,
  },
});
