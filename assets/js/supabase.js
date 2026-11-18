'use strict';
/* Ponto Car — conexão com o banco (Supabase): preço/estoque, login do cliente e login da loja */

/* ---------- Supabase: preço e estoque vêm do banco ---------- */
const SB_URL = 'https://qbehcztssgalireluvzs.supabase.co';
const SB_KEY = 'sb_publishable_elu87x9KMeavEeBNErn-Tg_DBtZLnxK'; // chave pública (pode ficar no site)
const codNorm = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
let sbPecas = null, sbBairros = null, sbConfig = null;
async function sb(caminho, opts = {}){
  let r;
  try { r = await fetch(SB_URL + '/rest/v1/' + caminho, Object.assign({}, opts, { headers: Object.assign({ apikey: SB_KEY, 'Content-Type': 'application/json' }, opts.headers || {}) })); }
  catch(e){ throw new Error('Sem conexão. Verifique sua internet e tente de novo.'); }
  const txt = await r.text(); let dados = null; try { dados = txt ? JSON.parse(txt) : null; } catch(e){}
  if (!r.ok) throw new Error((dados && dados.message) || ('Erro ' + r.status));
  return dados;
}
// Guarda os valores do estoque.js para o 🔒 Painel não salvar por cima o que veio do banco
const SB_CAMPOS = ['preco', 'oferta', 'precoOferta', 'falta', 'qtdEstoque'];
const SB_ORIG = {}, SB_APLIC = {}, SB_KORIG = {}, SB_KAPLIC = {}; let SB_LOJA_ORIG = null;
function aplicarSupabase(){
  if (!sbPecas) return;
  D.produtos.forEach(p => {
    if (!SB_ORIG[p.id]){ SB_ORIG[p.id] = {}; SB_CAMPOS.forEach(c => SB_ORIG[p.id][c] = p[c]); }
    const o = SB_ORIG[p.id]; const s = sbPecas[codNorm(p.codigo)];
    if (!s || (p.opcoes && p.opcoes.length)){
      p.falta = true; // sem cadastro no Supabase (ou com opções): não dá para pedir pelo site
    } else {
      const v = Number(s.preco) || 0; const po = Number(s.preco_oferta) || 0;
      p.preco = v;
      if (po > 0 && po < v){ p.oferta = true; p.precoOferta = po; } else { p.oferta = false; p.precoOferta = 0; }
      p.qtdEstoque = Math.max(0, parseInt(s.estoque, 10) || 0);
      p.falta = !!o.falta || p.qtdEstoque <= 0;
    }
    SB_APLIC[p.id] = {}; SB_CAMPOS.forEach(c => SB_APLIC[p.id][c] = p[c]);
  });
  if (!SB_LOJA_ORIG) SB_LOJA_ORIG = { bairros: clone(D.loja.bairros || []), descontoPix: D.loja.descontoPix };
  if (sbBairros) D.loja.bairros = sbBairros.map(b => ({ nome: b.nome, taxa: Number(b.taxa) || 0 }));
  if (sbConfig) D.loja.descontoPix = Number(sbConfig.desconto_pix) || 0;
  (D.kits || []).forEach(k => {
    if (!(k.id in SB_KORIG)) SB_KORIG[k.id] = k.preco;
    const its = kitItens(k);
    if (its.length && its.every(Boolean)) k.preco = Math.round(its.reduce((t, i) => t + precoFinal(i.p, i.opc) * i.qtd, 0) * 100) / 100;
    SB_KAPLIC[k.id] = k.preco;
  });
}
function semSupabase(obj){
  const c = clone(obj);
  (c.produtos || []).forEach(p => { const o = SB_ORIG[p.id], a = SB_APLIC[p.id]; if (!o || !a) return;
    SB_CAMPOS.forEach(k => { if (JSON.stringify(p[k]) === JSON.stringify(a[k])){ if (o[k] === undefined) delete p[k]; else p[k] = o[k]; } }); });
  (c.kits || []).forEach(k => { if (k.id in SB_KORIG && k.preco === SB_KAPLIC[k.id]) k.preco = SB_KORIG[k.id]; });
  if (SB_LOJA_ORIG && c.loja){ c.loja.bairros = clone(SB_LOJA_ORIG.bairros); c.loja.descontoPix = SB_LOJA_ORIG.descontoPix; }
  return c;
}
async function sincronizarSupabase(){
  try {
    const [linhas, brs, cfg] = await Promise.all([
      sb('pecas?select=codigo,nome,preco,preco_oferta,estoque'),
      sb('bairros?select=nome,taxa&order=nome').catch(() => null),
      sb('loja_config?select=*&id=eq.1').catch(() => null)
    ]);
    sbPecas = {}; (linhas || []).forEach(r => { if (r.codigo) sbPecas[codNorm(r.codigo)] = r; });
    sbBairros = Array.isArray(brs) ? brs : null; sbConfig = Array.isArray(cfg) && cfg[0] ? cfg[0] : null;
    aplicarSupabase(); limparCarrinhoInvalido(); LS.set('pc_carrinho', carrinho);
    const h = rotaAtual();
    if (h === '') renderLoja(); if (h === 'pedido') renderPedido();
    if (h === 'painel' && painelLiberado && abaPainel !== 'pedidos') renderPainel();
    if (typeof detalheAberto !== 'undefined' && detalheAberto) renderDetalhe();
  } catch(e){ console.warn('Supabase:', e.message); }
}

/* =================================================================
   CONTA DO CLIENTE (e-mail, senha, CPF e endereço)
   ================================================================= */
const CLI_LS = 'pc_cli_sessao';
let cliCad = undefined, contaAba = 'entrar', contaVoltar = '', contaMsg = '', contaRecuperar = false;
const cliSessao = () => LS.get(CLI_LS, null);
const soDig = v => String(v || '').replace(/\D/g, '');
function cpfValido(c){ const d = soDig(c); if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +d[9] && dv(10) === +d[10]; }
const cpfMask = c => { const d = soDig(c).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
const cpfOculto = c => { const d = soDig(c); return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : ''; };
function traduzErro(m){
  m = String(m || '');
  if (/already registered|already been registered|already exists/i.test(m)) return 'Este e-mail já tem cadastro. Entre com a sua senha.';
  if (/invalid login|invalid credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/at least 6|password should be|weak password/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/email not confirmed/i.test(m)) return 'Confirme o seu e-mail (veja a mensagem que enviamos) e tente de novo.';
  if (/signups not allowed|signup.*disabled/i.test(m)) return 'O cadastro de novos clientes está desligado no momento. Fale com a loja.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (/clientes_cpf_key|duplicate key/i.test(m)) return 'Este CPF já está cadastrado em outra conta.';
  if (/clientes_cpf_check/i.test(m)) return 'CPF inválido. Confira os números.';
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(m)) return 'E-mail inválido.';
  return m || 'Algo deu errado. Tente de novo.';
}
async function cliAuth(caminho, corpo, extra){
  let r; try { r = await fetch(`${SB_URL}/auth/v1/${caminho}`, Object.assign({ method: 'POST', headers: Object.assign({ apikey: SB_KEY, 'Content-Type': 'application/json' }, (extra && extra.headers) || {}), body: JSON.stringify(corpo) }, extra && extra.method ? { method: extra.method } : {})); }
  catch(e){ throw new Error('Sem conexão com a internet.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(traduzErro(j.error_description || j.msg || j.message || j.error_code || ('Erro ' + r.status)));
  return j;
}
function cliGuardar(j){
  if (!j || !j.access_token) return null;
  const ss = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || (Math.floor(Date.now() / 1000) + (Number(j.expires_in) || 3600)), email: (j.user && j.user.email) || '', uid: (j.user && j.user.id) || '' };
  LS.set(CLI_LS, ss); return ss;
}
async function cliToken(){
  let ss = cliSessao(); if (!ss) return null;
  if ((ss.expires_at || 0) - 60 < Date.now() / 1000){
    try { const j = await cliAuth('token?grant_type=refresh_token', { refresh_token: ss.refresh_token }); ss = cliGuardar(Object.assign({}, j, { user: j.user || { email: ss.email, id: ss.uid } })); }
    catch(e){ cliSair(true); return null; }
  }
  return ss.access_token;
}
async function cliFetch(caminho, opts = {}){
  const tk = await cliToken(); if (!tk) throw new Error('Entre na sua conta.');
  return sb(caminho, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + tk }, opts.headers || {}) }));
}
async function cliCarregarCadastro(){
  if (!cliSessao()){ cliCad = null; atualizarRotuloConta(); return null; }
  try { const ss = cliSessao(); const r = await cliFetch(`clientes?select=*&id=eq.${encodeURIComponent(ss.uid)}`); cliCad = (r && r[0]) || null; }
  catch(e){ if (!cliSessao()) cliCad = null; }
  atualizarRotuloConta(); return cliCad;
}
function atualizarRotuloConta(){
  const ss = cliSessao(); const nome = cliCad && cliCad.nome ? cliCad.nome.trim().split(/\s+/)[0] : '';
  const t = ss ? (nome || 'Minha conta') : 'Entrar';
  if ($('#contaRotulo')) $('#contaRotulo').textContent = t; if ($('#contaRotulo2')) $('#contaRotulo2').textContent = ss ? (nome || 'Conta') : 'Entrar';
  if (rotaAtual() === 'pedido' && formAberto) renderCliCheckout();
}
function cliSair(silencioso){
  const ss = cliSessao(); LS.del(CLI_LS); cliCad = null; atualizarRotuloConta();
  if (ss && ss.access_token) fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + ss.access_token } }).catch(() => {});
  if (!silencioso) toast('Você saiu da sua conta.');
}
function enderecoTexto(c){ if (!c) return ''; return `${c.rua}, ${c.numero}${c.complemento ? ' — ' + c.complemento : ''} · ${c.bairro} · ${c.cidade}/${c.uf}${c.cep ? ' · CEP ' + c.cep : ''}`; }

/* =================================================================
   PAINEL DE PEDIDOS (Supabase) — Novos / Em andamento / Finalizados
   ================================================================= */
const ADM_UID = 'e4525025-1bbd-4f56-a3e5-277566fbfe4c';
const ADM_LS = 'pc_adm_sessao';
// Login da loja fica só nesta aba do navegador: ao fechar a aba ou o navegador, pede a senha de novo
const ADMS = {
  get(){ try { const v = sessionStorage.getItem(ADM_LS); return v ? JSON.parse(v) : null; } catch(e){ return null; } },
  set(v){ try { sessionStorage.setItem(ADM_LS, JSON.stringify(v)); } catch(e){} },
  del(){ try { sessionStorage.removeItem(ADM_LS); } catch(e){} }
};
try { localStorage.removeItem(ADM_LS); } catch(e){}  // apaga o login antigo, que ficava salvo para sempre
let admCol = 'novo', admUltimoId = null, admCarregando = false, admLista = null, admErro = '';
const admSessao = () => ADMS.get();
async function admAuth(corpo, tipo){
  let r;
  try { r = await fetch(`${SB_URL}/auth/v1/token?grant_type=${tipo}`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }); }
  catch(e){ throw new Error('Sem conexão com a internet.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(/invalid/i.test(j.error_description || j.msg || j.message || '') ? 'E-mail ou senha incorretos.' : (j.error_description || j.msg || j.message || 'Não foi possível entrar.'));
  const sess = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || (Math.floor(Date.now() / 1000) + (j.expires_in || 3600)), email: (j.user && j.user.email) || '', uid: (j.user && j.user.id) || '' };
  ADMS.set(sess); return sess;
}
async function admToken(){
  let ss = admSessao(); if (!ss) return null;
  if ((ss.expires_at || 0) - 60 < Date.now() / 1000){
    try { ss = await admAuth({ refresh_token: ss.refresh_token }, 'refresh_token'); }
    catch(e){ ADMS.del(); return null; }
  }
  return ss.access_token;
}
async function admFetch(caminho, opts = {}){
  const tk = await admToken(); if (!tk) throw new Error('LOGIN');
  let r;
  try { r = await fetch(SB_URL + '/rest/v1/' + caminho, Object.assign({}, opts, { headers: Object.assign({ apikey: SB_KEY, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, opts.headers || {}) })); }
  catch(e){ throw new Error('Sem conexão com a internet.'); }
  if (r.status === 401){ ADMS.del(); throw new Error('LOGIN'); }
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch(e){}
  if (!r.ok) throw new Error((j && j.message) || ('Erro ' + r.status));
  return j;
}
