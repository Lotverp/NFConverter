/**
 * Helper utility to determine input format based on file extension
 * @param {string} filename - The uploaded file's name
 * @returns {string} The detected format identifier
 */
export const detectInputFormat = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  
  switch (ext) {
    case 'mct': return 'mct';
    case 'dump': return 'dump';
    case 'txt': return 'txt';
    case 'bin': return 'bin';
    case 'dmp': return 'dmp';
    case 'nfc': return 'nfc';
    default: return 'mct'; // safe fallback
  }
};

/**
 * Constants defining the available formats in the application.
 * Centralizing these makes the UI easier to maintain and extend.
 */
export const OUTPUT_OPTIONS = [
  { value: 'nfc', label: 'Flipper NFC (.nfc)' },
  { value: 'bin', label: 'Binary Dump (.bin)' },
  { value: 'dmp', label: 'Binary Dump (.dmp)' },
  { value: 'mct', label: 'MCT Format (.mct)' },
  { value: 'dump', label: 'Text Dump (.dump)' },
  { value: 'txt', label: 'Text File (.txt)' }
];
