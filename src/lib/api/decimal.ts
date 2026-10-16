/** JSON decimals retain the exact digits entered by the operator. */
export class ExactDecimal {
  readonly value: string;
  constructor(value: string) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error('Decimal inválido.');
    this.value = value;
    Object.freeze(this);
  }
  toString() { return this.value; }
}

export function decimal(value: unknown, { allowZero = false }: { allowZero?: boolean } = {}): ExactDecimal {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error('Informe até 12 dígitos inteiros e 6 casas decimais, sem separador de milhar.');
  }
  const result = normalized.replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (!allowZero && Number(result) === 0) throw new Error('A quantidade deve ser maior que zero.');
  return new ExactDecimal(result);
}

export function optionalDecimal(value: unknown, options?: { allowZero?: boolean }): ExactDecimal | null {
  return value == null || String(value).trim() === '' ? null : decimal(value, options);
}

export function stringifyJson(value: unknown): string {
  if (value instanceof ExactDecimal) return value.value;
  if (value === null) return 'null';
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Número inválido.');
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? 'null' : stringifyJson(item)).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => `${JSON.stringify(key)}:${stringifyJson(item)}`).join(',')}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined) throw new Error('Valor JSON inválido.');
  return result;
}

function normalizedNumber(value: string): string {
  if (/[eE]/.test(value)) return value;
  return value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/** Preserve unsafe numeric literals as text instead of rounding warehouse data. */
export function parseJson(source: string): unknown {
  let output = '', index = 0;
  while (index < source.length) {
    if (source[index] === '"') {
      const start = index++;
      while (index < source.length) {
        if (source[index] === '\\') { index += 2; continue; }
        if (source[index++] === '"') break;
      }
      output += source.slice(start, index);
      continue;
    }
    const match = source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (match) {
      const literal = match[0], parsed = Number(literal);
      const safe = Number.isFinite(parsed) && normalizedNumber(String(parsed)) === normalizedNumber(literal);
      output += safe ? literal : JSON.stringify(literal);
      index += literal.length;
    } else output += source[index++];
  }
  return JSON.parse(output);
}
