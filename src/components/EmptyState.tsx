import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.illustrationBadge}>
        <Text style={styles.illustrationText}>+</Text>
      </View>

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <Pressable style={styles.actionButton} onPress={onAction}>
        <Text style={styles.actionButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  illustrationBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationText: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.accent,
  },
  eyebrow: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 22,
    backgroundColor: colors.primaryCtaFill,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: colors.primaryCtaText,
    fontWeight: '800',
  },
});
