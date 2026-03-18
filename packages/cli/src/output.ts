export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_AUTH = 2;
export const EXIT_INPUT = 3;

export function success(data: unknown): never {
  process.stdout.write(JSON.stringify(data) + '\n');
  process.exit(EXIT_SUCCESS);
}

export function error(message: string, code: number = EXIT_ERROR): never {
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(code);
}
