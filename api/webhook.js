// Mercado Pago avisa aqui; confirmamos o pagamento na API deles e marcamos o pedido como pago.
export default async function handler(req,res){
 const id=req.body?.data?.id||req.query['data.id'];if(!id)return res.status(200).end()
 const p=await(await fetch('https://api.mercadopago.com/v1/payments/'+id,{headers:{Authorization:'Bearer '+process.env.MP_ACCESS_TOKEN}})).json()
 if(p.status==='approved'){const K=process.env.SUPABASE_SERVICE_ROLE_KEY
  await fetch(process.env.VITE_SUPABASE_URL+'/rest/v1/orders?id=eq.'+p.external_reference,{method:'PATCH',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'},body:JSON.stringify({pago:true,forma:p.payment_type_id})})}
 res.status(200).end()}
