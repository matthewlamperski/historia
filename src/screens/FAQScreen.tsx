import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { theme } from '../constants/theme';
import Icon from 'react-native-vector-icons/FontAwesome6';

const FAQ_ITEMS = [
  {
    question: 'What are National Historic Landmarks?',
    answer:
      'National Historic Landmarks (NHLs) are buildings, sites, districts, structures, and objects that have been determined by the U.S. Secretary of the Interior to be nationally significant in American history and culture. There are about 2,600 NHLs across the country.',
  },
  {
    question: 'How do I check in at a landmark?',
    answer:
      "Navigate to the Map tab, tap on a landmark marker, and press the 'Check In' button. You must be within 100 meters of the landmark's location. Checking in awards you 20 points!",
  },
  {
    question: 'What is the points and levels system?',
    answer:
      'You earn points by checking in at landmarks (20 pts), creating posts (5 pts), and adding photos to posts (1 pt per photo). Points accumulate to unlock higher levels. See your progress in the Levels screen from your profile.',
  },
  {
    question: 'What is the difference between companions and following?',
    answer:
      "Companions are mutual connections — both users must accept a request, similar to Facebook friends. Following is one-directional — you can follow anyone without their approval, similar to Twitter/Instagram. Your feed can be filtered to show posts from people you follow.",
  },
  {
    question: 'How do I get a referral bonus?',
    answer:
      "Share your referral code (found in the 'Refer a Friend' card on your profile) with a friend. When they sign up using your code, both of you earn 20 bonus points!",
  },
  {
    question: 'What does Historia Pro (Premium) include?',
    answer:
      "Historia Pro removes the 10-bookmark limit (free accounts can save up to 10 landmarks), and will unlock additional features as they are added. You can subscribe from the Subscription screen in your profile.",
  },
  {
    question: 'How many posts can I make per day?',
    answer:
      'Free and Pro users can create up to 10 posts per day. This limit resets at midnight.',
  },
  {
    question: 'Can I save landmarks to use offline?',
    answer:
      "Yes! On a landmark's detail sheet, tap the 'Offline' button to save the landmark data for offline use. You can manage your offline maps in Settings.",
  },
  {
    question: 'How do private messages work?',
    answer:
      'You can start a direct message or group conversation with any user via the Messages tab. You can also share posts directly in a message. Messages support text and photos.',
  },
  {
    question: 'How do I report inappropriate content or users?',
    answer:
      'Long-press on any comment or post to see the report option. On a user\'s profile, tap the three-dot menu for block/report options. Reported content is reviewed by our moderation team.',
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => setExpanded(prev => !prev)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.question}>{question}</Text>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={theme.colors.primary[500]}
        />
      </View>
      {expanded && (
        <Text style={styles.answer}>{answer}</Text>
      )}
    </TouchableOpacity>
  );
};

export default function FAQScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {FAQ_ITEMS.map((item, index) => (
            <React.Fragment key={item.question}>
              <FAQItem question={item.question} answer={item.answer} />
              {index < FAQ_ITEMS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[100],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  item: {
    padding: theme.spacing.lg,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  question: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
  },
  answer: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    lineHeight: 22,
    marginTop: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[100],
    marginHorizontal: theme.spacing.lg,
  },
});
