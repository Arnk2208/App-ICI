import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(currentDir, '.env.local') });
dotenv.config({ path: path.join(currentDir, '.env') });
const requestCounts = new Map();

app.get('/api/dni/:dni', async (req, res) => {
  const { dni } = req.params;
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos.' });
  }

  const now = Date.now();
  const clientKey = req.ip || 'unknown';
  const recent = (requestCounts.get(clientKey) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 20) {
    return res.status(429).json({ error: 'Se alcanzó el límite temporal de consultas. Intenta más tarde.' });
  }
  requestCounts.set(clientKey, [...recent, now]);

  const token = process.env.FACTILIZA_API_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'La consulta DNI no está configurada. Completa los datos manualmente.' });
  }

  try {
    const response = await fetch(`https://api.factiliza.com/v1/dni/info/${dni}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success !== true || !payload.data) {
      return res.status(response.status === 429 ? 429 : 502).json({
        error: 'No se encontraron datos para ese DNI. Puedes completarlos manualmente.',
      });
    }

    const data = payload.data;
    const fullName = [data.nombres, data.apellido_paterno, data.apellido_materno]
      .filter((part) => typeof part === 'string' && part.trim())
      .join(' ');
    const birthDate = typeof data.fecha_nacimiento === 'string' ? data.fecha_nacimiento : '';
    const birth = birthDate ? new Date(birthDate) : null;
    let age;
    if (birth && !Number.isNaN(birth.getTime())) {
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
    }
    const sexValue = String(data.sexo || '').trim().toUpperCase();
    const sex = sexValue === 'M' || sexValue.startsWith('MASC') ? 'M' : sexValue === 'F' || sexValue.startsWith('FEM') ? 'F' : undefined;

    return res.json({ fullName: fullName || undefined, age, sex });
  } catch {
    return res.status(502).json({ error: 'No se pudo conectar con el servicio. Completa los datos manualmente.' });
  }
});

const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(currentDir, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(currentDir, 'dist', 'index.html')));
  app.listen(port, '0.0.0.0', () => console.log(`App lista en el puerto ${port}`));
} else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  app.listen(port, '0.0.0.0', () => console.log(`App lista en http://localhost:${port}`));
}
