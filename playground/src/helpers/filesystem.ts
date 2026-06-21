// Shared Filesystem option constants for playground file operation forms.
export const DIRECTORIES = [
  { value: '',                label: '(absolute path)' },
  { value: 'DOCUMENTS',      label: 'DOCUMENTS' },
  { value: 'DATA',           label: 'DATA (userData)' },
  { value: 'LIBRARY',        label: 'LIBRARY (userData)' },
  { value: 'CACHE',          label: 'CACHE (temp)' },
  { value: 'EXTERNAL',       label: 'EXTERNAL (downloads)' },
  { value: 'EXTERNAL_STORAGE', label: 'EXTERNAL_STORAGE (downloads)' },
] as const;
