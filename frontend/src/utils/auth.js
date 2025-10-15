
export function saveToken(token){ localStorage.setItem('vork_token', token); }
export function getToken(){ return localStorage.getItem('vork_token'); }
export function clearToken(){ localStorage.removeItem('vork_token'); }
export function authHeader(){ const t=getToken(); return t? { Authorization: 'Bearer '+t } : {}; }
