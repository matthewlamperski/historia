import React from 'react';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { theme } from '../../constants/theme';

interface LocationSwitcherHeaderProps {
  title?: string;
  onPress?: () => void;
}

const LocationSwitcherHeader: React.FC<LocationSwitcherHeaderProps> = ({ 
  title = 'Cincinnati, OH', 
  onPress 
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={styles.container} onPress={onPress}>
      <Icon name="chevron-down" size={16} color={theme.colors.gray[600]} />
      <Text variant="body" weight="medium" style={styles.text}>
        {title}
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
  },
  text: {
    marginLeft: theme.spacing.sm,
  },
});

export default LocationSwitcherHeader;