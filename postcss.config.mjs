const config = {
  plugins: [
    "@tailwindcss/postcss",
    // Compile cascade layers into legacy-safe selectors. Chrome versions
    // before 99 ignore @layer blocks, which otherwise removes Tailwind's
    // layout, shadow and responsive utilities altogether.
    "@csstools/postcss-cascade-layers",
  ],
};

export default config;
