import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PhoneCountry } from '../data/phoneCountries';
import { PHONE_COUNTRIES } from '../data/phoneCountries';

type CountryCodeFieldProps = {
  country: PhoneCountry;
  onCountry: (country: PhoneCountry) => void;
  value: string;
  onValue: (value: string) => void;
  placeholder: string;
};

export function CountryCodeField({ country, onCountry, value, onValue, placeholder }: CountryCodeFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const choices = useMemo(
    () => PHONE_COUNTRIES.filter((item) => `${item.name} ${item.dial}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return <>
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Country code ${country.name} ${country.dial}`}
        style={styles.selector}
        onPress={() => { setQuery(''); setOpen(true); }}
      >
        <Text style={styles.selectorText}>{country.flag} {country.dial}⌄</Text>
      </Pressable>
      <TextInput
        style={styles.number}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => onValue(text.replace(/\D/g, '').slice(0, 15))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={15}
      />
    </View>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close country selector" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.heading}>Choose country code</Text>
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search country or code" autoCorrect={false} />
          <ScrollView keyboardShouldPersistTaps="handled">
            {choices.map((item) => <Pressable key={`${item.name}-${item.dial}`} style={styles.choice} onPress={() => { onCountry(item); setOpen(false); }}>
              <Text style={styles.choiceText}>{item.flag}  {item.name}</Text><Text style={styles.dialText}>{item.dial}</Text>
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  selector: { minWidth: 98, padding: 13, borderRadius: 9, borderWidth: 1, borderColor: '#dfe6e8', backgroundColor: 'white', alignItems: 'center' },
  selectorText: { fontSize: 13, color: '#203744', fontWeight: '600' },
  number: { flex: 1, backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, padding: 13, fontSize: 14, color: '#203744' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#101c2880' },
  sheet: { maxHeight: '72%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  heading: { fontSize: 17, fontWeight: '700', color: '#192b3d', marginBottom: 10 },
  search: { borderWidth: 1, borderColor: '#dfe6e8', borderRadius: 9, padding: 12, color: '#203744', marginBottom: 8 },
  choice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderColor: '#edf0f1' },
  choiceText: { fontSize: 14, color: '#203744' },
  dialText: { fontSize: 13, color: '#286c8b', fontWeight: '700' },
});
