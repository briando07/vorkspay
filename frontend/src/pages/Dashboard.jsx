
import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { authHeader } from '../utils/auth'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
export default function Dashboard(){
  const [stats,setStats]=useState({total:0,paid:0,created:0,refused:0}); const [txs,setTxs]=useState([])
  useEffect(()=>{ axios.get('/api/admin/stats',{headers:authHeader()}).then(r=>setStats(r.data)).catch(()=>{}); axios.get('/api/transactions',{headers:authHeader()}).then(r=>setTxs(r.data)).catch(()=>{}) },[])
  const data = txs.slice(0,10).map((t,i)=>({name:'#'+(i+1), amount:(t.amount_cents||0)/100}))
  return (<div className='page'><div className='grid-2'>
    <div className='card'><h3>Saldo (simulado)</h3><div className='big'>R$ 0,00</div><div className='meta'>Vendas: {stats.total} • Pagas: {stats.paid} • Recusadas: {stats.refused}</div></div>
    <div className='card'><h3>Relatório</h3><div style={{height:200}}><ResponsiveContainer width='100%' height={200}><LineChart data={data}><XAxis dataKey='name'/><YAxis/><Tooltip/><Line type='monotone' dataKey='amount' stroke='#e63946'/></LineChart></ResponsiveContainer></div></div>
  </div>
  <div className='card'><h3>Transações recentes</h3><table className='table'><thead><tr><th>ID</th><th>Produto</th><th>Valor</th><th>Status</th></tr></thead><tbody>{txs.map(t=>(<tr key={t.id}><td>{t.id}</td><td>{t.product_title}</td><td>R$ {(t.amount_cents||0)/100}</td><td>{t.status}</td></tr>))}</tbody></table></div></div>)
}
