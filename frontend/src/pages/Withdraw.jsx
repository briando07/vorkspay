
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { authHeader } from '../utils/auth'
export default function Withdraw(){ const [list,setList]=useState([]); const [amount,setAmount]=useState(''); const [msg,setMsg]=useState(''); const [destination,setDestination]=useState({ pix_key:'', name:'', cpf:'' }); useEffect(()=>{ fetchList(); fetchMerchant() },[])
  async function fetchMerchant(){ try{ const r = await axios.get('/api/merchant/me', { headers: authHeader() }); setDestination(r.data.destination_info || {}); }catch(e){} }
  async function fetchList(){ try{ const r=await axios.get('/api/withdrawals', { headers: authHeader() }); setList(r.data); }catch(e){ console.log(e) } }
  async function submit(e){ e.preventDefault(); setMsg('Enviando...'); try{ const r=await axios.post('/api/withdrawals', { amount }, { headers: authHeader() }); setMsg('Pedido criado: Fee R$ '+(r.data.fee_cents/100).toFixed(2)); fetchList(); }catch(e){ setMsg(e.response?.data?.error||'Erro') } }
  return (<div className='page'><div className='card'><h2>Saque</h2><p>Chave PIX cadastrada: {destination.pix_key || 'Nenhuma'}</p><form onSubmit={submit} className='form'><input placeholder='Valor (R$)' value={amount} onChange={e=>setAmount(e.target.value)} required/><button className='btn'>Solicitar saque</button></form><div className='muted'>{msg}</div></div><div className='card'><h3>Meus pedidos</h3><table className='table'><thead><tr><th>ID</th><th>Valor</th><th>Fee</th><th>Líquido</th><th>Status</th></tr></thead><tbody>{list.map(w=>(<tr key={w.id}><td>{w.id}</td><td>R$ {(w.requested_cents/100).toFixed(2)}</td><td>R$ {(w.fee_cents/100).toFixed(2)}</td><td>R$ {(w.net_cents/100).toFixed(2)}</td><td>{w.status}</td></tr>))}</tbody></table></div></div>)
}
