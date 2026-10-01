# Portal Imagium Foto

Portal interno (administradores, fotógrafos e organizadores). Projeto separado do site do cliente,
usando o mesmo banco Supabase e o mesmo bucket do Cloudflare R2.

## Segurança

- O banco não aceita a chave pública em nenhuma tabela ou função. Tudo passa pelo servidor com a chave secreta,
  e cada página e ação confere antes quem está logado e se a pessoa administra aquele evento.
- Nenhuma variável de ambiente vai para o navegador (nenhuma começa com `NEXT_PUBLIC_`).
- Evento que a pessoa não administra responde "não encontrado" (não revela que existe).
- O portal não é indexado por buscadores e não pode ser embutido em outro site.

## Publicar no Vercel

1. Crie um repositório privado no GitHub (ex.: `imagium-portal`) e envie estes arquivos.
2. No Vercel: Add New → Project → importe o repositório. Framework: Next.js.
3. Em Environment Variables, preencha tudo do `.env.example`.
4. Deploy. Depois, se quiser, ligue um domínio (ex.: `portal.imagiumfoto.com.br`) e atualize `PORTAL_URL`.

## Configurar o Supabase (uma vez)

- Authentication → Sign In / Providers: desligue **Allow new users to sign up**. Contas só são criadas por você.
- Authentication → URL Configuration: em Redirect URLs, adicione `https://SEU-PORTAL/auth/confirm`.
- Authentication → Users → Add user: crie sua conta (marque Auto Confirm User).

## Rodar localmente

```
cp .env.example .env.local   # e preencha
npm install
npm run dev
npm test                     # testes da divisão do valor
```
