import React, { useState } from 'react';
import { View, Text, Pressable, Switch, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SpecialtyItem } from '../../store/slices/movingRequestSlice';
import type { AdditionalServiceType } from '../../types';
import { DatePickerModal } from './DatePickerModal';
import { SpecialtyItemsFields } from './SpecialtyItemsFields';
import { formatDisplayDate } from '../../utils/date';

const TIME_WINDOW_OPTIONS: { label: string; hours: string; value: string }[] = [
  { label: 'Morning', hours: '8am–12pm', value: 'Morning' },
  { label: 'Afternoon', hours: '12pm–4pm', value: 'Afternoon' },
  { label: 'Evening', hours: '4pm–8pm', value: 'Evening' },
];

// Display label <-> backend `AdditionalServiceType` enum value for the 4
// "Additional Services" chips. Kept as a single source of truth here so the
// UI label and the value actually sent in the RFQ payload never drift apart.
const ADDITIONAL_SERVICE_OPTIONS: { label: string; value: AdditionalServiceType }[] = [
  { label: 'Furniture Disassembly', value: 'FURNITURE_DISASSEMBLY' },
  { label: 'Packing Help', value: 'PACKING_HELP' },
  { label: 'Moving Blankets', value: 'MOVING_BLANKETS' },
  { label: 'Boxes & Supplies', value: 'BOXES_SUPPLIES' },
];

const QUICK_NOTE_PHRASES = ['Elevator booked', 'Fragile items', 'Narrow hallway'];

// Fallback handler when `showSpecialtyItems` is false and a caller omits the
// specialty-item props entirely — never actually invoked, since the fields
// that would call it aren't rendered in that case.
function NOOP() {}

interface Step2ScheduleProps {
  moveDate: string;
  onChangeMoveDate: (value: string) => void;
  timeWindow: string;
  onChangeTimeWindow: (value: string) => void;
  notes: string;
  onChangeNotes: (text: string) => void;
  /**
   * Hides the heavy/special items list entirely (e.g. `SmallMovingWizardScreen`,
   * which doesn't collect specialty items). Defaults to `true` so the
   * Residential wizard (`BookingFlow`), which always passes every
   * specialty-item prop below, is unaffected.
   */
  showSpecialtyItems?: boolean;
  specialtyItems?: SpecialtyItem[];
  onAddSpecialtyItem?: (item: SpecialtyItem) => void;
  onRemoveSpecialtyItem?: (index: number) => void;
  specialtyItemDraftName?: string;
  onChangeSpecialtyItemDraftName?: (name: string) => void;
  specialtyItemDraftQuantity?: number;
  onChangeSpecialtyItemDraftQuantity?: (quantity: number) => void;
  /**
   * Step 2's "Flexible with move date (±2 days)" switch and "Additional
   * Services" chips, lifted to the caller so they can be included in the
   * RFQ submission payload (`isFlexibleDate`/`additionalServices`). Both
   * are optional and fall back to local component state when omitted, so
   * any caller that doesn't need to persist them still works unchanged.
   */
  isFlexibleDate?: boolean;
  onChangeIsFlexibleDate?: (value: boolean) => void;
  additionalServices?: AdditionalServiceType[];
  onToggleAdditionalService?: (service: AdditionalServiceType) => void;
}

/**
 * Step 2 of the booking wizard — "Schedule & Details": three bordered
 * NativeWind cards mirroring Step 1's "Pickup & Route" aesthetic, so the
 * screen reads as one consistent design language rather than a plain form:
 *   1. Schedule — move date (calendar sheet), a segmented Morning/
 *      Afternoon/Evening time window, and a "Flexible with date" switch.
 *   2. Extra Help & Special Items — multi-select "Additional Services"
 *      chips plus the structured heavy/special items list (via
 *      `<SpecialtyItemsFields />`, hidden entirely when `showSpecialtyItems`
 *      is false).
 *   3. Notes for Movers — free-text notes plus quick-append chips that
 *      insert a common phrase instead of requiring it to be typed out.
 *
 * "Additional Services" and "Flexible with date" map 1:1 onto the backend's
 * `additionalServices`/`isFlexibleDate` RFQ fields — see
 * `ADDITIONAL_SERVICE_OPTIONS` above for the label<->enum-value mapping.
 *
 * Destination move scope + access details used to live here but now live
 * on the "Pickup & Route" step (`<Step1Locations />`), right below the
 * destination address, so both ends of the move are configured on the same
 * screen.
 */
export function Step2Schedule({
  moveDate,
  onChangeMoveDate,
  timeWindow,
  onChangeTimeWindow,
  notes,
  onChangeNotes,
  showSpecialtyItems = true,
  specialtyItems,
  onAddSpecialtyItem,
  onRemoveSpecialtyItem,
  specialtyItemDraftName,
  onChangeSpecialtyItemDraftName,
  specialtyItemDraftQuantity,
  onChangeSpecialtyItemDraftQuantity,
  isFlexibleDate: isFlexibleDateProp,
  onChangeIsFlexibleDate,
  additionalServices: additionalServicesProp,
  onToggleAdditionalService,
}: Step2ScheduleProps) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isFlexibleDateState, setIsFlexibleDateState] = useState(false);
  const [additionalServicesState, setAdditionalServicesState] = useState<AdditionalServiceType[]>(
    []
  );

  // Controlled-with-fallback: use the caller's state/handler if provided,
  // otherwise fall back to local state so Step2Schedule still works
  // standalone (e.g. if a future caller doesn't need to persist these).
  const isFlexibleDate = isFlexibleDateProp ?? isFlexibleDateState;
  const setIsFlexibleDate = onChangeIsFlexibleDate ?? setIsFlexibleDateState;
  const selectedServices = additionalServicesProp ?? additionalServicesState;

  const toggleService = (service: AdditionalServiceType) => {
    if (onToggleAdditionalService) {
      onToggleAdditionalService(service);
      return;
    }
    setAdditionalServicesState((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
    );
  };

  const appendQuickNote = (phrase: string) => {
    const addition = `+ ${phrase}`;
    onChangeNotes(notes.trim().length > 0 ? `${notes.trim()}\n${addition}` : addition);
  };

  return (
    <View>
      {/* Card 1: Schedule */}
      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <Text className="text-sm font-semibold text-gray-900 mb-2">Move Date</Text>
        <Pressable
          onPress={() => setDatePickerVisible(true)}
          className="flex-row items-center justify-between border border-gray-200 rounded-xl px-4 h-11 mb-4"
        >
          <View className="flex-row items-center gap-2">
            <Feather name="calendar" size={18} color="#374151" />
            <Text className={`ml-2 text-base ${moveDate ? 'text-gray-900' : 'text-gray-500'}`}>
              {formatDisplayDate(moveDate)}
            </Text>
          </View>
          <Text className="text-gray-500">▼</Text>
        </Pressable>
        <DatePickerModal
          visible={datePickerVisible}
          value={moveDate}
          onSelect={onChangeMoveDate}
          onClose={() => setDatePickerVisible(false)}
        />

        <Text className="text-sm font-semibold text-gray-900 mb-2">Time Window</Text>
        <View className="flex-row border border-gray-200 rounded-xl overflow-hidden mb-4">
          {TIME_WINDOW_OPTIONS.map((option, index) => {
            const selected = option.value === timeWindow;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChangeTimeWindow(option.value)}
                className={`flex-1 items-center justify-center py-2 ${
                  selected ? 'bg-blue-600' : 'bg-white'
                } ${index > 0 ? 'border-l border-gray-200' : ''}`}
              >
                <Text className={`font-semibold ${selected ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </Text>
                <Text className={`text-xs ${selected ? 'text-white' : 'text-gray-500'}`}>
                  {option.hours}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center justify-between pt-3 border-t border-gray-200">
          <Text className="text-base text-gray-900 flex-1 pr-2">
            Flexible with move date (±2 days)
          </Text>
          <Switch value={isFlexibleDate} onValueChange={setIsFlexibleDate} />
        </View>
      </View>

      {/* Card 2: Extra Help & Special Items */}
      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <Text className="text-sm font-semibold text-gray-900 mb-2">Additional Services</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {ADDITIONAL_SERVICE_OPTIONS.map((service) => {
            const selected = selectedServices.includes(service.value);
            return (
              <Pressable
                key={service.value}
                onPress={() => toggleService(service.value)}
                className={`rounded-full border px-3 py-2 ${
                  selected ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
                  {service.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showSpecialtyItems && (
          <SpecialtyItemsFields
            items={specialtyItems ?? []}
            onAdd={onAddSpecialtyItem ?? NOOP}
            onRemove={onRemoveSpecialtyItem ?? NOOP}
            draftName={specialtyItemDraftName ?? ''}
            onChangeDraftName={onChangeSpecialtyItemDraftName ?? NOOP}
            draftQuantity={specialtyItemDraftQuantity ?? 1}
            onChangeDraftQuantity={onChangeSpecialtyItemDraftQuantity ?? NOOP}
          />
        )}
      </View>

      {/* Card 3: Notes for Movers */}
      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <Text className="text-sm font-semibold text-gray-900 mb-2">Notes for Movers (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="e.g. Please bring extra movers, gate code is 1234..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          className="min-h-[100px] border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-3"
          style={{ textAlignVertical: 'top' }}
        />
        <View className="flex-row flex-wrap gap-2">
          {QUICK_NOTE_PHRASES.map((phrase) => (
            <Pressable
              key={phrase}
              onPress={() => appendQuickNote(phrase)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
            >
              <Text className="text-xs font-medium text-gray-700">+ {phrase}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
