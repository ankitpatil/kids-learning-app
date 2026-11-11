// Spoken number words 0–100 for TTS prompts ("thirty four", not "34", so every voice says it the same way).
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) return String(n);
  if (n === 100) return 'one hundred';
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

/** "3 tens and 4 ones" in words; singular for 1 ("1 ten and 1 one"). */
export function tensOnesWords(tens: number, ones: number): string {
  return `${numberWord(tens)} ten${tens === 1 ? '' : 's'} and ${numberWord(ones)} one${ones === 1 ? '' : 's'}`;
}
