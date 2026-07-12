/** Labeled text input with error message and consistent styling. */

import { useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';

import { colors, radius, spacing, fontSize } from '../../constants/theme';
import { AppText } from './Typography';

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines,
  rightAccessory,
  style,
  ...rest
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
          multiline && styles.fieldMultiline,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8A98AE"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...rest}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.helper}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.xs, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  fieldFocused: { borderColor: colors.teal },
  fieldError: { borderColor: colors.danger },
  fieldMultiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: '#0D1B2E',
    paddingVertical: spacing.sm,
    // Web: quita el outline al enfocar y fuerza texto oscuro incluso con el
    // autofill de Chrome (evita la "franja blanca" con texto invisible).
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, WebkitTextFillColor: '#0D1B2E' },
      default: {},
    }),
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  accessory: { marginLeft: spacing.sm },
  helper: { marginTop: spacing.xs },
});

export default Input;
