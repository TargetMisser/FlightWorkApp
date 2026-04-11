// src/screens/TraveldocScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function TraveldocScreen() {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Timeout: hide spinner after 15s even if WebView never fires onLoadEnd
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => { setLoading(false); setLoadError(true); }, 15_000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.primaryDark }]}>TravelDoc</Text>
        <Text style={[styles.sub, { color: colors.textSub }]}>{t('traveldocSub')}</Text>
      </View>

      {/* WebView */}
      {loading && (
        <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>{t('traveldocLoading')}</Text>
        </View>
      )}
      {loadError && !loading && (
        <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
          <Text style={[styles.loadingText, { color: colors.textSub }]}>
            Caricamento lento. Verifica la connessione internet.
          </Text>
        </View>
      )}
      <WebView
        source={{ uri: 'https://legacy.traveldoc.aero/' }}
        style={{ flex: 1 }}
        onLoadEnd={() => { setLoading(false); setLoadError(false); }}
        onError={() => { setLoading(false); setLoadError(true); }}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 3, letterSpacing: 0.3 },
  loadingWrap: { position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText: { marginTop: 12, fontSize: 14 },
});
