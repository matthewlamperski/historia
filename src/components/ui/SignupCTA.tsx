import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from './Text';
import Button from './Button';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../types';

interface SignupCTAProps {
  icon: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
}

/**
 * Full-bleed signup invitation shown to anonymous users in tabs they
 * can't browse without an account (Feed, Messages, Profile). Tapping
 * the CTA opens the Auth modal.
 */
export const SignupCTA: React.FC<SignupCTAProps> = ({
  icon,
  title,
  subtitle,
  ctaLabel = 'Sign in or create account',
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={48} color={theme.colors.primary[500]} />
      </View>
      <Text variant="h3" weight="semibold" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="gray.500" style={styles.subtitle}>
        {subtitle}
      </Text>
      <Button
        variant="primary"
        onPress={() => navigation.navigate('Auth')}
        style={styles.cta}
      >
        {ctaLabel}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.white,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  cta: {
    minWidth: 240,
  },
});

export default SignupCTA;
