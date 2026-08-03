/** Converts a JS number[] into pgvector's text literal input format, e.g. "[0.1,0.2,0.3]". */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
