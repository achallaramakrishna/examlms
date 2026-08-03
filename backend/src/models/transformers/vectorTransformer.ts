import { ValueTransformer } from 'typeorm';

/**
 * Converts between a JS number[] and pgvector's text literal representation
 * ("[0.1,0.2,...]"). The actual Postgres column type is `vector(1536)`,
 * created via raw SQL in the migration — TypeORM has no native pgvector
 * column type, so the entity declares it as `text` and this transformer
 * handles the serialization. Postgres coerces the text literal into the
 * column's `vector` type on write via the extension's own input function.
 */
export const vectorTransformer: ValueTransformer = {
  to(value?: number[]): string | undefined {
    return value ? `[${value.join(',')}]` : undefined;
  },
  from(value?: string): number[] | undefined {
    if (!value) return undefined;
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  },
};
