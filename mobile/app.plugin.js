const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withDhanamQuickActions(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    activity['meta-data'] = activity['meta-data'] || [];
    if (!activity['meta-data'].some((item) => item.$['android:name'] === 'android.app.shortcuts')) {
      activity['meta-data'].push({ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } });
    }
    activity['intent-filter'] = activity['intent-filter'] || [];
    if (!activity['intent-filter'].some((filter) => filter.action?.some((entry) => entry.$['android:name'] === 'android.intent.action.SEND'))) {
      activity['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      });
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const resourceRoot = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const xmlDirectory = path.join(resourceRoot, 'xml');
    const valuesDirectory = path.join(resourceRoot, 'values');
    fs.mkdirSync(xmlDirectory, { recursive: true });
    fs.mkdirSync(valuesDirectory, { recursive: true });
    fs.writeFileSync(path.join(xmlDirectory, 'shortcuts.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut android:shortcutId="add_expense" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_add_expense_short" android:shortcutLongLabel="@string/shortcut_add_expense_long">
    <intent android:action="android.intent.action.VIEW" android:data="dhanam://add/expense" />
  </shortcut>
  <shortcut android:shortcutId="add_income" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_add_income_short" android:shortcutLongLabel="@string/shortcut_add_income_long">
    <intent android:action="android.intent.action.VIEW" android:data="dhanam://add/income" />
  </shortcut>
</shortcuts>`);
    const shortcutStrings = path.join(valuesDirectory, 'dhanam_shortcuts.xml');
    fs.writeFileSync(shortcutStrings, `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="shortcut_add_expense_short">Add expense</string>
  <string name="shortcut_add_expense_long">Add an expense</string>
  <string name="shortcut_add_income_short">Add income</string>
  <string name="shortcut_add_income_long">Add income</string>
</resources>`);
    const mainActivity = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', 'com', 'dhanam', 'tracker', 'MainActivity.kt');
    if (fs.existsSync(mainActivity)) {
      let source = fs.readFileSync(mainActivity, 'utf8');
      if (!source.includes('private fun routeSharedText')) {
        source = source
          .replace('import android.os.Bundle', 'import android.os.Bundle\nimport android.content.Intent\nimport android.net.Uri')
          .replace(
            '    setTheme(R.style.AppTheme);\n    super.onCreate(null)',
            '    setTheme(R.style.AppTheme);\n    routeSharedText(intent)\n    super.onCreate(null)'
          )
          .replace(
            '\n  /**\n   * Returns the name',
            `\n  override fun onNewIntent(intent: Intent) {
    routeSharedText(intent)
    super.onNewIntent(intent)
    setIntent(intent)
  }

  private fun routeSharedText(sourceIntent: Intent?) {
    if (sourceIntent?.action != Intent.ACTION_SEND || sourceIntent.type != "text/plain") return
    val text = sourceIntent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
    if (text.isEmpty()) return
    sourceIntent.action = Intent.ACTION_VIEW
    sourceIntent.data = Uri.Builder()
      .scheme("dhanam")
      .authority("add")
      .appendPath("import")
      .appendQueryParameter("text", text)
      .build()
  }

  /**
   * Returns the name`
          );
        fs.writeFileSync(mainActivity, source);
      }
    }
    return mod;
  }]);
};
