<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d4d6d3ec-5267-473d-9e74-248a576da9e8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# App-ICI
# App-ICI

## Consulta de DNI

La consulta usa la API de Factiliza. Su plan gratuito ofrece 100 consultas por mes y requiere crear una cuenta para obtener un token. Copia ese token en `FACTILIZA_API_TOKEN` dentro de `.env.local` (puedes partir de `.env.example`). El token se usa únicamente desde el servidor.

La API puede no incluir fecha de nacimiento ni sexo en su respuesta. En ese caso, esos campos quedan vacíos para que la persona los ingrese; el nombre y los demás datos también se pueden editar.

```sh
npm install
npm run dev
```

Para producción, ejecuta `npm run build` y luego `npm start`. El servidor requiere que `FACTILIZA_API_TOKEN` esté configurado como variable de entorno. La consulta manual sigue disponible sin token.

La API oficial de RENIEC para verificación de datos requiere acceso institucional y cobra por consulta; Factiliza es una alternativa de terceros con cuota gratuita, sujeta a sus límites y condiciones.
