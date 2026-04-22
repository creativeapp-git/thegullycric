import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    <View style={styles.cardHeader}>
      <SkeletonLoader width={60} height={12} />
      <SkeletonLoader width={80} height={16} />
      <SkeletonLoader width={100} height={12} />
    </View>
    <View style={styles.cardContent}>
      <View style={styles.teamRow}>
        <SkeletonLoader width={80} height={14} />
        <SkeletonLoader width={30} height={18} />
      </View>
      <SkeletonLoader width={20} height={12} style={styles.vs} />
      <View style={styles.teamRow}>
        <SkeletonLoader width={80} height={14} />
        <SkeletonLoader width={30} height={18} />
      </View>
    </View>
    <View style={styles.cardFooter}>
      <SkeletonLoader width={100} height={12} />
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
    backgroundColor: '#e0e0e0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamRow: {
    flex: 1,
    alignItems: 'center',
  },
  vs: {
    marginHorizontal: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  list: {
    padding: 12,
  },
});

export { SkeletonLoader, SkeletonCard, SkeletonMatchList };
export default SkeletonLoader;