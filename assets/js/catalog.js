'use strict';
/* Ponto Car — carregamento de produtos, busca, filtros, kits, ficha do produto e escolha do carro */

/* ---------- Kits ---------- */
const kitPorId = id => (D.kits || []).find(k => k.id === id);
function kitItens(kit){
  return (kit.itens || []).map(it => { const p = prod(it.pid); if (!p) return null; const opc = it.oi >= 0 ? (p.opcoes || [])[it.oi] : null; if (it.oi >= 0 && !opc) return null;
    return { p, opc, qtd: it.qtd || 1, nome: p.nome + (opc ? ' — ' + opc.nome : ''), cheio: precoCheio(p, opc) }; });
}
function kitDisponivel(kit){ if (!kit || !kit.ativo) return false; const its = kitItens(kit); return its.length > 0 && its.every(i => i && !i.p.falta && !(i.opc && i.opc.falta)); }
const kitSoma = kit => kitItens(kit).reduce((s, i) => s + (i ? i.cheio * i.qtd : 0), 0);
const kitTexto = kit => kitItens(kit).filter(Boolean).map(i => `${i.qtd}x ${i.nome}`).join(' + ');
function kitCombina(kit, termos){ const hay = norm(kit.nome + ' ' + (kit.descricao || '') + ' ' + kitTexto(kit) + ' kit combo'); return termos.every(t => hay.includes(t)); }
function kitCardHTML(kit){
  const k = 'kit:' + kit.id; const q = carrinho[k] || 0; const soma = kitSoma(kit); const eco = soma - (Number(kit.preco) || 0);
  const acao = q ? `<div class="step" role="group" aria-label="Quantidade"><button data-menos="${esc(k)}" aria-label="Diminuir">−</button><output>${q}</output><button data-mais="${esc(k)}" aria-label="Aumentar">+</button></div>` : `<button class="btn btn-ouro add" data-mais="${esc(k)}">+ Adicionar</button>`;
  return `<article class="card kit-card">
    <div class="card-top"><div class="ico">🧰</div><div style="min-width:0"><span class="tag kit">🧰 Kit</span>${eco > 0.009 ? ` <span class="tag oferta">Economize ${brl(eco)}</span>` : ''}<h3>${esc(kit.nome)}</h3></div></div>
    <div class="ret"><span class="ret-t">📦 O kit leva</span><p>${kitItens(kit).filter(Boolean).map(i => `${i.qtd}x ${esc(i.nome)}`).join('<br>')}</p></div>
    ${kit.descricao ? `<div class="ret"><span class="ret-t">📄 Descrição</span><p class="clamp">${esc(kit.descricao)}</p></div>` : ''}
    <div class="card-bot"><span class="preco">${eco > 0.009 ? `<s>${brl(soma)}</s> ` : ''}${brl(kit.preco)}</span>${acao}</div>
  </article>`;
}
function limparCarrinhoInvalido(){
  for (const k of Object.keys(carrinho)){
    if (k.startsWith('kit:')){ if (!kitDisponivel(kitPorId(k.slice(4)))) delete carrinho[k]; continue; }
    const [pid, oi] = k.split('|'); const p = prod(pid); const o = +oi;
    if (!p || p.falta || (o >= 0 && (!p.opcoes || !p.opcoes[o] || p.opcoes[o].falta)) || (o < 0 && p.opcoes && p.opcoes.length)) delete carrinho[k];
  }
}
/* ---------- Ofertas ---------- */
function precoCheio(p, opc){ return Number(opc ? opc.preco : p.preco) || 0; }
function precoOferta(p, opc){
  if (!p.oferta) return 0;
  const v = Number(opc ? opc.precoOferta : p.precoOferta) || 0; const c = precoCheio(p, opc);
  return v > 0 && v < c ? v : 0;
}
const precoFinal = (p, opc) => precoOferta(p, opc) || precoCheio(p, opc);
const temOferta = p => !!p.oferta && ((p.opcoes && p.opcoes.length) ? p.opcoes.some(o => precoOferta(p, o)) : !!precoOferta(p, null));
function precoHTML(p, opc){ const o = precoOferta(p, opc); return o ? `<s>${brl(precoCheio(p, opc))}</s> ${brl(o)}` : brl(precoCheio(p, opc)); }

/* ---------- Busca ---------- */
let busca = '', catAtiva = '';
function anoServe(txt, y){
  const t = norm(txt); let m;
  const re = /((?:19|20)\d{2})\s*(?:-|–|a|ate|\/|~)\s*((?:19|20)\d{2})/g;
  while ((m = re.exec(t))) if (y >= +m[1] && y <= +m[2]) return true;
  const re2 = /((?:19|20)\d{2})\s*(?:\+|em diante|>)/g;
  while ((m = re2.exec(t))) if (y >= +m[1]) return true;
  return false;
}
function combina(p, termos){
  const hay = norm([p.nome, p.marca, p.codigo, p.similares, p.aplicacao, p.descricao, catNome(p.cat), (p.opcoes||[]).map(o=>o.nome).join(' ')].join(' '));
  const compacto = hay.replace(/[\s\-.\/]/g, '');
  return termos.every(t => {
    if (/^(19|20)\d{2}$/.test(t) && anoServe(p.aplicacao || '', +t)) return true;
    return hay.includes(t) || compacto.includes(t.replace(/[\s\-.\/]/g, ''));
  });
}

/* ---------- Ícones ---------- */
const icoFiltro = '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect x="8" y="4" width="16" height="24" rx="4" fill="#D4AF37" stroke="#07120D" stroke-width="1.5"/><rect x="8" y="9" width="16" height="2.5" fill="#07120D"/><rect x="8" y="20.5" width="16" height="2.5" fill="#07120D"/><circle cx="16" cy="16" r="3" fill="#00843D"/></svg>';
const icoOleo = '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3s-8 9.5-8 15a8 8 0 0 0 16 0C24 12.5 16 3 16 3z" fill="#D4AF37" stroke="#07120D" stroke-width="1.5"/><path d="M12 19a4 4 0 0 0 4 4" stroke="#00843D" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const icone = p => /oleo|fluido|aditivo/.test(norm(catNome(p.cat) + ' ' + p.nome)) && !/filtro/.test(norm(p.nome)) ? icoOleo : icoFiltro;

/* ---------- Render: loja ---------- */
/* ---------- Horário: aberto agora ---------- */
const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const paraMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fmtH = t => { const [h, m] = String(t).split(':').map(Number); return h + 'h' + (m ? String(m).padStart(2, '0') : ''); };
function agoraSP(){ try { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })); } catch(e){ return new Date(); } }
function temHorarios(){ const H = D.loja.horarios; return !!(H && Object.values(H).some(Boolean)); }
function statusLoja(){
  if (!temHorarios()) return null;
  const H = D.loja.horarios; const n = agoraSP(); const dia = n.getDay(); const min = n.getHours() * 60 + n.getMinutes();
  const hj = H[dia];
  if (hj && min >= paraMin(hj[0]) && min < paraMin(hj[1])) return { aberto: true, curto: `Aberto · fecha ${fmtH(hj[1])}`, longo: `Aberto agora · fecha às ${fmtH(hj[1])}` };
  for (let i = 0; i < 8; i++){
    const dd = (dia + i) % 7; const h = H[dd]; if (!h) continue;
    if (i === 0){ if (min < paraMin(h[0])) return { aberto: false, curto: `Fechado · abre ${fmtH(h[0])}`, longo: `Fechado agora · abre hoje às ${fmtH(h[0])}` }; continue; }
    const quando = i === 1 ? 'amanhã' : DIAS[dd].toLowerCase();
    return { aberto: false, curto: `Fechado · abre ${i === 1 ? 'amanhã' : DIAS_C[dd].toLowerCase()} ${fmtH(h[0])}`, longo: `Fechado agora · abre ${quando} às ${fmtH(h[0])}` };
  }
  return { aberto: false, curto: 'Fechado', longo: 'Fechado' };
}
function resumoHorarios(){
  if (!temHorarios()) return '';
  const H = D.loja.horarios; const grupos = []; const ordem = [1,2,3,4,5,6,0];
  ordem.forEach(d => { const h = H[d]; const chave = h ? h.join('-') : ''; const g = grupos[grupos.length - 1];
    if (g && g.chave === chave) g.dias.push(d); else grupos.push({ chave, h, dias: [d] }); });
  return grupos.filter(g => g.h).map(g => `${DIAS_C[g.dias[0]]}${g.dias.length > 1 ? ' a ' + DIAS_C[g.dias[g.dias.length - 1]] : ''} ${fmtH(g.h[0])}–${fmtH(g.h[1])}`).join(' · ');
}
function statusHTML(longo){ const st = statusLoja(); if (!st) return ''; const txt = longo ? st.longo : st.curto; const [a1, ...r] = txt.split(' · '); return `<span class="status-loja ${st.aberto ? 'aberto' : 'fechado'}"><i></i>${esc(a1)}${r.length ? `<span class="st-det"> · ${esc(r.join(' · '))}</span>` : ''}</span>`; }

function renderLoja(){ if (!$('#grid')){ renderLado(); return; }
  limparCarrinhoInvalido();
  $('#fraseTopo').textContent = D.loja.frase; $('#fraseRod').textContent = D.loja.frase;
  $('#zapsRod').innerHTML = D.loja.whatsapp.filter(Boolean).map(n => `<a target="_blank" rel="noopener" href="https://wa.me/${esc(String(n).replace(/\D/g,''))}">${esc(fone(n))}</a>`).join(' · ');
  const L0 = D.loja;
  $('#redesRod').innerHTML = REDES.filter(r => D.loja[r.k]).map(r => `<a target="_blank" rel="noopener" href="${esc(redeLink(r, D.loja[r.k]))}">${r.nome} ${esc(redeNome(D.loja[r.k]))}</a>`).join(' · ');
  $('#seloPix').classList.toggle('hide', !pctPix()); $('#seloPix').textContent = `${pctPix()}% off no Pix`;
  const horTxt = L0.horario || resumoHorarios();
  $('#endRod').innerHTML = [horTxt ? esc(horTxt) : '', L0.endereco ? `${esc(L0.endereco)} · <a class="rod-mapa" target="_blank" rel="noopener" href="${mapaLink()}">Ver no mapa</a>` : ''].filter(Boolean).join('<br>');
  const ei = $('#entregaInfo'); if (ei) ei.textContent = bairros().length ? 'Escolha o bairro e informe o endereço.' : 'Informe o endereço logo abaixo.';
  const sr = $('#retiradaInfo'); if (sr) sr.innerHTML = L0.endereco ? `📍 ${esc(L0.endereco)}${horTxt ? `<br>🕒 ${esc(horTxt)}` : ''}${statusLoja() ? '<br>' + statusHTML(true) : ''}<br><a target="_blank" rel="noopener" href="${mapaLink()}" style="color:var(--bandeira);font-weight:700">Ver no mapa</a>` : 'Você busca quando estiver pronto.';
  const comProd = D.categorias.filter(c => D.produtos.some(p => p.cat === c.id));
  const orfaos = D.produtos.some(p => !D.categorias.find(c => c.id === p.cat));
  const haOfertas = D.produtos.some(temOferta);
  const kitsOk = (D.kits || []).filter(kitDisponivel);
  if (catAtiva && !comProd.find(c => c.id === catAtiva) && !(catAtiva === '_outros' && orfaos) && !(catAtiva === '_ofertas' && haOfertas) && !(catAtiva === '_kits' && kitsOk.length)) catAtiva = '';
  $('#cats').innerHTML = D.produtos.length ? [`<button class="chip" data-cat="" aria-pressed="${!catAtiva}">Todos</button>`].concat(haOfertas ? [`<button class="chip chip-oferta" data-cat="_ofertas" aria-pressed="${catAtiva==='_ofertas'}">🏷️ Ofertas</button>`] : []).concat(kitsOk.length ? [`<button class="chip chip-kit" data-cat="_kits" aria-pressed="${catAtiva==='_kits'}">🧰 Kits</button>`] : [])
    .concat(comProd.map(c => `<button class="chip" data-cat="${esc(c.id)}" aria-pressed="${catAtiva===c.id}">${esc(c.nome)}</button>`))
    .concat(orfaos ? [`<button class="chip" data-cat="_outros" aria-pressed="${catAtiva==='_outros'}">Outros</button>`] : []).join('') : '';

  const termos = norm(busca).split(/\s+/).filter(Boolean);
  let lista = catAtiva === '_kits' ? [] : D.produtos.filter(p => !catAtiva || (catAtiva === '_ofertas' ? temOferta(p) : catAtiva === '_outros' ? !D.categorias.find(c => c.id === p.cat) : p.cat === catAtiva));
  if (termos.length) lista = lista.filter(p => combina(p, termos));
  const filtroCarro = soMeuCarro && carroOk(carro);
  if (filtroCarro) lista = lista.filter(p => p.aplicacao && combina({ nome:'', marca:'', codigo:'', similares:'', aplicacao: p.aplicacao, descricao:'', cat:'', opcoes:[] }, norm(carro.modelo).split(/\s+/).filter(Boolean).concat([String(carro.ano)])));
  const ordemCat = id => { const i = D.categorias.findIndex(c => c.id === id); return i < 0 ? 999 : i; };
  lista.sort((a, b) => (a.falta - b.falta) || ((b.maisVendido ? 1 : 0) - (a.maisVendido ? 1 : 0)) || (ordemCat(a.cat) - ordemCat(b.cat)));

  $('#hero').classList.toggle('hide', !!(busca.trim() || filtroCarro));
  const alvo = [busca.trim() ? `“${busca.trim()}”` : '', filtroCarro ? `${carro.modelo} ${carro.ano}` : ''].filter(Boolean).join(' · ');
  $('#infoBusca').innerHTML = alvo ? `${lista.length} ${lista.length === 1 ? 'item encontrado' : 'itens encontrados'} para ${esc(alvo)}${filtroCarro ? ' (a loja confirma a compatibilidade)' : ''} <button class="limpa-filtro" type="button" data-limpartudo>✕ Limpar pesquisa</button>` : '';
  renderCarroBar();
  const ultOk = !Object.keys(carrinho).length && !busca.trim() && !filtroCarro ? ultimoCarrinhoValido() : null;
  $('#repetirBox').innerHTML = ultOk ? `<div class="repetir"><span>🔁 <b>Repetir seu último pedido?</b> <small>${Object.values(ultOk).reduce((a, b) => a + b, 0)} itens</small></span><span style="display:flex;gap:6px"><button class="btn btn-ouro btn-sm" type="button" data-repetir>Repetir pedido</button><button class="ic-btn" type="button" data-esquecer aria-label="Esconder">✕</button></span></div>` : '';
  const grid = $('#grid');
  const kitsAchados = catAtiva === '_kits' ? kitsOk : (termos.length && !filtroCarro ? kitsOk.filter(k => kitCombina(k, termos)) : []);
  if (catAtiva === '_kits'){
    grid.innerHTML = `<section class="faixa-ofertas" style="grid-column:1/-1"><h2>🧰 Kits com desconto</h2></section>` + kitsAchados.map(kitCardHTML).join('');
  } else if (kitsAchados.length && !lista.length){
    grid.innerHTML = kitsAchados.map(kitCardHTML).join('');
  } else if (!D.produtos.length){
    grid.innerHTML = `<div class="vazio" style="grid-column:1/-1"><b>Estamos montando nosso estoque 🛠️</b>Em breve os filtros e óleos aparecem aqui. Enquanto isso, chame a gente no WhatsApp e diga o modelo e o ano do seu carro.<br><a class="btn btn-verde" target="_blank" rel="noopener" href="${zapLink('Olá, Ponto Car! Preciso de filtro/óleo para o meu carro: ')}">Falar no WhatsApp</a></div>`;
  } else if (!lista.length){
    grid.innerHTML = `<div class="vazio" style="grid-column:1/-1"><b>Não encontramos ${esc(alvo)}</b>${filtroCarro ? 'Ainda não cadastramos peças para esse carro no site. ' : 'Tente outro nome, a marca, o código ou só o modelo do carro. '}Pergunte direto pra gente:<br>${filtroCarro ? '<button class="btn btn-linha" data-socarro style="margin-top:14px">Ver todos os produtos</button> ' : ''}<button class="btn btn-verde" type="button" data-encomenda="${esc(busca.trim())}" style="margin-top:14px">🔎 Encomendar essa peça</button></div>`;
  } else {
    const ofertas = D.produtos.filter(p => temOferta(p) && !p.falta);
    const faixa = (!termos.length && !filtroCarro && !catAtiva && ofertas.length) ? `<section class="faixa-ofertas" style="grid-column:1/-1"><h2>🏷️ Ofertas da semana</h2><div class="faixa">${ofertas.map(cardHTML).join('')}</div></section>` : '';
    const faixaKits = (!termos.length && !filtroCarro && !catAtiva && kitsOk.length) ? `<section class="faixa-ofertas" style="grid-column:1/-1"><h2>🧰 Kits com desconto</h2><div class="faixa">${kitsOk.map(kitCardHTML).join('')}</div></section>` : '';
    grid.innerHTML = faixa + faixaKits + kitsAchados.map(kitCardHTML).join('') + lista.map(cardHTML).join('') +
      `<div class="encomenda-card"><div><b>🔎 Não achou a peça?</b><span>A gente procura e encomenda pra você.</span></div><button class="btn btn-verde btn-sm" type="button" data-encomenda="${esc(busca.trim())}">Encomendar</button></div>`;
  }
  renderLado();
}

function infoProduto(p){
  const ops = p.opcoes || [];
  let oi = -1;
  if (ops.length){
    if (opcaoSel[p.id] == null || !ops[opcaoSel[p.id]] || ops[opcaoSel[p.id]].falta) opcaoSel[p.id] = Math.max(0, ops.findIndex(o => !o.falta));
    oi = opcaoSel[p.id];
  }
  const opc = oi >= 0 ? ops[oi] : null;
  const tudoFalta = !!(p.falta || (ops.length && ops.every(o => o.falta)));
  const disp = ops.filter(o => !o.falta);
  const aPartir = ops.length ? Math.min(...(disp.length ? disp : ops).map(o => precoFinal(p, o))) : precoFinal(p, null);
  const qtdTotal = Object.entries(carrinho).filter(([k]) => k.split('|')[0] === p.id).reduce((s, [, q]) => s + q, 0);
  return { ops, oi, opc, tudoFalta, aPartir, qtdTotal, k: p.id + '|' + oi, preco: precoFinal(p, opc), oferta: temOferta(p) };
}
function similarBuscado(p){
  const termos = norm(busca).split(/\s+/).filter(t => t.length >= 3); if (!termos.length || !p.similares) return '';
  const cpt = x => norm(x).replace(/[\s\-.\/]/g, '');
  const lista = String(p.similares).split(/,\s*/).filter(Boolean);
  if (termos.some(t => cpt(p.codigo || '').includes(cpt(t)) || norm(p.nome).includes(t))) return '';
  return lista.find(c => termos.some(t => cpt(c).includes(cpt(t)))) || '';
}
function marcaCodigo(p){ return [p.codigo ? 'Cód. ' + p.codigo : '', p.marca].filter(Boolean).join(' · '); }
function acaoHTML(p, I, grande){
  const q = carrinho[I.k] || 0;
  if (I.tudoFalta) return `<button class="btn btn-linha add" disabled style="color:#56665C;border-color:#C9D3CC">Em falta</button>`;
  if (q) return `<div class="step${grande ? '' : ''}" role="group" aria-label="Quantidade"><button data-menos="${esc(I.k)}" aria-label="Diminuir">−</button><output>${q}</output><button data-mais="${esc(I.k)}" aria-label="Aumentar">+</button></div>`;
  return `<button class="btn btn-ouro add" data-mais="${esc(I.k)}">+ Adicionar</button>`;
}
function cardHTML(p){
  const I = infoProduto(p);
  let acao;
  if (I.ops.length && !I.tudoFalta) acao = `<button class="btn ${I.qtdTotal ? 'btn-verde' : 'btn-ouro'} add" data-abrir="${esc(p.id)}">${I.qtdTotal ? `✓ ${I.qtdTotal} no pedido` : 'Ver opções'}</button>`;
  else acao = acaoHTML(p, I);
  const mc = marcaCodigo(p);
  const simBuscado = similarBuscado(p);
  return `<article class="card${I.tudoFalta ? ' falta' : ''}${I.oferta && !I.tudoFalta ? ' em-oferta' : ''}" data-abrir="${esc(p.id)}" tabindex="0" aria-label="Ver detalhes de ${esc(p.nome)}">
    <div class="card-top">
      <div class="ico">${p.foto ? `<img src="${esc(p.foto)}" alt="" onerror="this.remove()">` : icone(p)}</div>
      <div style="min-width:0">
        ${I.oferta && !I.tudoFalta ? '<span class="tag oferta">🏷️ Oferta</span>' : ''}
        <h3>${esc(p.nome)}</h3>
        ${mc ? `<div class="meta">${esc(mc)}</div>` : ''}
        ${simBuscado ? `<div class="sim-hit">🔁 Similar a: ${esc(simBuscado)}</div>` : ''}
        ${I.tudoFalta ? '<span class="selo-est falta">✕ Em falta</span>' : '<span class="selo-est ok">✓ Em estoque</span>'}${p.maisVendido ? ' <span class="selo-est mv">⭐ Mais vendido</span>' : ''}
      </div>
    </div>
    ${p.aplicacao ? `<div class="ret"><span class="ret-t">🚗 Veículos</span><p class="clamp">${esc(p.aplicacao)}</p></div>` : ''}
    ${p.descricao ? `<div class="ret"><span class="ret-t">📄 Descrição</span><p class="clamp">${esc(p.descricao)}</p></div>` : ''}
    <div class="card-bot"><span class="preco">${I.ops.length ? '<small>a partir de</small> ' + brl(I.aPartir) : precoHTML(p, null)}</span>${acao}</div>
    <div class="ver-tudo">Toque para ver tudo</div>
  </article>`;
}

/* ---------- Combina com / compartilhar / encomenda / repetir ---------- */
function combinaCom(p){
  const ids = new Set(p.combina || []);
  D.produtos.forEach(x => { if ((x.combina || []).includes(p.id)) ids.add(x.id); });
  ids.delete(p.id);
  return [...ids].map(prod).filter(x => x && !x.falta);
}
function miniCombinaHTML(x){
  const I2 = infoProduto(x);
  let acao;
  if (I2.tudoFalta) acao = '<span class="prov">Em falta</span>';
  else if (I2.ops.length) acao = `<button class="btn btn-linha btn-sm" data-abrir="${esc(x.id)}">Ver opções</button>`;
  else if (carrinho[I2.k]) acao = `<span class="ok-tag">✓ No pedido</span>`;
  else acao = `<button class="btn btn-ouro btn-sm" data-mais="${esc(I2.k)}">+ Adicionar</button>`;
  return `<div class="comb-item"><button class="comb-nome" type="button" data-abrir="${esc(x.id)}"><b>${esc(x.nome)}</b><small>${I2.ops.length ? 'a partir de ' + brl(I2.aPartir) : brl(I2.preco)}</small></button>${acao}</div>`;
}
function abrirEncomenda(peca){
  const nomeIni = ($('#fNome') && $('#fNome').value.trim()) || (LS.get('pc_cliente', {}).fNome || '');
  modal(`<h2>🔎 Encomendar uma peça</h2>
    <p style="margin:0 0 4px;color:var(--muted);font-size:14px">Não achou no site? Diga qual peça e o carro que a Ponto Car procura pra você.</p>
    <form id="fEnc" novalidate>
      <label class="lbl" for="encPeca">Peça que você procura <i>*</i></label><input class="in" id="encPeca" value="${esc(peca || '')}" placeholder="Ex.: filtro de combustível">
      <label class="lbl" for="encCarro">Carro (marca, modelo e ano)</label><input class="in" id="encCarro" value="${esc(carroOk(carro) ? carroTexto(carro) : '')}" placeholder="Ex.: Chevrolet S10 2016">
      <label class="lbl" for="encNome">Seu nome</label><input class="in" id="encNome" value="${esc(nomeIni)}" placeholder="Ex.: João">
      <label class="lbl" for="encObs">Observação <small>(opcional — código da peça antiga, marca…)</small></label><input class="in" id="encObs" placeholder="Ex.: código Fram CA10161">
      <div class="msg-erro hide" id="eEnc">Diga qual peça você procura.</div>
      <div class="acoes-m"><button type="button" class="btn btn-linha" data-fechar>Cancelar</button><a class="btn btn-verde" id="encEnviar" target="_blank" rel="noopener" href="#">📲 Enviar no WhatsApp</a></div>
    </form>`, m => {
    const montar = () => {
      const v = id => m.querySelector(id).value.trim();
      const t = ['Olá, Ponto Car! Quero *encomendar uma peça*:', '', `*Peça:* ${v('#encPeca')}`];
      if (v('#encCarro')) t.push(`*Carro:* ${v('#encCarro')}`);
      if (v('#encNome')) t.push(`*Nome:* ${v('#encNome')}`);
      if (v('#encObs')) t.push(`*Obs.:* ${v('#encObs')}`);
      m.querySelector('#encEnviar').href = zapLink(t.join('\n'));
    };
    m.addEventListener('input', montar); montar();
    m.querySelector('#encEnviar').addEventListener('click', e => {
      if (!m.querySelector('#encPeca').value.trim()){ e.preventDefault(); m.querySelector('#eEnc').classList.remove('hide'); m.querySelector('#encPeca').focus(); return; }
      setTimeout(() => { fecharModal(); toast('Abrindo o WhatsApp…'); }, 300);
    });
  });
}
function ultimoCarrinhoValido(){
  const ult = LS.get('pc_ultimo_carrinho', null); if (!ult) return null;
  const bak = carrinho; carrinho = Object.assign({}, ult); limparCarrinhoInvalido(); const ok = carrinho; carrinho = bak;
  return Object.keys(ok).length ? ok : null;
}

/* ---------- Ficha completa do produto ---------- */
let detalheAberto = null;
function abrirDetalhe(id){ if (!prod(id)) return; if (PAGINA !== 'produto'){ location.href = 'produto.html?id=' + encodeURIComponent(id); return; } detalheAberto = id; renderDetalhe(); window.scrollTo(0, 0); return; modal('<div id="fichaIn"></div>'); const m = document.querySelector('.modal'); if (m) m.classList.add('ficha'); renderDetalhe(); }
function renderDetalhe(){
  const box = $('#fichaIn'); const p = prod(detalheAberto); if (!box || !p) return;
  const I = infoProduto(p); const mc = marcaCodigo(p);
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <span><span class="tag">${esc(catNome(p.cat))}</span> ${I.oferta ? '<span class="tag oferta">🏷️ Oferta</span>' : ''}</span>
      ${PAGINA === 'produto' ? '' : '<button class="ic-btn fechar-ficha" data-fechar aria-label="Fechar">✕</button>'}
    </div>
    ${p.foto ? `<img class="foto" style="margin-top:10px" src="${esc(p.foto)}" alt="${esc(p.nome)}" onerror="this.remove()">` : ''}
    <h2 style="margin:10px 0 2px">${esc(p.nome)}</h2>
    ${mc ? `<div class="meta" style="font-size:14px">${esc(mc)}</div>` : ''}
    ${I.tudoFalta ? '<span class="selo-est falta">✕ Em falta</span>' : '<span class="selo-est ok">✓ Em estoque</span>'}${p.maisVendido ? ' <span class="selo-est mv">⭐ Mais vendido</span>' : ''}
    ${p.aplicacao ? `<div class="ret" style="margin-top:12px"><span class="ret-t">🚗 Veículos</span><p>${esc(p.aplicacao)}</p></div>` : ''}
    ${p.similares ? `<div class="ret" style="margin-top:10px"><span class="ret-t">🔁 Códigos similares</span><p>${esc(p.similares)}</p></div>` : ''}
    ${p.descricao ? `<div class="ret" style="margin-top:10px"><span class="ret-t">📄 Descrição</span><p style="white-space:pre-line">${esc(p.descricao)}</p></div>` : ''}
    ${I.ops.length ? `<div style="margin-top:12px"><span class="ret-t">Escolha a opção</span><div class="opts" style="margin-top:6px">${I.ops.map((o, i) => `<button class="opt" data-op="${esc(p.id)}|${i}" aria-pressed="${i===I.oi}" ${o.falta||p.falta ? 'disabled' : ''}>${esc(o.nome)} · ${precoHTML(p, o)}${o.falta ? ' (em falta)' : ''}</button>`).join('')}</div></div>` : ''}
    <div class="card-bot" style="margin-top:16px"><span class="preco">${precoHTML(p, I.opc)}</span>${acaoHTML(p, I)}</div>
    ${(() => { const comb = combinaCom(p); return comb.length ? `<div class="comb-box"><span class="ret-t">🤝 Combina com</span>${comb.map(miniCombinaHTML).join('')}</div>` : ''; })()}
    ${I.qtdTotal ? `<button class="btn btn-ouro" style="width:100%;margin-top:6px" data-ir="pedido">Ver meu pedido →</button>` : ''}`;
}

function stepHTML(k, q){ return `<div class="step sm" role="group" aria-label="Quantidade"><button data-menos="${esc(k)}" aria-label="Diminuir">−</button><output>${q}</output><button data-mais="${esc(k)}" aria-label="Aumentar">+</button></div>`; }

function renderLado(){ if (!$('#barra')) return;
  const L = linhasCarrinho(); const tot = totalCarrinho(); const qtd = qtdCarrinho();
  if ($('#lado')) $('#lado').innerHTML = `<h2>🛒 Seu pedido</h2>` + (L.length ? `<ul class="mini">${L.map(l => `<li><div><div class="n">${esc(l.nome)}</div>${l.opcao ? `<div class="o">${esc(l.opcao)}</div>` : ''}<div class="o">${brl(l.preco)} cada</div></div><div class="v">${brl(l.qtd*l.preco)}</div><div style="grid-column:1/-1">${stepHTML(l.k, l.qtd)}</div></li>`).join('')}</ul>
    <div class="total-row"><span>Total</span><strong>${brl(tot)}</strong></div>
    <button class="btn btn-ouro" style="width:100%" data-ir="pedido">Ver meu pedido →</button>` : `<p style="color:var(--muted);margin:0">Seu pedido está vazio. Toque em <b>+ Adicionar</b> nos produtos.</p>`);
  const hh = rotaAtual(); const mostrar = L.length && (hh === '' || hh === 'produto');
  $('#barra').classList.toggle('hide', !mostrar);
  document.body.classList.toggle('tem-barra', !!mostrar);
  $('#barraQ').textContent = `${qtd} ${qtd === 1 ? 'item' : 'itens'} no pedido`;
  $('#barraT').textContent = brl(tot);
}

/* ---------- Dados do carro (menu flutuante) ---------- */
let carro = LS.get('pc_carro', null);
let soMeuCarro = false;
const carroOk = c => !!(c && c.modelo && +c.ano >= 1950 && +c.ano <= new Date().getFullYear() + 1);
const MARCAS = ['Chevrolet','Fiat','Ford','Honda','Hyundai','Jeep','Nissan','Peugeot','Citroën','Renault','Toyota','Volkswagen','Mitsubishi','Kia','BYD','Caoa Chery'];
function renderCarroBar(){ if (!$('#carroBar')) return;
  const bar = $('#carroBar'); if (!bar) return;
  const h = rotaAtual();
  bar.classList.toggle('hide', h === 'painel' || h === 'resumo' || h === 'meus' || h === 'conta' || (h === '' && !!(busca.trim() || (soMeuCarro && carroOk(carro)))));
  bar.innerHTML = `<div class="carro-in"><button class="carro-btn" data-carro type="button">🚗 <b><span class="t-lg">Pesquisar peças pelo seu carro</span><span class="t-sm">Pesquisar pelo carro</span></b></button></div>`;
}
function abrirCarro(){
  const c = {}; // abre sempre limpo: as informações somem depois de cada pesquisa
  const noPedido = rotaAtual() === 'pedido';
  modal(`<h2>🚗 Dados do seu carro</h2>
    <p style="margin:0 0 4px;color:var(--muted);font-size:14px">Com o carro informado, a loja confere a compatibilidade e você pode ver só as peças dele.</p>
    <form id="fCarro" novalidate>
      <div class="g2">
        <div><label class="lbl" for="cMarca">Marca</label><input class="in" id="cMarca" list="listaMarcas" value="${esc(c.marca||'')}" placeholder="Ex.: Volkswagen"><datalist id="listaMarcas">${MARCAS.map(m => `<option value="${m}">`).join('')}</datalist></div>
        <div><label class="lbl" for="cModelo">Modelo <i>*</i></label><input class="in" id="cModelo" value="${esc(c.modelo||'')}" placeholder="Ex.: Gol"></div>
      </div>
      <div class="g2">
        <div><label class="lbl" for="cAno">Ano <i>*</i></label><input class="in" id="cAno" inputmode="numeric" maxlength="4" value="${esc(c.ano||'')}" placeholder="Ex.: 2015"></div>
        <div><label class="lbl" for="cComb">Combustível</label><select class="in" id="cComb">${['','Flex','Gasolina','Etanol','Diesel','GNV','Híbrido'].map(o => `<option value="${o}" ${o===(c.combustivel||'')?'selected':''}>${o||'—'}</option>`).join('')}</select></div>
      </div>
      <label class="lbl" for="cVersao">Versão / motor</label><input class="in" id="cVersao" value="${esc(c.versao||'')}" placeholder="Ex.: 1.0 MPI 12V">
      <div class="msg-erro hide" id="eCarroM">Informe pelo menos o modelo e o ano (ex.: Gol 2015).</div>
      <div class="acoes-m"><button type="button" class="btn btn-linha" data-fechar>${carroOk(carro) ? 'Cancelar' : 'Agora não'}</button><button class="btn btn-ouro" type="submit">${noPedido ? 'Confirmar carro' : '🔍 Pesquisar'}</button></div>
    </form>`, m => {
    m.querySelector('#cAno').addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g,'').slice(0,4));
    m.querySelector('#fCarro').onsubmit = e => {
      e.preventDefault();
      const v = id => m.querySelector(id).value.trim();
      const novo = { marca: v('#cMarca'), modelo: v('#cModelo'), ano: v('#cAno'), versao: v('#cVersao'), combustivel: v('#cComb'), extra: '' };
      if (!carroOk(novo)){ m.querySelector('#eCarroM').classList.remove('hide'); m.querySelector(!novo.modelo ? '#cModelo' : '#cAno').focus(); return; }
      carro = novo; LS.set('pc_carro', carro); m.querySelector('#fCarro').reset(); fecharModal();
      $('#eCarro').classList.add('hide');
      if (noPedido){ renderCarroBar(); renderCoCarro(); toast('Carro confirmado!'); return; }
      soMeuCarro = true; busca = ''; $('#q').value = ''; $('#limparBusca').classList.add('hide');
      renderCoCarro(); if (rotaAtual() === 'produto') renderDetalhe(); else if (rotaAtual() !== '') ir(''); else { renderLoja(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      toast(`Peças para ${carro.modelo} ${carro.ano}`);
    };
  });
  LS.set('pc_carro_visto', true);
}
function renderCoCarro(){ if (!$('#coCarro')) return;
  const el = $('#coCarro'); if (!el) return;
  el.innerHTML = carroOk(carro)
    ? `<div class="carro-resumo"><span>🚗 <b>${esc(carroTexto(carro))}</b>${carro.extra ? `<br><small>${esc(carro.extra)}</small>` : ''}</span><button class="btn btn-linha btn-sm" type="button" data-carro>Alterar</button></div>`
    : `<button class="btn btn-linha" style="width:100%" type="button" data-carro id="btnInfoCarro">🚗 Informar o carro (modelo e ano)</button>`;
}
