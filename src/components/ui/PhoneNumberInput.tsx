import React from 'react';
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks';
import { FONT_SIZES, SPACING } from '../../constants';

/**
 * Describes the (currently fixed) country-code side of the input. Kept as
 * its own shape — rather than hardcoding "+1"/"🇺🇸" inline — so a future
 * country picker can swap this out per-field without touching any of the
 * formatting/validation logic below.
 */
export interface PhoneCountryPrefix {
  /** E.164 calling code, including the leading "+", e.g. "+1". */
  callingCode: string;
  /** Small flag glyph shown next to the calling code. */
  flagEmoji: string;
  /** Max significant digits accepted for this country (NANP numbers are 10). */
  maxDigits: number;
  /** Formats raw digits into the country's conventional grouping as-you-type. */
  format: (digits: string) => string;
}

// North American Numbering Plan: (XXX) XXX-XXXX, 10 significant digits.
// Shared by both the US and Canada (same calling code + formatting rules),
// so the only thing that actually differs between them is the flag shown.
// Defaults to Canada (🇨🇦) per product requirements — the "+1" calling code
// itself is unchanged either way.
const US_CANADA_PREFIX: PhoneCountryPrefix = {
  callingCode: '+1',
  flagEmoji: '🇨🇦',
  maxDigits: 10,
  format: (digits) => {
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  },
};

// Default flag choices offered for the default +1 prefix — NANP covers both
// the US and Canada under the same calling code/formatting rules, so there's
// no way to tell them apart from the digits alone; the user picks instead.
// Canada listed first to match the default flag above.
const US_CANADA_FLAG_OPTIONS = ['🇨🇦', '🇺🇸'];

// NPA (area code) prefixes assigned to Canada under the shared NANP +1
// calling code — https://en.wikipedia.org/wiki/List_of_Canada_area_codes.
// Used to auto-detect "this is unmistakably a Canadian number" purely from
// the area code the user is typing, and flip the flag to 🇨🇦 automatically
// (e.g. Toronto 416/647/437, Montreal 514/438, Vancouver 604, etc.). There's
// deliberately no equivalent "US-only" list to auto-flip back to 🇺🇸 — area
// codes not in this set are simply ambiguous (could be a US area code, or a
// Canadian one not yet typed in full), so the flag is left as whatever the
// user last had selected (or the 🇨🇦 default) rather than guessing wrong.
const CANADIAN_AREA_CODES = new Set([
  '204', '226', '236', '249', '250', '263', '289',
  '306', '343', '354', '365', '367', '368', '387',
  '403', '416', '418', '431', '437', '438', '450', '460', '468',
  '506', '514', '519', '531', '548', '579', '581', '584', '587',
  '604', '613', '639', '647', '672', '683',
  '705', '709', '710', '742', '753', '778', '780', '782',
  '807', '819', '825', '867', '873', '879',
  '902', '905',
]);

/** Strips every non-digit character, e.g. pasted/typed "(415) 555-2671". */
const onlyDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Best-effort extraction of the national-significant digits from an E.164
 * string for a given prefix, used to seed the field from a `value` prop
 * (e.g. "+14155552671" + "+1" -> "4155552671"). Falls back to stripping all
 * non-digits (and the calling code's digits, if present) so pasting a
 * formatted number or a bare local number both work.
 *
 * Whether to strip the leading calling-code digits is decided by checking
 * for a literal "+<callingCode>" prefix on the raw string — NOT by digit
 * count. A digit-count heuristic (e.g. "only strip if there are more total
 * digits than `maxDigits`") is ambiguous for partial/in-progress numbers:
 * this component always emits its own partial value as `${callingCode}${digits}`
 * (e.g. typing just "4" emits "+14"), and many parents round-trip that
 * straight back in as `value`. "+14" only has 2 digits — nowhere near
 * `maxDigits` (10) — so a count-based check would never strip the "1",
 * which then gets misread as part of the national number, compounding into
 * garbage (e.g. "416" progressively corrupting into "(114) 16") every time
 * the echoed `value` round-trips through this parser.
 */
function digitsFromE164(value: string | undefined, prefix: PhoneCountryPrefix): string {
  if (!value) return '';
  const trimmed = value.trim();
  const digits = onlyDigits(trimmed);
  if (trimmed.startsWith(prefix.callingCode)) {
    const callingCodeDigits = onlyDigits(prefix.callingCode);
    return digits.slice(callingCodeDigits.length, callingCodeDigits.length + prefix.maxDigits);
  }
  return digits.slice(0, prefix.maxDigits);
}

interface PhoneNumberInputProps {
  label?: string;
  /** Prefilled value, accepted as a full E.164 string (e.g. "+14155552671")
   * or a bare national number — only the digits are used. */
  value?: string;
  /**
   * Fired on every keystroke with the number re-assembled as a fully
   * qualified E.164 string (e.g. "+14155552671"), ready to hand straight to
   * a backend API. `isComplete` tells you whether all digits have been
   * entered yet — `e164` is still returned while incomplete (e.g.
   * "+1415555") so the parent can keep its own draft state in sync, but it
   * should only be persisted/submitted once `isComplete` is true.
   */
  onChangeText: (e164: string, isComplete: boolean) => void;
  /** Called once when the number first becomes fully qualified. */
  onComplete?: (e164: string) => void;
  /** Externally-driven error (e.g. server-side validation) — always forces
   * the red error border + message, regardless of local completeness. */
  error?: string;
  /** Swap in a different country's prefix later; defaults to US/Canada. */
  prefix?: PhoneCountryPrefix;
  /**
   * Flag glyphs the user can toggle between for this calling code (e.g. a
   * +1 number could be a US or a Canadian subscriber — the digits alone
   * can't tell you which). Tapping the flag opens a small picker when more
   * than one option is given. Defaults to US + Canada for the default +1
   * `prefix`, or just that prefix's own single flag otherwise. Purely
   * cosmetic — it has no effect on `onChangeText`'s E.164 output.
   */
  flagOptions?: string[];
  /** Fired whenever the user picks a different flag from the picker. */
  onChangeFlag?: (flagEmoji: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Single-border, horizontal phone number field: a non-editable "🇨🇦 +1"
 * prefix on the left (rendered as plain `Text`, never part of the editable
 * string — so it can't be deleted or typed over) and a `phone-pad` number
 * field on the right that auto-formats as the user types:
 * "(415) 555-2671". Reports changes to the parent as a fully qualified
 * E.164 string, e.g. "+14155552671". Defaults to Canada (🇨🇦) for the shared
 * +1/NANP prefix; when `flagOptions` has more than one entry, the flag
 * itself is tappable and opens a small picker (US vs. Canada), and typing a
 * recognizable Canadian area code (416, 647, 905, 514, ...) automatically
 * flips the flag to 🇨🇦 even without the user opening the picker.
 */
export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  label,
  value,
  onChangeText,
  onComplete,
  error,
  prefix = US_CANADA_PREFIX,
  flagOptions,
  onChangeFlag,
  placeholder = '(555) 123-4567',
  autoFocus,
  disabled,
  containerStyle,
}) => {
  const { colors } = useTheme();
  const [digits, setDigits] = React.useState(() => digitsFromE164(value, prefix));
  const [focused, setFocused] = React.useState(false);
  const wasCompleteRef = React.useRef(false);

  const resolvedFlagOptions =
    flagOptions ?? (prefix.callingCode === '+1' ? US_CANADA_FLAG_OPTIONS : [prefix.flagEmoji]);
  const canPickFlag = resolvedFlagOptions.length > 1;
  const [selectedFlag, setSelectedFlag] = React.useState(() =>
    resolvedFlagOptions.includes(prefix.flagEmoji) ? prefix.flagEmoji : resolvedFlagOptions[0]
  );
  const [flagPickerOpen, setFlagPickerOpen] = React.useState(false);

  const handleSelectFlag = (flagEmoji: string) => {
    setSelectedFlag(flagEmoji);
    setFlagPickerOpen(false);
    onChangeFlag?.(flagEmoji);
  };

  // Re-sync from a parent-driven `value` change (e.g. backend data arriving
  // after mount, or the form being reset) without clobbering what the user
  // is actively typing on every render.
  React.useEffect(() => {
    setDigits(digitsFromE164(value, prefix));
  }, [value, prefix]);

  const isComplete = digits.length === prefix.maxDigits;
  const hasIncompleteDraft = digits.length > 0 && !isComplete;
  // Only nag about an incomplete number once the user has looked away —
  // not on every keystroke while they're still in the middle of typing it.
  const showIncompleteError = hasIncompleteDraft && !focused;
  const errorMessage = error ?? (showIncompleteError ? 'Enter a complete 10-digit phone number' : undefined);
  const isError = Boolean(errorMessage);

  const borderColor = isError ? colors.error : focused ? colors.primary : colors.border;

  const handleChangeText = (raw: string) => {
    const nextDigits = onlyDigits(raw).slice(0, prefix.maxDigits);
    setDigits(nextDigits);

    // Area-code dynamic matching: as soon as a recognizable Canadian area
    // code has been typed (e.g. 416, 647, 905, 514...), flip the flag to
    // 🇨🇦 automatically so it's always accurate without the user having to
    // manually open the picker. See `CANADIAN_AREA_CODES` for why this is
    // one-directional (never auto-flips to 🇺🇸).
    if (canPickFlag && nextDigits.length >= 3) {
      const areaCode = nextDigits.slice(0, 3);
      if (CANADIAN_AREA_CODES.has(areaCode) && selectedFlag !== '🇨🇦') {
        setSelectedFlag('🇨🇦');
        onChangeFlag?.('🇨🇦');
      }
    }

    const e164 = `${prefix.callingCode}${nextDigits}`;
    const complete = nextDigits.length === prefix.maxDigits;
    onChangeText(e164, complete);

    if (complete && !wasCompleteRef.current) {
      onComplete?.(e164);
    }
    wasCompleteRef.current = complete;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <RNText style={[styles.label, { color: colors.text }]}>{label}</RNText> : null}
      <View style={styles.fieldWrapper}>
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: disabled ? colors.border + '22' : colors.background,
          },
          focused && styles.fieldFocused,
        ]}
      >
        <View style={styles.prefix}>
          {canPickFlag ? (
            <Pressable
              onPress={() => setFlagPickerOpen((open) => !open)}
              hitSlop={8}
              style={styles.flagButton}
              disabled={disabled}
            >
              <RNText style={styles.flag}>{selectedFlag}</RNText>
              <RNText style={[styles.flagCaret, { color: colors.text }]}>▾</RNText>
            </Pressable>
          ) : (
            <RNText style={styles.flag}>{selectedFlag}</RNText>
          )}
          <RNText style={[styles.callingCode, { color: colors.text }]}>
            {prefix.callingCode}
          </RNText>
        </View>
        <View style={[styles.divider, { backgroundColor: '#ccc' }]} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={prefix.format(digits)}
          onChangeText={handleChangeText}
          onFocus={() => {
            setFocused(true);
            setFlagPickerOpen(false);
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.border}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus={autoFocus}
          editable={!disabled}
          maxLength={14} // formatted length cap: "(XXX) XXX-XXXX" == 14 chars
        />
      </View>
      {canPickFlag && flagPickerOpen ? (
        <View
          style={[
            styles.flagDropdown,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {resolvedFlagOptions.map((flagEmoji) => (
            <Pressable
              key={flagEmoji}
              onPress={() => handleSelectFlag(flagEmoji)}
              style={[
                styles.flagOption,
                flagEmoji === selectedFlag && { backgroundColor: colors.primary + '1A' },
              ]}
            >
              <RNText style={styles.flag}>{flagEmoji}</RNText>
            </Pressable>
          ))}
        </View>
      ) : null}
      </View>
      {errorMessage ? (
        <RNText style={[styles.error, { color: colors.error }]}>{errorMessage}</RNText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  fieldWrapper: {
    position: 'relative',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    overflow: 'hidden',
  },
  fieldFocused: {
    borderWidth: Platform.OS === 'ios' ? 1.5 : 1,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: SPACING.sm,
  },
  flagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flagCaret: {
    fontSize: 10,
  },
  flagDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 56,
    zIndex: 20,
    elevation: 6,
  },
  flagOption: {
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: SPACING.sm,
  },
  flag: {
    fontSize: FONT_SIZES.md,
    textAlignVertical: 'center',
  },
  callingCode: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: FONT_SIZES.md,
  },
  error: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
});

