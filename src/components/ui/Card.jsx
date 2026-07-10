/** Surface container with rounded corners and a soft shadow. Optionally pressable. */

import { View, Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing, shadow } from '../../constants/theme';

export function Card({ children, onPress, selected, style, padded = true }) {
  const content = (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        selected && styles.selected,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: { padding: spacing.lg },
  selected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
});

export default Card;
