export type SingleFlight = {
  isRunning: () => boolean;
  run: <T>(task: () => Promise<T>) => Promise<T | undefined>;
};

export function createSingleFlight(): SingleFlight {
  let running = false;
  return {
    isRunning: () => running,
    run: async (task) => {
      if (running) {
        return undefined;
      }
      running = true;
      try {
        return await task();
      } finally {
        running = false;
      }
    },
  };
}
