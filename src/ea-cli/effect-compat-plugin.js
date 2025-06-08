// Using Bun's module resolution capabilities to redirect effect/ReadonlyArray imports

export default {
  name: "effect-compatibility-resolver",
  setup(build) {
    // When effect/ReadonlyArray is imported, redirect to effect/Array
    build.onResolve({ filter: /^effect\/ReadonlyArray$/ }, () => {
      return { path: require.resolve("effect/Array") };
    });
  },
};
