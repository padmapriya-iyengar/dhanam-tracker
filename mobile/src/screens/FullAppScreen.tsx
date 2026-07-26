import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, Home, RefreshCw, WifiOff } from 'lucide-react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Text } from '../components/Typography';
import { colors, typography } from '../theme';

const DEFAULT_WEB_APP_URL = 'https://joshikiran.com/dhanam-tracker/';
const CONFIGURED_WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_WEB_APP_URL;

export function FullAppScreen() {
  const webView = useRef<WebView>(null);
  const [sourceUrl, setSourceUrl] = useState(CONFIGURED_WEB_APP_URL);
  const [currentUrl, setCurrentUrl] = useState(CONFIGURED_WEB_APP_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleBack = useCallback(() => {
    if (!canGoBack) return false;
    webView.current?.goBack();
    return true;
  }, [canGoBack]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  const allowNavigation = useCallback((request: { url: string }) => {
    const { url } = request;
    if (url === 'about:blank') return true;
    try {
      const target = new URL(url);
      if (target.origin === new URL(sourceUrl).origin) return true;
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(target.protocol)) {
        Linking.openURL(url);
      }
    } catch {
      return false;
    }
    return false;
  }, [sourceUrl]);

  const handleLoadFailure = useCallback(() => {
    if (sourceUrl !== DEFAULT_WEB_APP_URL) {
      setSourceUrl(DEFAULT_WEB_APP_URL);
      setFailed(false);
      return;
    }
    setFailed(true);
  }, [sourceUrl]);

  const updateNavigation = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    setCurrentUrl(state.url);
    setFailed(false);
  }, []);

  const goHome = useCallback(() => {
    if (currentUrl === sourceUrl) {
      webView.current?.reload();
      return;
    }
    setReloadKey(key => key + 1);
  }, [currentUrl, sourceUrl]);

  if (failed) {
    return (
      <View style={styles.error}>
        <View style={styles.errorIcon}><WifiOff size={28} color={colors.negative} /></View>
        <Text style={styles.errorTitle}>Unable to open Dhanam</Text>
        <Text style={styles.errorText}>Check your connection and confirm that the Dhanam web application is available.</Text>
        <Pressable onPress={() => { setFailed(false); setReloadKey(key => key + 1); }} style={styles.retry}>
          <RefreshCw size={16} color="#fff" /><Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityLabel="Go back"
          disabled={!canGoBack}
          onPress={() => webView.current?.goBack()}
          style={({ pressed }) => [styles.toolButton, !canGoBack && styles.toolDisabled, pressed && styles.toolPressed]}
        >
          <ChevronLeft size={21} color="#E0F2F1" />
        </Pressable>
        <View style={styles.toolbarTitle}>
          <Text style={styles.toolbarName}>Dhanam</Text>
          <Text numberOfLines={1} style={styles.toolbarStatus}>{sourceUrl === DEFAULT_WEB_APP_URL ? 'Secure online app' : 'Local development'}</Text>
        </View>
        <Pressable accessibilityLabel="Dashboard home" onPress={goHome} style={({ pressed }) => [styles.toolButton, pressed && styles.toolPressed]}>
          <Home size={18} color="#E0F2F1" />
        </Pressable>
        <Pressable accessibilityLabel="Refresh page" onPress={() => webView.current?.reload()} style={({ pressed }) => [styles.toolButton, pressed && styles.toolPressed]}>
          <RefreshCw size={18} color="#E0F2F1" />
        </Pressable>
      </View>
      <WebView
      key={reloadKey}
      ref={webView}
      source={{ uri: sourceUrl }}
      style={styles.webView}
      originWhitelist={['http://*', 'https://*', 'mailto:*', 'tel:*']}
      onNavigationStateChange={updateNavigation}
      onShouldStartLoadWithRequest={allowNavigation}
      onError={handleLoadFailure}
      onHttpError={({ nativeEvent }) => {
        if (nativeEvent.statusCode >= 500) handleLoadFailure();
      }}
      allowsBackForwardNavigationGestures
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      javaScriptEnabled
      domStorageEnabled
      pullToRefreshEnabled
      setSupportMultipleWindows={false}
      mixedContentMode="compatibility"
      startInLoadingState
      renderError={() => (
        <View style={styles.loading}>
          <View style={styles.loadingMark}><Text style={styles.loadingMarkText}>D</Text></View>
          <Text style={styles.loadingText}>Connecting to Dhanam…</Text>
        </View>
      )}
      renderLoading={() => (
        <View style={styles.loading}>
          <View style={styles.loadingMark}><Text style={styles.loadingMarkText}>D</Text></View>
          <Text style={styles.loadingText}>Loading Dhanam…</Text>
        </View>
      )}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F766E' },
  toolbar: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, backgroundColor: '#0F766E', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.2)' },
  toolbarTitle: { flex: 1, paddingHorizontal: 6 },
  toolbarName: { ...typography, color: '#fff', fontSize: 13, fontWeight: '800' },
  toolbarStatus: { ...typography, color: '#99F6E4', fontSize: 8.5, marginTop: 1 },
  toolButton: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toolDisabled: { opacity: .3 },
  toolPressed: { backgroundColor: 'rgba(255,255,255,.14)' },
  webView: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F8FAFC' },
  loadingMark: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  loadingMarkText: { ...typography, color: '#fff', fontSize: 22, fontWeight: '800' },
  loadingText: { ...typography, color: colors.textMuted, fontSize: 12 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.background },
  errorIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.negativeSoft },
  errorTitle: { ...typography, color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 18 },
  errorText: { ...typography, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 310 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 },
  retryText: { ...typography, color: '#fff', fontSize: 12, fontWeight: '800' },
});
