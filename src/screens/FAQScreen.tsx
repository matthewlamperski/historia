import React, { useMemo, useState } from 'react';
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
import { usePointsConfig } from '../context/PointsConfigContext';
import { EarningRules } from '../types/points';

interface FAQItem {
  question: string;
  answer: string;
}

function buildFaqItems(earning: EarningRules | null): FAQItem[] {
  // Format helper: when config is not yet loaded, drop the numeric parenthetical.
  const pts = (n: number | undefined, suffix = 'pts') =>
    n === undefined ? '' : `(${n} ${suffix})`;

  return [
    {
      question: 'What do the map marker colors mean?',
      answer:
        'Each landmark on the map is a colored circle. The color tells you your history with that site:\n\n🔴  Brick red — you have checked in and visited this landmark.\n🟢  Sage green — you have bookmarked (saved) this landmark but not yet visited.\n🟤  Brown (default) — you have not yet bookmarked or visited this landmark.\n\nWhen you zoom out, nearby markers group into clusters with a number inside. Clusters are shaded by size: lighter brown for smaller clusters, darker brown as more landmarks are grouped together. Tap a cluster to zoom in and see the individual markers.',
    },
    {
      question: 'What do the map marker icons mean?',
      answer:
        "Each landmark shows a white icon inside its colored circle to tell you at a glance what kind of site it is:\n\n🏛️  Columned building — Museum. Landmarks categorized as museums or cultural institutions open to the public.\n🗿  Monument — Historic site. Battlefields, memorials, historic districts, homes of notable figures, and other preserved places of significance.\n🏭  Factory — Manufacturer. American-made manufacturers and heritage brands participating in Historia's partner program.\n📍  Pin — Other. Any landmark that hasn't yet been categorized into one of the above groups.",
    },
    {
      question: 'What are National Historic Landmarks?',
      answer:
        'National Historic Landmarks (NHLs) are buildings, sites, districts, structures, and objects that have been determined by the U.S. Secretary of the Interior to be nationally significant in American history and culture. There are about 2,600 NHLs across the country.',
    },
    {
      question: 'How do I check in at a landmark?',
      answer: earning
        ? `Navigate to the Map tab, tap on a landmark marker, and press the 'Check In' button. You must be within 100 meters of the landmark's location. Checking in awards you ${earning.siteVisitPoints} points!`
        : "Navigate to the Map tab, tap on a landmark marker, and press the 'Check In' button. You must be within 100 meters of the landmark's location. Checking in awards you points.",
    },
    {
      question: 'Who is Bede and how do I use him?',
      answer:
        "Bede is our highly knowledgeable AI Guide, inspired by Bede the Venerable, the patron saint of history. He delivers accurate answers on all things Historia with clarity and depth — simply type your question in Bede's chatbox on the landmark landing page. Bede is powered by Google's Gemini API, with prompts custom-tuned for a focused commitment to historical inquiry.",
    },
    {
      question: 'What is the points and levels system?',
      answer: earning
        ? `You earn points by checking in at landmarks ${pts(earning.siteVisitPoints)}, creating posts ${pts(earning.postBasePoints)}, and adding photos or videos to posts ${pts(earning.postPerMediaPoints, 'pt each')}. Points accumulate to unlock higher levels. See your progress in the Levels screen from your profile.`
        : 'You earn points by checking in at landmarks, creating posts, and adding photos or videos to posts. Points accumulate to unlock higher levels. See your progress in the Levels screen from your profile.',
    },
    {
      question: 'Who can participate in Points & Rewards?',
      answer:
        'Points & Rewards is a Historia Pro feature. Free accounts can use the map, social feed, and bookmark up to 10 landmarks, but earning points, leveling up, unlocking badges, and redeeming rewards for American-made gear all require a Pro subscription.\n\nFrom your profile, tap your level card to start a 14-day free trial and begin earning points on every check-in.',
    },
    {
      question: 'What is the difference between companions and following?',
      answer:
        'Companions are mutual connections — both users must accept a request, similar to Facebook friends. Following is one-directional — you can follow anyone without their approval, similar to Twitter/Instagram. Your feed can be filtered to show posts from people you follow.',
    },
    {
      question: 'How do I get a referral bonus?',
      answer: earning
        ? `Share your referral code (found in the 'Refer a Friend' card on your profile) with a friend. When they sign up using your code, both of you earn ${earning.referralPoints} bonus points!`
        : "Share your referral code (found in the 'Refer a Friend' card on your profile) with a friend. When they sign up using your code, both of you earn bonus points!",
    },
    {
      question: 'What does Historia Pro (Premium) include?',
      answer:
        'Historia Pro removes the 10-bookmark limit (free accounts can save up to 10 landmarks), and will unlock additional features as they are added. You can subscribe from the Subscription screen in your profile.',
    },
    {
      question: 'How many posts can I make per day?',
      answer: earning
        ? `Free and Pro users can create up to ${earning.dailyPostCap} posts per day. This limit resets at midnight.`
        : 'There is a daily limit on how many posts you can create. This limit resets at midnight.',
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
}

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItemRow: React.FC<FAQItemProps> = ({ question, answer }) => {
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
  const { config, status } = usePointsConfig();
  const earning = status === 'ready' && config ? config.earning : null;
  const items = useMemo(() => buildFaqItems(earning), [earning]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {items.map((item, index) => (
            <React.Fragment key={item.question}>
              <FAQItemRow question={item.question} answer={item.answer} />
              {index < items.length - 1 && <View style={styles.divider} />}
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
