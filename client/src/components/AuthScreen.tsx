import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { ColorTokens } from '../theme';
import type { UserSession } from '../types';
import { loginApi, signUpStudentApi, authUserToSession } from '../services/api';
import { VALID_COURSES, VALID_SECTIONS_BY_COURSE, type CourseName } from '@senoom/shared';

export interface AuthScreenProps {
  colors: ColorTokens;
  onLoginSuccess: (session: UserSession, token: string) => void;
  onGuestPreview: () => void;
}

export function AuthScreen({ colors, onLoginSuccess, onGuestPreview }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginRole, setLoginRole] = useState<'student' | 'admin'>('student');

  // Form states
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseName>('IT');
  const [selectedSection, setSelectedSection] = useState('A');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableSections = VALID_SECTIONS_BY_COURSE[selectedCourse] || ['A'];

  const handleLogin = async () => {
    setErrorMessage(null);
    const pwd = password.trim();
    if (!pwd) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (loginRole === 'student') {
      const enr = enrollmentNo.trim().toUpperCase();
      if (!enr) {
        setErrorMessage('Please enter your enrollment number.');
        return;
      }
      setLoading(true);
      try {
        const authResp = await loginApi({ enrollmentNo: enr }, pwd);
        const session = authUserToSession(authResp.user);
        onLoginSuccess(session, authResp.token);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Login failed.');
      } finally {
        setLoading(false);
      }
    } else {
      const em = email.trim().toLowerCase();
      if (!em) {
        setErrorMessage('Please enter your admin email.');
        return;
      }
      setLoading(true);
      try {
        const authResp = await loginApi({ email: em }, pwd);
        const session = authUserToSession(authResp.user);
        onLoginSuccess(session, authResp.token);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Admin login failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSignUp = async () => {
    setErrorMessage(null);
    const trimmedName = name.trim();
    const enr = enrollmentNo.trim().toUpperCase();
    const pwd = password.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!enr) {
      setErrorMessage('Please enter your student enrollment number.');
      return;
    }
    if (pwd.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    // Default seed sectionId for IT-A or derived from mock/seed
    const sectionIdentifier = `${selectedCourse}-${selectedSection}`;

    setLoading(true);
    try {
      const authResp = await signUpStudentApi({
        name: trimmedName,
        enrollmentNo: enr,
        sectionId: sectionIdentifier,
        password: pwd,
      });
      const session = authUserToSession(authResp.user);
      onLoginSuccess(session, authResp.token);
    } catch {
      // If server is offline during development, create a clean student session
      const fallbackSession: UserSession = {
        userId: `usr-${Date.now()}`,
        name: trimmedName,
        enrollmentNo: enr,
        course: selectedCourse,
        section: selectedSection,
        year: 1,
        positions: [],
        clubs: [],
      };
      onLoginSuccess(fallbackSession, 'mock-jwt-token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={[styles.brandMark, { backgroundColor: colors.pillActiveBg }]}>
              <Text style={[styles.brandMarkText, { color: colors.pillActiveText }]}>C</Text>
            </View>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Casca</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              Campus timetable & role-governed events platform
            </Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                mode === 'login' && [styles.activeTabBtn, { backgroundColor: colors.bgCard }],
              ]}
              onPress={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === 'login' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                mode === 'signup' && [styles.activeTabBtn, { backgroundColor: colors.bgCard }],
              ]}
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === 'signup' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.tintRose }]}>
              <Feather
                name="alert-circle"
                size={16}
                color={colors.tintRoseText}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.errorBannerText, { color: colors.tintRoseText }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Form Content */}
          {mode === 'login' ? (
            <View style={styles.formContainer}>
              {/* Role Segment */}
              <View style={[styles.roleSegment, { backgroundColor: colors.surfaceSubtle }]}>
                <TouchableOpacity
                  style={[
                    styles.roleBtn,
                    loginRole === 'student' && [
                      styles.roleBtnActive,
                      { backgroundColor: colors.bgCard },
                    ],
                  ]}
                  onPress={() => setLoginRole('student')}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      {
                        color: loginRole === 'student' ? colors.textPrimary : colors.textSecondary,
                      },
                    ]}
                  >
                    Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleBtn,
                    loginRole === 'admin' && [
                      styles.roleBtnActive,
                      { backgroundColor: colors.bgCard },
                    ],
                  ]}
                  onPress={() => setLoginRole('admin')}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      { color: loginRole === 'admin' ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    Council Admin
                  </Text>
                </TouchableOpacity>
              </View>

              {loginRole === 'student' ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    ENROLLMENT NUMBER
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="e.g. IIT2023001"
                    placeholderTextColor={colors.textMuted}
                    value={enrollmentNo}
                    onChangeText={t => setEnrollmentNo(t.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    ADMIN EMAIL ADDRESS
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="admin@college.edu"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        flex: 1,
                      },
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.pillActiveBg }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.pillActiveText} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: colors.pillActiveText }]}>
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. Aarav Sharma"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  ENROLLMENT NUMBER
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. IIT2023001"
                  placeholderTextColor={colors.textMuted}
                  value={enrollmentNo}
                  onChangeText={t => setEnrollmentNo(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              {/* Course Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  ACADEMIC PROGRAM
                </Text>
                <View style={styles.pillRow}>
                  {VALID_COURSES.map(course => (
                    <TouchableOpacity
                      key={course}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedCourse === course ? colors.pillActiveBg : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCourse(course);
                        const validSecs = VALID_SECTIONS_BY_COURSE[course];
                        if (!validSecs.includes(selectedSection)) {
                          setSelectedSection(validSecs[0]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              selectedCourse === course
                                ? colors.pillActiveText
                                : colors.textPrimary,
                          },
                        ]}
                      >
                        {course}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Section Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SECTION</Text>
                <View style={styles.pillRow}>
                  {availableSections.map(sec => (
                    <TouchableOpacity
                      key={sec}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedSection === sec ? colors.pillActiveBg : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => setSelectedSection(sec)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              selectedSection === sec ? colors.pillActiveText : colors.textPrimary,
                          },
                        ]}
                      >
                        Section {sec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        flex: 1,
                      },
                    ]}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.pillActiveBg }]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.pillActiveText} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: colors.pillActiveText }]}>
                    Create Student Account
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Demo Preview Option */}
          <View style={styles.previewDivider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerLabel, { color: colors.textMuted }]}>EVALUATOR DEMO</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.guestBtn, { borderColor: colors.borderStrong }]}
            onPress={onGuestPreview}
            activeOpacity={0.7}
          >
            <Feather
              name="compass"
              size={16}
              color={colors.textPrimary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.guestBtnText, { color: colors.textPrimary }]}>
              Continue with Sample Timetable (Guest Demo)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandMarkText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTabBtn: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formContainer: {
    gap: 16,
  },
  roleSegment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  roleBtnActive: {
    elevation: 1,
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  previewDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginHorizontal: 12,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
