import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS as C, API_BASE } from '../../constants';

interface Task {
  id: string;
  icon: string;
  name: string;
  sub: string;
  reward: number;
  rewardType: 'WISH' | 'PTS';
  action: string;
  url?: string;
}

const SOCIAL_TASKS: Task[] = [
  { id: 'twitter', icon: '𝕏', name: 'Twitter', sub: 'Follow on X', reward: 2, rewardType: 'WISH', action: 'Follow', url: 'https://twitter.com/wishnetwork' },
  { id: 'instagram', icon: '📸', name: 'Instagram', sub: 'Follow on Instagram', reward: 2, rewardType: 'WISH', action: 'Follow', url: 'https://instagram.com/wishnetwork' },
  { id: 'telegram', icon: '✈️', name: 'Telegram', sub: 'Follow on Telegram', reward: 2, rewardType: 'WISH', action: 'Follow', url: 'https://t.me/wishnetwork' },
];

const DAILY_TASKS: Task[] = [
  { id: 'daily_login', icon: '📅', name: 'Daily Login', sub: 'Login today for bonus', reward: 80, rewardType: 'PTS', action: 'Claim' },
  { id: 'daily_spin', icon: '🎡', name: 'Daily Spin', sub: 'Use your free spin', reward: 500, rewardType: 'PTS', action: 'Spin' },
  { id: 'daily_share', icon: '🔗', name: 'Share App', sub: 'Share with a friend', reward: 100, rewardType: 'PTS', action: 'Share' },
];

export default function TasksScreen() {
  const { user, updateUser } = useAuth();
  const [done, setDone] = useState<Record<string, boolean>>(user?.tasksDone || {});

  const completeTask = async (task: Task) => {
    if (done[task.id]) return;
    if (task.url) {
      Alert.alert(
        task.name,
        `${task.sub}\n\nYou'll earn +${task.reward} ${task.rewardType} after visiting!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open & Earn',
            onPress: async () => {
              await Linking.openURL(task.url!).catch(() => {});
              markDone(task);
            },
          },
        ]
      );
    } else {
      markDone(task);
    }
  };

  const markDone = async (task: Task) => {
    const newDone = { ...done, [task.id]: true };
    setDone(newDone);
    const updates: any = { tasksDone: newDone };
    if (task.rewardType === 'PTS') {
      updates.pts = (user?.pts ?? 0) + task.reward;
    } else {
      updates.tokens = (user?.tokens ?? 0) + task.reward;
    }
    updateUser(updates);
    try {
      await fetch(`${API_BASE}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user?.id, email: user?.email, ...updates }),
      });
    } catch {}
    Alert.alert('✅ Task Complete!', `+${task.reward} ${task.rewardType} has been added to your account!`);
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const isDone = done[task.id];
    return (
      <View style={[styles.taskRow, isDone && { opacity: 0.8 }]}>
        <View style={styles.taskIcon}>
          <Text style={{ fontSize: 22 }}>{task.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskName, isDone && { opacity: 0.6 }]}>{task.name}</Text>
          <Text style={styles.taskSub}>{task.sub}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={styles.rewardText}>+{task.reward} {task.rewardType}</Text>
          {isDone ? (
            <View style={styles.doneBadge}>
              <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>✓ Done</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.doBtn} onPress={() => completeTask(task)}>
              <Text style={styles.doBtnText}>Do</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const total = SOCIAL_TASKS.length + DAILY_TASKS.length;
  const completed = Object.keys(done).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Wish Network</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        <Text style={styles.sectionLabel}>SOCIAL TASKS</Text>
        {SOCIAL_TASKS.map(task => <TaskRow key={task.id} task={task} />)}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DAILY TASKS</Text>
        {DAILY_TASKS.map(task => <TaskRow key={task.id} task={task} />)}

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.progressSub}>Tasks completed today</Text>
            <Text style={[styles.progressSub, { color: C.brand }]}>{completed}/{total}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completed / total) * 100}%` }]} />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.brand },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.s2, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  taskIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: C.border2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  taskName: { color: C.white, fontWeight: '700', fontSize: 15 },
  taskSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  rewardText: { color: C.gold, fontWeight: '700', fontSize: 13 },
  doBtn: {
    backgroundColor: C.brand, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  doBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },
  doneBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  progressCard: {
    marginTop: 20, backgroundColor: C.s2, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  progressTitle: { color: C.white, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  progressSub: { color: C.muted, fontSize: 12 },
  progressBar: {
    height: 6, backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 3, overflow: 'hidden', marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.brand },
});