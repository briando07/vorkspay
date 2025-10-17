
import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
export default function Product(){ const {id}=useParams(); const [product,setProduct]=useState(null); const [form,setForm]=useState({email:'',name:'',cpf:'',phone:''}); const [result,setResult]=useState(null); const [loading,setLoading]=useState(false)
  useEffect(()=>{ axios.get('/api/products').then(r=>{ const p=r.data.find(x=>x.id==id); setProduct(p) }).catch(()=>{}) },[id])
  async function buy(e){ e.preventDefault(); setLoading(true); try{ const res = await axios.post('/api/checkout/'+id, form); setResult(res.data); }catch(e){ alert('Erro'); } setLoading(false) }
  if(!product) return <div className='page'><div>Carregando...</div></div>
  return (<div className='page'><div className='card'><h2>{product.title}</h2><p>{product.description}</p><p className='price'>R$ {(product.price_cents||0)/100}</p>
    <form onSubmit={buy} className='form'><input placeholder='E-mail' value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/><input placeholder='Nome' value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><input placeholder='CPF' value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} required/><input placeholder='Telefone' value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required/><button className='btn' disabled={loading}>{loading?'Processando...':'Finalizar compra'}</button></form>
    {result && <div className='qr'><h4>QR/Payload</h4><textarea readOnly rows={6} value={result.mp?.point_of_interaction?.transaction_data?.qr_code || ''}></textarea><div style={{marginTop:8}}><button className='btn' onClick={()=>navigator.clipboard.writeText(result.mp?.point_of_interaction?.transaction_data?.qr_code || '')}>Copiar código QR</button></div></div>}
  </div></div>)
}
