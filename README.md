# MartClick

O mercado dentro da sua casa — app de lista de compras com entrega em Serrana-SP.

## Como funciona

- **Cliente**: escreve ou dita a lista de compras, vê o total estimado, escolhe a forma de pagamento (PIX, cartão ou link) e acompanha o pedido em tempo real.
- **Wagner (admin)**: painel com kanban de pedidos, lista de compras consolidada e configurações (taxa, mínimo, prazo, parcelas, formas de pagamento).

## Configuração

### 1. Banco de dados (Supabase)
As tabelas `settings` e `orders` já são criadas automaticamente via migração. Não é preciso rodar SQL manualmente.

### 2. Variáveis de ambiente
Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=           # URL do projeto Supabase
VITE_SUPABASE_ANON_KEY=      # Chave anônima do Supabase
```

As seguintes variáveis são usadas apenas nas Edge Functions (configuradas no painel do Supabase ou em `.env` para desenvolvimento):

```
PAY_PROVIDER=mercadopago     # mercadopago | stripe | manual
MP_ACCESS_TOKEN=             # Token do Mercado Pago
SITE_URL=                    # URL pública do app (para webhooks e retornos)
MANUAL_PIX_KEY=              # Chave PIX quando PAY_PROVIDER=manual
STRIPE_SECRET_KEY=           # Secret key do Stripe
```

### 3. Instalar e rodar

```bash
npm install && npm run dev
```

### 4. Criar usuário admin

No painel do Supabase: Authentication > Users > Add user. Use email e senha do Wagner. O login acontece na aba "Wagner" do app.

### 5. Mercado Pago (opcional)

Cadastre o webhook `SUA_URL/functions/v1/webhook` em Webhooks do Mercado Pago (evento: Pagamentos).

## Deploy

O app é publicado direto pelo Bolt. As Edge Functions de pagamento e webhook são deployadas no Supabase automaticamente.

Taxa, mínimo, prazo, parcelas e formas de pagamento: painel do Wagner > Configurações.
