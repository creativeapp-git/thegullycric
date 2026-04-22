import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInWithPhone, verifyOTP, setupRecaptcha } from '../services/authService';
import { createUserProfile, getUserProfile } from '../services/userService';
import { ConfirmationResult } from 'firebase/auth';

const PhoneLoginScreen = () => {
  const navigation = useNavigation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    // Setup recaptcha when component mounts
    setupRecaptcha('recaptcha-container');
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const formatPhoneNumber = (number: string) => {
    // Ensure the number starts with +91 for India
    if (number.startsWith('+91')) {
      return number;
    } else if (number.startsWith('91')) {
      return '+' + number;
    } else if (number.startsWith('0')) {
      return '+91' + number.substring(1);
    } else {
      return '+91' + number;
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      console.log('Sending OTP to:', formattedNumber);

      const result = await signInWithPhone(formattedNumber);
      setConfirmationResult(result);
      setOtpSent(true);
      setResendTimer(60); // 60 seconds timer

      Alert.alert('OTP Sent', `OTP has been sent to ${formattedNumber}`);
    } catch (error: any) {
      console.log('Send OTP error:', error);
      let errorMessage = 'Failed to send OTP. Please try again.';

      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Please enter a valid phone number.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    if (!confirmationResult) {
      Alert.alert('Error', 'Please request OTP first');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying OTP...');
      const user = await verifyOTP(confirmationResult, otp);

      // Create user profile if it doesn't exist
      const existingProfile = await getUserProfile(user.uid);
      if (!existingProfile) {
        await createUserProfile(user.uid, {
          name: user.phoneNumber || 'Phone User',
          email: user.email || '',
          phoneNumber: user.phoneNumber,
        });
      }

      console.log('Phone login success:', user);
      Alert.alert('Success', 'Logged in successfully!');
      navigation.replace('Tabs');
    } catch (error: any) {
      console.log('Verify OTP error:', error);
      let errorMessage = 'Invalid OTP. Please try again.';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please request a new one.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (resendTimer === 0) {
      setOtpSent(false);
      setConfirmationResult(null);
      handleSendOTP();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with Phone</Text>

      {!otpSent ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number (10 digits)"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Enter the 6-digit OTP sent to</Text>
          <Text style={styles.phoneText}>{formatPhoneNumber(phoneNumber)}</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, resendTimer > 0 && styles.disabledButton]}
            onPress={handleResendOTP}
            disabled={resendTimer > 0}
          >
            <Text style={[styles.resendText, resendTimer > 0 && styles.disabledText]}>
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back to Login Options</Text>
      </TouchableOpacity>

      {/* Invisible recaptcha container */}
      <View id="recaptcha-container" style={styles.recaptchaContainer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#2196F3',
    fontSize: 14,
  },
  disabledText: {
    color: '#999',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backText: {
    color: '#666',
    fontSize: 14,
  },
  recaptchaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 0,
  },
});

export default PhoneLoginScreen;