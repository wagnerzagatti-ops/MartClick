import {supabase} from './supabase'
// Valores iniciais. O Wagner altera tudo no painel (Configurações), salvo na tabela settings.
export const DEFAULTS={fee:15,freeAbove:200,minOrder:0,eta:90,installments:3,whats:'5516999999999',
 methods:{pix:true,link:true,credit:true,debit:true}}
export const MES=['Recebido','Comprando','Saiu para entrega','Entregue']
export const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export async function loadSettings(){const{data}=await supabase.from('settings').select('value').eq('id',1).maybeSingle();return{...DEFAULTS,...(data?.value||{})}}
export const saveSettings=v=>supabase.from('settings').upsert({id:1,value:v})
const P={arroz:28,'feijão':9,feijao:9,leite:5.5,'açúcar':5,'café':18,cafe:18,'óleo':7.5,ovos:14,'macarrão':5,'pão':9,frango:22,carne:42,banana:7,tomate:8,cebola:6,batata:7,'sabão':6,detergente:3,papel:22,manteiga:12,queijo:38,'água':3}
export const preco=n=>{n=n.toLowerCase();for(const k in P)if(n.includes(k))return P[k];return 8}
const NUM={um:1,uma:1,dois:2,duas:2,'três':3,quatro:4,cinco:5,seis:6}
export const parse=t=>t.split(/[,;\n]+|\se\s(?=\d)/i).map(x=>x.trim()).filter(Boolean).map(x=>{
 const m=x.match(/^(\d+)\s*(?:x|un|kg|l|pacotes?)?\s*(?:de\s+)?(.+)$/i);if(m)return{q:+m[1],n:m[2],on:true}
 const w=x.split(/\s+/),q=NUM[w[0].toLowerCase()];return q?{q,n:w.slice(1).join(' ').replace(/^de\s+/i,''),on:true}:{q:1,n:x,on:true}})
export const calc=(l,c)=>{const s=l.reduce((a,i)=>a+i.q*preco(i.n),0),taxa=s>=c.freeAbove?0:Number(c.fee);return{s,taxa,t:s+taxa}}
