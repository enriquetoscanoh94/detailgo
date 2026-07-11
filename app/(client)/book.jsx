import { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Image, Alert, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, Header, AppText, Card, Button, Input, SegmentedControl, LoadingState } from '@/components/ui';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscribeActiveServices } from '@/services/serviceService';
import { subscribeActiveExtras } from '@/services/extrasService';
import { subscribeVehicles } from '@/services/vehicleService';
import { subscribeAddresses } from '@/services/addressService';
import { createBooking } from '@/services/bookingService';
import { uploadImageAsync } from '@/services/storageService';
import { vehicleLabel } from './vehicles';
import { BUSINESS } from '@/config/business';
import { PAYMENT_METHOD, isTransferMethod } from '@/constants/payments';
import { computeOrderQuote, itemQuote } from '@/utils/pricing';
import { formatMoney } from '@/utils/money';
import { getBookableDays, getSlotsForDay, formatHour, formatLongDate } from '@/utils/dates';
import { pickImage } from '@/utils/media';
import { colors, spacing, radius } from '@/constants/theme';

const TOTAL_STEPS = 4;
const MAX_CARS = 5;

const typeKey = (type) => `vehicle.type${type === 'suv' ? 'Suv' : type === 'truck' ? 'Truck' : 'Sedan'}`;

/** A selectable row used inside the picker modals. */
function SelectRow({ selected, onPress, title, subtitle, right }) {
  return (
    <Card onPress={onPress} selected={selected} style={styles.selectRow}>
      <View style={styles.flex}>
        <AppText variant="subtitle">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {right ?? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'chevron-forward'}
          size={22}
          color={selected ? colors.primary : colors.border}
        />
      )}
    </Card>
  );
}

/** Multi-select row for an extra service (fixed price, added to the total). */
function ExtraRow({ extra, entry, onPress, onQty }) {
  const selected = !!entry;
  const showStepper = selected && extra.perUnit;
  const badge = selected && extra.perUnit
    ? `+${formatMoney(entry.price)}`
    : extra.perUnit
    ? `+${formatMoney(extra.price)} c/u`
    : `+${formatMoney(extra.price)}`;

  return (
    <Card onPress={onPress} selected={selected} style={styles.extraRow}>
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={22}
        color={selected ? colors.primary : colors.border}
      />
      <View style={styles.flex}>
        <AppText variant="label">{extra.name}</AppText>
        {extra.description ? <AppText variant="caption">{extra.description}</AppText> : null}
        {showStepper ? (
          <View style={styles.stepper}>
            <Pressable onPress={() => onQty(-1)} hitSlop={8} style={styles.stepBtn}>
              <Ionicons name="remove" size={16} color={colors.primary} />
            </Pressable>
            <AppText variant="label">{entry.quantity}</AppText>
            <Pressable onPress={() => onQty(1)} hitSlop={8} style={styles.stepBtn}>
              <Ionicons name="add" size={16} color={colors.primary} />
            </Pressable>
            <AppText variant="caption" muted>
              {entry.quantity === 1 ? 'asiento' : 'asientos'}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.quoteBadge}>
        <AppText variant="caption" color={colors.accent}>{badge}</AppText>
      </View>
    </Card>
  );
}

function EmptyLink({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.emptyLink}>
      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
      <AppText variant="label" color={colors.primary}>{label}</AppText>
    </Pressable>
  );
}

export default function BookScreen() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user, profile } = useAuth();
  const now = useMemo(() => new Date(), []);

  const services = useSubscription((d, e) => subscribeActiveServices(d, e), []);
  const extras = useSubscription((d, e) => subscribeActiveExtras(d, e), []);
  const vehicles = useSubscription((d, e) => subscribeVehicles(user.uid, d, e), [user.uid]);
  const addresses = useSubscription((d, e) => subscribeAddresses(user.uid, d, e), [user.uid]);

  const [step, setStep] = useState(1);
  // Each item = one car + its own package. Up to MAX_CARS in one order.
  const [items, setItems] = useState([{ key: 0, vehicle: null, service: null }]);
  const seq = useMemo(() => ({ n: 1 }), []);
  const [picker, setPicker] = useState({ type: null, index: 0 }); // 'vehicle' | 'service'
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [address, setAddress] = useState(null);
  const [dayType, setDayType] = useState(null);
  const [slot, setSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.ZELLE);
  const [receiptUri, setReceiptUri] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const quote = useMemo(() => computeOrderQuote(items, selectedExtras), [items, selectedExtras]);

  const transferAccount = useMemo(() => {
    if (paymentMethod === PAYMENT_METHOD.VENMO) return { label: t('payment.venmo'), ...BUSINESS.venmo };
    return { label: t('payment.zelle'), ...BUSINESS.zelle };
  }, [paymentMethod, t]);

  // --- Items (cars + packages) ----------------------------------------------
  const addItem = () =>
    setItems((prev) => (prev.length >= MAX_CARS ? prev : [...prev, { key: seq.n++, vehicle: null, service: null }]));
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const setItemField = (index, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));

  const openPicker = (type, index) => setPicker({ type, index });
  const closePicker = () => setPicker({ type: null, index: 0 });

  const allItemsReady = items.length > 0 && items.every((it) => it.vehicle && it.service);

  // --- Extras ---------------------------------------------------------------
  const selectedExtra = (id) => selectedExtras.find((e) => e.id === id);
  const toggleExtra = (extra) =>
    setSelectedExtras((prev) => {
      if (prev.some((e) => e.id === extra.id)) return prev.filter((e) => e.id !== extra.id);
      const unitPrice = Number(extra.price) || 0;
      const unitPay = Number(extra.detailerPay) || 0;
      return [
        ...prev,
        {
          id: extra.id, name: extra.name, perUnit: !!extra.perUnit, unitLabel: extra.unitLabel ?? null,
          unitPrice, unitPay, quantity: 1, price: unitPrice, detailerPay: unitPay,
        },
      ];
    });
  const changeExtraQty = (id, delta) =>
    setSelectedExtras((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const quantity = Math.max(1, (e.quantity || 1) + delta);
        return { ...e, quantity, price: e.unitPrice * quantity, detailerPay: e.unitPay * quantity };
      })
    );

  // --- Schedule -------------------------------------------------------------
  const bookableDays = useMemo(() => getBookableDays(now), [now]);
  const selectedDay = bookableDays.find((d) => d.type === dayType);
  const slots = useMemo(() => (selectedDay ? getSlotsForDay(selectedDay.date, now) : []), [selectedDay, now]);

  const canProceed = () => {
    if (step === 1) return allItemsReady;
    if (step === 2) return !!address;
    if (step === 3) return !!slot;
    return true;
  };

  const goBack = () => {
    setFormError('');
    if (step === 1) {
      router.canGoBack() ? router.back() : router.replace('/(client)/home');
    } else {
      setStep((s) => s - 1);
    }
  };
  const goNext = () => {
    setFormError('');
    if (!canProceed()) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const chooseImage = async () => {
    let fromCamera = false;
    // On web the file picker already offers the gallery/camera, and a multi-
    // button Alert does nothing, so skip the source chooser there.
    if (Platform.OS !== 'web') {
      const source = await new Promise((resolve) => {
        Alert.alert(t('payment.uploadReceipt'), '', [
          { text: '📷', onPress: () => resolve('camera') },
          { text: '🖼️', onPress: () => resolve('library') },
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
        ]);
      });
      if (!source) return;
      fromCamera = source === 'camera';
    }
    const result = await pickImage({ fromCamera });
    if (result.status === 'denied') {
      Alert.alert(t('common.close'), t('error.permissionDenied'));
      return;
    }
    if (result.status === 'ok') setReceiptUri(result.uri);
  };

  const submit = async () => {
    setFormError('');
    const isTransfer = isTransferMethod(paymentMethod);
    if (isTransfer && !receiptUri && confirmationCode.trim() === '') {
      setFormError(t('payment.receiptRequired'));
      return;
    }
    setSubmitting(true);
    try {
      let receiptUrl = null;
      if (isTransfer && receiptUri) {
        receiptUrl = await uploadImageAsync(receiptUri, `receipts/${user.uid}/${Date.now()}.jpg`);
      }
      const id = await createBooking({
        client: { uid: user.uid, name: profile?.name ?? '' },
        items: items.map((it) => ({ vehicle: it.vehicle, service: it.service })),
        extras: selectedExtras,
        address,
        scheduledAt: slot,
        paymentMethod,
        payment: isTransfer ? { receiptUrl, confirmationCode: confirmationCode.trim() || null } : null,
      });
      router.replace(`/(client)/order/${id}`);
    } catch (err) {
      setFormError(t(err.key ?? 'error.generic'));
      setSubmitting(false);
    }
  };

  // Keep the Confirm button disabled until a transfer order has proof of payment
  // (receipt image or confirmation code); cash needs nothing. submit() re-checks
  // this as a backstop, but disabling gives immediate feedback.
  const paymentReady =
    !isTransferMethod(paymentMethod) || !!receiptUri || confirmationCode.trim() !== '';

  const stepTitle = ['', t('booking.stepCars'), t('booking.stepAddress'), t('booking.stepSchedule'), t('booking.stepReview')][step];

  return (
    <Screen padded={false}>
      <View style={styles.headerWrap}>
        <Header title={t('client.bookNow')} showBack onBack={goBack} />
        <View style={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressSeg, i < step && styles.progressSegOn]} />
          ))}
        </View>
        <AppText variant="heading" style={styles.stepTitle}>{stepTitle}</AppText>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1 — Cars + packages (+ extras) */}
        {step === 1 && (
          <>
            {items.map((it, i) => (
              <Card key={it.key} style={styles.itemCard}>
                <View style={styles.itemHead}>
                  <AppText variant="subtitle">{t('booking.carN', { n: i + 1 })}</AppText>
                  {items.length > 1 ? (
                    <Pressable onPress={() => removeItem(i)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>

                <Pressable onPress={() => openPicker('vehicle', i)} style={styles.pickRow}>
                  <Ionicons name="car-outline" size={20} color={colors.primary} />
                  <AppText variant="body" style={styles.flex} color={it.vehicle ? colors.text : colors.textMuted}>
                    {it.vehicle ? vehicleLabel(it.vehicle) : t('booking.pickVehicle')}
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>

                <Pressable onPress={() => openPicker('service', i)} style={styles.pickRow}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                  <AppText variant="body" style={styles.flex} color={it.service ? colors.text : colors.textMuted}>
                    {it.service ? it.service.name : t('booking.pickPackage')}
                  </AppText>
                  {it.service && it.vehicle ? (
                    <AppText variant="label" color={colors.accent}>
                      {formatMoney(itemQuote(it.service, it.vehicle.type).price)}
                    </AppText>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              </Card>
            ))}

            {items.length < MAX_CARS ? (
              <EmptyLink label={t('booking.addCar')} onPress={addItem} />
            ) : null}

            {(extras.data ?? []).length > 0 ? (
              <View style={styles.extrasBlock}>
                <AppText variant="subtitle" style={styles.extrasTitle}>{t('extras.pickTitle')}</AppText>
                <AppText variant="caption" style={styles.extrasHint}>{t('extras.pickHint')}</AppText>
                {extras.data.map((ex) => (
                  <ExtraRow
                    key={ex.id}
                    extra={ex}
                    entry={selectedExtra(ex.id)}
                    onPress={() => toggleExtra(ex)}
                    onQty={(d) => changeExtraQty(ex.id, d)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* STEP 2 — Address */}
        {step === 2 &&
          (addresses.loading ? (
            <LoadingState />
          ) : (
            <>
              {(addresses.data ?? []).map((a) => (
                <SelectRow
                  key={a.id}
                  selected={address?.id === a.id}
                  onPress={() => setAddress(a)}
                  title={a.alias}
                  subtitle={a.fullAddress}
                />
              ))}
              <EmptyLink label={t('address.add')} onPress={() => router.push('/(client)/addresses')} />
            </>
          ))}

        {/* STEP 3 — Schedule */}
        {step === 3 && (
          <>
            <View style={styles.dayRow}>
              {bookableDays.map((d) => (
                <Pressable
                  key={d.type}
                  disabled={!d.available}
                  onPress={() => { setDayType(d.type); setSlot(null); }}
                  style={[styles.dayCard, dayType === d.type && styles.dayCardOn, !d.available && styles.dayCardOff]}
                >
                  <AppText variant="subtitle" color={dayType === d.type ? colors.textOnPrimary : colors.text}>
                    {d.type === 'today' ? t('common.today') : t('common.tomorrow')}
                  </AppText>
                  <AppText variant="caption" color={dayType === d.type ? colors.textOnPrimary : colors.textMuted}>
                    {formatLongDate(d.date, lang)}
                  </AppText>
                  {!d.available ? (
                    <AppText variant="caption" color={colors.danger} style={styles.noSlots}>
                      {t('booking.noSlotsToday')}
                    </AppText>
                  ) : null}
                </Pressable>
              ))}
            </View>

            {selectedDay ? (
              <>
                <AppText variant="label" style={styles.pickTime}>{t('booking.pickTime')}</AppText>
                <View style={styles.slotGrid}>
                  {slots.map((s) => (
                    <Pressable
                      key={s.date.getTime()}
                      disabled={s.disabled}
                      onPress={() => setSlot(s.date)}
                      style={[styles.slot, slot?.getTime() === s.date.getTime() && styles.slotOn, s.disabled && styles.slotOff]}
                    >
                      <AppText
                        variant="label"
                        color={slot?.getTime() === s.date.getTime() ? colors.textOnPrimary : s.disabled ? colors.textMuted : colors.text}
                      >
                        {formatHour(s.date, lang)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}

        {/* STEP 4 — Review & pay */}
        {step === 4 && (
          <>
            <Card style={styles.summary}>
              <SummaryRow label={t('address.title')} value={address?.alias} />
              <SummaryRow
                label={t('booking.scheduledFor')}
                value={slot ? `${formatLongDate(slot, lang)} · ${formatHour(slot, lang)}` : '—'}
              />
              <View style={styles.divider} />
              {quote.lines.map((l, i) => (
                <SummaryRow
                  key={i}
                  label={`${vehicleLabel(l.vehicle)} — ${l.service.name}`}
                  value={formatMoney(l.price)}
                />
              ))}
              {selectedExtras.map((e) => (
                <SummaryRow
                  key={e.id}
                  label={e.perUnit ? `${e.name} × ${e.quantity}` : e.name}
                  value={`+${formatMoney(e.price)}`}
                />
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <AppText variant="subtitle">{t('common.total')}</AppText>
                <AppText variant="title" color={colors.accent}>{formatMoney(quote.total)}</AppText>
              </View>
            </Card>

            <AppText variant="label" style={styles.payLabel}>{t('booking.payMethod')}</AppText>
            <SegmentedControl
              options={[
                { value: PAYMENT_METHOD.ZELLE, label: t('payment.zelle') },
                { value: PAYMENT_METHOD.VENMO, label: t('payment.venmo') },
                { value: PAYMENT_METHOD.CASH, label: t('payment.cash') },
              ]}
              value={paymentMethod}
              onChange={setPaymentMethod}
              style={styles.paySeg}
            />

            {isTransferMethod(paymentMethod) ? (
              <Card style={styles.payBox}>
                <AppText variant="body">
                  {t('payment.transferInstructions', { amount: formatMoney(quote.total), method: transferAccount.label })}
                </AppText>
                <AppText variant="subtitle" color={colors.primary} style={styles.zelleHandle}>{transferAccount.handle}</AppText>
                <AppText variant="caption">{t('payment.zelleAccount', { name: transferAccount.accountName })}</AppText>

                <Pressable onPress={chooseImage} style={styles.uploadBox}>
                  {receiptUri ? (
                    <Image source={{ uri: receiptUri }} style={styles.receiptPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.uploadInner}>
                      <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                      <AppText variant="label" color={colors.primary}>{t('payment.uploadReceipt')}</AppText>
                    </View>
                  )}
                </Pressable>
                {receiptUri ? (
                  <Pressable onPress={chooseImage} hitSlop={8} style={styles.changeReceipt}>
                    <AppText variant="caption" color={colors.primary}>{t('payment.changeReceipt')}</AppText>
                  </Pressable>
                ) : null}

                <Input
                  label={t('payment.confirmationCode')}
                  value={confirmationCode}
                  onChangeText={setConfirmationCode}
                  style={styles.codeInput}
                />
                <AppText variant="caption">{t('payment.pendingReview')}</AppText>
              </Card>
            ) : (
              <Card style={styles.payBox}>
                <View style={styles.cashRow}>
                  <Ionicons name="cash-outline" size={22} color={colors.success} />
                  <AppText variant="body" style={styles.flex}>
                    {t('payment.cashNotice', { amount: formatMoney(quote.total) })}
                  </AppText>
                </View>
              </Card>
            )}
          </>
        )}

        {formError ? (
          <AppText variant="label" color={colors.danger} center style={styles.formError}>{formError}</AppText>
        ) : null}
      </ScrollView>

      {/* Vehicle / service picker */}
      <Modal visible={!!picker.type} animationType="slide" transparent onRequestClose={closePicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <AppText variant="subtitle">
                {picker.type === 'vehicle' ? t('booking.pickVehicle') : t('booking.pickPackage')}
              </AppText>
              <Pressable onPress={closePicker} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
              {picker.type === 'vehicle' ? (
                <>
                  {(vehicles.data ?? []).map((v) => (
                    <SelectRow
                      key={v.id}
                      selected={items[picker.index]?.vehicle?.id === v.id}
                      onPress={() => { setItemField(picker.index, 'vehicle', v); closePicker(); }}
                      title={vehicleLabel(v)}
                      subtitle={t(typeKey(v.type))}
                    />
                  ))}
                  <EmptyLink label={t('vehicle.add')} onPress={() => { closePicker(); router.push('/(client)/vehicles'); }} />
                </>
              ) : (
                (services.data ?? []).map((s) => (
                  <SelectRow
                    key={s.id}
                    selected={items[picker.index]?.service?.id === s.id}
                    onPress={() => { setItemField(picker.index, 'service', s); closePicker(); }}
                    title={s.name}
                    subtitle={`${formatMoney(s.basePrice)} · ${s.durationMinutes || 0} min`}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        {step > 1 && quote.total > 0 ? (
          <View style={styles.footerPrice}>
            <AppText variant="caption">{t('common.total')}</AppText>
            <AppText variant="subtitle" color={colors.accent}>{formatMoney(quote.total)}</AppText>
          </View>
        ) : null}
        {step < TOTAL_STEPS ? (
          <Button title={t('common.continue')} onPress={goNext} disabled={!canProceed()} style={styles.footerBtn} />
        ) : (
          <Button title={t('booking.confirmOrder')} onPress={submit} loading={submitting} disabled={!paymentReady} style={styles.footerBtn} />
        )}
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="caption" style={styles.summaryLabel}>{label}</AppText>
      <AppText variant="label" style={styles.summaryValue} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.lg },
  progress: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegOn: { backgroundColor: colors.primary },
  stepTitle: { marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  itemCard: { gap: spacing.sm },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },

  extrasBlock: { marginTop: spacing.md, gap: spacing.sm },
  extrasTitle: { marginTop: spacing.sm },
  extrasHint: { marginBottom: spacing.xs },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quoteBadge: { backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  stepBtn: { width: 30, height: 30, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  emptyLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md,
  },

  dayRow: { flexDirection: 'row', gap: spacing.md },
  dayCard: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.surface, gap: 2 },
  dayCardOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayCardOff: { opacity: 0.5 },
  noSlots: { marginTop: spacing.xs },
  pickTime: { marginTop: spacing.lg, marginBottom: spacing.sm },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotOff: { backgroundColor: colors.surfaceMuted, opacity: 0.6 },

  summary: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { flexShrink: 0 },
  summaryValue: { flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  payLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  paySeg: { marginBottom: spacing.md },
  payBox: { gap: spacing.sm },
  zelleHandle: { marginTop: spacing.xs },
  uploadBox: {
    marginTop: spacing.md, minHeight: 120, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary,
    borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight,
  },
  uploadInner: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  receiptPreview: { width: '100%', height: 180 },
  changeReceipt: { alignSelf: 'center', paddingVertical: spacing.xs },
  codeInput: { marginTop: spacing.md, marginBottom: 0 },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formError: { marginTop: spacing.md },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.lg, maxHeight: '80%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  modalList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg,
    paddingTop: spacing.md, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface,
  },
  footerPrice: { justifyContent: 'center' },
  footerBtn: { flex: 1 },
});
