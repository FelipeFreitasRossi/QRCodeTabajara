/** Junta classes CSS ignorando valores falsos: cx('a', cond && 'b'). */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export const formatTable = (n: number) => `Mesa ${String(n).padStart(2, '0')}`
