import "./global.css";
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/constants/theme';
import RNSplashScreen from 'react-native-splash-screen';

function App(): React.JSX.Element {

  useEffect(() => {
    setTimeout(() => {
      RNSplashScreen.hide();
    }, 1000)
  }, []);
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={theme.colors.white}
        />
        <RootNavigator />
        <Toast />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
