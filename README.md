# Imagium Foto — Serviço de Busca Facial

Serviço separado, sempre ligado, que faz a busca por rosto. Roda ao
lado do site principal (que continua no Vercel) — os dois se falam
por uma chamada de API simples.

## Deploy no Railway

1. Crie um repositório novo no GitHub (ex: `imagium-face-service`) e
   suba todos os arquivos desta pasta.
2. No Railway (railway.app), crie um projeto novo → "Deploy from
   GitHub repo" → escolha esse repositório. O Railway detecta o
   `Dockerfile` sozinho.
3. Em "Variables", adicione:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `FACE_SERVICE_SECRET` (invente uma senha, só letras/números)
4. Espere o deploy terminar. O Railway te dá uma URL pública (ative
   em Settings → Networking → "Generate Domain", se não tiver uma
   automática).
5. Teste abrindo `https://sua-url.up.railway.app/health` no navegador
   — deve responder `{"status": "ok"}`.

## Conectar ao site principal (Vercel)

No Vercel, adicione duas variáveis novas ao projeto `imagium-foto`:
- `FACE_SERVICE_URL` = a URL do Railway (ex: `https://sua-url.up.railway.app`)
- `FACE_SERVICE_SECRET` = a MESMA senha que você colocou no Railway

O site já vem preparado (rota `/api/face-search`) para chamar esse
serviço automaticamente assim que essas variáveis existirem.
