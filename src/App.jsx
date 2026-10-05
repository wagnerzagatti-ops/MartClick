import {useEffect,useState} from 'react'
import {supabase} from './lib/supabase'
import {DEFAULTS,MES,brl,preco,parse,calc,loadSettings,saveSettings} from './lib/config'
import './style.css'

const Logo=()=><div className="logo"><svg width="46" height="42" viewBox="0 0 46 42" fill="none"><path d="M4 20 23 4l19 16M8 18v19a2 2 0 0 0 2 2h26a2 2 0 0 0 2-2V18" stroke="#3ABAB0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 21h3l3 11h12l2.5-8H18" stroke="#FF7A65" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="21" cy="35.5" r="1.9" fill="#FF7A65"/><circle cx="31" cy="35.5" r="1.9" fill="#FF7A65"/></svg><span><b>Mart</b><b>Click</b></span></div>

export default function App(){
 const[v,setV]=useState('c'),[cfg,setCfg]=useState(DEFAULTS)
 useEffect(()=>{loadSettings().then(setCfg).catch(()=>{})},[])
 return<><header><Logo/><div className="tabs"><button className={v=='c'?'on':''} onClick={()=>setV('c')}>Cliente</button><button className={v=='a'?'on':''} onClick={()=>setV('a')}>Wagner</button></div></header>
 <main className={v=='a'?'wide':''}>{v=='a'?<Admin cfg={cfg} setCfg={setCfg}/>:<Client cfg={cfg}/>}</main></>}

const LABEL={pix:'PIX',link:'Link de pagamento',credit:'Cartão de crédito',debit:'Cartão de débito'}

function Client({cfg}){
 const[t,setT]=useState(localStorage.getItem('mc_oid')?'track':'home'),[f,setF]=useState({texto:'',nome:'',zap:'',end:''}),[it,setIt]=useState([]),
 [oid,setOid]=useState(localStorage.getItem('mc_oid')),[pay,setPay]=useState(null),[msg,setMsg]=useState(''),[o,setO]=useState(null),[rec,setRec]=useState(false)
 const up=k=>e=>setF({...f,[k]:e.target.value}),on=it.filter(i=>i.on),c=calc(on,cfg)
 useEffect(()=>{if(t!='track'||!oid)return;const g=()=>supabase.rpc('get_order',{oid}).then(r=>setO(r.data?.[0]));g();const h=setInterval(g,8000);return()=>clearInterval(h)},[t,oid])
 function ouvir(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return setMsg('Seu navegador não ouve áudio. Escreva a lista.')
  const r=new R();r.lang='pt-BR';r.interimResults=true;setRec(true);r.onresult=e=>setF(x=>({...x,texto:[...e.results].map(a=>a[0].transcript).join(' ')}));r.onend=()=>setRec(false);r.start()}
 function montar(){if(!f.texto.trim()||!f.nome||f.zap.replace(/\D/g,'').length<10)return setMsg('Falta a lista, seu nome e WhatsApp.');setMsg('');setIt(parse(f.texto));setT('resumo')}
 async function pagar(m){const id=crypto.randomUUID(),tel=f.zap.replace(/\D/g,'')
  await supabase.from('orders').insert({id,nome:f.nome,tel,endereco:f.end,itens:on,subtotal:c.s,taxa:c.taxa,total:c.t,forma:m})
  localStorage.setItem('mc_oid',id);setOid(id)
  const r=await fetch('/api/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:id,method:m,amount:c.t,name:f.nome,phone:tel,installments:cfg.installments})}).then(r=>r.json()).catch(()=>({}))
  if(r.type=='pix'||r.type=='manual')setPay(r);else if(r.url)location.href=r.url;else setMsg('Não deu certo. Tente outro jeito de pagar.')}
 if(t=='home')return<><h1>Oi, vizinha! 👋</h1><p>Mande sua lista. Entregamos em até {cfg.eta} minutos.</p>
  <button className="btn" onClick={ouvir}>{rec?'Estou ouvindo...':'🎤 Mandar lista por áudio'}</button>
  <div className="card"><textarea placeholder="Escreva o que está faltando: arroz, leite..." value={f.texto} onChange={up('texto')}/>
  <input placeholder="Seu nome" value={f.nome} onChange={up('nome')}/><input placeholder="Seu WhatsApp" inputMode="tel" value={f.zap} onChange={up('zap')}/><input placeholder="Endereço - Serrana-SP" value={f.end} onChange={up('end')}/></div>
  {msg&&<p>{msg}</p>}<button className="btn t" onClick={montar}>Montar minha lista</button>{oid&&<button className="btn o" onClick={()=>setT('track')}>Ver meu pedido</button>}</>
 if(t=='resumo')return<><h1>Sua lista</h1><div className="card">{it.map((i,k)=><label className="item" key={k}><input type="checkbox" checked={i.on} onChange={e=>setIt(it.map((x,j)=>j==k?{...x,on:e.target.checked}:x))}/><span style={{flex:1}}><b style={{color:'#FF7A65'}}>{i.q}</b> {i.n}</span>{brl(i.q*preco(i.n))}</label>)}
  <input placeholder="Esqueceu algo? Ex: 2 sabão" onKeyDown={e=>{if(e.key=='Enter'&&e.target.value){setIt([...it,...parse(e.target.value)]);e.target.value=''}}}/></div>
  <div className="card"><div className="row"><span>Compras (estimado)</span>{brl(c.s)}</div><div className="row"><span>Taxa de entrega</span>{c.taxa?brl(c.taxa):'Grátis!'}</div><div className="row tot"><span>Total</span>{brl(c.t)}</div></div>
  <button className="btn" disabled={!c.s||c.s<cfg.minOrder} onClick={()=>setT('pagar')}>{c.s<cfg.minOrder?`Pedido mínimo ${brl(cfg.minOrder)}`:'Ir para o pagamento'}</button><button className="btn o" onClick={()=>setT('home')}>Voltar</button></>
 if(t=='pagar')return<><h1>Como quer pagar?</h1><p>Total: <b>{brl(c.t)}</b></p>
  {!pay&&Object.keys(cfg.methods).filter(m=>cfg.methods[m]).map(m=><button key={m} className="btn t" onClick={()=>pagar(m)}>{LABEL[m]}</button>)}
  {msg&&<p>{msg}</p>}
  {pay&&<div className="card" style={{textAlign:'center'}}>{pay.qr&&<img alt="QR Code PIX" width="200" src={'data:image/png;base64,'+pay.qr}/>}<div className="pix">{pay.code||pay.text}</div>
  <button className="btn t" style={{marginTop:10}} onClick={()=>navigator.clipboard.writeText(pay.code||pay.text)}>Copiar código PIX</button><button className="btn o" onClick={()=>setT('track')}>Já paguei</button></div>}</>
 return<><h1>Seu pedido</h1>{!o?<p>Carregando...</p>:<div className="card"><div className="bar"><i style={{width:o.status/3*100+'%'}}/></div>
  <p><b>{MES[o.status]}</b> · {o.pago?'Pago':'Aguardando pagamento'}</p><div className="row"><span>Total</span>{brl(o.total)}</div><p>{o.endereco}</p>
  <a className="btn o sm" target="_blank" href={'https://www.google.com/maps/search/'+encodeURIComponent(o.endereco||'')}>Ver no mapa</a></div>}
  <a className="btn t" href={`whatsapp://send?phone=${cfg.whats}&text=${encodeURIComponent('Oi, MartClick! Sobre meu pedido, pode me ajudar?')}`}>Falar com a MartClick</a>
  <button className="btn o" onClick={()=>{localStorage.removeItem('mc_oid');setOid(null);setPay(null);setT('home')}}>Fazer outro pedido</button></>}

function Admin({cfg,setCfg}){
 const[ok,setOk]=useState(false),[l,setL]=useState([]),[e,setE]=useState(''),[p,setP]=useState(''),[tab,setTab]=useState('p'),[cp,setCp]=useState(null),[cf,setCf]=useState(cfg)
 useEffect(()=>{supabase.auth.getSession().then(r=>setOk(!!r.data.session))},[])
 useEffect(()=>{setCf(cfg)},[cfg])
 const load=()=>supabase.from('orders').select('*').order('created_at',{ascending:false}).then(r=>setL(r.data||[]))
 useEffect(()=>{if(!ok)return;load();const h=setInterval(load,8000);return()=>clearInterval(h)},[ok])
 const upd=(id,d)=>supabase.from('orders').update(d).eq('id',id).then(load)
 if(!ok)return<div className="card"><h2>Entrar (só o Wagner)</h2><input placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/><input type="password" placeholder="Senha" value={p} onChange={x=>setP(x.target.value)}/>
  <button className="btn t" onClick={async()=>{const r=await supabase.auth.signInWithPassword({email:e,password:p});setOk(!r.error)}}>Entrar</button></div>
 const lista=()=>{const m={};l.filter(o=>o.status<2).forEach(o=>o.itens.forEach(i=>m[i.n]=(m[i.n]||0)+i.q));setCp(Object.entries(m).map(([n,q])=>`[ ] ${q} ${n}`).join('\n')||'Nada para comprar agora.')}
 const N=k=>x=>setCf({...cf,[k]:x.target.value===''?'':isNaN(x.target.value)?x.target.value:Number(x.target.value)})
 if(tab=='s')return<><button className="btn o sm" onClick={()=>setTab('p')}>← Pedidos</button><div className="card" style={{maxWidth:520}}><h2>Configurações</h2>
  {[['fee','Taxa de entrega (R$)'],['freeAbove','Entrega grátis a partir de (R$)'],['minOrder','Pedido mínimo (R$, 0 = sem mínimo)'],['eta','Prazo de entrega (min)'],['installments','Parcelas máximas no crédito'],['whats','WhatsApp da loja (com 55)']].map(([k,t])=><label key={k}>{t}<input value={cf[k]} onChange={N(k)}/></label>)}
  <p>Formas de pagamento:</p>{Object.keys(LABEL).map(m=><label key={m} style={{display:'block'}}><input type="checkbox" style={{width:20}} checked={cf.methods[m]} onChange={x=>setCf({...cf,methods:{...cf.methods,[m]:x.target.checked}})}/> {LABEL[m]}</label>)}
  <button className="btn" onClick={async()=>{await saveSettings(cf);setCfg(cf);alert('Salvo!')}}>Salvar</button></div></>
 return<><div><button className="btn sm" onClick={lista}>Gerar lista de compras</button><button className="btn t sm" onClick={()=>setTab('s')}>Configurações</button><button className="btn o sm" onClick={()=>supabase.auth.signOut().then(()=>setOk(false))}>Sair</button></div>
  {cp&&<div className="card"><textarea readOnly rows={8} value={cp}/><button className="btn o sm" onClick={()=>setCp(null)}>Fechar</button></div>}
  <div className="kan">{['Novos','Comprando','Em rota','Entregues'].map((n,s)=><div className="col" key={n}><h3>{n} ({l.filter(o=>o.status==s).length})</h3>{l.filter(o=>o.status==s).map(o=><div className="ord" key={o.id}>
  <b>{o.nome}</b> · {o.pago?'Pago':'Não pago'}<br/><small>{o.tel} · {o.endereco}</small><ul>{o.itens.map((i,k)=><li key={k}>{i.q} {i.n}</li>)}</ul>
  <div className="row"><span>Estimado + taxa</span>{brl(o.subtotal)} + {brl(o.taxa)}</div><div className="row"><b>Total</b><b>{brl(o.total)}</b></div>
  {!o.pago&&<button className="btn sm" onClick={()=>upd(o.id,{pago:true})}>Marcar como pago</button>}
  <a className="btn t sm" target="_blank" href={`https://wa.me/55${o.tel}`}>Chamar no Whats</a>
  {s<3&&<button className="btn o sm" onClick={()=>upd(o.id,{status:s+1})}>{['Começar a comprar','Saiu para entrega','Entregue'][s]}</button>}</div>)}</div>)}</div></>}
