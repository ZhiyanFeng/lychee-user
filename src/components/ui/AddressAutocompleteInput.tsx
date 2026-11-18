import React from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import GooglePlacesSDK, {
  PLACE_FIELDS,
  type PlacePrediction,
} from 'react-native-google-places-sdk';
import { useTheme } from '../../hooks';
import { FONT_SIZES, SPACING } from '../../constants';

/**
 * Structured place data resolved from a Google Places "Place Details" call,
 * shaped to line up 1:1 with the backend `addresses` table's Google-derived
 * columns: google_place_id, formatted_address, latitude, longitude,
 * postal_code, city, state_province, country.
 */
export interface GooglePlaceSelection {
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  /**
   * `street_number` + `route` joined (e.g. "123 Main St"), for callers that
   * need a plain street-line field (vs. the full `formattedAddress` blob) —
   * e.g. `SmallMovingWizardScreen`'s flat `RfqAddressInput` shape. Falls
   * back to `undefined` if Google didn't return either component (rare,
   * but happens for some rural/PO-box addresses), in which case callers
   * should fall back to `formattedAddress`.
   */
  streetAddress?: string;
}

interface AddressComponentLike {
  name?: string;
  shortName?: string;
  types: string[];
}

// Parses the SDK's `addressComponents` array into the discrete fields the
// backend needs for tax/dispatch logic (postal_code, city, state_province,
// country), rather than storing only the opaque `formattedAddress` blob.
function parseAddressComponents(components: AddressComponentLike[] | null = []) {
  const findByType = (type: string) =>
    (components ?? []).find((c) => c.types?.includes(type));

  const streetNumber = findByType('street_number')?.name;
  const route = findByType('route')?.name;
  const streetAddress = [streetNumber, route].filter(Boolean).join(' ') || undefined;

  return {
    postalCode: findByType('postal_code')?.name,
    city: findByType('locality')?.name ?? findByType('postal_town')?.name,
    stateProvince: findByType('administrative_area_level_1')?.name,
    country: findByType('country')?.name,
    streetAddress,
  };
}

const DETAIL_FIELDS = [
  PLACE_FIELDS.PLACE_ID,
  PLACE_FIELDS.FORMATTED_ADDRESS,
  PLACE_FIELDS.COORDINATE,
  PLACE_FIELDS.ADDRESS_COMPONENTS,
];

interface AddressAutocompleteInputProps {
  label: string;
  placeholder: string;
  /** Prefill text, e.g. a previously-selected `formattedAddress`. */
  value?: string;
  /**
   * Fired only once the user picks a suggestion and its Place Details have
   * been resolved — this is the point at which we have all the NOT NULL
   * columns (`google_place_id`, `formatted_address`, `latitude`,
   * `longitude`) required to persist an address row.
   */
  onSelectPlace: (place: GooglePlaceSelection) => void;
  /**
   * Stacking order for the suggestion dropdown. When rendering multiple
   * autocomplete fields stacked vertically (e.g. pickup above destination),
   * give the upper field a higher zIndex so its dropdown isn't clipped by
   * the field(s) below it.
   */
  zIndex?: number;
}

/**
 * Google Places–backed address input used by the moving-request wizard's
 * "from"/"to" address fields. Built on the native `react-native-google-places-sdk`
 * (Places SDK for Android/iOS) rather than a raw REST call, so the API key
 * can be restricted to "Android apps"/"iOS apps" in Google Cloud Console
 * (the SDK attaches this app's package name/bundle ID + signing certificate
 * to every request — see `GooglePlacesSDK.initialize()` in `app/_layout.tsx`).
 */
export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  label,
  placeholder,
  value,
  onSelectPlace,
  zIndex = 1,
}) => {
  const { colors } = useTheme();
  const [text, setText] = React.useState(value ?? '');
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setText(value ?? '');
  }, [value]);

  const runPrediction = React.useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const results = await GooglePlacesSDK.fetchPredictions(query);
      setPredictions(results);
      setShowDropdown(results.length > 0);
      setApiError(null);
    } catch (error: any) {
      console.warn('Google Places SDK fetchPredictions error:', error);
      const message = String(error?.message ?? error);
      if (message.match(/API_KEY|REQUEST_DENIED|not authorized|NOT_INITIALIZED/i)) {
        setApiError(
          'Address search is misconfigured (API key rejected by Google — check ' +
            'Android/iOS app restrictions + SHA-1/bundle ID in Google Cloud Console).'
        );
      } else {
        setApiError('Address search is temporarily unavailable. You can still type the address manually.');
      }
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (newText: string) => {
    setText(newText);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPrediction(newText), 300);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setShowDropdown(false);
    setText(prediction.description);
    setLoading(true);
    try {
      const place = await GooglePlacesSDK.fetchPlaceByID(prediction.placeID, DETAIL_FIELDS);
      if (!place.coordinate || !place.placeID) {
        console.warn('Google Places SDK: missing coordinate/placeID for selection', place);
        return;
      }
      const parsed = parseAddressComponents(
        place.addressComponents as unknown as AddressComponentLike[] | null
      );
      onSelectPlace({
        googlePlaceId: place.placeID,
        formattedAddress: place.formattedAddress || prediction.description,
        latitude: place.coordinate.latitude,
        longitude: place.coordinate.longitude,
        ...parsed,
      });
      setApiError(null);
      GooglePlacesSDK.startNewSession();
    } catch (error: any) {
      console.warn('Google Places SDK fetchPlaceByID error:', error);
      setApiError('Could not resolve the selected address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { zIndex }]}>
      <RNText style={[styles.label, { color: colors.text }]}>{label}</RNText>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.border}
        value={text}
        onChangeText={handleChangeText}
        onFocus={() => setShowDropdown(predictions.length > 0)}
      />
      {loading && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      )}
      {showDropdown && predictions.length > 0 && (
        <View
          style={[
            styles.listView,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {/*
            Plain ScrollView + .map() instead of FlatList: this dropdown is
            rendered inside the wizard's outer (vertical) ScrollView
            (moving-request/index.tsx), and nesting a VirtualizedList-backed
            component (FlatList/SectionList) inside a plain ScrollView with
            the same scroll orientation breaks windowing/other functionality
            (React Native's own "VirtualizedLists should never be nested..."
            warning). Google Places predictions are capped at a small,
            bounded count (~5), so virtualization buys nothing here anyway —
            a plain scrollable list is both correct and simpler.
          */}
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {predictions.map((item) => (
              <Pressable
                key={item.placeID}
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectPrediction(item)}
              >
                <RNText style={{ color: colors.text, fontWeight: '600' }}>
                  {item.primaryText}
                </RNText>
                {item.secondaryText ? (
                  <RNText style={{ color: colors.text, opacity: 0.7, fontSize: FONT_SIZES.xs }}>
                    {item.secondaryText}
                  </RNText>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {apiError && (
        <RNText style={[styles.errorText, { color: '#FF3B30' }]}>{apiError}</RNText>
      )}
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
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
    height: 44,
  },
  loader: {
    position: 'absolute',
    right: SPACING.md,
    top: 34,
  },
  listView: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: SPACING.xs,
    maxHeight: 220,
  },
  row: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
});

