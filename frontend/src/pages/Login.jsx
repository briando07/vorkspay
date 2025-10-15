
import React,{useState} from 'react'
import axios from 'axios'
import { saveToken } from '../utils/auth'
import { useNavigate } from 'react-router-dom'
export default function Login(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[err,setErr]=useState('')
  const nav = useNavigate()
  async function submit(e){ e.preventDefault(); try{ const r=await axios.post('/api/auth/login',{email,password}); saveToken(r.data.token); nav('/dashboard') }catch(e){ setErr(e.response?.data?.error||'Erro') } }
  return (<div className='page auth-page'><form className='card form' onSubmit={submit}><h2>Entrar</h2>
    <input value={email} onChange={e=>setEmail(e.target.value)} placeholder='E-mail' required />
    <input type='password' value={password} onChange={e=>setPassword(e.target.value)} placeholder='Senha' required />
    <button className='btn'>Entrar</button>
    <div className='muted'>Ainda não tem conta? <a href='/register'>Crie uma</a></div>
    <div className='error'>{err}</div>
  </form></div>)
}
