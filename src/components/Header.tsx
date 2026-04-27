import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/firebase';
import { getUserProfile } from '../services/userService';
import { AppNavigationProp } from '../navigation/navigation.types';

const Header: React.FC = () => {
  const [username, setUsername] = useState('Player');
  const [avatar, setAvatar] = useState('');
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile) {
          if (profile.username) setUsername(profile.username);
          if (profile.avatar) setAvatar(profile.avatar);
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <View style={styles.header}>
      <Image
        source={require('../../assets/app-logo.png')}
        style={styles.logo}
        resizeMode="cover"
      />
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingText}>Hey there, {username} <Text style={{fontSize: 18}}>👋</Text></Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Settings' })}>
        <View style={styles.avatarCircle}>
          {avatar ? (
            <Text style={{fontSize: 20}}>{avatar}</Text>
          ) : (
            <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12, // Rounded corners square
    backgroundColor: '#F3F4F6',
  },
  greetingContainer: {
    flex: 1,
    marginLeft: 12,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default Header;