create table settings(id int primary key default 1, value jsonb not null default '{}');
create table orders(id uuid primary key, created_at timestamptz default now(), nome text, tel text, endereco text, itens jsonb,
 subtotal numeric, taxa numeric, total numeric, status int default 0, pago boolean default false, forma text);
alter table settings enable row level security; alter table orders enable row level security;
create policy "todos leem config" on settings for select using (true);
create policy "admin config" on settings for all to authenticated using (true) with check (true);
create policy "cliente cria pedido" on orders for insert to anon with check (status=0 and pago=false);
create policy "admin pedidos" on orders for all to authenticated using (true) with check (true);
create function get_order(oid uuid) returns setof orders language sql security definer as $$ select * from orders where id=oid $$;
grant execute on function get_order to anon;
insert into settings values (1,'{"fee":15,"freeAbove":200,"eta":90}');
-- 3 pedidos de demonstração
insert into orders(id,nome,tel,endereco,itens,subtotal,taxa,total,status,pago,forma) values
(gen_random_uuid(),'Dona Cida','16991112222','Rua das Flores, 120 - Centro, Serrana-SP','[{"q":2,"n":"arroz"},{"q":1,"n":"leite integral"},{"q":1,"n":"café"}]',79.5,15,94.5,0,false,'pix'),
(gen_random_uuid(),'Marlene Souza','16993334444','Av. Brasil, 845 - Jd. Primavera, Serrana-SP','[{"q":5,"n":"frango"},{"q":3,"n":"carne"},{"q":2,"n":"feijão"}]',254,0,254,1,true,'credit'),
(gen_random_uuid(),'Joana Lima','16995556666','Rua XV de Novembro, 33 - Serrana-SP','[{"q":12,"n":"ovos"},{"q":1,"n":"pão"}]',177,15,192,3,true,'pix');
