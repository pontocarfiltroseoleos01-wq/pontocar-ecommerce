'use strict';
/* Ponto Car — cadastro do cliente (e-mail, CPF, endereço) e Meus pedidos */

// Formulário de cadastro (dados pessoais + endereço)
function camposCadastro(c, comConta){
  c = c || {}; const v = k => esc(c[k] || '');
  return `
    ${comConta ? `<label class="lbl" for="cEmail">E-mail <i>*</i></label><input class="in" id="cEmail" type="email" autocomplete="email" value="${v('email')}">
    <label class="lbl" for="cSenha">Crie uma senha <i>*</i> <small>(mínimo 6 caracteres)</small></label><input class="in" id="cSenha" type="password" autocomplete="new-password">` : ''}
    <label class="lbl" for="cNome">Nome completo <i>*</i></label><input class="in" id="cNome" autocomplete="name" value="${v('nome')}">
    <div class="g2"><div><label class="lbl" for="cCpf">CPF <i>*</i></label><input class="in" id="cCpf" inputmode="numeric" placeholder="000.000.000-00" value="${c.cpf ? cpfMask(c.cpf) : ''}" ${c.cpf && !comConta && cliCad ? 'readonly title="Para mudar o CPF, fale com a loja"' : ''}></div>
    <div><label class="lbl" for="cTel">Telefone (WhatsApp) <i>*</i></label><input class="in" id="cTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(16) 99999-0000" value="${v('telefone')}"></div></div>
    <h3 style="margin:16px 0 0;font-size:16px">🏠 Endereço</h3>
    <div class="g2"><div><label class="lbl" for="cCep">CEP</label><input class="in" id="cCep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${v('cep')}"></div><div style="display:flex;align-items:flex-end"><small id="cCepMsg" style="color:var(--muted);padding-bottom:12px">Digite o CEP para preencher o endereço sozinho.</small></div></div>
    <label class="lbl" for="cRua">Rua <i>*</i></label><input class="in" id="cRua" autocomplete="address-line1" value="${v('rua')}">
    <div class="g2"><div><label class="lbl" for="cNum">Número <i>*</i></label><input class="in" id="cNum" value="${v('numero')}"></div><div><label class="lbl" for="cComp">Complemento</label><input class="in" id="cComp" placeholder="Apto, bloco, fundos…" value="${v('complemento')}"></div></div>
    <label class="lbl" for="cBairro">Bairro <i>*</i></label><input class="in" id="cBairro" value="${v('bairro')}">
    <div class="g2"><div><label class="lbl" for="cCidade">Cidade <i>*</i></label><input class="in" id="cCidade" autocomplete="address-level2" value="${v('cidade')}"></div><div><label class="lbl" for="cUf">Estado (UF) <i>*</i></label><input class="in" id="cUf" maxlength="2" style="text-transform:uppercase" placeholder="SP" value="${v('uf')}"></div></div>
    ${comConta ? `<label class="priv-check" style="margin-top:14px"><input type="checkbox" id="cPriv"><span>Li a <button class="link-btn2" type="button" data-privacidade><b>Política de Privacidade</b></button> e sei como a Ponto Car usa os meus dados. <i style="color:#B3261E">*</i></span></label>` : ''}
    <div class="msg-erro hide" id="eCad"></div>`;
}
function lerCadastro(comConta){
  const g = id => ($('#' + id) ? $('#' + id).value.trim() : '');
  const d = { nome: g('cNome'), cpf: soDig(g('cCpf')), telefone: g('cTel'), cep: g('cCep'), rua: g('cRua'), numero: g('cNum'), complemento: g('cComp'), bairro: g('cBairro'), cidade: g('cCidade'), uf: g('cUf').toUpperCase() };
  const er = [];
  if (comConta){ if (!/^\S+@\S+\.\S+$/.test(g('cEmail'))) er.push('e-mail válido'); if ((($('#cSenha') || {}).value || '').length < 6) er.push('senha com pelo menos 6 caracteres'); }
  if (d.nome.length < 3) er.push('nome completo');
  if (!cpfValido(d.cpf)) er.push('CPF válido');
  const t = soDig(d.telefone); if (t.length < 10 || t.length > 13) er.push('telefone com DDD');
  if (!d.rua) er.push('rua'); if (!d.numero) er.push('número'); if (!d.bairro) er.push('bairro'); if (!d.cidade) er.push('cidade'); if (!/^[A-Z]{2}$/.test(d.uf)) er.push('UF (ex.: SP)');
  if (comConta && !($('#cPriv') || {}).checked) er.push('confirmação de que leu a Política de Privacidade');
  return { d, er };
}
function mostrarErroCad(msg){ const e = $('#eCad'); if (e){ e.innerHTML = msg; e.classList.remove('hide'); e.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
async function buscarCep(){
  const cep = soDig(($('#cCep') || {}).value); const msg = $('#cCepMsg'); if (cep.length !== 8) return;
  msg.textContent = 'Buscando o endereço…';
  try { const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`); const j = await r.json();
    if (j.erro){ msg.textContent = 'CEP não encontrado. Preencha à mão.'; return; }
    if (j.logradouro && !$('#cRua').value) $('#cRua').value = j.logradouro; if (j.bairro && !$('#cBairro').value) $('#cBairro').value = j.bairro;
    if (j.localidade) $('#cCidade').value = j.localidade; if (j.uf) $('#cUf').value = j.uf;
    msg.textContent = '✓ Endereço encontrado. Confira e coloque o número.'; $('#cNum').focus();
  } catch(e){ msg.textContent = 'Não foi possível buscar o CEP. Preencha à mão.'; }
}
function voltarDaConta(){
  if (contaVoltar === 'pedido'){ location.href = 'carrinho.html?form=1'; return true; setTimeout(() => { const el = $('#cliCheckout'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); return true; }
  return false;
}
async function renderConta(){
  const box = $('#contaIn'); if (!box) return;
  const topo = `<button class="voltar" type="button" ${contaVoltar === 'pedido' ? 'data-ir="pedido"' : 'data-ir=""'}>← ${contaVoltar === 'pedido' ? 'Voltar ao pedido' : 'Voltar à loja'}</button><h1>👤 Minha conta</h1>`;
  const ss = cliSessao();
  if (contaRecuperar && ss){
    box.innerHTML = topo + `<div class="box"><h2>🔑 Crie uma nova senha</h2><form id="fNovaSenha" novalidate><label class="lbl" for="cNova">Nova senha <small>(mínimo 6 caracteres)</small></label><input class="in" id="cNova" type="password" autocomplete="new-password"><div class="msg-erro hide" id="eCad"></div><div class="acoes"><button class="btn btn-ouro" type="submit">Salvar nova senha</button></div></form></div>`;
    return;
  }
  if (!ss){
    const aviso = contaVoltar === 'pedido' ? `<div class="aviso" style="margin-bottom:12px"><span>🛒</span><span>Para finalizar o pedido, <b>entre</b> ou <b>crie a sua conta</b>. Seu carrinho continua salvo.</span></div>` : '';
    box.innerHTML = topo + aviso + (contaMsg ? `<div class="aviso" style="margin-bottom:12px"><span>ℹ️</span><span>${contaMsg}</span></div>` : '') +
      `<div class="conta-tabs"><button type="button" data-contaaba="entrar" aria-pressed="${contaAba === 'entrar'}">Já tenho conta</button><button type="button" data-contaaba="criar" aria-pressed="${contaAba === 'criar'}">Criar conta</button></div>` +
      (contaAba === 'entrar'
        ? `<div class="box"><h2>Entrar</h2><form id="fCliEntrar" novalidate>
            <label class="lbl" for="cEmail">E-mail</label><input class="in" id="cEmail" type="email" autocomplete="username">
            <label class="lbl" for="cSenha">Senha</label><input class="in" id="cSenha" type="password" autocomplete="current-password">
            <div class="msg-erro hide" id="eCad"></div>
            <div class="acoes"><button class="btn btn-ouro" type="submit" id="cBtnEntrar">Entrar</button><button class="btn btn-linha" type="button" id="cEsqueci">Esqueci minha senha</button></div>
          </form></div>`
        : `<div class="box"><h2>Criar conta</h2><p class="prov" style="margin-top:0">O CPF é usado para identificar a compra e emitir a nota fiscal. Seus dados ficam protegidos e só a loja tem acesso.</p><form id="fCliCriar" novalidate>${camposCadastro({}, true)}
            <div class="acoes"><button class="btn btn-ouro" type="submit" id="cBtnCriar">Criar conta</button></div></form></div>`);
    return;
  }
  if (cliCad === undefined){ box.innerHTML = topo + '<p style="color:var(--muted)">Carregando…</p>'; await cliCarregarCadastro(); if (rotaAtual() === 'conta') renderConta(); return; }
  if (!cliCad){
    box.innerHTML = topo + `<div class="aviso" style="margin-bottom:12px"><span>📝</span><span>Falta pouco! Complete o seu cadastro para poder comprar. <small>(${esc(ss.email || '')})</small></span></div>
      <div class="box"><h2>Complete o seu cadastro</h2><form id="fCliCompletar" novalidate>${camposCadastro({ email: ss.email }, false)}<div class="acoes"><button class="btn btn-ouro" type="submit">Salvar cadastro</button><button class="btn btn-linha" type="button" id="cSair">Sair</button></div></form></div>`;
    return;
  }
  const c = cliCad;
  box.innerHTML = topo + (contaMsg ? `<div class="aviso" style="margin-bottom:12px"><span>✅</span><span>${contaMsg}</span></div>` : '') + `
    <div class="box"><h2>Olá, ${esc(c.nome.split(/\s+/)[0])}! 👋</h2>
      <div class="cli-dados"><div><b>Nome</b> ${esc(c.nome)}</div><div><b>E-mail</b> ${esc(c.email || ss.email || '')}</div><div><b>CPF</b> ${esc(cpfOculto(c.cpf))}</div><div><b>Telefone</b> ${esc(c.telefone)}</div><div><b>Endereço</b> ${esc(enderecoTexto(c))}</div></div>
      <div class="acoes">${contaVoltar === 'pedido' ? '<button class="btn btn-ouro" type="button" data-ir="pedido">Continuar o pedido →</button>' : ''}<button class="btn btn-linha" type="button" data-ir="meus">📦 Meus pedidos</button><button class="btn btn-linha" type="button" id="cSair">Sair da conta</button></div>
    </div>
    <details class="box"><summary style="cursor:pointer;font-weight:800">✏️ Alterar meus dados</summary><form id="fCliEditar" novalidate style="margin-top:10px">${camposCadastro(c, false)}<div class="acoes"><button class="btn btn-ouro" type="submit">Salvar alterações</button></div></form></details>
    <details class="box"><summary style="cursor:pointer;font-weight:800">🗑️ Excluir minha conta</summary><p>Apaga a sua conta e o seu cadastro (nome, CPF, endereço). Os pedidos já feitos continuam registrados na loja, como exige a lei (notas e garantias).</p><button class="btn btn-linha" type="button" id="cExcluir" style="background:#B3261E!important;color:#fff!important;border-color:#B3261E!important">Excluir minha conta</button></details>`;
  contaMsg = '';
}
async function salvarCadastro(d, criando){
  const ss = cliSessao(); const corpo = Object.assign({}, d, { email: ss.email || d.email || null });
  if (criando) await cliFetch('clientes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(Object.assign({ id: ss.uid }, corpo)) });
  else { delete corpo.cpf; delete corpo.email; await cliFetch(`clientes?id=eq.${encodeURIComponent(ss.uid)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(corpo) }); }
  await cliCarregarCadastro();
}

// Volta do link "esqueci minha senha" (vem com #access_token…&type=recovery)
(function lerRetornoAuth(){
  const h = location.hash.replace(/^#/, ''); if (!/access_token=/.test(h)) return;
  const p = new URLSearchParams(h);
  cliGuardar({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in'), expires_at: Number(p.get('expires_at')) || undefined, user: {} });
  (async () => { try { const tk = p.get('access_token'); const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + tk } }); const u = await r.json(); const ss = cliSessao(); if (ss && u && u.id){ ss.uid = u.id; ss.email = u.email || ''; LS.set(CLI_LS, ss); } } catch(e){} cliCarregarCadastro(); })();
  contaRecuperar = p.get('type') === 'recovery';
  history.replaceState(null, '', location.pathname + location.search + '#conta');
})();

/* ---------- Meus pedidos (cliente) ---------- */
const MP_STATUS = { novo: 'Recebido', andamento: 'Em andamento', finalizado: 'Finalizado', cancelado: 'Cancelado' };
const mpLocais = () => LS.get('pc_pedidos', []).filter(o => o && o.num && o.token);
function mpData(iso){ try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e){ return ''; } }
function mpCard(p){
  const st = String(p.status || 'novo');
  const itens = Array.isArray(p.itens) ? p.itens : [];
  const zap = (D.loja.whatsapp || []).filter(Boolean)[0];
  let acao = '';
  const pago = /^✅/.test(p.forma_pagamento || '');
  if (st === 'novo' && pago) acao = `<span class="mp-info">Pedido pago. Para cancelar, fale com a loja.</span>`;
  else if (st === 'novo') acao = `<button class="btn btn-linha btn-sm" type="button" data-cancelar="${esc(p.numero)}">Cancelar pedido</button>`;
  else if (st === 'cancelado' || st === 'finalizado') acao = `<button class="btn btn-linha btn-sm" type="button" data-ocultar="${esc(p.numero)}">🗑️ Excluir da lista</button>`;
  else if (st === 'andamento') acao = `<span class="mp-info">Para cancelar, fale com a loja${zap ? ` · <a target="_blank" rel="noopener" href="https://wa.me/${esc(String(zap).replace(/\D/g, ''))}">${esc(fone(zap))}</a>` : ''}</span>`;
  return `<article class="mp-card st-${esc(st)}">
    <div class="mp-top"><div><span class="mp-num">Nº ${esc(p.numero)}</span><span class="mp-data">${esc(mpData(p.criado_em))} · ${p.tipo_entrega === 'entrega' ? '🛵 Entrega' : '🏪 Retirada na loja'}</span></div>
      <span class="mp-st st-${esc(st)}">${esc(MP_STATUS[st] || st)}</span></div>
    <ul class="mp-itens">${itens.map(i => `<li><span>${esc(i.quantidade)}x ${esc(i.nome)}</span><span>${brl(i.subtotal)}</span></li>`).join('')}</ul>
    <div class="mp-rod"><div><b>Total: ${brl(p.valor_total)}</b><div class="mp-info">${esc(p.forma_pagamento || '')}</div></div>${acao}</div>
    ${mpPodePagar(p) ? `<div class="mp-aviso" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">💳 Pagamento online ainda não concluído. <button class="btn btn-ouro btn-sm" type="button" data-pagar="${esc(p.numero)}">Pagar agora</button></div>` : ''}
    ${st === 'novo' ? (pago ? '<div class="mp-aviso">⏳ Pagamento confirmado. Aguardando a loja separar o seu pedido.</div>' : '<div class="mp-aviso">⏳ Aguardando a loja. Você pode cancelar enquanto o pedido estiver como “Recebido”.</div>') : ''}
  </article>`;
}
function mpPodePagar(p){
  return String(p.status) !== 'cancelado' && /^Pagamento online/.test(p.forma_pagamento || '') && !!mpLocais().find(x => String(x.num) === String(p.numero));
}
async function pagarMeuPedido(num, btn){
  const o = mpLocais().find(x => String(x.num) === String(num));
  if (!o){ toast('Abra este pedido no aparelho em que ele foi feito para pagar.'); return; }
  if (btn){ btn.disabled = true; btn.textContent = 'Abrindo…'; }
  try { await mpIrPagar(o.num, o.token); }
  catch(err){ toast(err.message); if (btn){ btn.disabled = false; btn.textContent = 'Pagar agora'; } }
}
// Mensagem ao voltar do Mercado Pago
(function(){
  const q = new URLSearchParams(location.search); const v = q.get('mp'); if (!v) return;
  const n = q.get('n') || '';
  const msg = { ok: `✅ Pagamento do pedido Nº ${n} recebido! A confirmação aparece aqui em alguns instantes.`, pendente: `⏳ Pagamento do pedido Nº ${n} em análise. Assim que for aprovado, ele aparece como pago aqui.`, erro: `❌ O pagamento do pedido Nº ${n} não foi concluído. Você pode tentar de novo pelo botão “Pagar agora”.` }[v];
  history.replaceState(null, '', location.pathname + location.hash);
  if (msg) setTimeout(() => { toast(msg); }, 600);
  if (v === 'ok' || v === 'pendente') [4000, 10000, 20000].forEach(t => setTimeout(() => { if (rotaAtual() === 'meus') renderMeus(); }, t));
})();
async function renderMeus(){
  const box = $('#meusIn'); if (!box) return;
  const topo = `<button class="voltar" type="button" data-ir="">← Voltar à loja</button><h1>📦 Meus pedidos</h1>`;
  const locais = mpLocais();
  if (!locais.length && !cliSessao()){
    box.innerHTML = topo + `<div class="vazio"><b>Você ainda não tem pedidos neste aparelho</b>Os pedidos que você fizer aqui no site aparecem nesta tela.</div>`;
    return;
  }
  box.innerHTML = topo + `<p style="color:var(--muted)">Carregando seus pedidos…</p>`;
  try {
    const corpo = { method: 'POST', body: JSON.stringify({ p_pedidos: locais.slice(0, 50).map(o => ({ numero: String(o.num), token: o.token })) }) };
    let lista = cliSessao() ? await cliFetch('rpc/meus_pedidos', corpo).catch(() => sb('rpc/meus_pedidos', corpo)) : await sb('rpc/meus_pedidos', corpo);
    const ocultos = LS.get('pc_ocultos', []).map(String); lista = (lista || []).filter(p => !ocultos.includes(String(p.numero)));
    if (rotaAtual() !== 'meus') return;
    box.innerHTML = topo + `<p style="color:var(--muted);margin-top:0">${cliSessao() ? `Pedidos da sua conta <b>${esc((cliSessao() || {}).email || '')}</b> e os feitos neste aparelho.` : 'Aparecem aqui os pedidos feitos <b>neste aparelho</b>. <button class="link-btn2" type="button" data-ir="conta">Entre na sua conta</button> para ver todos.'}</p>` +
      ((lista && lista.length) ? lista.map(mpCard).join('') : `<div class="vazio"><b>Nenhum pedido encontrado</b>Se precisar de ajuda, fale com a loja.</div>`) +
      `<div class="acoes"><button class="btn btn-linha" type="button" id="mpAtualizar">↻ Atualizar</button></div>`;
  } catch(err){
    box.innerHTML = topo + `<div class="vazio"><b>Não foi possível carregar seus pedidos</b>${esc(err.message)}</div><div class="acoes"><button class="btn btn-ouro" type="button" id="mpAtualizar">Tentar de novo</button></div>`;
  }
}
async function ocultarMeuPedido(num){
  if (!(await confirmar(`Excluir o pedido <b>Nº ${esc(num)}</b> da sua lista? Ele some só desta tela; a loja continua com o registro.`, 'Sim, excluir', true, 'Não'))) return;
  LS.set('pc_pedidos', LS.get('pc_pedidos', []).filter(o => String(o.num) !== String(num)));
  const oc = LS.get('pc_ocultos', []); if (!oc.map(String).includes(String(num))){ oc.push(String(num)); LS.set('pc_ocultos', oc.slice(-300)); }
  toast(`Pedido Nº ${num} excluído da lista.`); renderMeus();
}
async function cancelarMeuPedido(num){
  const o = mpLocais().find(x => String(x.num) === String(num)); if (!o && !cliSessao()) return;
  if (!(await confirmar(`Cancelar o pedido <b>Nº ${esc(num)}</b>? Essa ação não pode ser desfeita.`, 'Sim, cancelar', true, 'Não, manter'))) return;
  try {
    const corpoC = { method: 'POST', body: JSON.stringify({ p_numero: Number(num), p_token: o ? o.token : null }) };
    if (cliSessao()) await cliFetch('rpc/cancelar_meu_pedido', corpoC); else await sb('rpc/cancelar_meu_pedido', corpoC);
    toast(`Pedido Nº ${num} cancelado.`);
    sincronizarSupabase();
  } catch(err){ toast(err.message); }
  renderMeus();
}
