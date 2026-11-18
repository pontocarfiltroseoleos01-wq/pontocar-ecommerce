'use strict';
/* Ponto Car — painel administrativo: pedidos, relatórios, peças, promoções, kits e configurações */

/* ---------- 🚀 Publicar no site (GitHub) ---------- */
const GH_PADRAO = { owner: 'pontocarfiltroseoleos01-wq', repo: 'pontocar-ecommerce', branch: 'main' };
function ghConfig(){
  const c = LS.get('pc_github', {}) || {}; let owner = c.owner, repo = c.repo;
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  if (m){ owner = owner || m[1]; const seg = location.pathname.split('/').filter(Boolean)[0]; if (seg && !/\.html?$/i.test(seg)) repo = repo || seg; }
  return { owner: owner || GH_PADRAO.owner, repo: repo || GH_PADRAO.repo, branch: c.branch || GH_PADRAO.branch, token: c.token || '' };
}
const ghConectado = () => !!ghConfig().token;
function b64utf8(str){ const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function ghFetch(url, opts, token){ opts = opts || {}; return fetch(url, Object.assign({}, opts, { cache: 'no-store', headers: Object.assign({ 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28' }, opts.headers || {}) })); }
const ghUrlArquivo = c => `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/estoque.js`;
function ghErro(st){
  if (st === 401) return 'A chave do GitHub está errada ou venceu. Gere uma nova e cole em 🔗 Conexão com o GitHub.';
  if (st === 403) return 'A chave não tem permissão para gravar. No GitHub, edite a chave: em Acesso ao repositório escolha pontocar-ecommerce e em Permissões → Repositórios → Conteúdo marque Leitura e gravação.';
  if (st === 404) return 'Não achei o repositório ou o arquivo. Confira o usuário, o nome do repositório e se a chave tem acesso a ele.';
  if (st === 409 || st === 422) return 'O arquivo mudou no GitHub enquanto publicava. Tente de novo.';
  if (!/github\.io$/i.test(location.hostname)) return 'Aqui na prévia não dá para publicar. Use o painel do site publicado no GitHub.';
  return 'Não foi possível publicar agora. Confira a internet e tente de novo.';
}
async function publicarNoSite(){
  const c = ghConfig();
  if (!c.token){ abrirConexaoGH(); return; }
  const btns = $$('[data-publicar]'); btns.forEach(b => { b.disabled = true; b.dataset.txt = b.textContent; b.textContent = 'Publicando…'; });
  try {
    if (!D.atualizado) D.atualizado = Date.now(); LS.set('pc_rascunho', semSupabase(D));
    const url = ghUrlArquivo(c); let sha;
    const g = await ghFetch(url + '?ref=' + encodeURIComponent(c.branch) + '&t=' + Date.now(), {}, c.token);
    if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw { status: g.status };
    const body = { message: 'Atualiza estoque pelo Painel ponto car', content: b64utf8(arquivoEstoque()), branch: c.branch }; if (sha) body.sha = sha;
    const r = await ghFetch(url, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }, c.token);
    if (!r.ok) throw { status: r.status };
    LS.set('pc_publicado', D.atualizado); renderPainel();
    modal(`<h2>🚀 Publicado!</h2><p>O estoque foi enviado para o site. Em <b>1 a 3 minutos</b> os clientes já veem as mudanças.</p><p class="prov">Se abrir o site e ainda estiver igual, espere mais um pouco e atualize a página.</p><div class="acoes-m"><button class="btn btn-ouro" data-fechar>Ok</button></div>`);
  } catch(e){
    modal(`<h2>Não deu para publicar</h2><p>${esc(ghErro(e && e.status))}</p><div class="acoes-m"><button class="btn btn-linha" data-fechar>Fechar</button><button class="btn btn-ouro" type="button" data-conexaogh>🔗 Conexão com o GitHub</button></div>`);
  } finally { $$('[data-publicar]').forEach(b => { b.disabled = false; if (b.dataset.txt) b.textContent = b.dataset.txt; }); }
}
function abrirConexaoGH(){
  const c = ghConfig();
  modal(`<h2>🔗 Conexão com o GitHub</h2>
    <p style="margin-top:0;color:var(--muted);font-size:14px">Faça isso <b>uma vez só</b> neste aparelho. Depois, é só clicar em <b>🚀 Publicar no site</b>.</p>
    <div class="sub" style="font-size:14px">
      <b>Como criar a chave:</b>
      <ol style="margin:8px 0 0;padding-left:20px">
        <li>Logada na conta da loja no GitHub, abra: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="color:var(--bandeira);font-weight:700">github.com/settings/personal-access-tokens/new</a></li>
        <li>Em <b>Nome do token</b> (Token name), escreva <b>Painel Ponto Car</b>. Em <b>Expiração</b>, escolha a maior validade.</li>
        <li>Em <b>Acesso ao repositório</b>, marque <b>Apenas repositórios selecionados</b> e escolha <b>${esc(c.repo)}</b>.</li>
        <li>Em <b>Permissões</b>, abra a aba <b>Repositórios</b> → <b>+ Adicionar permissões</b> → <b>Conteúdo</b> e escolha <b>Leitura e gravação</b>. (Na aba Conta não precisa nada.)</li>
        <li>Clique em <b>Gerar token</b>, copie a chave (começa com <b>github_pat_</b>) e cole abaixo.</li>
      </ol>
    </div>
    <form id="fGH" novalidate>
      <label class="lbl" for="ghToken">Chave do GitHub (token)</label><input class="in" id="ghToken" type="password" autocomplete="off" placeholder="${c.token ? '•••••••• (já salva — deixe vazio para manter)' : 'github_pat_...'}">
      <details style="margin-top:10px"><summary style="cursor:pointer;font-size:14px;color:var(--muted)">Repositório (já preenchido)</summary>
        <div class="g3"><div><label class="lbl" for="ghOwner">Usuário</label><input class="in" id="ghOwner" value="${esc(c.owner)}"></div><div><label class="lbl" for="ghRepo">Repositório</label><input class="in" id="ghRepo" value="${esc(c.repo)}"></div><div class="full-m"><label class="lbl" for="ghBranch">Ramo</label><input class="in" id="ghBranch" value="${esc(c.branch)}"></div></div>
      </details>
      <div class="cupom-msg" id="ghMsg" style="margin-top:10px"></div>
      <p class="prov">A chave fica salva só neste aparelho. Ela não vai para o site e os clientes não têm acesso.</p>
      <div class="acoes-m">${c.token ? '<button type="button" class="btn btn-linha" id="ghSair">Desconectar</button>' : ''}<button type="button" class="btn btn-linha" id="ghTestar">Testar conexão</button><button class="btn btn-ouro" type="submit">Salvar conexão</button></div>
    </form>`, m => {
    const ler = () => { const v = id => m.querySelector(id).value.trim(); return { owner: v('#ghOwner'), repo: v('#ghRepo'), branch: v('#ghBranch') || 'main', token: v('#ghToken') || c.token }; };
    const msg = (t, ok) => { const el = m.querySelector('#ghMsg'); el.textContent = t; el.className = 'cupom-msg ' + (ok ? 'ok' : 'erro-c'); };
    m.querySelector('#ghTestar').onclick = async () => {
      const x = ler(); if (!x.token){ msg('Cole a chave do GitHub primeiro.'); return; }
      msg('Testando…', true);
      try { const r = await ghFetch(ghUrlArquivo(x) + '?ref=' + encodeURIComponent(x.branch), {}, x.token); if (r.ok) msg('✓ Conexão funcionando! Pode salvar.', true); else msg(ghErro(r.status)); }
      catch(e){ msg(ghErro(0)); }
    };
    if (m.querySelector('#ghSair')) m.querySelector('#ghSair').onclick = () => { LS.del('pc_github'); fecharModal(); renderPainel(); toast('Desconectado do GitHub.'); };
    m.querySelector('#fGH').onsubmit = e => { e.preventDefault(); const x = ler(); if (!x.token){ msg('Cole a chave do GitHub.'); return; } if (!x.owner || !x.repo){ msg('Preencha o usuário e o repositório.'); return; }
      LS.set('pc_github', x); fecharModal(); renderPainel(); toast('Conexão salva! Agora é só clicar em 🚀 Publicar no site.'); };
  });
}

/* =================================================================
   PAINEL DO DONO
   ================================================================= */
let painelLiberado = false, abaPainel = 'pedidos', filtroPed = 'hoje';
function pedirSenha(){
  modal(`<h2>🔒 Painel ponto car</h2><form id="fSenha"><label class="lbl" for="senhaIn">Digite a senha</label><input class="in" id="senhaIn" type="password" inputmode="numeric" autocomplete="off"><div class="msg-erro hide" id="eSenha">Senha incorreta.</div><div class="acoes-m"><button type="button" class="btn btn-linha" id="cancSenha">Cancelar</button><button class="btn btn-ouro" type="submit">Entrar</button></div></form>`, m => {
    m.querySelector('#cancSenha').onclick = () => { fecharModal(); ir(''); };
    m.querySelector('#fSenha').onsubmit = e => {
      e.preventDefault();
      if (sha256(m.querySelector('#senhaIn').value) === D.loja.senhaHash){ painelLiberado = true; fecharModal(); renderPainel(); }
      else { m.querySelector('#eSenha').classList.remove('hide'); m.querySelector('#senhaIn').select(); }
    };
  });
}

function hojeStr(d){ const x = new Date(d); return x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); }
function renderPainel(){ if (!$('#painelIn')) return;
  const ssA = admSessao(); painelLiberado = !!(ssA && (!ssA.uid || ssA.uid === ADM_UID));
  if (!painelLiberado){ $('#painelIn').innerHTML = `<div class="p-top"><h1>🔒 Painel Ponto Car</h1><div style="display:flex;gap:8px"><a class="btn btn-linha btn-sm" href="index.html">← Ver a loja</a></div></div><div id="admPedidos">${admHTML()}</div>`; return; }
  const abas = [['pedidos','📋 Pedidos'],['relatorios','📊 Relatórios'],['estoque','📦 Estoque'],['promo','🏷️ Promoções'],['kits','🧰 Kits'],['config','⚙️ Configurações']];
  let corpo = '';
  if (abaPainel === 'pedidos') corpo = painelPedidos();
  if (abaPainel === 'estoque') corpo = painelEstoque();
  if (abaPainel === 'config') corpo = painelConfig();
  if (abaPainel === 'promo') corpo = painelPromo();
  if (abaPainel === 'kits') corpo = painelKits();
  if (abaPainel === 'relatorios') corpo = painelRelatorios();
  $('#painelIn').innerHTML = `
    <div class="p-top"><h1>🔒 Painel ponto car</h1><div style="display:flex;gap:8px"><a class="btn btn-linha btn-sm" href="index.html">← Ver a loja</a><button class="btn btn-linha btn-sm" id="sairPainel">Sair da conta</button></div></div>
    ${temPendente() ? `<div class="pend pend-pub"><span>⚠️ <b>Há mudanças que ainda não estão no site para os clientes.</b></span><button class="btn btn-verde btn-sm" type="button" data-publicar>🚀 Publicar no site</button></div>` : ''}
    <div class="tabs" role="tablist">${abas.map(([id, n]) => `<button class="tab" role="tab" data-aba="${id}" aria-selected="${abaPainel===id}">${n}</button>`).join('')}</div>
    ${corpo}`;
  if (abaPainel === 'config') carregarProximoNumero();
  if (abaPainel === 'promo' && !arguments[0]) admCarregarCupons();
}

function admBip(){
  try { const C = window.AudioContext || window.webkitAudioContext; const c = new C(); [0, 0.25].forEach(t => { const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = 880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.0001, c.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, c.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.2); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.22); }); } catch(e){}
}
async function admCarregar(silencioso){
  if (admCarregando) return; admCarregando = true;
  try {
    if (!admSessao()){ admLista = null; admErro = ''; return; }
    const lista = await admFetch('pedidos?select=id,created_at,cliente_nome,cliente_telefone,cliente_cpf,cliente_email,itens,subtotal,desconto,taxa_entrega,cupom,bairro,valor_total,forma_pagamento,tipo_entrega,endereco,veiculos,observacoes,status&order=id.desc&limit=300');
    const maxId = lista.reduce((m, p) => Math.max(m, p.id), 0);
    const novos = admUltimoId == null ? [] : lista.filter(p => p.id > admUltimoId && p.status === 'novo');
    admUltimoId = Math.max(admUltimoId || 0, maxId);
    lista.forEach(p => { p._chegou = novos.some(n => n.id === p.id); });
    admLista = lista; admErro = '';
    if (novos.length){
      admBip(); toast(novos.length === 1 ? `🔔 Novo pedido! Nº ${novos[0].id}` : `🔔 ${novos.length} pedidos novos!`); admCol = 'novo';
      novos.forEach(p => notificar(`🔔 Novo pedido Nº ${p.id} — ${brl(p.valor_total)}`, `${p.cliente_nome} · ${(p.itens || []).map(i => i.quantidade + 'x ' + i.nome).join(', ')} · ${p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada'}`));
      if (document.hidden || !document.hasFocus()) titulaNovo(novos.length);
    }
  } catch(e){
    if (e.message === 'LOGIN'){ admLista = null; admErro = 'Sua sessão expirou. Entre de novo.'; }
    else admErro = e.message;
  } finally {
    admCarregando = false;
    if (rotaAtual() === 'painel' && painelLiberado && abaPainel === 'pedidos'){ const el = $('#admPedidos'); if (el) el.innerHTML = admHTML(); }
  }
}
function admCard(p){
  const st = p.status || 'novo'; const itens = Array.isArray(p.itens) ? p.itens : [];
  const tel = String(p.cliente_telefone || ''); let dig = tel.replace(/\D/g, ''); if (dig.length <= 11) dig = '55' + dig;
  const quando = new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const btn = (cls, attr, txt) => `<button class="btn ${cls} btn-sm" type="button" ${attr}>${txt}</button>`;
  let acoes = '';
  if (st === 'novo') acoes = btn('btn-ouro', `data-admst="${p.id}|andamento"`, '▶ Em andamento') + btn('btn-linha', `data-admst="${p.id}|cancelado"`, '✕ Cancelar');
  else if (st === 'andamento') acoes = btn('btn-verde', `data-admst="${p.id}|finalizado"`, '✓ Finalizar') + btn('btn-linha', `data-admst="${p.id}|cancelado"`, '✕ Cancelar');
  else acoes = btn('btn-linha', `data-admdel="${p.id}"`, '🗑 Excluir');
  return `<article class="adm-card st-${esc(st)}${p._chegou ? ' novo-chegou' : ''}">
    <div class="adm-top"><div><span class="adm-num">Nº ${esc(p.id)}</span><span class="adm-data">${esc(quando)}</span></div><span class="adm-tag st-${esc(st)}">${esc(MP_STATUS[st] === 'Recebido' ? 'Novo' : (MP_STATUS[st] || st))}</span></div>
    <div class="adm-cli"><b>${esc(p.cliente_nome)}</b>${p.cliente_cpf ? ` <small style="color:#5d6b62">· CPF ${esc(cpfMask(p.cliente_cpf))}</small>` : ''}${p.cliente_email ? `<br>✉️ <a href="mailto:${esc(p.cliente_email)}">${esc(p.cliente_email)}</a>` : ''}<br>📞 <a href="tel:+${esc(dig)}">${esc(tel)}</a> · <a target="_blank" rel="noopener" href="https://wa.me/${esc(dig)}">WhatsApp</a>${p.veiculos ? `<br>🚗 ${esc(p.veiculos)}` : ''}</div>
    <table class="adm-itens">${itens.map(i => `<tr><td>${esc(i.quantidade)}x ${esc(i.nome)}<br><small>${brl(i.preco_unitario)} cada</small></td><td class="v">${brl(i.subtotal)}</td></tr>`).join('')}</table>
    ${Number(p.desconto) > 0 || Number(p.taxa_entrega) > 0 ? `<div class="adm-linha" style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${brl(p.subtotal)}</span></div>` : ''}
    ${Number(p.desconto) > 0 ? `<div class="adm-linha" style="display:flex;justify-content:space-between;color:#0B5C2E"><span>Descontos${p.cupom ? ' · cupom ' + esc(p.cupom) : ''}</span><span>− ${brl(p.desconto)}</span></div>` : ''}
    ${Number(p.taxa_entrega) > 0 ? `<div class="adm-linha" style="display:flex;justify-content:space-between"><span>Taxa de entrega</span><span>+ ${brl(p.taxa_entrega)}</span></div>` : ''}
    <div class="adm-total"><span>Total</span><span>${brl(p.valor_total)}</span></div>
    <div class="adm-linha">💳 ${esc(p.forma_pagamento || '')}</div>
    <div class="adm-linha">${p.tipo_entrega === 'entrega' ? `🛵 <b>Entrega${p.bairro ? ' — ' + esc(p.bairro) : ''}:</b> ${esc(p.endereco || '')}${p.bairro && !(Number(p.taxa_entrega) > 0) ? ' <i>(taxa a combinar)</i>' : ''}` : '🏪 Retirada na loja'}</div>
    ${p.observacoes ? `<div class="adm-linha">📝 ${esc(p.observacoes)}</div>` : ''}
    <div class="adm-acoes">${acoes}</div>
    ${admAvisarHTML(p, dig)}
  </article>`;
}
/* ---------- Relatórios ---------- */
let relPeriodo = 'mes', relDados = null, relErro = '', relCarregando = false;
const REL_PER = [['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['tudo', 'Tudo']];
function relIntervalo(){
  const n = new Date(); const ini = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (relPeriodo === 'hoje') return [ini(n), null];
  if (relPeriodo === '7d'){ const a = ini(n); a.setDate(a.getDate() - 6); return [a, null]; }
  if (relPeriodo === 'mes') return [new Date(n.getFullYear(), n.getMonth(), 1), null];
  if (relPeriodo === 'mespassado') return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 1)];
  return [null, null];
}
async function relCarregar(){
  if (relCarregando) return; relCarregando = true; relErro = '';
  try {
    const [de, ate] = relIntervalo();
    let lista = await admFetch('pedidos?select=id,created_at,cliente_nome,cliente_telefone,cliente_cpf,cliente_email,itens,subtotal,desconto,taxa_entrega,valor_total,forma_pagamento,tipo_entrega,bairro,endereco,cupom,veiculos,status&order=id.desc&limit=10000' + (de ? '&created_at=gte.' + encodeURIComponent(de.toISOString()) : ''));
    if (ate) lista = lista.filter(p => new Date(p.created_at) < ate);
    relDados = lista;
  } catch(e){ relDados = null; relErro = e.message === 'LOGIN' ? 'Entre com o e-mail do Supabase na aba 📋 Pedidos.' : e.message; }
  relCarregando = false;
  if (rotaAtual() === 'painel' && painelLiberado && abaPainel === 'relatorios'){ const el = $('#relIn'); if (el) el.innerHTML = relHTML(); }
}
function relHTML(){
  if (!admSessao()) return '';
  if (relErro) return `<div class="msg-erro">${esc(relErro)}</div>`;
  if (!relDados) return '<p style="color:var(--muted)">Carregando…</p>';
  const V = relDados.filter(p => p.status !== 'cancelado'); const C = relDados.length - V.length;
  const fat = V.reduce((t, p) => t + Number(p.valor_total || 0), 0);
  const tipoPag = f => /^pix/i.test(f) ? 'Pix' : /^cart/i.test(f) ? 'Cartão' : /^dinheiro/i.test(f) ? 'Dinheiro' : 'Outro';
  const porPag = {}; V.forEach(p => { const k = tipoPag(p.forma_pagamento || ''); porPag[k] = (porPag[k] || 0) + Number(p.valor_total || 0); });
  const porDia = {}; V.forEach(p => { const d = new Date(p.created_at).toLocaleDateString('pt-BR'); porDia[d] = porDia[d] || { n: 0, v: 0 }; porDia[d].n++; porDia[d].v += Number(p.valor_total || 0); });
  const prods = {}; V.forEach(p => (p.itens || []).forEach(i => { const k = i.nome || i.codigo; prods[k] = prods[k] || { q: 0, v: 0 }; prods[k].q += Number(i.quantidade || 0); prods[k].v += Number(i.subtotal || 0); }));
  const top = Object.entries(prods).sort((a, b) => b[1].q - a[1].q).slice(0, 10);
  const descTot = V.reduce((t, p) => t + Number(p.desconto || 0), 0);
  return `
    <div class="kpis">
      <div class="kpi dest"><span>Faturamento</span><b>${brl(fat)}</b></div>
      <div class="kpi dest"><span>Pedidos</span><b>${V.length}</b></div>
      <div class="kpi"><span>Ticket médio</span><b>${brl(V.length ? fat / V.length : 0)}</b></div>
      <div class="kpi"><span>Descontos dados</span><b>${brl(descTot)}</b></div>
      <div class="kpi"><span>Cancelados</span><b>${C}</b></div>
    </div>
    <div class="box"><h2>💳 Por forma de pagamento</h2>
      ${Object.keys(porPag).length ? `<table class="rel-tab">${Object.entries(porPag).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="v">${brl(v)}</td></tr>`).join('')}</table>` : '<p style="color:var(--muted)">Nenhuma venda no período.</p>'}
    </div>
    <div class="box"><h2>🏆 Produtos mais vendidos</h2>
      ${top.length ? `<table class="rel-tab"><tr><th>Produto</th><th class="v">Qtd.</th><th class="v">Valor</th></tr>${top.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="v">${x.q}</td><td class="v">${brl(x.v)}</td></tr>`).join('')}</table>` : '<p style="color:var(--muted)">Nenhuma venda no período.</p>'}
    </div>
    <div class="box"><h2>📅 Vendas por dia</h2>
      ${Object.keys(porDia).length ? `<table class="rel-tab"><tr><th>Dia</th><th class="v">Pedidos</th><th class="v">Valor</th></tr>${Object.entries(porDia).map(([d, x]) => `<tr><td>${esc(d)}</td><td class="v">${x.n}</td><td class="v">${brl(x.v)}</td></tr>`).join('')}</table>` : '<p style="color:var(--muted)">Nenhuma venda no período.</p>'}
    </div>
    <div class="box"><h2>⬇️ Planilha</h2>
      <p class="prov" style="margin-top:0">Baixe os pedidos do período em planilha (abre no Excel e no Google Planilhas). <b>Dica:</b> baixe <b>"Tudo"</b> uma vez por mês e guarde, como cópia de segurança.</p>
      <button class="btn btn-ouro btn-sm" type="button" id="relCsv">⬇️ Baixar planilha (${relDados.length} pedidos)</button>
    </div>`;
}
function painelRelatorios(){
  setTimeout(() => relCarregar(), 0);
  return admAvisoLogin() + `<div class="rel-filtros">${REL_PER.map(([k, n]) => `<button type="button" data-relper="${k}" aria-pressed="${relPeriodo === k}">${n}</button>`).join('')}</div><div id="relIn">${relHTML()}</div>`;
}
function relBaixarCsv(){
  if (!relDados) return;
  const c = v => { v = v == null ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const num = v => v == null || v === '' ? '' : Number(v).toFixed(2).replace('.', ',');
  const cab = ['Nº', 'Data', 'Hora', 'Status', 'Cliente', 'CPF', 'E-mail', 'Telefone', 'Carro', 'Itens', 'Subtotal', 'Desconto', 'Cupom', 'Taxa entrega', 'Total', 'Pagamento', 'Recebimento', 'Bairro', 'Endereço'];
  const linhas = relDados.slice().sort((a, b) => a.id - b.id).map(p => { const d = new Date(p.created_at); return [p.id, d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), MP_STATUS[p.status] === 'Recebido' ? 'Novo' : (MP_STATUS[p.status] || p.status), p.cliente_nome, p.cliente_cpf ? cpfMask(p.cliente_cpf) : '', p.cliente_email, p.cliente_telefone, p.veiculos, (p.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(' + '), num(p.subtotal), num(p.desconto), p.cupom, num(p.taxa_entrega), num(p.valor_total), p.forma_pagamento, p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada', p.bairro, p.endereco].map(c).join(';'); });
  const csv = '﻿' + [cab.join(';')].concat(linhas).join('\r\n');
  const nome = 'pedidos-pontocar-' + (REL_PER.find(x => x[0] === relPeriodo) || ['', 'periodo'])[1].toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, '') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  try { const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('Planilha baixada!'); }
  catch(e){ toast('Não foi possível baixar a planilha.'); }
}

function admAvisarHTML(p, dig){
  const nome = String(p.cliente_nome || '').trim().split(/\s+/)[0] || '';
  const n = p.id; const tot = brl(p.valor_total); const L = D.loja;
  const msgs = [
    ['✅ Pedido confirmado', `Olá, ${nome}! Aqui é da Ponto Car. Recebemos o seu pedido Nº ${n} (total ${tot}) e já estamos separando as peças. Obrigado pela preferência!`],
    ['🚗 Confirmar se serve no carro', `Olá, ${nome}! Aqui é da Ponto Car, sobre o pedido Nº ${n}. Queremos confirmar se as peças servem no seu carro${p.veiculos ? ` (${p.veiculos})` : ''}. Pode nos passar a versão/motor?`]
  ];
  if (/^pix/i.test(p.forma_pagamento || '') && L.pixChave) msgs.push(['💠 Enviar a chave Pix', `Olá, ${nome}! Pedido Nº ${n} confirmado. Para pagar no Pix: chave ${L.pixChave}${L.pixNome ? ` (${L.pixNome})` : ''}, valor ${tot}. Depois é só mandar o comprovante aqui. Obrigado!`]);
  if (p.tipo_entrega === 'entrega') msgs.push(['🛵 Saiu para entrega', `Olá, ${nome}! O seu pedido Nº ${n} da Ponto Car saiu para entrega. Em breve chega aí!`]);
  else msgs.push(['🏪 Pronto para retirar', `Olá, ${nome}! O seu pedido Nº ${n} da Ponto Car está pronto para retirada.${L.endereco ? ` Endereço: ${L.endereco}.` : ''}${L.horario || resumoHorarios() ? ` Horário: ${L.horario || resumoHorarios()}.` : ''}`]);
  msgs.push(['🙏 Agradecer', `Olá, ${nome}! Obrigado por comprar na Ponto Car (pedido Nº ${n}). Qualquer dúvida sobre as peças, é só chamar!`]);
  msgs.push(['❌ Pedido cancelado', `Olá, ${nome}. O seu pedido Nº ${n} na Ponto Car foi cancelado. Se quiser, podemos te ajudar a fazer um novo. É só responder aqui.`]);
  return `<details class="adm-avisar"><summary>💬 Avisar cliente pelo WhatsApp</summary><div class="lista">${msgs.map(([t, m]) => `<a target="_blank" rel="noopener" href="https://wa.me/${esc(dig)}?text=${encodeURIComponent(m)}">${esc(t)}</a>`).join('')}</div></details>`;
}
function estoqueBaixoLista(){
  if (!sbPecas) return [];
  const min = Number(sbConfig && sbConfig.estoque_minimo != null ? sbConfig.estoque_minimo : 2);
  return Object.values(sbPecas).filter(x => Number(x.estoque) <= min).sort((a, b) => a.estoque - b.estoque);
}
function alertaEstoqueHTML(){
  const L = estoqueBaixoLista(); if (!L.length) return '';
  return `<div class="alerta-est">⚠️ <b>Estoque baixo:</b> ${L.map(x => `${esc(x.nome || x.codigo)} — <b>${esc(x.estoque)} un.</b>`).join(' · ')}</div>`;
}
function admHTML(){
  const ss = admSessao();
  if (!ss) return `<div class="box adm-login">
      <h2>Entrar no painel de pedidos</h2>
      <p class="prov" style="margin-top:0">Use o e-mail e a senha do usuário que você criou no Supabase.</p>
      ${admErro ? `<div class="msg-erro">${esc(admErro)}</div>` : ''}
      <form id="fAdmLogin" novalidate>
        <label class="lbl" for="admEmail">E-mail</label><input class="in" id="admEmail" type="email" autocomplete="username">
        <label class="lbl" for="admSenha">Senha</label><input class="in" id="admSenha" type="password" autocomplete="current-password">
        <div class="msg-erro hide" id="eAdm"></div>
        <div class="acoes"><button class="btn btn-ouro" type="submit" id="admEntrar">Entrar</button></div>
      </form></div>`;
  if (ss.uid && ss.uid !== ADM_UID) return `<div class="box adm-login"><h2>Acesso não autorizado</h2><p>Este usuário não é o administrador da loja.</p><button class="btn btn-linha" type="button" id="admSair">Sair</button></div>`;
  if (!admLista) return `<div class="adm-vazio">${admErro ? esc(admErro) + '<br><br><button class="btn btn-ouro btn-sm" type="button" id="admAtualizar">Tentar de novo</button>' : 'Carregando pedidos…'}</div>`;
  const L = admLista; const hoje = new Date().toDateString(); const alertaEst = alertaEstoqueHTML();
  const deHoje = L.filter(p => new Date(p.created_at).toDateString() === hoje && p.status !== 'cancelado');
  const cols = [['novo', '🆕 Novos', L.filter(p => p.status === 'novo')], ['andamento', '⏳ Em andamento', L.filter(p => p.status === 'andamento')], ['finalizado', '✅ Finalizados', L.filter(p => p.status === 'finalizado' || p.status === 'cancelado')]];
  return alertaEst + `
    <div class="kpis">
      <div class="kpi dest"><span>Pedidos hoje</span><b>${deHoje.length}</b></div>
      <div class="kpi dest"><span>Vendido hoje</span><b>${brl(deHoje.reduce((t, p) => t + Number(p.valor_total || 0), 0))}</b></div>
      <div class="kpi"><span>Novos</span><b>${cols[0][2].length}</b></div>
      <div class="kpi"><span>Em andamento</span><b>${cols[1][2].length}</b></div>
      <div class="kpi"><span>Finalizados hoje</span><b>${L.filter(p => p.status === 'finalizado' && new Date(p.created_at).toDateString() === hoje).length}</b></div>
    </div>
    <div class="adm-barra"><small>Atualiza sozinho a cada 15 segundos · ${esc(ss.email || '')}</small><div style="display:flex;gap:6px;flex-wrap:wrap">${notifBotao()}<button class="btn btn-linha btn-sm" type="button" id="admAtualizar">↻ Atualizar</button><button class="btn btn-linha btn-sm" type="button" id="admSair">Sair da conta</button></div></div>
    ${admErro ? `<div class="msg-erro" style="margin-bottom:10px">${esc(admErro)}</div>` : ''}
    <div class="adm-tabs">${cols.map(([id, n, arr]) => `<button type="button" data-admcol="${id}" aria-pressed="${admCol === id}">${n} (${arr.length})</button>`).join('')}</div>
    <div class="adm-cols">${cols.map(([id, n, arr]) => `<section class="adm-col${admCol === id ? ' ativa' : ''}"><h3>${n} (${arr.length})</h3>${arr.length ? arr.map(admCard).join('') : `<div class="adm-vazio">Nenhum pedido aqui.</div>`}</section>`).join('')}</div>`;
}
function painelPedidos(){
  setTimeout(() => admCarregar(), 0);
  return `<div id="admPedidos">${admHTML()}</div>`;
}
async function admMudarStatus(id, st){
  const nomes = { andamento: 'colocar em andamento', finalizado: 'finalizar', cancelado: 'cancelar' };
  if (st === 'cancelado' && !(await confirmar(`Cancelar o pedido <b>Nº ${esc(id)}</b>? As peças voltam para o estoque.`, 'Sim, cancelar', true, 'Não'))) return;
  if (st === 'finalizado' && !(await confirmar(`Finalizar o pedido <b>Nº ${esc(id)}</b>?`, 'Sim, finalizar', false, 'Não'))) return;
  try { await admFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: st }) }); toast(`Pedido Nº ${id}: ${MP_STATUS[st] || st}`); if (st !== 'cancelado') admCol = st; }
  catch(e){ toast(e.message === 'LOGIN' ? 'Entre de novo no painel.' : `Não foi possível ${nomes[st] || 'alterar'}: ${e.message}`); }
  admCarregar();
}
async function admExcluir(id){
  if (!(await confirmar(`Excluir de vez o pedido <b>Nº ${esc(id)}</b>? Ele some do banco de dados e não pode ser recuperado.`, 'Sim, excluir', true, 'Não'))) return;
  try { await admFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); toast(`Pedido Nº ${id} excluído.`); }
  catch(e){ toast(e.message === 'LOGIN' ? 'Entre de novo no painel.' : 'Não foi possível excluir: ' + e.message); }
  admCarregar();
}
setInterval(() => { if (rotaAtual() === 'painel' && painelLiberado && admSessao()) admCarregar(true); }, 15000);

/* ---------- Notificação no computador ---------- */
const TITULO_ORIG = document.title; let admNaoVistos = 0;
const notifSuportada = () => 'Notification' in window;
function notifBotao(){
  if (!notifSuportada()) return '';
  const p = Notification.permission;
  if (p === 'granted') return '<button class="btn btn-linha btn-sm" type="button" id="admNotifTeste" title="Os avisos aparecem mesmo com o painel minimizado">🔔 Avisos no computador: ativos (testar)</button>';
  if (p === 'denied') return '<button class="btn btn-linha btn-sm" type="button" id="admNotifBloq">🔕 Avisos bloqueados: como liberar</button>';
  return '<button class="btn btn-ouro btn-sm" type="button" id="admNotifAtivar">🔔 Ativar avisos no computador</button>';
}
function notificar(titulo, corpo){
  try {
    if (!notifSuportada() || Notification.permission !== 'granted') return;
    const n = new Notification(titulo, { body: corpo, tag: 'pontocar-' + Date.now(), requireInteraction: true });
    n.onclick = () => { window.focus(); if (rotaAtual() !== 'painel') ir('painel'); abaPainel = 'pedidos'; admCol = 'novo'; renderPainel(); n.close(); };
  } catch(e){}
}
function titulaNovo(qtd){ admNaoVistos += qtd; document.title = `(${admNaoVistos}) 🔔 Novo pedido! · ${TITULO_ORIG}`; }
function limparTitulo(){ if (!document.hidden && document.hasFocus()){ admNaoVistos = 0; document.title = TITULO_ORIG; } }
document.addEventListener('visibilitychange', limparTitulo); window.addEventListener('focus', limparTitulo);

/* ---------- Gravar no Supabase pelo painel ---------- */
function admAvisoLogin(){
  return admSessao() ? '' : `<div class="aviso" style="margin-bottom:12px"><span>🔑</span><span>Para alterar <b>preço, estoque, ofertas, cupons, desconto no Pix e bairros</b>, entre primeiro com o e-mail do Supabase. <button class="btn btn-ouro btn-sm" type="button" data-aba="pedidos" style="margin-left:6px">Entrar</button></span></div>`;
}
async function admGravar(caminho, metodo, corpo, okMsg, prefer){
  if (!admSessao()){ toast('Entre primeiro com o e-mail do Supabase (aba 📋 Pedidos).'); return false; }
  try {
    await admFetch(caminho, { method: metodo, headers: { Prefer: prefer || 'return=minimal' }, body: corpo == null ? undefined : JSON.stringify(corpo) });
    if (okMsg) toast(okMsg); return true;
  } catch(e){ toast(e.message === 'LOGIN' ? 'Sua sessão expirou: entre de novo na aba 📋 Pedidos.' : 'Não foi possível salvar: ' + e.message); return false; }
}
const sbDe = p => sbPecas && p && p.codigo ? sbPecas[codNorm(p.codigo)] : null;
const dinheiroIn = v => (v == null || v === '' || isNaN(Number(v))) ? '' : Number(v).toFixed(2).replace('.', ',');
let admCupons = null;
async function admCarregarCupons(){
  if (!admSessao()){ admCupons = null; return; }
  try { admCupons = await admFetch('cupons?select=codigo,pct,ativo&order=codigo'); } catch(e){ admCupons = []; }
  if (rotaAtual() === 'painel' && painelLiberado && abaPainel === 'promo') renderPainel(true);
}
async function admSalvarPeca(cod, campos, okMsg){
  const ss = sbPecas && sbPecas[codNorm(cod)]; if (!ss){ toast('Esse código ainda não está no Supabase.'); return; }
  if (await admGravar(`pecas?codigo=eq.${encodeURIComponent(ss.codigo)}`, 'PATCH', campos, okMsg)) await sincronizarSupabase();
  renderPainel(true);
}

function painelEstoque(){
  const porCat = c => D.produtos.filter(p => p.cat === c.id);
  const orfaos = D.produtos.filter(p => !D.categorias.find(c => c.id === p.cat));
  const linhaProd = p => `<div class="est-row"><div style="display:flex;gap:10px;align-items:center">${p.foto ? `<img class="thumb" src="${esc(p.foto)}" alt="" onerror="this.remove()">` : ''}<div><div class="n">${esc(p.nome)}</div><div class="s">${brl(p.preco)}${(p.opcoes||[]).length ? ` · ${p.opcoes.length} opções` : ''}${p.marca ? ' · ' + esc(p.marca) : ''}${p.codigo ? ' · ' + esc(p.codigo) : ''}${p.similares ? ' · similares: ' + esc(p.similares) : ''}</div></div></div>
    <div class="est-act">${sbDe(p) ? `<label class="qtd-est">💲 <input class="in" inputmode="decimal" data-sbpreco="${esc(p.codigo)}" value="${dinheiroIn(sbDe(p).preco)}" aria-label="Preço de ${esc(p.nome)}" style="width:86px"></label><label class="qtd-est${Number(sbDe(p).estoque) === 0 ? ' zero' : ''}">📦 <input class="in" inputmode="numeric" data-sbqtd="${esc(p.codigo)}" value="${esc(sbDe(p).estoque)}" aria-label="Estoque de ${esc(p.nome)}"> un.</label>` : `<span class="qtd-est zero" title="Cadastre o preço e o estoque em Editar">⚠️ ${sbPecas ? 'Sem preço/estoque' : '…'}</span>`}<div class="toggles"><label class="toggle"><input type="checkbox" data-falta="${esc(p.id)}" ${p.falta ? 'checked' : ''}> Em falta</label><label class="toggle toggle-mv"><input type="checkbox" data-maisvendido="${esc(p.id)}" ${p.maisVendido ? 'checked' : ''}> ⭐ Mais vendido</label></div><button class="btn btn-linha btn-sm" data-editar="${esc(p.id)}">Editar</button><button class="ic-btn" data-delprod="${esc(p.id)}" aria-label="Apagar">🗑</button></div></div>`;
  return admAvisoLogin() + alertaEstoqueHTML() + `
    <div class="box">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ouro" id="novoProd">+ Novo produto</button>
        <button class="btn btn-verde" type="button" data-publicar>🚀 Publicar no site</button>
      </div>
      <p class="prov" style="font-size:13px">As mudanças aparecem na hora <b>neste aparelho</b>. Para os clientes verem, clique em <b>🚀 Publicar no site</b>.</p>
      <label class="lbl" for="sbEstMin">⚠️ Avisar quando o estoque de uma peça ficar em (ou abaixo de)</label>
      <div style="display:flex;gap:8px;align-items:center"><input class="in" id="sbEstMin" inputmode="numeric" value="${sbConfig && sbConfig.estoque_minimo != null ? esc(sbConfig.estoque_minimo) : 2}" style="max-width:100px"> <span>unidades</span></div>
      <div class="aviso" style="margin-top:8px"><span>ℹ️</span><span><b>💲 Preço e 📦 estoque</b> são salvos direto no banco (Supabase) e valem <b>na hora</b> para os clientes, sem precisar publicar. Fotos, descrições, categorias e kits continuam precisando do <b>🚀 Publicar no site</b>.</span></div>
      <div class="gh-status">${ghConectado() ? `✓ Conectado ao GitHub (<b>${esc(ghConfig().owner)}/${esc(ghConfig().repo)}</b>)` : '⚪ Ainda não conectado ao GitHub'} · <button class="link-btn" type="button" data-conexaogh>🔗 Conexão com o GitHub</button> · <button class="link-btn" type="button" id="salvarEstoque">💾 Baixar estoque.js</button></div>
    </div>
    <div class="box">
      <h2>Categorias</h2>
      ${D.categorias.map((c, i) => `<div class="cat-row"><input class="in" value="${esc(c.nome)}" data-rencat="${esc(c.id)}" aria-label="Nome da categoria"><button class="ic-btn" data-movcat="${i}|-1" aria-label="Subir">↑</button><button class="ic-btn" data-movcat="${i}|1" aria-label="Descer">↓</button><button class="ic-btn" data-delcat="${esc(c.id)}" aria-label="Apagar">🗑</button></div>`).join('') || '<p class="prov">Nenhuma categoria.</p>'}
      <form class="cat-row" id="fNovaCat" style="margin-top:6px"><input class="in" id="novaCatNome" placeholder="Nova categoria (ex.: Filtros de óleo)"><button class="btn btn-ouro btn-sm" type="submit">Adicionar</button></form>
    </div>
    <div class="box">
      <h2>Produtos (${D.produtos.length})</h2>
      ${D.produtos.length ? D.categorias.map(c => porCat(c).length ? `<h3 style="margin:14px 0 4px;font-size:15px;color:var(--muted)">${esc(c.nome)}</h3>${porCat(c).map(linhaProd).join('')}` : '').join('') + (orfaos.length ? `<h3 style="margin:14px 0 4px;font-size:15px;color:var(--muted)">Sem categoria</h3>${orfaos.map(linhaProd).join('')}` : '')
        : `<div class="vazio"><b>Estoque zerado</b>Clique em <b>+ Novo produto</b> para cadastrar o primeiro item.</div>`}
    </div>`;
}

function formProduto(p){
  const novo = !p; p = p ? clone(p) : { id: uid(), cat: (D.categorias[0]||{}).id || '', nome:'', marca:'', codigo:'', similares:'', aplicacao:'', descricao:'', preco:0, opcoes:[], foto:'', falta:false };
  const optRow = (o = {nome:'', preco:''}) => `<div class="opt-row"><input class="in" placeholder="Ex.: 1 litro / 5W30" value="${esc(o.nome)}" data-onome><input class="in" placeholder="Preço" inputmode="decimal" value="${o.preco !== '' && o.preco != null ? String(o.preco).replace('.', ',') : ''}" data-opreco><button type="button" class="ic-btn" data-rmopt aria-label="Tirar opção">✕</button></div>`;
  modal(`<h2>${novo ? 'Novo produto' : 'Editar produto'}</h2>
    <form id="fProd">
      <label class="lbl">Categoria</label>
      <select class="in" id="pCat">${D.categorias.map(c => `<option value="${esc(c.id)}" ${c.id===p.cat ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>
      <label class="lbl">Nome do produto <i>*</i></label><input class="in" id="pNome" value="${esc(p.nome)}" placeholder="Ex.: Filtro de óleo PSL 140">
      <div class="g2"><div><label class="lbl">Marca</label><input class="in" id="pMarca" value="${esc(p.marca)}" placeholder="Ex.: Tecfil"></div>
      <div><label class="lbl">Código</label><input class="in" id="pCod" value="${esc(p.codigo)}" placeholder="Ex.: PSL140"></div></div>
      <label class="lbl">Códigos similares <small>(equivalentes de outras marcas — separe por vírgula; o cliente acha pela busca)</small></label>
      <input class="in" id="pSim" value="${esc(p.similares || '')}" placeholder="Ex.: Fram PH5949, Mann W712/95, Wega WO-120">
      <label class="lbl">Carros que servem <small>(modelos e anos — usado na busca)</small></label>
      <input class="in" id="pAplic" value="${esc(p.aplicacao)}" placeholder="Ex.: Gol, Voyage, Fox 1.0/1.6 2008-2016">
      <label class="lbl">Descrição</label><textarea class="in" id="pDesc" placeholder="Ex.: Filtro blindado, troca a cada 10 mil km">${esc(p.descricao)}</textarea>
      <input type="hidden" id="pPreco" value="${p.preco ? String(p.preco).replace('.', ',') : ''}"><input type="hidden" id="pQtd" value="${p.qtdEstoque != null ? esc(p.qtdEstoque) : ''}">
      <div class="g2 g-preco"><div><label class="lbl">💲 Preço (R$) <small>— salvo no banco</small></label><input class="in" id="pPrecoSb" inputmode="decimal" value="${sbDe(p) ? dinheiroIn(sbDe(p).preco) : ''}" placeholder="Ex.: 29,90"></div>
      <div><label class="lbl">📦 Estoque (un.) <small>— salvo no banco</small></label><input class="in" id="pQtdSb" inputmode="numeric" value="${sbDe(p) ? esc(sbDe(p).estoque) : ''}" placeholder="Ex.: 12"></div></div>
      <p class="prov" style="font-size:13px">O <b>código</b> liga o produto ao banco. Sem preço, o produto aparece como indisponível.${admSessao() ? '' : ' <b>Entre com o e-mail do Supabase (aba 📋 Pedidos) para salvar preço e estoque.</b>'}</p>
      <label class="lbl">Opções <small>(ex.: viscosidade, tamanho, 1 L / 4 L — cada uma com seu preço)</small></label>
      <div id="optsBox">${(p.opcoes||[]).map(optRow).join('')}</div>
      <button type="button" class="btn btn-linha btn-sm" id="addOpt">+ Acrescentar opção</button>
      <label class="lbl">🤝 Combina com <small>(aparece como sugestão na ficha e no pedido — ex.: filtro de óleo combina com o óleo)</small></label>
      <div class="comb-lista">${D.produtos.filter(x => x.id !== p.id).map(x => `<label class="check"><input type="checkbox" data-comb value="${esc(x.id)}" ${(p.combina || []).includes(x.id) ? 'checked' : ''}> ${esc(x.nome)}</label>`).join('') || '<p class="prov" style="margin:0">Cadastre outros produtos para escolher.</p>'}</div>
      <label class="lbl">Foto do produto <small>(opcional)</small></label>
      <div class="foto-box" id="fotoBox">
        <img id="fotoPrev" alt="Foto do produto">
        <div class="vz" id="fotoVazia">📷 Arraste a foto do computador aqui<br>ou clique no botão</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <label class="btn btn-ouro btn-sm" style="cursor:pointer">🖼️ Adicionar imagem do computador<input type="file" accept="image/*" id="pArquivo" hidden></label>
          <button type="button" class="btn btn-linha btn-sm" id="pTirarFoto">Remover foto</button>
        </div>
        <small class="vz" id="fotoInfo"></small>
      </div>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-size:14px;color:var(--muted)">ou usar um link de imagem</summary>
        <input class="in" id="pFotoLink" style="margin-top:6px" value="${p.foto && !p.foto.startsWith('data:') ? esc(p.foto) : ''}" placeholder="https://… ou fotos/nome-da-foto.jpg"></details>
      <label class="check"><input type="checkbox" id="pFalta" ${p.falta ? 'checked' : ''}> Em falta (aparece para o cliente, mas sem poder pedir)</label>
      <div class="msg-erro hide" id="eProd"></div>
      <div class="acoes-m"><button type="button" class="btn btn-linha" data-fechar>Cancelar</button><button class="btn btn-ouro" type="submit">Salvar produto</button></div>
    </form>`, m => {
    let fotoAtual = p.foto || '';
    const prev = m.querySelector('#fotoPrev'), vazia = m.querySelector('#fotoVazia'), tirar = m.querySelector('#pTirarFoto'), info = m.querySelector('#fotoInfo'), box = m.querySelector('#fotoBox');
    const mostrarFoto = () => { prev.style.display = fotoAtual ? '' : 'none'; if (fotoAtual) prev.src = fotoAtual; else prev.removeAttribute('src'); vazia.style.display = fotoAtual ? 'none' : ''; tirar.style.display = fotoAtual ? '' : 'none'; };
    prev.onerror = () => { if (fotoAtual) info.textContent = 'Não deu para mostrar essa imagem aqui (o link pode estar errado).'; };
    mostrarFoto();
    const usarArquivo = async f => {
      if (!f) return; info.textContent = 'Preparando a foto…';
      try { fotoAtual = await lerImagem(f); m.querySelector('#pFotoLink').value = ''; info.textContent = `Foto pronta (${Math.round(fotoAtual.length * 0.75 / 1024)} KB). Ela vai junto no estoque.js.`; mostrarFoto(); }
      catch(err){ info.textContent = 'Não consegui abrir essa imagem. Use JPG, PNG ou WEBP.'; }
    };
    m.querySelector('#pArquivo').onchange = e => { usarArquivo(e.target.files[0]); e.target.value = ''; };
    tirar.onclick = () => { fotoAtual = ''; m.querySelector('#pFotoLink').value = ''; info.textContent = ''; mostrarFoto(); };
    m.querySelector('#pFotoLink').oninput = e => { const v = e.target.value.trim(); fotoAtual = v; info.textContent = ''; mostrarFoto(); };
    ['dragenter','dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('arrastando'); }));
    ['dragleave','drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('arrastando'); }));
    box.addEventListener('drop', e => usarArquivo(e.dataTransfer.files[0]));
    m.querySelector('#addOpt').onclick = () => { m.querySelector('#optsBox').insertAdjacentHTML('beforeend', optRow()); };
    m.querySelector('#optsBox').addEventListener('click', e => { if (e.target.closest('[data-rmopt]')) e.target.closest('.opt-row').remove(); });
    m.querySelector('#fProd').onsubmit = e => {
      e.preventDefault();
      const er = m.querySelector('#eProd'); const v = id => m.querySelector(id).value.trim();
      if (!D.categorias.length){ er.textContent = 'Crie uma categoria antes.'; er.classList.remove('hide'); return; }
      if (!v('#pNome')){ er.textContent = 'Digite o nome do produto.'; er.classList.remove('hide'); return; }
      const opcoes = []; let erroOpt = '';
      m.querySelectorAll('.opt-row').forEach(r => { const n = r.querySelector('[data-onome]').value.trim(); const pr = parseMoney(r.querySelector('[data-opreco]').value); if (!n && isNaN(pr)) return; if (!n || isNaN(pr)) erroOpt = 'Cada opção precisa de nome e preço.'; else opcoes.push({ nome: n, preco: Math.round(pr*100)/100 }); });
      const preco = parseMoney(v('#pPreco'));
      if (erroOpt){ er.textContent = erroOpt; er.classList.remove('hide'); return; }
      const antigo = prod(p.id); const oldOps = antigo ? antigo.opcoes || [] : [];
      Object.assign(p, { cat: v('#pCat'), nome: v('#pNome'), marca: v('#pMarca'), codigo: v('#pCod'), similares: v('#pSim').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).join(', '), aplicacao: v('#pAplic'), descricao: v('#pDesc'),
        preco: isNaN(preco) ? (opcoes[0] ? opcoes[0].preco : 0) : Math.round(preco*100)/100, opcoes: opcoes.map(o => { const ant = oldOps.find(x => x.nome === o.nome); if (ant && ant.falta) o.falta = true; if (ant && ant.precoOferta) o.precoOferta = ant.precoOferta; return o; }), combina: Array.from(m.querySelectorAll('[data-comb]:checked')).map(x => x.value), foto: fotoAtual, falta: m.querySelector('#pFalta').checked });
      const qtdTxt = v('#pQtd');
      if (qtdTxt === '') delete p.qtdEstoque;
      else { const q = parseInt(qtdTxt.replace(/\D/g, ''), 10); if (isNaN(q)){ er.textContent = 'A quantidade em estoque precisa ser um número (ou deixe vazio).'; er.classList.remove('hide'); return; } p.qtdEstoque = q; if (q === 0) p.falta = true; }
      const i = D.produtos.findIndex(x => x.id === p.id); if (i >= 0) D.produtos[i] = p; else D.produtos.push(p);
      const precoSb = parseMoney(m.querySelector('#pPrecoSb').value); const qtdSbTxt = m.querySelector('#pQtdSb').value.replace(/\D/g, '');
      const qtdSb = qtdSbTxt === '' ? 0 : parseInt(qtdSbTxt, 10);
      if (m.querySelector('#pPrecoSb').value.trim() && (isNaN(precoSb) || precoSb <= 0)){ er.textContent = 'Digite um preço válido (ex.: 29,90).'; er.classList.remove('hide'); return; }
      salvarRascunho(); fecharModal(); renderPainel(); toast(novo ? 'Produto criado!' : 'Produto atualizado!');
      if (!isNaN(precoSb) && precoSb > 0){
        if (!p.codigo){ toast('Produto salvo, mas sem código: o preço e o estoque não foram para o banco.'); }
        else (async () => {
          const ss = sbDe(p); const corpo = { preco: Math.round(precoSb * 100) / 100, estoque: qtdSb };
          const ok = ss ? await admGravar(`pecas?codigo=eq.${encodeURIComponent(ss.codigo)}`, 'PATCH', corpo)
                        : await admGravar('pecas', 'POST', Object.assign({ codigo: p.codigo.trim(), nome: p.nome + ' - ' + p.codigo.trim() }, corpo));
          if (ok){ toast(novo ? 'Produto criado e preço/estoque salvos no banco!' : 'Produto, preço e estoque atualizados!'); await sincronizarSupabase(); renderPainel(true); }
        })();
      }
    };
  });
}

function arquivoEstoque(){
  const dados = semSupabase(D); dados.atualizado = D.atualizado || Date.now();
  return `/* ============================================================
   PONTO CAR — ESTOQUE DA LOJA (estoque.js)
   Gerado pelo Painel ponto car em ${new Date().toLocaleString('pt-BR')}.
   Para mudar: use o 🔒 Painel no site, clique em "Salvar estoque"
   e suba este arquivo no GitHub (substituindo o antigo).
   ============================================================ */
window.PONTOCAR = ${JSON.stringify(dados, null, 2)};
`;
}

function painelConfig(){
  const L = D.loja;
  return `
    <div class="box"><h2>Numeração dos pedidos</h2>
      <p style="margin-top:0">O número de cada pedido é dado pelo <b>Supabase</b>, o mesmo para todos os clientes. Dois pedidos nunca recebem o mesmo número.</p>
      <div class="linha"><span>Próximo pedido</span><span id="proxNum">carregando…</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-ouro" id="zerarNum">↺ Recomeçar a numeração do 01</button></div>
      <p class="prov" style="font-size:13px">Para recomeçar do Nº 01, a lista de pedidos precisa estar vazia: cancele e exclua todos os pedidos na aba 📋 Pedidos antes.</p>
    </div>
    ${admAvisoLogin()}
    <div class="box"><h2>🛵 Taxa de entrega por bairro</h2>
      <p class="prov" style="margin-top:0">Fica salva no banco e vale <b>na hora</b> para os clientes. Deixe a lista vazia para combinar a taxa por telefone. Taxa 0 = entrega grátis no bairro. O cliente também pode escolher "Outro bairro (taxa a combinar)".</p>
      <div id="bairrosBox">${bairros().map(b => `<div class="bairro-row"><input class="in" data-bnome value="${esc(b.nome)}" placeholder="Bairro"><input class="in" data-btaxa inputmode="decimal" value="${Number(b.taxa) ? Number(b.taxa).toFixed(2).replace('.', ',') : '0'}" placeholder="Taxa"><button type="button" class="ic-btn" data-rmbairro aria-label="Tirar bairro">✕</button></div>`).join('')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn btn-linha btn-sm" id="addBairro">+ Acrescentar bairro</button><button type="button" class="btn btn-ouro btn-sm" id="sbSalvarBairros">💾 Salvar bairros</button></div>
    </div>
    <div class="box"><h2>Dados da loja</h2>
      <form id="fLoja">
        <div class="g2"><div><label class="lbl">WhatsApp principal</label><input class="in" id="cZap1" value="${esc(fone(L.whatsapp[0]||''))}"></div>
        <div><label class="lbl">WhatsApp 2</label><input class="in" id="cZap2" value="${esc(fone(L.whatsapp[1]||''))}"></div></div>
        <div class="g2"><div><label class="lbl">Chave Pix</label><input class="in" id="cPix" value="${esc(L.pixChave)}"></div>
        <div><label class="lbl">Tipo da chave</label><select class="in" id="cPixTipo">${[['telefone','Telefone'],['cpf','CPF'],['cnpj','CNPJ'],['email','E-mail'],['aleatoria','Chave aleatória']].map(([v,n]) => `<option value="${v}" ${L.pixTipo===v?'selected':''}>${n}</option>`).join('')}</select></div></div>
        <div class="g2"><div><label class="lbl">Nome de quem recebe o Pix</label><input class="in" id="cPixNome" value="${esc(L.pixNome)}"></div>
        <div><label class="lbl">Cidade (para o Pix)</label><input class="in" id="cPixCidade" value="${esc(L.pixCidade)}"></div></div>
        <label class="lbl">Frase da loja</label><input class="in" id="cFrase" value="${esc(L.frase)}">
        <label class="lbl">Endereço da loja <small>(aparece no rodapé, na retirada e no botão do mapa)</small></label><input class="in" id="cEnd" value="${esc(L.endereco || '')}" placeholder="Ex.: Rua Exemplo, 123 – Centro, Ituverava – SP">
        <h3 style="margin:18px 0 0;font-size:16px">🕒 Horário de funcionamento <small style="font-weight:500;color:var(--muted)">(mostra "Aberto agora" / "Fechado" no site)</small></h3>
        <div class="hor-grid">${[1,2,3,4,5,6,0].map(d => { const h = (L.horarios || {})[d]; return `<div class="hor-row"><label class="check" style="margin:0"><input type="checkbox" data-hordia="${d}" ${h ? 'checked' : ''}> <b>${DIAS[d]}</b></label><input class="in" type="time" data-horini="${d}" value="${h ? h[0] : '08:00'}" aria-label="Abre"><span>às</span><input class="in" type="time" data-horfim="${d}" value="${h ? h[1] : '18:00'}" aria-label="Fecha"></div>`; }).join('')}</div>
        <p class="prov">Marque os dias que a loja abre. Dia desmarcado = fechado.</p>
        <label class="lbl">Texto do horário <small>(opcional — se ficar vazio, o site monta sozinho com os horários acima)</small></label><input class="in" id="cHor" value="${esc(L.horario || '')}" placeholder="Ex.: Seg a sex 8h–18h · Sáb 8h–12h">

        <h3 style="margin:18px 0 0;font-size:16px">Redes sociais <small style="font-weight:500;color:var(--muted)">(deixe em branco a que não usar)</small></h3>
        <div class="g3">
          <div><label class="lbl" for="cInsta">📸 Instagram</label><input class="in" id="cInsta" value="${esc(L.instagram || '')}" placeholder="@pontocar"></div>
          <div><label class="lbl" for="cFace">👍 Facebook</label><input class="in" id="cFace" value="${esc(L.facebook || '')}" placeholder="pontocar ou link"></div>
          <div class="full-m"><label class="lbl" for="cTiktok">🎵 TikTok</label><input class="in" id="cTiktok" value="${esc(L.tiktok || '')}" placeholder="@pontocar"></div>
        </div>
        <button class="btn btn-ouro btn-sm" style="margin-top:12px" type="submit">Salvar dados da loja</button>
      </form>
    </div>
    <div class="box"><h2>Histórico deste aparelho</h2>
      <button class="btn btn-perigo btn-sm" id="apagarHist">🗑 Apagar o histórico de pedidos</button>
    </div>`;
}
async function carregarProximoNumero(){
  const el = $('#proxNum'); if (!el) return;
  if (!admSessao()){ el.innerHTML = '<small style="font-weight:500;color:var(--muted)">Entre na aba 📋 Pedidos com o e-mail do Supabase para ver</small>'; return; }
  try { const n = await admFetch('rpc/proximo_numero_pedido', { method: 'POST', body: '{}' }); el.textContent = 'Nº ' + pad(n); }
  catch(e){ el.innerHTML = `<small style="font-weight:500;color:var(--muted)">${e.message === 'LOGIN' ? 'Entre de novo na aba 📋 Pedidos' : esc(e.message)}</small>`; }
}

function painelPromo(){
  const comSb = D.produtos.filter(p => sbDe(p) && !(p.opcoes && p.opcoes.length));
  const ativos = comSb.filter(p => { const s0 = sbDe(p); return Number(s0.preco_oferta) > 0 && Number(s0.preco_oferta) < Number(s0.preco); }).length;
  const linha = p => {
    const s0 = sbDe(p); const po = Number(s0.preco_oferta) || 0; const ok = po > 0 && po < Number(s0.preco);
    return `<div class="ped promo-item${ok ? ' on' : ''}">
      <div class="ped-h"><div><b>${esc(p.nome)}</b> <span style="color:var(--muted);font-size:13px">${esc(p.codigo || '')}</span></div>${ok ? '<span class="tag oferta">🏷️ Em oferta</span>' : ''}</div>
      <div class="promo-campos"><label class="promo-campo"><span>Preço normal <s>${brl(s0.preco)}</s></span><input class="in" inputmode="decimal" placeholder="Preço da oferta" data-sboferta="${esc(p.codigo)}" value="${po ? dinheiroIn(po) : ''}"></label></div>
      ${po && !ok ? '<div class="msg-erro">O preço da oferta precisa ser menor que o preço normal.</div>' : ''}
      ${ok ? `<div class="prov" style="color:var(--bandeira);font-weight:700">✓ Na loja: <s>${brl(s0.preco)}</s> por ${brl(po)}. Apague o valor para encerrar a oferta.</div>` : ''}
    </div>`;
  };
  const cupons = admCupons || [];
  const descontos = `<div class="box">
      <h2>💸 Descontos</h2>
      <h3 style="margin:4px 0 0;font-size:16px">Desconto no Pix</h3>
      <label class="lbl" for="sbPixDesc">Desconto para quem paga no Pix (%, 0 = sem desconto)</label>
      <input class="in" id="sbPixDesc" inputmode="decimal" value="${pctPix() || ''}" placeholder="Ex.: 5" style="max-width:220px">
      <h3 style="margin:18px 0 0;font-size:16px">Cupons</h3>
      <p class="prov" style="font-size:13px;margin-top:4px">O cliente digita o código na hora do pagamento. Ex.: <b>OLEO10</b> com 10% de desconto. Os clientes não conseguem ver a lista de cupons.</p>
      ${!admSessao() ? '' : admCupons === null ? '<p style="color:var(--muted)">Carregando cupons…</p>' : cupons.length ? cupons.map(c => `<div class="cupom-row"><div><code>${esc(c.codigo)}</code> · <b>${Number(c.pct)}%</b> de desconto</div><div class="est-act"><label class="toggle"><input type="checkbox" data-sbcupomativo="${esc(c.codigo)}" ${c.ativo ? 'checked' : ''} style="accent-color:var(--bandeira)"> Ativo</label><button class="ic-btn" data-sbdelcupom="${esc(c.codigo)}" aria-label="Apagar cupom">🗑</button></div></div>`).join('') : '<p style="color:var(--muted)">Nenhum cupom criado.</p>'}
      <button class="btn btn-ouro btn-sm" id="sbNovoCupom" style="margin-top:10px">+ Novo cupom</button>
    </div>`;
  return admAvisoLogin() + descontos + `<div class="box">
      <h2>🏷️ Promoções</h2>
      <p style="margin-top:0">Digite o <b>preço da oferta</b> e aperte Enter (ou toque fora). Na loja aparece o <s>preço antigo</s> riscado, o selo <b>🏷️ Oferta</b> e a faixa <b>Ofertas da semana</b>. Vale <b>na hora</b>, sem publicar.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="tag oferta">${ativos} ${ativos === 1 ? 'oferta ativa' : 'ofertas ativas'}</span>${ativos ? '<button class="btn btn-linha btn-sm" id="sbEncerrarOfertas">Encerrar todas as ofertas</button>' : ''}</div>
    </div>
    ${comSb.length ? comSb.map(linha).join('') : '<div class="vazio"><b>Nenhum produto com preço no banco</b>Cadastre o preço em 📦 Estoque → Editar.</div>'}`;
}

function painelKits(){
  const kits = D.kits || [];
  return `<div class="box">
      <h2>🧰 Kits</h2>
      <p style="margin-top:0">Monte combos com preço especial (ex.: filtro de óleo + 4 L de óleo). O cliente adiciona o kit inteiro com um toque e no WhatsApp chega cada item do kit.</p>
      <p class="prov" style="font-size:13px">Depois de mexer nos kits, clique em <b>🚀 Publicar no site</b>.</p>
      <button class="btn btn-ouro" id="novoKit">+ Novo kit</button>
    </div>
    ${kits.length ? kits.map(k => { const its = kitItens(k); const ok = kitDisponivel(k); const soma = kitSoma(k);
      return `<div class="ped${k.ativo ? '' : ''}">
        <div class="ped-h"><div><b>🧰 ${esc(k.nome)}</b> <span class="tag ${ok ? 'kit' : 'falta'}" style="margin-left:4px">${ok ? 'Na loja' : (k.ativo ? 'Indisponível' : 'Desligado')}</span></div>
        <div class="est-act"><label class="toggle"><input type="checkbox" data-kitativo="${esc(k.id)}" ${k.ativo ? 'checked' : ''} style="accent-color:var(--bandeira)"> Ativo</label><button class="btn btn-linha btn-sm" data-editkit="${esc(k.id)}">Editar</button><button class="ic-btn" data-delkit="${esc(k.id)}" aria-label="Apagar kit">🗑</button></div></div>
        <ul>${its.map((i, n) => i ? `<li>${(k.itens[n].qtd||1)}x ${esc(i.nome)}${i.p.falta || (i.opc && i.opc.falta) ? ' <b style="color:#E5484D">(em falta)</b>' : ''}</li>` : '<li style="color:#E5484D">Produto apagado do estoque</li>').join('')}</ul>
        <div style="font-size:14px">Separado: <s>${brl(soma)}</s> · <b>Kit: ${brl(k.preco)}</b>${soma > k.preco ? ` · economia de ${brl(soma - k.preco)}` : ''}</div>
        ${k.ativo && !ok ? '<div class="prov">Não aparece na loja porque algum item está em falta ou foi apagado.</div>' : ''}
      </div>`; }).join('') : '<div class="vazio"><b>Nenhum kit ainda</b>Clique em <b>+ Novo kit</b> para montar o primeiro.</div>'}`;
}
function formKit(kit){
  if (!D.produtos.length){ toast('Cadastre produtos no Estoque primeiro.'); return; }
  const novo = !kit; kit = kit ? clone(kit) : { id: uid(), nome:'', descricao:'', itens:[], preco:0, ativo:true };
  const opcoesSel = D.produtos.flatMap(p => (p.opcoes && p.opcoes.length) ? p.opcoes.map((o, i) => [`${p.id}|${i}`, `${p.nome} — ${o.nome} (${brl(o.preco)})`]) : [[`${p.id}|-1`, `${p.nome} (${brl(p.preco)})`]]);
  const linha = (it = {}) => `<div class="kit-row"><select class="in" data-kitprod>${opcoesSel.map(([v, n]) => `<option value="${esc(v)}" ${v === `${it.pid}|${it.oi}` ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><input class="in" data-kitqtd inputmode="numeric" value="${it.qtd || 1}" aria-label="Quantidade"><button type="button" class="ic-btn" data-rmkit aria-label="Tirar item">✕</button></div>`;
  modal(`<h2>${novo ? 'Novo kit' : 'Editar kit'}</h2>
    <form id="fKit">
      <label class="lbl">Nome do kit <i>*</i></label><input class="in" id="kNome" value="${esc(kit.nome)}" placeholder="Ex.: Kit troca de óleo Gol 1.0">
      <label class="lbl">Descrição <small>(opcional)</small></label><textarea class="in" id="kDesc" placeholder="Ex.: Tudo para a troca de óleo completa">${esc(kit.descricao || '')}</textarea>
      <label class="lbl">Itens do kit <small>(produto e quantidade)</small></label>
      <div id="kItens">${(kit.itens.length ? kit.itens : [{}, {}]).map(linha).join('')}</div>
      <button type="button" class="btn btn-linha btn-sm" id="kAdd">+ Acrescentar item</button>
      <div class="sub" style="margin-top:12px">Separado sairia: <b id="kSoma">—</b></div>
      <label class="lbl">Preço do kit (R$) <i>*</i></label><input class="in" id="kPreco" inputmode="decimal" value="${kit.preco ? Number(kit.preco).toFixed(2).replace('.', ',') : ''}" placeholder="Ex.: 169,90">
      <div class="troco-calc" id="kEco"></div>
      <label class="check"><input type="checkbox" id="kAtivo" ${kit.ativo ? 'checked' : ''}> Ativo (aparece na loja)</label>
      <div class="msg-erro hide" id="eKit"></div>
      <div class="acoes-m"><button type="button" class="btn btn-linha" data-fechar>Cancelar</button><button class="btn btn-ouro" type="submit">Salvar kit</button></div>
    </form>`, m => {
    const ler = () => Array.from(m.querySelectorAll('.kit-row')).map(r => { const [pid, oi] = r.querySelector('[data-kitprod]').value.split('|'); return { pid, oi: +oi, qtd: Math.max(1, parseInt(r.querySelector('[data-kitqtd]').value, 10) || 1) }; });
    const calc = () => { const soma = kitSoma({ itens: ler() }); m.querySelector('#kSoma').textContent = brl(soma); const v = parseMoney(m.querySelector('#kPreco').value);
      m.querySelector('#kEco').innerHTML = !isNaN(v) && v < soma ? `O cliente economiza <span style="color:var(--bandeira)">${brl(soma - v)}</span>` : ''; };
    m.querySelector('#kAdd').onclick = () => { m.querySelector('#kItens').insertAdjacentHTML('beforeend', linha()); calc(); };
    m.querySelector('#kItens').addEventListener('click', e => { if (e.target.closest('[data-rmkit]')){ e.target.closest('.kit-row').remove(); calc(); } });
    m.addEventListener('input', calc); m.addEventListener('change', calc); calc();
    m.querySelector('#fKit').onsubmit = e => {
      e.preventDefault(); const er = m.querySelector('#eKit'); const nome = m.querySelector('#kNome').value.trim(); const itens = ler(); const preco = parseMoney(m.querySelector('#kPreco').value);
      if (!nome){ er.textContent = 'Digite o nome do kit.'; er.classList.remove('hide'); return; }
      if (itens.length < 2 && !(itens[0] && itens[0].qtd > 1)){ er.textContent = 'O kit precisa de pelo menos 2 itens.'; er.classList.remove('hide'); return; }
      if (isNaN(preco) || preco <= 0){ er.textContent = 'Digite o preço do kit.'; er.classList.remove('hide'); return; }
      Object.assign(kit, { nome, descricao: m.querySelector('#kDesc').value.trim(), itens, preco: Math.round(preco*100)/100, ativo: m.querySelector('#kAtivo').checked });
      D.kits = D.kits || []; const i = D.kits.findIndex(x => x.id === kit.id); if (i >= 0) D.kits[i] = kit; else D.kits.push(kit);
      salvarRascunho(); fecharModal(); renderPainel(); toast(novo ? 'Kit criado!' : 'Kit atualizado!');
    };
  });
}

/* =================================================================
   NAVEGAÇÃO E EVENTOS
   ================================================================= */
