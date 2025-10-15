
import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { authHeader } from '../utils/auth'
export default function AdminUsers(){
  const [users,setUsers]=useState([])
  useEffect(()=>{ fetch() },[])
  function fetch(){ axios.get('/api/admin/users', { headers: authHeader() }).then(r=>setUsers(r.data)).catch(()=>{}) }
  async function approve(id){ await axios.post('/api/admin/users/'+id+'/approve', {}, { headers: authHeader() }); fetch() }
  async function promote(id){ await axios.post('/api/admin/users/'+id+'/promote', {}, { headers: authHeader() }); fetch() }
  async function editFees(merchantId){ const p = prompt('Nova % (ex: 0.0599 para 5.99%)'); const f = prompt('Taxa fixa em centavos (ex: 200)'); if(p!=null && f!=null) { await axios.post('/api/admin/merchant/'+merchantId+'/fees',{ fee_percent: parseFloat(p), fee_fixed_cents: parseInt(f) }, { headers: authHeader() }); alert('Atualizado'); } fetch() }
  async function lock(merchantId, lock){ await axios.post('/api/admin/merchant/'+merchantId+'/lock',{ lock }, { headers: authHeader() }); fetch() }
  return (<div className='page'><div className='card'><h2>Usuários / Aprovação</h2><table className='table'><thead><tr><th>Email</th><th>Nome</th><th>CPF</th><th>Aprovado</th><th>Role</th><th>Ações</th></tr></thead><tbody>{users.map(u=>(<tr key={u.id}><td>{u.email}</td><td>{u.full_name}</td><td>{u.cpf}</td><td>{u.approved?'Sim':'Não'}</td><td>{u.role}</td><td><button className='btn' onClick={()=>approve(u.id)} style={{marginRight:8}}>Aprovar</button><button className='btn' onClick={()=>promote(u.id)} style={{marginRight:8}}>Promover</button></td></tr>))}</tbody></table></div></div>)
}
