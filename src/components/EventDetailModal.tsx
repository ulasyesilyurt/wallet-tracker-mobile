import React, { useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Linking, StyleSheet, Text } from 'react-native';
import type { WalletHistoryItem } from '../api/events';
import { WalletChip } from './ActivityRow';
import {
  CopyRow,
  LegRow,
  LinkRow,
  MetaRow,
  ResultBlock,
  SheetSectionHeader,
  SheetShell,
  ValueRow,
} from './EventDetailSheetUI';
import { NetworkBadge } from './WalletDetailUI';
import { eventDetailColors as colors } from '../theme/eventDetail';
import {
  resolveEventDetail,
  type EventDetailMeta,
} from '../utils/eventDetailPresentation';

type EventDetailModalProps = {
  event: WalletHistoryItem | null;
  onClose: () => void;
};

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  if (!event) return null;
  return <EventDetailContent key={event.id} event={event} onClose={onClose} />;
}

function EventDetailContent({
  event,
  onClose,
}: {
  event: WalletHistoryItem;
  onClose: () => void;
}) {
  const detail = useMemo(() => resolveEventDetail(event), [event]);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setLinkError(null);
  }, [detail.id]);

  async function openExternalUrl(url: string) {
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError('Could not open this link. Please try again.');
    }
  }

  return (
    <SheetShell
      kind={detail.kind}
      title={detail.title}
      timestamp={detail.timestamp}
      status={detail.status}
      onClose={onClose}
    >
      {detail.result && detail.status ? (
        <ResultBlock
          status={detail.status}
          title={detail.result.title}
          body={detail.result.body}
        />
      ) : detail.value ? (
        <ValueRow value={detail.value} />
      ) : null}

      {detail.legsTitle && detail.legs.length > 0 ? (
        <>
          <SheetSectionHeader title={detail.legsTitle} />
          {detail.legs.map((leg, index) => (
            <LegRow
              key={leg.id}
              leg={leg}
              last={index === detail.legs.length - 1}
            />
          ))}
        </>
      ) : null}

      {detail.meta.length > 0 ? (
        <>
          <SheetSectionHeader title="Details" />
          {detail.meta.map((item, index) => (
            <ResolvedMetaRow
              key={item.id}
              item={item}
              last={index === detail.meta.length - 1}
            />
          ))}
        </>
      ) : null}

      {detail.links.length > 0 ? (
        <>
          <SheetSectionHeader title="Links" />
          {detail.links.map((item, index) => (
            <LinkRow
              key={item.id}
              label={item.label}
              last={index === detail.links.length - 1}
              onPress={() => openExternalUrl(item.url)}
            />
          ))}
        </>
      ) : null}

      {linkError ? <Text style={styles.linkError}>{linkError}</Text> : null}
    </SheetShell>
  );
}

function ResolvedMetaRow({
  item,
  last,
}: {
  item: EventDetailMeta;
  last: boolean;
}) {
  if (item.kind === 'wallet') {
    return item.copyValue ? (
      <CopyRow
        label={item.label}
        display={item.walletName}
        full={item.copyValue}
        monospace={false}
        last={last}
        onCopy={Clipboard.setString}
      >
        <WalletChip
          name={item.walletName}
          fontSize={13}
          color={colors.textPrimary}
        />
      </CopyRow>
    ) : (
      <MetaRow
        label={item.label}
        value={
          <WalletChip
            name={item.walletName}
            fontSize={13}
            color={colors.textPrimary}
          />
        }
        accessibilityValue={item.accessibilityValue}
        last={last}
      />
    );
  }

  if (item.kind === 'network') {
    return (
      <MetaRow
        label={item.label}
        value={<NetworkBadge chainId={item.chainId} />}
        accessibilityValue={item.accessibilityValue}
        last={last}
      />
    );
  }

  return item.copyable ? (
    <CopyRow
      label={item.label}
      display={item.displayValue}
      full={item.fullValue}
      monospace={item.monospace}
      last={last}
      onCopy={Clipboard.setString}
    />
  ) : (
    <MetaRow
      label={item.label}
      value={item.displayValue}
      accessibilityValue={item.fullValue}
      monospace={item.monospace}
      last={last}
    />
  );
}

const styles = StyleSheet.create({
  linkError: {
    marginTop: 12,
    color: colors.negative,
    fontSize: 12.5,
    textAlign: 'center',
  },
});
