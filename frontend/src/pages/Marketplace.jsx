
import React,{useEffect,useState} from 'react'
import axios from 'axios'
export default function Marketplace(){ const [products,setProducts]=useState([]); useEffect(()=>{ axios.get('/api/products').then(r=>setProducts(r.data)).catch(()=>{}) },[])
  return (<div className='page'><h2>Marketplace</h2><div className='products'>{products.map(p=>(<div key={p.id} className='card product'><img src={p.image||''} alt='' /><h4>{p.title}</h4><p className='price'>R$ {(p.price_cents||0)/100}</p><a className='btn' href={'/product/'+p.id}>Comprar</a></div>))}</div></div>)
}
