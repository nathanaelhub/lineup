const CHARACTER_COLORS = [
  'var(--color-char-1)',
  'var(--color-char-2)',
  'var(--color-char-3)',
  'var(--color-char-4)',
  'var(--color-char-5)',
  'var(--color-char-6)',
];

const CHARACTER_COLOR_CLASSES = [
  'text-char-1',
  'text-char-2',
  'text-char-3',
  'text-char-4',
  'text-char-5',
  'text-char-6',
];

const CHARACTER_BG_CLASSES = [
  'bg-char-1',
  'bg-char-2',
  'bg-char-3',
  'bg-char-4',
  'bg-char-5',
  'bg-char-6',
];

export function getCharacterColor(character: string, characters: string[]): string {
  const index = characters.indexOf(character);
  return CHARACTER_COLORS[index >= 0 ? index % CHARACTER_COLORS.length : 0];
}

export function getCharacterColorClass(character: string, characters: string[]): string {
  const index = characters.indexOf(character);
  return CHARACTER_COLOR_CLASSES[index >= 0 ? index % CHARACTER_COLOR_CLASSES.length : 0];
}

export function getCharacterBgClass(character: string, characters: string[]): string {
  const index = characters.indexOf(character);
  return CHARACTER_BG_CLASSES[index >= 0 ? index % CHARACTER_BG_CLASSES.length : 0];
}
