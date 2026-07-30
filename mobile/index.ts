import { registerRootComponent } from 'expo';
import { Platform, Text, TextInput } from 'react-native';
import App from './App';

const preferredFamily = Platform.select({
  web: 'Roboto, "Trebuchet MS", Calibri, Verdana, sans-serif',
  default: 'Roboto',
});
const appText = Text as any;
const appTextInput = TextInput as any;
appText.defaultProps = { ...(appText.defaultProps || {}), style: { fontFamily: preferredFamily } };
appTextInput.defaultProps = { ...(appTextInput.defaultProps || {}), style: { fontFamily: preferredFamily } };

registerRootComponent(App);
