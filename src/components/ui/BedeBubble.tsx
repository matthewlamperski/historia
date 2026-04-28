import React from 'react';
import { View, StyleSheet, Text as RNText, TouchableOpacity, Linking } from 'react-native';
import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { theme } from '../../constants/theme';
import { BedeSource } from '../../types';

interface BedeBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  sources?: BedeSource[];
}

const MAX_LABEL_CHARS = 32;

/**
 * Pick a sensible chip label from a Gemini grounding source. The `url` is
 * always a `vertexaisearch.cloud.google.com/...` redirect (Google requires
 * grounded citations to use it), so the hostname is uninformative — fall
 * back chain: title → 'Source'.
 */
function labelForSource(s: BedeSource): string {
  const title = (s.title ?? '').trim();
  if (!title) return 'Source';
  // Trim long " - publisher" suffixes some sources include
  const cleaned = title.replace(/\s+[-—|]\s+.+$/, '').trim() || title;
  if (cleaned.length <= MAX_LABEL_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_LABEL_CHARS - 1).trim()}…`;
}

/**
 * Renders a single line of Bede's text with very lightweight Markdown:
 *   **bold** → bold text
 * Anything else is passed through verbatim.
 */
function renderInline(line: string, keyPrefix: string, color: string) {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <RNText key={`${keyPrefix}-t-${i++}`} style={{ color }}>
          {line.slice(lastIndex, match.index)}
        </RNText>,
      );
    }
    parts.push(
      <RNText
        key={`${keyPrefix}-b-${i++}`}
        style={{ color, fontWeight: theme.fontWeight.semibold }}
      >
        {match[1]}
      </RNText>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(
      <RNText key={`${keyPrefix}-t-${i++}`} style={{ color }}>
        {line.slice(lastIndex)}
      </RNText>,
    );
  }
  return parts;
}

function renderMarkdown(text: string, color: string) {
  // Split into blocks separated by blank lines; each block is rendered as a
  // paragraph, with `-` or `•` prefixed lines treated as a bullet.
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, blockIdx) => {
    const lines = block.split('\n');
    const isList = lines.every(
      l => /^\s*(-|•|\*)\s+/.test(l) && l.trim().length > 0,
    ) && lines.length > 0;
    if (isList) {
      return (
        <View key={`block-${blockIdx}`} style={styles.list}>
          {lines.map((l, lineIdx) => {
            const content = l.replace(/^\s*(-|•|\*)\s+/, '');
            return (
              <View key={`li-${blockIdx}-${lineIdx}`} style={styles.listItem}>
                <RNText style={[styles.bullet, { color }]}>•</RNText>
                <RNText style={[styles.paragraph, { color }]}>
                  {renderInline(content, `li-${blockIdx}-${lineIdx}`, color)}
                </RNText>
              </View>
            );
          })}
        </View>
      );
    }
    return (
      <RNText
        key={`block-${blockIdx}`}
        style={[styles.paragraph, { color }, blockIdx > 0 && styles.paragraphGap]}
      >
        {renderInline(block, `block-${blockIdx}`, color)}
      </RNText>
    );
  });
}

export const BedeBubble: React.FC<BedeBubbleProps> = ({ role, text, sources }) => {
  const isUser = role === 'user';
  const color = isUser ? theme.colors.white : theme.colors.gray[900];
  const hasSources = !isUser && Array.isArray(sources) && sources.length > 0;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowBede]}>
      {!isUser && (
        <View style={styles.avatar}>
          <FontAwesome6
            name="feather-pointed"
            size={13}
            color={theme.colors.primary[600]}
            iconStyle="solid"
          />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBede,
        ]}
      >
        {renderMarkdown(text, color)}
        {hasSources && (
          <View style={styles.sourcesContainer}>
            <View style={styles.sourcesHeader}>
              <FontAwesome6
                name="globe"
                size={10}
                color={theme.colors.primary[600]}
                iconStyle="solid"
              />
              <RNText style={styles.sourcesLabel}>Sources</RNText>
            </View>
            <View style={styles.sourcesList}>
              {sources!.map((s, i) => (
                <TouchableOpacity
                  key={`source-${i}`}
                  style={styles.sourceChip}
                  onPress={() => {
                    Linking.openURL(s.url).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <RNText
                    style={styles.sourceChipText}
                    numberOfLines={1}
                  >
                    {labelForSource(s)}
                  </RNText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: theme.spacing.md,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowBede: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary[500],
    borderBottomRightRadius: 6,
  },
  bubbleBede: {
    backgroundColor: '#f6efe3', // warm cream
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    borderBottomLeftRadius: 6,
  },
  paragraph: {
    fontSize: theme.fontSize.base,
    lineHeight: 22,
  },
  paragraphGap: {
    marginTop: 10,
  },
  list: {
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: theme.fontSize.base,
    lineHeight: 22,
    marginRight: 6,
    width: 12,
  },
  sourcesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary[100],
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  sourcesLabel: {
    fontSize: 10,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 220,
  },
  sourceChipText: {
    fontSize: 11,
    color: theme.colors.primary[700],
    fontWeight: theme.fontWeight.medium,
  },
});

export default BedeBubble;
