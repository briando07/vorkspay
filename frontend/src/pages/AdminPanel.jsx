
import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { authHeader } from '../utils/auth'
export default function AdminPanel(){ const [withdrawals,setWithdrawals]=useState([]); useEffect(()=>{ fetch() },[])
  function fetch(){ axios.get('/api/admin/withdrawals', { headers: authHeader() }).then(r=>setWithdrawals(r.data)).catch(()=>{}) }
  async function approve(id){ await axios.post('/api/admin/withdrawals/'+id+'/approve', {}, { headers: authHeader() }); fetch() }
  async function reject(id){ const note = prompt('Motivo (opcional):')||''; await axios.post('/api/admin/withdrawals/'+id+'/reject', { note }, { headers: authHeader() }); fetch() }
  return (<div className='page'><div className='card'><h2>Painel Admin - Saques</h2><table className='table'><thead><tr><th>ID</th><th>Merchant</th><th>Pedido</th><th>Fee</th><th>Líquido</th><th>Status</th><th>Ações</th></tr></thead><tbody>{withdrawals.map(w=>(<tr key={w.id}><td>{w.id}</td><td>{w.merchant_name} ({w.owner_email})</td><td>R$ {(w.requested_cents/100).toFixed(2)}</td><td>R$ {(w.fee_cents/100).toFixed(2)}</td><td>R$ {(w.net_cents/100).toFixed(2)}</td><td>{w.status}</td><td>{w.status==='pending' && (<><button onClick={()=>approve(w.id)} className='btn' style={{marginRight:8}}>Aprovar</button><button onClick={()=>reject(w.id)} className='btn-ghost'>Recusar</button></>)}</td></tr>))}</tbody></table></div></div>)
}
