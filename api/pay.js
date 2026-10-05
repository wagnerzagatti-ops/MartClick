// Troque de instituição com PAY_PROVIDER = mercadopago | stripe | manual.
// Para outra (Pagar.me, Asaas...), crie mais um bloco "if" com o mesmo formato de retorno.
const J={'Content-Type':'application/json'}
export default async function handler(req,res){
 const{orderId,method,amount,name,phone,installments=1}=req.body||{},prov=process.env.PAY_PROVIDER||'mercadopago',site=process.env.SITE_URL
 try{
  if(prov==='manual')return res.json({type:'manual',text:process.env.MANUAL_PIX_KEY})
  if(prov==='mercadopago'){
   const H={...J,Authorization:'Bearer '+process.env.MP_ACCESS_TOKEN}
   if(method==='pix'){
    const d=await(await fetch('https://api.mercadopago.com/v1/payments',{method:'POST',headers:{...H,'X-Idempotency-Key':orderId},body:JSON.stringify({transaction_amount:amount,payment_method_id:'pix',external_reference:orderId,notification_url:site+'/api/webhook',payer:{email:phone+'@martclick.app',first_name:name}})})).json()
    const t=d.point_of_interaction.transaction_data;return res.json({type:'pix',code:t.qr_code,qr:t.qr_code_base64})}
   const ex={credit:['debit_card','ticket','bank_transfer'],debit:['credit_card','ticket','bank_transfer'],link:[]}[method]
   const d=await(await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:H,body:JSON.stringify({items:[{title:'Compras MartClick',quantity:1,unit_price:amount,currency_id:'BRL'}],external_reference:orderId,notification_url:site+'/api/webhook',back_urls:{success:site,failure:site,pending:site},auto_return:'approved',payment_methods:{excluded_payment_types:ex.map(id=>({id})),installments:method==='debit'?1:installments}})})).json()
   return res.json({type:'link',url:d.init_point})}
  if(prov==='stripe'){
   const b=new URLSearchParams({mode:'payment','payment_method_types[0]':method==='pix'?'pix':'card','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'brl','line_items[0][price_data][unit_amount]':String(Math.round(amount*100)),'line_items[0][price_data][product_data][name]':'Compras MartClick',success_url:site,cancel_url:site,'metadata[orderId]':orderId})
   const d=await(await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY},body:b})).json()
   return res.json({type:'link',url:d.url})}
  res.status(400).json({error:'provider desconhecido'})
 }catch(e){res.status(500).json({error:String(e)})}}
