
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Product from './pages/Product'
import CreateProduct from './pages/CreateProduct'
import AdminPanel from './pages/AdminPanel'
import Withdraw from './pages/Withdraw'
import Financeiro from './pages/Financeiro'
import AdminUsers from './pages/AdminUsers'
import { getToken } from './utils/auth'

const Private = ({children}) => getToken()?children:<Navigate to='/login'/>;

export default function App(){
  return (<div className='app'>
    <Header/>
    <Routes>
      <Route path='/' element={<Navigate to='/marketplace'/>} />
      <Route path='/login' element={<Login/>} />
      <Route path='/register' element={<Register/>} />
      <Route path='/dashboard' element={<Private><Dashboard/></Private>} />
      <Route path='/marketplace' element={<Marketplace/>} />
      <Route path='/product/:id' element={<Product/>} />
      <Route path='/create-product' element={<Private><CreateProduct/></Private>} />
      <Route path='/withdraw' element={<Private><Withdraw/></Private>} />
      <Route path='/financeiro' element={<Private><Financeiro/></Private>} />
      <Route path='/admin' element={<Private><AdminPanel/></Private>} />
      <Route path='/admin/users' element={<Private><AdminUsers/></Private>} />
    </Routes>
  </div>)
}