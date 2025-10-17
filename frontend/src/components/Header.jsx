
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../utils/auth'
export default function Header(){
  const nav = useNavigate()
  const logout = ()=>{ clearToken(); nav('/login') }
  return (<header className='header'><div className='brand'>Vorkspay</div><nav>
    <Link to='/marketplace'>Marketplace</Link>
    <Link to='/dashboard'>Dashboard</Link>
    <Link to='/create-product'>Criar produto</Link>
    <Link to='/withdraw'>Saque</Link>\n    <Link to='/financial'>Financeiro</Link>
    <Link to='/admin'>Admin</Link>
    <Link to='/admin/users'>Usuários</Link>
    {getToken()?<button onClick={logout} className='btn-ghost'>Sair</button>:<Link to='/login'>Entrar</Link>}
  </nav></header>)
}
