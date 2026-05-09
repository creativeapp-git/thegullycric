import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

// Inject CSS shimmer animation once on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = 'skeleton-shimmer-style';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes skeletonShimmer {
        0% { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
      .skeleton-shimmer {
        background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 37%, #E5E7EB 63%);
        background-size: 800px 100%;
        animation: skeletonShimmer 1.8s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return; // CSS handles web animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  if (Platform.OS === 'web') {
    return (
      <div
        className="skeleton-shimmer"
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height,
          borderRadius,
          ...(style || {}),
        }}
      />
    );
  }

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const SkeletonCard: React.FC = () => (
  <View style={styles.card}>
    {/* Status badge skeleton */}
    <View style={{ marginBottom: 14 }}>
      <SkeletonLoader width={80} height={22} borderRadius={8} />
    </View>
    {/* Teams row */}
    <View style={styles.teamsRow}>
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonLoader width={100} height={16} />
        <SkeletonLoader width={50} height={28} borderRadius={6} />
      </View>
      <View style={styles.vsContainer}>
        <SkeletonLoader width={24} height={14} borderRadius={4} />
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end', gap: 8 }}>
        <SkeletonLoader width={100} height={16} />
        <SkeletonLoader width={50} height={28} borderRadius={6} />
      </View>
    </View>
    {/* Footer */}
    <View style={styles.cardFooter}>
      <SkeletonLoader width={70} height={12} />
      <SkeletonLoader width={20} height={20} borderRadius={10} />
    </View>
  </View>
);

const SkeletonMatchList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  vsContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  list: {
    padding: 12,
  },
});

export { SkeletonLoader, SkeletonCard, SkeletonMatchList };
export default SkeletonLoader;