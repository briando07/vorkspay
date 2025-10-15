
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { authHeader } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

export default function Financial(){
  const [dest, setDest] = useState({ pix_key: '', name: '', cpf: '' })
  const [msg, setMsg] = useState('')
  const nav = useNavigate()

  useEffect(()=>{
    async function load(){
      try{
        const r = await axios.get('/api/merchant/me', { headers: authHeader() })
        const d = r.data.destination_info || {}
        setDest({ pix_key: d.pix_key || '', name: d.name || '', cpf: d.cpf || '' })
      }catch(e){ /* ignore */ }
    }
    load()
  },[])

  async function save(e){
    e.preventDefault()
    setMsg('Salvando...')
    try{
      await axios.post('/api/merchant/me/destination', { destination: dest }, { headers: authHeader() })
      setMsg('Chave PIX salva.')
    }catch(err){ setMsg(err.response?.data?.error || 'Erro') }
  }

  function goWithdraw(){ nav('/withdraw') }

  return (<div className='page'><div className='card'><h2>Financeiro</h2>
    <p>Cadastre sua chave PIX para receber saques.</p>
    <form className='form' onSubmit={save}>
      <input placeholder='Chave PIX (e-mail/CPF/Celular/Chave aleatória)' value={dest.pix_key} onChange={e=>setDest({...dest,pix_key:e.target.value})} required />
      <input placeholder='Nome do titular' value={dest.name} onChange={e=>setDest({...dest,name:e.target.value})} required />
      <input placeholder='CPF do titular' value={dest.cpf} onChange={e=>setDest({...dest,cpf:e.target.value})} required />
      <button className='btn'>Salvar chave PIX</button>
    </form>
    <div className='muted'>{msg}</div>
    <div style={{marginTop:12}}><button className='btn' onClick={goWithdraw}>Solicitar saque</button></div>
  </div></div>)
}
