import { AppError } from "./errors";
// A publication timeout is an uncertain result, so callers retain the same
// durable/provider idempotency key when retrying.
export async function within<T>(task: Promise<T>, milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new AppError(
                "PROVIDER_TIMEOUT",
                "Provider request timed out",
                503,
              ),
            ),
          milliseconds,
        );
        timer.unref();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
