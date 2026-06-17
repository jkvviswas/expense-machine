/// <reference types="vite/client" />

/**
 * Allow `import ... from '...?url'` (used to wire the pdfjs worker under Vite).
 * Vite resolves these to a string URL at build time.
 */
declare module '*?url' {
  const src: string;
  export default src;
}
