export interface DniLookupResult {
  fullName?: string;
  age?: number;
  sex?: 'F' | 'M';
}

export async function lookupDni(dni: string): Promise<DniLookupResult> {
  const response = await fetch(`/api/dni/${dni}`);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || 'No se pudo consultar el DNI. Puedes ingresar los datos manualmente.');
  }

  return body as DniLookupResult;
}
