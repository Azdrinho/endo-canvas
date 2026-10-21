import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The card generators measure text with a canvas and sanitize through
    // DOMPurify, so they need a document. jsdom has no 2D context, which the
    // generators already handle (they catch and fall back to a fixed size) --
    // that fallback is deterministic, which is what a snapshot wants.
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
