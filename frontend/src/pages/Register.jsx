
import React,{useState} from 'react'
import axios from 'axios'
import { saveToken } from '../utils/auth'
import { useNavigate } from 'react-router-dom'
export default function Register(){
  const [form,setForm]=useState({email:'',password:'',fullName:'',cpf:'',phone:'',street:'',number:'',complement:'',cep:'',apartment:false,city:'',state:''})
  const [err,setErr]=useState(''); const nav=useNavigate()
  const onChange=(e)=>{ const {name,value,type,checked}=e.target; setForm(p=>({...p,[name]:type==='checkbox'?checked:value})) }
  async function submit(e){ e.preventDefault(); try{ const r=await axios.post('/api/auth/register', form); saveToken(r.data.token); nav('/dashboard') }catch(e){ setErr(e.response?.data?.error||'Erro') } }
  return (<div className='page auth-page'><form className='card form wide' onSubmit={submit}><h2>Criar conta</h2>
    <div className='grid'>
      <input name='fullName' placeholder='Nome completo' value={form.fullName} onChange={onChange} required />
      <input name='email' placeholder='E-mail' value={form.email} onChange={onChange} required />
      <input name='password' placeholder='Senha' type='password' value={form.password} onChange={onChange} required />
      <input name='cpf' placeholder='CPF' value={form.cpf} onChange={onChange} required />
      <input name='phone' placeholder='Telefone' value={form.phone} onChange={onChange} required />
      <input name='street' placeholder='Rua' value={form.street} onChange={onChange} required />
      <input name='number' placeholder='Número' value={form.number} onChange={onChange} required />
      <input name='complement' placeholder='Complemento' value={form.complement} onChange={onChange} />
      <input name='cep' placeholder='CEP' value={form.cep} onChange={onChange} required />
      <label className='checkbox'><input type='checkbox' name='apartment' checked={form.apartment} onChange={onChange}/> Apartamento?</label>
      <input name='city' placeholder='Cidade' value={form.city} onChange={onChange} required />
      <input name='state' placeholder='Estado' value={form.state} onChange={onChange} required />
    </div>
    <button className='btn'>Criar conta</button>
    <div className='error'>{err}</div>
  </form></div>)
}
