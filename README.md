# MartClick
1. Supabase: crie o projeto, rode `supabase/schema.sql` no SQL Editor e crie o usuário do Wagner em Authentication > Users.
2. Copie `.env.example` para `.env` e preencha. `npm install && npm run dev` (use `vercel dev` para testar as rotas /api).
3. Vercel: importe o repositório e cadastre as mesmas variáveis. Em PAY_PROVIDER escolha a instituição.
4. Mercado Pago: cadastre `SITE_URL/api/webhook` em Webhooks (evento Pagamentos).
Taxa, mínimo, prazo, parcelas e formas de pagamento: painel do Wagner > Configurações.
