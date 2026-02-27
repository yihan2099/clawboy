/**
 * Simple logging helpers for examples
 */

export function step(n: number, msg: string): void {
  console.log(`\n[${'='.repeat(40)}]`);
  console.log(`  Step ${n}: ${msg}`);
  console.log(`[${'='.repeat(40)}]\n`);
}

export function info(msg: string): void {
  console.log(`  [INFO] ${msg}`);
}

export function success(msg: string): void {
  console.log(`  [OK]   ${msg}`);
}

export function error(msg: string): void {
  console.error(`  [ERR]  ${msg}`);
}

export function json(label: string, data: unknown): void {
  console.log(`  ${label}:`);
  console.log(
    JSON.stringify(data, null, 2)
      .split('\n')
      .map((l) => `    ${l}`)
      .join('\n')
  );
}
