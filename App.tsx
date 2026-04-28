import "./global.css";
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ModerationProvider } from './src/context/ModerationContext';
import { PointsConfigProvider } from './src/context/PointsConfigContext';
import { theme } from './src/constants/theme';
import RNSplashScreen from 'react-native-splash-screen';
import { useNotificationHandlers } from './src/hooks';

function App(): React.JSX.Element {
  // Register FCM foreground/background/tap handlers once at the root.
  useNotificationHandlers();

  useEffect(() => {
    setTimeout(() => {
      RNSplashScreen.hide();
    }, 1000)
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ModerationProvider>
          <PointsConfigProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={theme.colors.white}
            />
            <RootNavigator />
            <Toast />
          </PointsConfigProvider>
        </ModerationProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
