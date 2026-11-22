import react from '@sabha/eslint-config/react';

export default [
  { ignores: ['src/routeTree.gen.ts', '.output/**', '.tanstack/**', '.nitro/**', '.svelte-kit/**'] },
  ...react,
];
