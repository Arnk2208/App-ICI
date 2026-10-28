/** Serialize only plain JSON data so QR readers receive a predictable text payload. */
export function stringifyQrPayload(data: unknown): string {
  const seen = new WeakSet<object>();

  const validate = (value: unknown, path: string): void => {
    if (
      value === undefined ||
      typeof value === 'function' ||
      typeof value === 'symbol' ||
      typeof value === 'bigint'
    ) {
      throw new TypeError(`El valor de QR en "${path}" no se puede serializar como JSON.`);
    }

    if (value === null || typeof value !== 'object') return;
    if (seen.has(value)) {
      throw new TypeError(`Se detectó una referencia circular en "${path}".`);
    }
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => validate(item, `${path}[${index}]`));
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`El valor de QR en "${path}" debe ser un objeto plano.`);
      }
      Object.entries(value).forEach(([key, item]) => validate(item, `${path}.${key}`));
    }

    seen.delete(value);
  };

  validate(data, 'datosTriaje');
  const json = JSON.stringify(data);
  if (typeof json !== 'string') {
    throw new TypeError('No se pudo convertir el triaje a texto JSON.');
  }
  return json;
}

/** Avoid camera OCR classifying a DNI printed beside the QR as a phone number. */
export function maskDniForDisplay(dni: string): string {
  const digits = dni.replace(/\D/g, '');
  if (digits.length < 3) return '••••';
  return `${'•'.repeat(digits.length - 2)}${digits.slice(-2)}`;
}
