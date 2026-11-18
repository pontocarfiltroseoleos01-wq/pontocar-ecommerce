'use strict';
/* Ponto Car — carrinho (localStorage), fechamento do pedido, Pix e tela de confirmação */

/* ---------- Carrinho ---------- */
let carrinho = LS.get('pc_carrinho', {});   // chave "idProduto|indiceOpcao" -> quantidade
const opcaoSel = {};                         // idProduto -> índice da opção escolhida

function linhasCarrinho(){
  return Object.entries(carrinho).map(([k, q]) => {
    if (k.startsWith('kit:')){ const kit = kitPorId(k.slice(4)); if (!kit) return null; return { k, kit, nome: '🧰 ' + kit.nome, opcao: kitTexto(kit), qtd: q, preco: Number(kit.preco) || 0, oferta: false }; }
    const [pid, oi] = k.split('|'); const p = prod(pid); if (!p) return null; const o = +oi;
    const opc = o >= 0 ? p.opcoes[o] : null;
    return { k, p, opc, nome: p.nome, opcao: opc ? opc.nome : '', qtd: q, preco: precoFinal(p, opc), oferta: !!precoOferta(p, opc) };
  }).filter(Boolean);
}
const totalCarrinho = () => linhasCarrinho().reduce((s, l) => s + l.qtd * l.preco, 0);
const qtdCarrinho = () => linhasCarrinho().reduce((s, l) => s + l.qtd, 0);
function mudarQtd(k, delta){
  const q = (carrinho[k] || 0) + delta;
  if (delta > 0 && !k.startsWith('kit:')){ const pe = prod(k.split('|')[0]); if (pe && pe.qtdEstoque != null && q > pe.qtdEstoque){ toast(`Temos só ${pe.qtdEstoque} em estoque.`); return; } }
  if (q <= 0) delete carrinho[k]; else carrinho[k] = Math.min(q, 99);
  LS.set('pc_carrinho', carrinho); renderLoja(); renderPedido(); if (detalheAberto) renderDetalhe();
}

/* ---------- Entrega por bairro ---------- */
const bairros = () => (D.loja.bairros || []).filter(b => b && b.nome);
function entregaSel(){
  const rec = (document.querySelector('input[name=receber]:checked') || {}).value || 'retirada';
  if (rec !== 'entrega') return null;
  const sel = $('#fBairro'); const v = sel ? sel.value : '';
  if (v === '' || !bairros().length) return { bairro: '', taxa: 0, combinar: true, escolhido: false };
  if (v === 'outro') return { bairro: 'Outro bairro', taxa: 0, combinar: true, escolhido: true };
  const b = bairros()[+v]; return b ? { bairro: b.nome, taxa: Number(b.taxa) || 0, combinar: false, escolhido: true } : { bairro: '', taxa: 0, combinar: true, escolhido: false };
}
function renderEntregaSub(){ if (!$('#subEntrega')) return;
  const box = $('#subEntrega'); if (!box) return;
  const rec = (document.querySelector('input[name=receber]:checked') || {}).value || 'retirada';
  const se = $('#subEndereco'); if (se) se.classList.toggle('hide', rec !== 'entrega');
  const B = bairros();
  box.classList.toggle('hide', rec !== 'entrega' || !B.length);
  if (!B.length) return;
  const atual = $('#fBairro') ? $('#fBairro').value : '';
  box.innerHTML = `<label class="lbl" for="fBairro" style="margin-top:0">Bairro da entrega <i>*</i></label>
    <select class="in" id="fBairro"><option value="">Escolha o bairro</option>${B.map((b, i) => `<option value="${i}" ${String(i) === atual ? 'selected' : ''}>${esc(b.nome)} — ${Number(b.taxa) ? brl(b.taxa) : 'entrega grátis'}</option>`).join('')}<option value="outro" ${atual === 'outro' ? 'selected' : ''}>Outro bairro (taxa a combinar)</option></select>
    <div class="msg-erro hide" id="eBairro">Escolha o bairro da entrega.</div>
`;
}

/* ---------- Lembrete da próxima troca ---------- */
function dataYMD(d){ return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
function linksLembrete(meses, o){
  const ini = new Date(); ini.setMonth(ini.getMonth() + meses); const fim = new Date(ini); fim.setDate(fim.getDate() + 1);
  const titulo = 'Troca de óleo e filtros — Ponto Car';
  const site = location.href.split('#')[0];
  const det = `Hora de revisar o óleo e os filtros${o && o.carro && o.carro.modelo ? ' do ' + carroTexto(o.carro) : ''}.\nÚltimo pedido na Ponto Car: Nº ${o ? o.num : ''}.\nPeça de novo: ${site}`;
  const g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titulo) + '&dates=' + dataYMD(ini) + '/' + dataYMD(fim) + '&details=' + encodeURIComponent(det);
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ponto Car//PT-BR','BEGIN:VEVENT','UID:' + uid() + '@pontocar','DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    'DTSTART;VALUE=DATE:' + dataYMD(ini), 'DTEND;VALUE=DATE:' + dataYMD(fim), 'SUMMARY:' + titulo, 'DESCRIPTION:' + det.replace(/\n/g, '\\n'),
    'BEGIN:VALARM','TRIGGER:PT9H','ACTION:DISPLAY','DESCRIPTION:' + titulo,'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  return { google: g, ics: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), quando: ini.toLocaleDateString('pt-BR') };
}

/* ---------- Render: Meus pedidos ---------- */
let formAberto = false;
function renderPedido(){ if (!$('#coItens')) return;
  const L = linhasCarrinho(); const tot = totalCarrinho();
  if (!L.length){
    $('#coItens').innerHTML = `<li style="display:block"><div class="vazio" style="border:0;padding:16px 0"><b>Seu pedido está vazio</b>Volte para a loja e adicione os itens.</div></li>`;
    $('#acoesItens').innerHTML = `<button class="btn btn-ouro" type="button" data-ir="">Ver produtos</button>`;
    formAberto = false;
  } else {
    $('#coItens').innerHTML = L.map(l => `<li><div><div class="n">${esc(l.nome)}</div>${l.opcao ? `<div class="o">${esc(l.opcao)}</div>` : ''}<div class="o">${brl(l.preco)} cada</div></div><div style="font-weight:900">${brl(l.qtd*l.preco)}</div><div class="ctr">${stepHTML(l.k, l.qtd)}<button class="rm" type="button" data-rm="${esc(l.k)}">Remover</button></div></li>`).join('');
    $('#acoesItens').innerHTML = formAberto ? `<button class="btn btn-linha" type="button" data-ir="">+ Adicionar mais itens</button>` :
      `<button class="btn btn-ouro" id="btnProsseguir" type="button">Prosseguir para pagamento →</button><button class="btn btn-linha" type="button" data-ir="">+ Adicionar mais itens</button>`;
  }
  $('#coTotal').textContent = brl(tot);
  renderEntregaSub();
  const noCarrinho = new Set(L.filter(l => l.p).map(l => l.p.id)); const sug = new Map();
  L.forEach(l => { if (l.p) combinaCom(l.p).forEach(x => { if (!noCarrinho.has(x.id)) sug.set(x.id, x); }); });
  $('#coSugestoes').innerHTML = sug.size ? `<div class="comb-box"><span class="ret-t">🤝 Aproveite e leve também</span>${[...sug.values()].slice(0, 4).map(miniCombinaHTML).join('')}</div>` : '';
  $('#coForm').classList.toggle('hide', !formAberto);
  renderValores(); atualizarTroco();
}

/* ---------- Descontos (Pix e cupom) ---------- */
const pctPix = () => Math.max(0, Math.min(90, Number(D.loja.descontoPix) || 0));
let cupomOk = { codigo: '', pct: 0 };
function cupomValido(cod){ cod = String(cod || '').trim().toUpperCase(); return cod && cod === cupomOk.codigo ? cupomOk : null; cod = String(cod || '').trim().toUpperCase(); return cod ? (D.cupons || []).find(c => c.ativo !== false && c.codigo === cod) || null : null; }
let cupomAplicado = '';
function calcTotais(pag){
  const sub = totalCarrinho(); const descontos = []; let base = sub;
  const c = cupomValido(cupomAplicado);
  if (c){ const v = Math.round(base * c.pct) / 100; descontos.push({ nome: `Cupom ${c.codigo} (${c.pct}%)`, valor: v }); base -= v; }
  if (pag === 'pix' && pctPix() > 0){ const v = Math.round(base * pctPix()) / 100; descontos.push({ nome: `Desconto no Pix (${pctPix()}%)`, valor: v }); base -= v; }
  const E = entregaSel(); const taxa = E ? E.taxa : 0;
  return { sub, descontos, entrega: E, taxa, total: Math.round((base + taxa) * 100) / 100 };
}
function renderValores(){ if (!$('#coValores')) return;
  const el = $('#coValores'); if (!el) return; const T = calcTotais(pagSel());
  el.innerHTML = `<div class="linha"><span>Subtotal</span><span>${brl(T.sub)}</span></div>` +
    T.descontos.map(d => `<div class="linha desc"><span>${esc(d.nome)}</span><span>− ${brl(d.valor)}</span></div>`).join('') +
    (T.entrega ? `<div class="linha"><span>Entrega${T.entrega.bairro ? ' (' + esc(T.entrega.bairro) + ')' : ''}</span><span>${T.entrega.combinar ? 'a combinar' : (T.taxa ? '+ ' + brl(T.taxa) : 'grátis')}</span></div>` : '') +
    `<div class="big-total"><span>Total</span><strong>${brl(T.total)}</strong></div>`;
  $('#totalBtn').textContent = brl(T.total);
  const pixInfo = $('#pixDescInfo'); if (pixInfo) pixInfo.textContent = pctPix() ? `${pctPix()}% de desconto pagando no Pix` : 'Chave Pix aqui no site.';
}
async function aplicarCupom(){
  const inp = $('#fCupom'); const msg = $('#cupomMsg'); const cod = inp.value.trim().toUpperCase(); inp.value = cod;
  if (!cod){ cupomAplicado = ''; cupomOk = { codigo: '', pct: 0 }; msg.textContent = ''; msg.className = 'cupom-msg'; renderValores(); atualizarTroco(); return; }
  msg.textContent = 'Conferindo o cupom…'; msg.className = 'cupom-msg';
  try {
    const pct = await sb('rpc/validar_cupom', { method: 'POST', body: JSON.stringify({ p_codigo: cod }) });
    if (pct && Number(pct) > 0){ cupomOk = { codigo: cod, pct: Number(pct) }; cupomAplicado = cod; msg.textContent = `✓ Cupom ${cod} aplicado: ${Number(pct)}% de desconto`; msg.className = 'cupom-msg ok'; }
    else { cupomOk = { codigo: '', pct: 0 }; cupomAplicado = ''; msg.textContent = 'Cupom inválido ou encerrado.'; msg.className = 'cupom-msg erro-c'; }
  } catch(e){ cupomOk = { codigo: '', pct: 0 }; cupomAplicado = ''; msg.textContent = 'Não foi possível conferir o cupom agora. Tente de novo.'; msg.className = 'cupom-msg erro-c'; }
  renderValores(); atualizarTroco();
}

/* ---------- Formulário ---------- */
const cliente = LS.get('pc_cliente', {});
if (cliente.fNome && $('#fNome')) $('#fNome').value = cliente.fNome;
if (cliente.fTel && $('#fTel')) $('#fTel').value = cliente.fTel;
function lembrarCliente(){ LS.set('pc_cliente', { fNome: $('#fNome').value.trim(), fTel: $('#fTel').value.trim() }); }

const pagSel = () => (document.querySelector('input[name=pag]:checked') || {}).value || '';
function mostrarSubPag(){ if (!$('#subPix')) return;
  const p = pagSel();
  $('#subPix').classList.toggle('hide', p !== 'pix');
  $('#subCartao').classList.toggle('hide', p !== 'cartao');
  $('#subDinheiro').classList.toggle('hide', p !== 'dinheiro');
  if ($('#subOnline')) $('#subOnline').classList.toggle('hide', p !== 'online');
  if (p) $('#ePag').classList.add('hide');
}
function atualizarTroco(){ if (!$('#fTroco')) return;
  const tot = calcTotais(pagSel()).total; const out = $('#trocoCalc'); const sem = $('#fSemTroco').checked;
  $('#fTroco').disabled = sem;
  if (sem){ out.textContent = 'Valor certo, sem troco.'; $('#eTroco').classList.add('hide'); return; }
  const v = parseMoney($('#fTroco').value);
  if (isNaN(v)){ out.textContent = ''; return; }
  if (v < tot){ out.textContent = ''; $('#eTroco').textContent = `O valor para troco (${brl(v)}) é menor que o total (${brl(tot)}).`; $('#eTroco').classList.remove('hide'); }
  else { $('#eTroco').classList.add('hide'); out.innerHTML = `Seu troco: <span style="color:var(--bandeira)">${brl(v - tot)}</span>`; }
}

function validar(){
  let primeiro = null; const marca = (el, msg, ok) => { if (msg) msg.classList.toggle('hide', ok); if (el) el.classList.toggle('erro', !ok); if (!ok && !primeiro) primeiro = el || msg; return ok; };
  const nome = $('#fNome').value.trim();
  marca($('#fNome'), $('#eNome'), nome.length >= 2);
  const tel = $('#fTel').value.replace(/\D/g, '');
  marca($('#fTel'), $('#eTel'), tel.length >= 10 && tel.length <= 13);
  const recV = (document.querySelector('input[name=receber]:checked') || {}).value || 'retirada';
  if (recV === 'entrega') marca($('#fEndereco'), $('#eEndereco'), $('#fEndereco').value.trim().length >= 5);
  marca(null, $('#ePriv'), $('#fPriv').checked);
  marca(null, $('#eCarro'), carroOk(carro)); if (!carroOk(carro) && primeiro === $('#eCarro')) primeiro = $('#coCarro button') || $('#eCarro');
  const p = pagSel();
  marca(null, $('#ePag'), !!p);
  if (p === 'cartao'){ const c = document.querySelector('input[name=cartao]:checked'); marca(null, $('#eCartao'), !!c); }
  const E0 = entregaSel(); if (E0 && bairros().length) marca($('#fBairro'), $('#eBairro'), E0.escolhido);
  if (p === 'dinheiro' && !$('#fSemTroco').checked){
    const v = parseMoney($('#fTroco').value); const tot = calcTotais(pagSel()).total;
    if (isNaN(v)){ $('#eTroco').textContent = 'Informe para quanto é o troco ou marque “Não preciso de troco”.'; marca($('#fTroco'), $('#eTroco'), false); }
    else if (v < tot){ $('#eTroco').textContent = `O valor para troco (${brl(v)}) é menor que o total (${brl(tot)}).`; marca($('#fTroco'), $('#eTroco'), false); }
    else marca($('#fTroco'), $('#eTroco'), true);
  }
  if (primeiro){ primeiro.scrollIntoView({behavior:'smooth', block:'center'}); if (primeiro.focus) primeiro.focus({preventScroll:true}); toast('Confira os campos destacados.'); return false; }
  return true;
}

/* ---------- Numeração universal dos pedidos ---------- */
async function getJSON(url, ms = 7000){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, {signal: ctl.signal, cache: 'no-store'}); clearTimeout(t); return { ok: r.ok, status: r.status, data: r.ok ? await r.json() : null }; }
  catch(e){ clearTimeout(t); return { ok:false, status:0, data:null }; }
}
async function rodadaAtual(){
  const g = await getJSON(`${API_CONTADOR}/get/${D.loja.contador}/rodada`);
  if (g.ok) return { ok:true, r: Number(g.data.value) || 0 };
  if (g.status === 404) return { ok:true, r: 0 };
  return { ok:false };
}
async function proximoNumero(){
  const rd = await rodadaAtual();
  if (rd.ok){
    const h = await getJSON(`${API_CONTADOR}/hit/${D.loja.contador}/pedidos-${rd.r}`);
    if (h.ok && h.data && Number.isFinite(Number(h.data.value))) return { num: pad(h.data.value), universal: true };
  }
  // Sem internet para o contador: numeração deste aparelho + 2 letras para não repetir
  const seq = (LS.get('pc_seq_local', 0) || 0) + 1; LS.set('pc_seq_local', seq);
  const L = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  return { num: pad(seq) + '-' + L[Math.floor(Math.random()*L.length)] + L[Math.floor(Math.random()*L.length)], universal: false };
}

/* ---------- Pix copia e cola ---------- */
const tlv = (id, v) => id + String(v.length).padStart(2,'0') + v;
function crc16(s){ let c = 0xFFFF; for (let i = 0; i < s.length; i++){ c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++){ c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; } } return c.toString(16).toUpperCase().padStart(4,'0'); }
const ascii = s => norm(s).toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
function chavePixFormatada(){
  const k = String(D.loja.pixChave || '').trim(); const t = D.loja.pixTipo;
  if (t === 'telefone'){ let d = k.replace(/\D/g,''); if (d.length <= 11) d = '55' + d; return '+' + d; }
  if (t === 'cpf' || t === 'cnpj') return k.replace(/\D/g,'');
  if (t === 'email') return k.toLowerCase();
  return k;
}
function pixCopiaCola(valor, txid){
  const gui = tlv('00','br.gov.bcb.pix') + tlv('01', chavePixFormatada());
  let p = tlv('00','01') + tlv('26', gui) + tlv('52','0000') + tlv('53','986');
  if (valor > 0) p += tlv('54', valor.toFixed(2));
  p += tlv('58','BR') + tlv('59', (ascii(D.loja.pixNome) || 'PONTO CAR').slice(0,25)) + tlv('60', (ascii(D.loja.pixCidade) || 'SAO PAULO').slice(0,15));
  p += tlv('62', tlv('05', (String(txid||'').replace(/[^A-Za-z0-9]/g,'').slice(0,25)) || '***'));
  p += '6304';
  return p + crc16(p);
}

/* ---------- Pedido: texto e envio ---------- */
const PAG_NOME = { pix:'Pix', credito:'Cartão de crédito (maquininha)', debito:'Cartão de débito (maquininha)', dinheiro:'Dinheiro', online:'Pagamento online (Mercado Pago)' };

/* ---------- Pagamento online (Mercado Pago) ---------- */
// 'teste' = só aparece abrindo o carrinho com ?mpteste=1 · 'ligado' = aparece para todos · 'desligado' = some
const MP_ONLINE = 'teste';
(function(){ try { if (/[?&]mpteste=1/.test(location.search)) sessionStorage.setItem('pc_mpteste', '1'); } catch(e){} })();
function mpLigado(){
  if (MP_ONLINE === 'ligado') return true;
  if (MP_ONLINE !== 'teste') return false;
  try { return sessionStorage.getItem('pc_mpteste') === '1'; } catch(e){ return false; }
}
async function mpIrPagar(num, token){
  const r = await fetch(`${SB_URL}/functions/v1/mp-criar`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify({ numero: String(num), token: String(token || '') }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw new Error(d.erro || 'Não foi possível abrir o pagamento agora.');
  location.href = d.url;
}
(function(){ const el = $('#pagOnline'); if (!el || !mpLigado()) return; el.classList.remove('hide'); const g = el.parentElement; g.classList.remove('c3'); g.classList.add('c2'); })();
function carroTexto(c){ return [c.marca, c.modelo, c.versao, c.ano, c.combustivel ? `(${c.combustivel})` : ''].filter(Boolean).join(' '); }
function pagTexto(o){
  if (o.pag === 'dinheiro') return o.trocoPara ? `Dinheiro — troco para ${brl(o.trocoPara)} (troco: ${brl(o.trocoPara - o.total)})` : 'Dinheiro — sem troco (valor certo)';
  return PAG_NOME[o.pag] || o.pag;
}
function textoPedido(o){
  const linhas = [
    `*PEDIDO Nº ${o.num} — PONTO CAR*`,
    `_${D.loja.frase}_`,
    '',
    `*Nome:* ${o.nome}`,
    `*Telefone:* ${o.telefone || ''}`,
    `*Carro:* ${carroTexto(o.carro)}`
  ];
  if (o.carro.extra) linhas.push(`*Info do carro:* ${o.carro.extra}`);
  linhas.push('', '*Itens:*');
  o.itens.forEach(i => linhas.push(`• ${i.qtd}x ${i.nome}${i.opcao ? ' — ' + i.opcao : ''} = ${brl(i.qtd * i.preco)}${i.oferta ? ' (oferta)' : ''}`));
  if ((o.descontos && o.descontos.length) || o.taxaEntrega){ linhas.push('', `Subtotal: ${brl(o.subtotal)}`); (o.descontos || []).forEach(d => linhas.push(`${d.nome}: − ${brl(d.valor)}`)); if (o.taxaEntrega) linhas.push(`Taxa de entrega (${o.bairro}): + ${brl(o.taxaEntrega)}`); }
  linhas.push('', `*TOTAL: ${brl(o.total)}*`, '',
    `*Recebimento:* ${o.receber === 'entrega' ? `Entrega${o.bairro ? ' (' + o.bairro + ')' : ''} — ${o.endereco || ''}${o.entregaCombinar ? ' · taxa a combinar' : ''}` : 'Retirada na loja'}`,
    `*Pagamento:* ${pagTexto(o)}`);
  if (o.obs) linhas.push(`*Observações:* ${o.obs}`);
  linhas.push('', '⚠️ A loja confere a compatibilidade das peças e entra em contato pelo telefone informado.');
  return linhas.join('\n');
}

async function finalizar(ev){
  ev.preventDefault();
  if (!linhasCarrinho().length){ toast('Seu pedido está vazio.'); return; }
  if (!cliSessao() || !cliCad){ renderCliCheckout(); toast(cliSessao() ? 'Complete o seu cadastro para finalizar.' : 'Entre na sua conta para finalizar o pedido.'); $('#cliCheckout').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (!validar()) return;
  lembrarCliente();
  const btn = $('#btnFinalizar'); btn.disabled = true; btn.innerHTML = 'Enviando seu pedido…';
  const p = pagSel(); const T = calcTotais(p);
  const receber = (document.querySelector('input[name=receber]:checked') || {}).value || 'retirada';
  const L = linhasCarrinho();
  const o = {
    id: uid(), num: '', universal: true, data: new Date().toISOString(),
    nome: $('#fNome').value.trim(), telefone: $('#fTel').value.trim(),
    endereco: receber === 'entrega' ? $('#fEndereco').value.trim() : '',
    carro: Object.assign({ marca:'', modelo:'', ano:'', versao:'', combustivel:'', extra:'' }, carro),
    itens: L.map(l => ({ nome: l.nome, opcao: l.opcao, qtd: l.qtd, preco: l.preco, oferta: l.oferta })),
    subtotal: T.sub, descontos: T.descontos, bairro: T.entrega ? T.entrega.bairro : '', taxaEntrega: T.taxa, entregaCombinar: !!(T.entrega && T.entrega.combinar), total: T.total,
    receber,
    pag: p === 'cartao' ? document.querySelector('input[name=cartao]:checked').value : p,
    trocoPara: p === 'dinheiro' && !$('#fSemTroco').checked ? parseMoney($('#fTroco').value) : 0,
    obs: $('#fObs').value.trim(), status: 'Novo'
  };
  // Monta a lista para o banco: só código e quantidade (o preço o banco busca sozinho)
  const porCod = {};
  const somar = (pe, q) => { const s0 = sbPecas && sbPecas[codNorm(pe.codigo)]; const c = s0 ? s0.codigo : String(pe.codigo || '').trim(); porCod[c] = (porCod[c] || 0) + q; };
  L.forEach(l => { if (l.kit) kitItens(l.kit).forEach(i => { if (i) somar(i.p, i.qtd * l.qtd); }); else somar(l.p, l.qtd); });
  const itensBanco = Object.entries(porCod).map(([codigo, quantidade]) => ({ codigo, quantidade }));
  const veiculo = carroTexto(o.carro) + (o.carro.extra ? ' — ' + o.carro.extra : '');
  try {
    const r = await cliFetch('rpc/criar_pedido', { method: 'POST', body: JSON.stringify({
      p_cliente_nome: o.nome,
      p_cliente_telefone: o.telefone,
      p_itens: itensBanco,
      p_forma_pagamento: pagTexto(o),
      p_tipo_entrega: receber,
      p_endereco: o.endereco || null,
      p_veiculos: veiculo || null,
      p_observacoes: o.obs || null,
      p_metodo: p || null,
      p_cupom: cupomValido(cupomAplicado) ? cupomOk.codigo : null,
      p_bairro: T.entrega && T.entrega.bairro && T.entrega.bairro !== 'Outro bairro' ? T.entrega.bairro : null
    }) });
    o.num = String(r.numero); o.total = Number(r.total); o.subtotal = r.subtotal != null ? Number(r.subtotal) : o.total; o.token = r.token || '';
    if (r.taxa != null) o.taxaEntrega = Number(r.taxa);
  } catch(err){
    btn.disabled = false; btn.innerHTML = `Finalizar pedido · <span id="totalBtn">${brl(T.total)}</span>`;
    toast('Não foi possível enviar o pedido: ' + err.message);
    sincronizarSupabase();
    return;
  }
  LS.set('pc_ultimo_carrinho', Object.assign({}, carrinho));
  const hist = LS.get('pc_pedidos', []); hist.unshift(o); LS.set('pc_pedidos', hist.slice(0, 500));
  LS.set('pc_ultimo', o);
  carrinho = {}; LS.set('pc_carrinho', carrinho); formAberto = false; cupomAplicado = ''; cupomOk = { codigo: '', pct: 0 }; $('#fCupom').value = ''; $('#cupomMsg').textContent = '';
  $('#fEndereco').value = ''; $('#fObs').value = ''; $('#fPriv').checked = false;
  btn.disabled = false; btn.innerHTML = `Finalizar pedido · <span id="totalBtn">${brl(0)}</span>`;
  if (o.pag === 'online' && o.token){
    btn.disabled = true; btn.textContent = 'Abrindo o pagamento…';
    try { await mpIrPagar(o.num, o.token); sincronizarSupabase(); return; }
    catch(err){ toast(err.message + ' Você pode pagar depois, em Meus pedidos.'); }
    btn.disabled = false; btn.innerHTML = `Finalizar pedido · <span id="totalBtn">${brl(0)}</span>`;
  }
  ir('resumo');
  sincronizarSupabase();
}

// Checkout: caixinha "Comprando como…"
function renderCliCheckout(){
  const el = $('#cliCheckout'); if (!el) return;
  const ss = cliSessao();
  if (!ss || !cliCad){
    el.className = 'cli-box';
    el.innerHTML = ss ? `<div>📝 <b>Falta completar o seu cadastro</b> (CPF e endereço) para finalizar.</div><button class="btn btn-ouro btn-sm" type="button" id="cIrConta">Completar cadastro</button>`
                      : `<div>🔐 <b>Para finalizar, entre na sua conta</b> ou crie uma. É rapidinho, e o carrinho continua salvo.</div><button class="btn btn-ouro btn-sm" type="button" id="cIrConta">Entrar ou criar conta</button>`;
    return;
  }
  el.className = 'cli-box ok';
  el.innerHTML = `<div>✅ Comprando como <b>${esc(cliCad.nome)}</b><br><small style="color:var(--muted)">CPF ${esc(cpfOculto(cliCad.cpf))} · ${esc(cliCad.email || ss.email || '')}</small></div><button class="btn btn-linha btn-sm" type="button" id="cIrConta">Minha conta</button>`;
  if (!$('#fNome').value) $('#fNome').value = cliCad.nome;
  if (!$('#fTel').value) $('#fTel').value = cliCad.telefone;
  if (!$('#fEndereco').value) $('#fEndereco').value = enderecoTexto(cliCad);
}

function renderLembrete(o){
  const box = $('#lemLinks'); if (!box) return; o = o || LS.get('pc_ultimo', null);
  const mm = +((document.querySelector('input[name=lemMeses]:checked') || {}).value || 6); const L = linksLembrete(mm, o);
  box.innerHTML = `<a class="btn btn-verde" target="_blank" rel="noopener" href="${L.google}">📅 Adicionar no Google Agenda · ${L.quando}</a><a class="btn btn-linha" href="${L.ics}" download="lembrete-pontocar.ics">Outra agenda (iPhone, Outlook…)</a>`;
}
function renderResumo(){ if (!$('#resumoIn')) return;
  const o = LS.get('pc_ultimo', null);
  if (!o){ ir(''); return; }
  const txt = textoPedido(o);
  const pix = o.pag === 'pix' ? pixCopiaCola(o.total, 'PC' + String(o.num).replace(/\D/g,'')) : '';
  const zaps = D.loja.whatsapp.filter(Boolean);
  $('#resumoIn').innerHTML = `
    <button class="voltar" type="button" data-ir="">← Voltar à loja</button>
    <div class="ok-top">
      <div style="font-size:14px;color:var(--cinza);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Pedido recebido ✅</div>
      <div class="num">Nº ${esc(o.num)}</div>
      <p class="obg">Obrigado pela preferência, ${esc(o.nome.split(' ')[0])}! 💛</p>
      <p>A Ponto Car já recebeu seu pedido. A loja confere a compatibilidade das peças e entra em contato pelo telefone ${esc(o.telefone || '')}.</p>
    </div>
    <div class="box">
      <h2>Resumo do pedido</h2>
      <div class="linha"><span>Número</span><span>${esc(o.num)}</span></div>
      <div class="linha"><span>Nome</span><span>${esc(o.nome)}</span></div>
      <div class="linha"><span>Telefone</span><span>${esc(o.telefone || '')}</span></div>
      <div class="linha"><span>Carro</span><span>${esc(carroTexto(o.carro))}</span></div>
      ${o.itens.map(i => `<div class="linha"><span>${i.qtd}x ${esc(i.nome)}${i.opcao ? ' — ' + esc(i.opcao) : ''}</span><span>${brl(i.qtd*i.preco)}</span></div>`).join('')}
      <div class="linha"><span>Recebimento</span><span>${o.receber === 'entrega' ? `Entrega${o.bairro ? ' — ' + esc(o.bairro) : ''}<br><small style="font-weight:500">${esc(o.endereco || '')}${o.entregaCombinar ? '<br>Taxa de entrega a combinar' : ''}</small>` : 'Retirada na loja' + (D.loja.endereco ? `<br><small style="font-weight:500">📍 ${esc(D.loja.endereco)}${D.loja.horario ? ' · 🕒 ' + esc(D.loja.horario) : ''}</small>` : '')}</span></div>
      <div class="linha"><span>Pagamento</span><span>${esc(pagTexto(o))}</span></div>
      ${o.obs ? `<div class="linha"><span>Observações</span><span>${esc(o.obs)}</span></div>` : ''}
      ${(o.descontos && o.descontos.length) || o.taxaEntrega ? `<div class="linha"><span>Subtotal</span><span>${brl(o.subtotal)}</span></div>` + (o.descontos || []).map(d => `<div class="linha desc"><span>${esc(d.nome)}</span><span>− ${brl(d.valor)}</span></div>`).join('') + (o.taxaEntrega ? `<div class="linha"><span>Taxa de entrega (${esc(o.bairro)})</span><span>+ ${brl(o.taxaEntrega)}</span></div>` : '') : ''}
      <div class="big-total"><span>Total</span><strong>${brl(o.total)}</strong></div>

    </div>
    ${o.pag === 'online' && o.token ? `<div class="box">
      <h2>Pagamento online</h2>
      <p class="prov">O pagamento ainda não foi concluído. Clique abaixo para pagar com Pix ou cartão pelo Mercado Pago.</p>
      <button class="btn btn-ouro" type="button" data-pagar="${esc(o.num)}">💳 Pagar agora · ${brl(o.total)}</button>
    </div>` : ''}
    ${pix ? `<div class="box">
      <h2>Pagamento por Pix</h2>
      <div class="aviso" style="margin-bottom:12px"><span>⏳</span><span>Pague <b>depois</b> que a loja entrar em contato para confirmar o pedido.</span></div>
      <b>Chave Pix</b>
      <div class="chave" style="margin:8px 0 6px"><code>${esc(D.loja.pixChave)}</code><button class="btn btn-verde btn-sm" type="button" data-copiar="chave">Copiar chave</button></div>
      <p class="prov">No app do banco: Pix → “Pagar com chave” → cole a chave e digite o valor de <b>${brl(o.total)}</b>.</p>
    </div>` : ''}
    <div class="acoes">
      <button class="btn btn-verde" type="button" data-ir="meus">📦 Acompanhar em Meus pedidos</button>
      <button class="btn btn-linha" type="button" data-copiar="pedido">📋 Copiar pedido</button>
      <button class="btn btn-ouro" type="button" id="novoPedido">Fazer um novo pedido</button>
    </div>
    <div class="box lembrete" style="margin-top:14px">
      <h2>📅 Lembrete da próxima troca</h2>
      <p style="margin-top:0;color:var(--muted);font-size:14px">Coloque um lembrete na agenda do celular para não esquecer de trocar o óleo e os filtros.</p>
      <div class="escolhas c3" id="lemMeses">${[3, 6, 12].map(mm => `<label class="esc"><input type="radio" name="lemMeses" value="${mm}" ${mm === 6 ? 'checked' : ''}><span class="bol"></span><span><b>Daqui a ${mm} meses</b></span></label>`).join('')}</div>
      <div class="acoes" id="lemLinks"></div>
    </div>
    ${redesHTML() ? `<div class="box" style="margin-top:14px;text-align:center"><b>Siga a Ponto Car 💛</b><div class="redes">${redesHTML()}</div></div>` : ''}`;
  $('#resumoIn').dataset.txt = txt; $('#resumoIn').dataset.pix = pix;
  renderLembrete(o);
}
