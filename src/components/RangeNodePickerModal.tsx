import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Position, RangeNode } from '../types';
import { POSITIONS } from '../types';
import { colors, radius, spacing } from '../theme';
import { AppText } from './primitives';
import { spotTitle } from './labels';

export function RangeNodePickerModal({
  visible,
  nodes,
  selectedNodeId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  nodes: RangeNode[];
  selectedNodeId?: string;
  onSelect: (node: RangeNode) => void;
  onClose: () => void;
}) {
  const grouped = POSITIONS.map((position) => ({
    position,
    nodes: nodes.filter((node) => node.hero === position),
  })).filter((group) => group.nodes.length > 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="black">
              Выберите спот
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              Доступно диапазонов: {nodes.length}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть выбор спота"
            onPress={onClose}
            style={styles.close}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {grouped.map((group) => (
            <NodeGroup
              key={group.position}
              position={group.position}
              nodes={group.nodes}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function NodeGroup({
  position,
  nodes,
  selectedNodeId,
  onSelect,
}: {
  position: Position;
  nodes: RangeNode[];
  selectedNodeId?: string;
  onSelect: (node: RangeNode) => void;
}) {
  return (
    <View style={styles.group}>
      <AppText variant="caption" weight="bold" color={colors.muted} style={styles.groupLabel}>
        {position}
      </AppText>
      {nodes.map((node) => {
        const selected = node.id === selectedNodeId;
        return (
          <Pressable
            key={node.id}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать спот ${spotTitle(node.hero, node.scenario, node.villainPosition)}`}
            accessibilityState={{ selected }}
            onPress={() => onSelect(node)}
            style={({ pressed }) => [
              styles.row,
              selected ? styles.rowSelected : null,
              pressed ? styles.rowPressed : null,
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">
                {spotTitle(node.hero, node.scenario, node.villainPosition)}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {node.stackBB} BB{node.sourceChartId ? ` · чарт #${node.sourceChartId}` : ''}
              </AppText>
            </View>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={selected ? colors.primary : colors.muted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  group: { gap: spacing.sm },
  groupLabel: { letterSpacing: 1 },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowPressed: { opacity: 0.82 },
});
