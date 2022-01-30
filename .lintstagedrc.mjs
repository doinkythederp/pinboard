/** @type {Record<string, (filenames: string[]) => string[]>} */
export default {
  '*.{ts,js,json}': (filenames) => [`eslint ${filenames.join(' ')}`, 'tsc']
};
