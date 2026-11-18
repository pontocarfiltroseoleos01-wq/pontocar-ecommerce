'use strict';
/* Ponto Car — navegação entre páginas, eventos (cliques, formulários) e início */

// Cada "rota" antiga agora é uma página
const ROTA_PAGINA = { '': 'index.html', produto: 'produto.html', pedido: 'carrinho.html', resumo: 'carrinho.html#resumo', meus: 'meus-pedidos.html', conta: 'conta.html', painel: 'admin.html' };
function rotaAtual(){
  if (PAGINA === 'carrinho') return location.hash === '#resumo' ? 'resumo' : 'pedido';
  return { loja: '', produto: 'produto', conta: 'conta', meus: 'meus', admin: 'painel' }[PAGINA] ?? '';
}
function ir(h){
  h = h || '';
  if (PAGINA === 'carrinho' && (h === 'pedido' || h === 'resumo')){
    const alvo = h === 'resumo' ? '#resumo' : '';
    if (location.hash !== alvo) history.pushState(null, '', location.pathname + location.search.replace(/[?&]form=1/, '') + alvo);
    rota(); return;
  }
  if (h === rotaAtual() && h !== 'produto'){ rota(); return; }
  let url = ROTA_PAGINA[h] ?? 'index.html';
  if (h === 'conta' && contaVoltar === 'pedido') url = 'conta.html?voltar=pedido';
  if (h === 'pedido' && PAGINA === 'conta' && contaVoltar === 'pedido') url = 'carrinho.html?form=1';
  location.href = url;
}
function rota(){
  const h = rotaAtual();
  const v = { '': 'vLoja', produto: 'vProduto', pedido: 'vPedido', resumo: 'vResumo', painel: 'vPainel', meus: 'vMeus', conta: 'vConta' }[h] || 'vLoja';
  ['vLoja', 'vProduto', 'vPedido', 'vResumo', 'vPainel', 'vMeus', 'vConta'].forEach(id => { const el = $('#' + id); if (el) el.classList.toggle('hide', id !== v); });
  if (v === 'vLoja') renderLoja();
  if (v === 'vProduto'){ if (!prod(detalheAberto)){ $('#fichaIn').innerHTML = '<div class="vazio"><b>Produto não encontrado</b>Ele pode ter saído da loja. <a href="index.html">Ver todos os produtos</a></div>'; } else { renderDetalhe(); document.title = prod(detalheAberto).nome + ' — Ponto Car'; } }
  if (v === 'vPedido'){ renderPedido(); renderCliCheckout(); }
  if (v === 'vResumo') renderResumo();
  if (v === 'vMeus') renderMeus();
  if (v === 'vConta') renderConta();
  if (v === 'vPainel') renderPainel();
  renderLado(); renderCarroBar(); renderCoCarro();
  if (v === 'vLoja' && !carroOk(carro) && !LS.get('pc_carro_visto', false) && !$('#modalHost').innerHTML) setTimeout(abrirCarro, 400);
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', rota);
window.addEventListener('hashchange', rota);

// Busca
if ($('#q')) $('#q').addEventListener('input', e => {
  busca = e.target.value; $('#limparBusca').classList.toggle('hide', !busca);
  if (PAGINA === 'loja') renderLoja();
});
if ($('#q')) $('#q').addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); e.target.blur(); if (PAGINA !== 'loja'){ location.href = 'index.html?q=' + encodeURIComponent(e.target.value.trim()); return; } renderLoja(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
if ($('#limparBusca')) $('#limparBusca').onclick = () => { $('#q').value = ''; busca = ''; $('#limparBusca').classList.add('hide'); renderLoja(); $('#q').focus(); };
if ($('#abrirPainel')) $('#abrirPainel').onclick = () => ir('painel');
if ($('#abrirMeus')) $('#abrirMeus').onclick = () => ir('meus');
if ($('#abrirConta')) $('#abrirConta').onclick = () => { contaVoltar = ''; ir('conta'); };
if ($('#barraBtn')) $('#barraBtn').onclick = () => ir('pedido');

// Cliques gerais
document.addEventListener('click', async e => {
  const cBtn = e.target.closest && e.target.closest('[data-contaaba], #cSair, #cIrConta, #cEsqueci, #cExcluir');
  if (cBtn){
    if (cBtn.dataset.contaaba){ contaAba = cBtn.dataset.contaaba; renderConta(); }
    else if (cBtn.id === 'cSair'){ cliSair(); contaAba = 'entrar'; renderConta(); }
    else if (cBtn.id === 'cIrConta'){ contaVoltar = 'pedido'; ir('conta'); }
    else if (cBtn.id === 'cEsqueci'){
      const em = ($('#cEmail').value || '').trim(); if (!/^\S+@\S+\.\S+$/.test(em)){ mostrarErroCad('Digite o seu e-mail acima e clique de novo em "Esqueci minha senha".'); return; }
      try { await cliAuth('recover?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { email: em }); contaMsg = `Se o e-mail <b>${esc(em)}</b> tiver cadastro, enviamos um link para criar uma nova senha. Confira também o spam.`; renderConta(); }
      catch(err){ mostrarErroCad('Não foi possível enviar o e-mail agora. Fale com a loja pelo WhatsApp para recuperar o acesso.'); }
    }
    else if (cBtn.id === 'cExcluir'){
      if (!(await confirmar('Excluir a sua conta? O seu cadastro (nome, CPF e endereço) será apagado. Não dá para desfazer.', 'Sim, excluir conta', true, 'Não'))) return;
      try { await cliFetch('rpc/excluir_minha_conta', { method: 'POST', body: '{}' }); cliSair(true); toast('Sua conta foi excluída.'); ir(''); }
      catch(err){ toast('Não foi possível excluir agora: ' + err.message); }
    }
    return;
  }
  const nBtn = e.target.closest && e.target.closest('#admNotifAtivar, #admNotifTeste, #admNotifBloq');
  if (nBtn){
    if (nBtn.id === 'admNotifAtivar'){ try { const r = await Notification.requestPermission(); toast(r === 'granted' ? '🔔 Pronto! Os avisos vão aparecer no computador.' : 'Os avisos não foram liberados.'); if (r === 'granted') notificar('✅ Avisos da Ponto Car ativados', 'Quando chegar pedido novo, vai aparecer um aviso assim.'); } catch(err){ toast('Este navegador não aceita avisos.'); } }
    else if (nBtn.id === 'admNotifTeste'){ notificar('🔔 Teste de aviso da Ponto Car', 'Se você está vendo isto, os avisos estão funcionando.'); admBip(); }
    else modal(`<h2>🔕 Avisos bloqueados</h2><p>O navegador está bloqueando os avisos deste site. Para liberar:</p><ol><li>Clique no <b>cadeado 🔒</b> (ou no ícone de ajustes) à esquerda do endereço do site, lá em cima.</li><li>Em <b>Notificações</b>, escolha <b>Permitir</b>.</li><li>Atualize a página.</li></ol><div class="acoes-m"><button class="btn btn-ouro" type="button" data-fechar>Entendi</button></div>`);
    admCarregar(); return;
  }
  const extBtn = e.target.closest && e.target.closest('[data-privacidade], [data-relper], #relCsv');
  if (extBtn){
    if (extBtn.dataset.privacidade !== undefined){ e.preventDefault(); abrirPrivacidade(); }
    else if (extBtn.dataset.relper){ relPeriodo = extBtn.dataset.relper; relDados = null; renderPainel(); }
    else if (extBtn.id === 'relCsv') relBaixarCsv();
    return;
  }
  const sbBtn = e.target.closest && e.target.closest('#sbNovoCupom, [data-sbdelcupom], #sbEncerrarOfertas, #sbSalvarBairros');
  if (sbBtn){
    if (sbBtn.id === 'sbNovoCupom'){
      if (!admSessao()){ toast('Entre primeiro com o e-mail do Supabase (aba 📋 Pedidos).'); return; }
      modal(`<h2>Novo cupom</h2><form id="fSbCupom"><div class="g2"><div><label class="lbl">Código</label><input class="in" id="ncCod" placeholder="Ex.: OLEO10" style="text-transform:uppercase" autocomplete="off"></div><div><label class="lbl">Desconto (%)</label><input class="in" id="ncPct" inputmode="decimal" placeholder="Ex.: 10"></div></div><div class="msg-erro hide" id="eNc"></div><div class="acoes-m"><button type="button" class="btn btn-linha" data-fechar>Cancelar</button><button class="btn btn-ouro" type="submit">Criar cupom</button></div></form>`, m => {
        m.querySelector('#fSbCupom').onsubmit = async ev => { ev.preventDefault(); const er = m.querySelector('#eNc');
          const cod = m.querySelector('#ncCod').value.trim().toUpperCase().replace(/\s+/g, ''); const pct = parseMoney(m.querySelector('#ncPct').value);
          if (!/^[A-Z0-9_-]{3,20}$/.test(cod)){ er.textContent = 'Use de 3 a 20 letras ou números, sem espaço.'; er.classList.remove('hide'); return; }
          if ((admCupons || []).some(c => c.codigo === cod)){ er.textContent = 'Já existe um cupom com esse código.'; er.classList.remove('hide'); return; }
          if (isNaN(pct) || pct <= 0 || pct > 90){ er.textContent = 'O desconto precisa ser entre 1% e 90%.'; er.classList.remove('hide'); return; }
          if (await admGravar('cupons', 'POST', { codigo: cod, pct: Math.round(pct * 100) / 100, ativo: true }, `Cupom ${cod} criado!`)){ fecharModal(); admCarregarCupons(); } };
      });
    }
    else if (sbBtn.dataset.sbdelcupom){ const c = sbBtn.dataset.sbdelcupom; if (await confirmar(`Apagar o cupom <b>${esc(c)}</b>?`, 'Apagar cupom', true, 'Não')){ if (await admGravar(`cupons?codigo=eq.${encodeURIComponent(c)}`, 'DELETE', null, 'Cupom apagado.')) admCarregarCupons(); } }
    else if (sbBtn.id === 'sbEncerrarOfertas'){ if (await confirmar('Encerrar todas as ofertas? Os produtos voltam ao preço normal.', 'Encerrar ofertas', true, 'Não')){ if (await admGravar('pecas?preco_oferta=not.is.null', 'PATCH', { preco_oferta: null }, 'Ofertas encerradas.')){ await sincronizarSupabase(); renderPainel(true); } } }
    else if (sbBtn.id === 'sbSalvarBairros'){
      const lista = Array.from(document.querySelectorAll('#bairrosBox .bairro-row')).map(r => ({ nome: r.querySelector('[data-bnome]').value.trim(), taxa: Math.max(0, Math.round((parseMoney(r.querySelector('[data-btaxa]').value) || 0) * 100) / 100) })).filter(b => b.nome);
      const nomes = lista.map(b => b.nome.toLowerCase()); if (new Set(nomes).size !== nomes.length){ toast('Tem bairro repetido na lista.'); return; }
      let ok = true;
      if (lista.length) ok = await admGravar('bairros?on_conflict=nome', 'POST', lista, null, 'resolution=merge-duplicates,return=minimal');
      if (ok) ok = await admGravar(lista.length ? `bairros?nome=not.in.(${lista.map(b => '"' + b.nome.replace(/"/g, '') + '"').join(',')})` : 'bairros?id=gt.0', 'DELETE', null, null);
      if (ok){ toast(lista.length ? 'Bairros salvos!' : 'Lista de bairros apagada: taxa a combinar.'); await sincronizarSupabase(); renderPainel(true); }
    }
    return;
  }
  const admBtn = e.target.closest && e.target.closest('[data-admst], [data-admdel], [data-admcol], #admAtualizar, #admSair');
  if (admBtn){
    if (admBtn.dataset.admst){ const [id, st] = admBtn.dataset.admst.split('|'); admMudarStatus(id, st); }
    else if (admBtn.dataset.admdel) admExcluir(admBtn.dataset.admdel);
    else if (admBtn.dataset.admcol){ admCol = admBtn.dataset.admcol; $('#admPedidos').innerHTML = admHTML(); }
    else if (admBtn.id === 'admAtualizar') admCarregar();
    else if (admBtn.id === 'admSair'){ ADMS.del(); admLista = null; admUltimoId = null; admErro = ''; renderPainel(); }
    return;
  }
  const pgBtn = e.target.closest && e.target.closest('[data-pagar]');
  if (pgBtn){ pagarMeuPedido(pgBtn.dataset.pagar, pgBtn); return; }
  const mpBtn = e.target.closest && e.target.closest('[data-cancelar], [data-ocultar], #mpAtualizar');
  if (mpBtn){ if (mpBtn.id === 'mpAtualizar') renderMeus(); else if (mpBtn.dataset.ocultar) ocultarMeuPedido(mpBtn.dataset.ocultar); else cancelarMeuPedido(mpBtn.dataset.cancelar); return; }
  const t = e.target.closest('button, a');
  if (!t){ const c = e.target.closest('.card[data-abrir]'); if (c) abrirDetalhe(c.dataset.abrir); return; }
  const d = t.dataset;
  if (d.ir !== undefined){ e.preventDefault(); if (detalheAberto) fecharModal(); ir(d.ir); return; }
  if (d.abrir){ abrirDetalhe(d.abrir); return; }
  if (d.carro !== undefined){ abrirCarro(); return; }
  if (d.encomenda !== undefined){ abrirEncomenda(d.encomenda); return; }
  if (d.repetir !== undefined){ const ok = ultimoCarrinhoValido(); if (ok){ carrinho = ok; LS.set('pc_carrinho', carrinho); toast('Itens do último pedido adicionados!'); ir('pedido'); } return; }
  if (d.esquecer !== undefined){ LS.del('pc_ultimo_carrinho'); renderLoja(); return; }
  if (d.limpartudo !== undefined){ busca = ''; $('#q').value = ''; $('#limparBusca').classList.add('hide'); soMeuCarro = false; renderLoja(); return; }
  if (d.socarro !== undefined){ soMeuCarro = !soMeuCarro; if (rotaAtual() !== '') ir(''); renderCarroBar(); renderLoja(); return; }
  if (d.mais){ if (d.mais.startsWith('kit:')){ if (kitDisponivel(kitPorId(d.mais.slice(4)))) mudarQtd(d.mais, +1); return; } const [pid, oi] = d.mais.split('|'); const p = prod(pid); if (p && !p.falta) mudarQtd(d.mais, +1); return; }
  if (d.menos){ mudarQtd(d.menos, -1); return; }
  if (d.rm){ delete carrinho[d.rm]; LS.set('pc_carrinho', carrinho); renderPedido(); renderLoja(); return; }
  if (d.op){ const [pid, i] = d.op.split('|'); opcaoSel[pid] = +i; renderLoja(); if (detalheAberto) renderDetalhe(); return; }
  if (d.cat !== undefined){ catAtiva = d.cat; renderLoja(); return; }
  if (t.id === 'btnProsseguir'){ formAberto = true; renderPedido(); renderCliCheckout(); setTimeout(() => $('#coForm').scrollIntoView({behavior:'smooth', block:'start'}), 50); return; }
  if (t.id === 'aplicarCupom'){ aplicarCupom(); return; }
  if (t.id === 'copiarChave'){ copiar(D.loja.pixChave, 'Chave Pix copiada!'); return; }
  if (d.copiar === 'chave'){ copiar(D.loja.pixChave, 'Chave Pix copiada!'); return; }
  if (d.copiar === 'pix'){ copiar($('#resumoIn').dataset.pix, 'Código Pix copiado!'); return; }
  if (d.copiar === 'pedido'){ copiar($('#resumoIn').dataset.txt, 'Pedido copiado!'); return; }
  if (t.id === 'novoPedido'){
    carrinho = {}; LS.set('pc_carrinho', carrinho); LS.del('pc_ultimo'); formAberto = false;
    $('#coForm').reset(); $('#fNome').value = ''; LS.del('pc_cliente'); carro = null; soMeuCarro = false; LS.del('pc_carro'); renderCarroBar(); renderCoCarro();
    $$('.erro').forEach(x => x.classList.remove('erro')); $$('.msg-erro').forEach(x => x.classList.add('hide')); mostrarSubPag(); $('#trocoCalc').textContent = '';
    busca = ''; $('#q').value = ''; catAtiva = ''; ir(''); toast('Pronto! Pode começar um novo pedido.'); return;
  }
  // ---- Painel ----
  if (t.id === 'reabrirSenha'){ pedirSenha(); return; }
  if (t.id === 'sairPainel'){ ADMS.del(); painelLiberado = false; admLista = null; admUltimoId = null; location.href = 'index.html'; return; }
  if (d.aba){ abaPainel = d.aba; renderPainel(); return; }
  if (d.fped){ filtroPed = d.fped; renderPainel(); return; }
  if (d.atualizarped !== undefined){ renderPainel(); toast('Pedidos atualizados.'); return; }
  if (d.status){ const [id, s] = d.status.split('|'); const hist = LS.get('pc_pedidos', []); const o = hist.find(x => x.id === id); if (o){ o.status = s; LS.set('pc_pedidos', hist); renderPainel(); } return; }
  if (d.delped){ const hist = LS.get('pc_pedidos', []); const o = hist.find(x => x.id === d.delped);
    if (o && await confirmar(`Excluir o pedido <b>Nº ${esc(o.num)}</b> de <b>${esc(o.nome)}</b>? Ele sai da lista e do resumo de hoje.`, 'Excluir pedido')){ LS.set('pc_pedidos', hist.filter(x => x.id !== o.id)); renderPainel(); toast('Pedido excluído.'); } return; }
  if (t.id === 'addBairro'){ $('#bairrosBox').insertAdjacentHTML('beforeend', `<div class="bairro-row"><input class="in" data-bnome placeholder="Bairro"><input class="in" data-btaxa inputmode="decimal" placeholder="Taxa (ex.: 5,00)"><button type="button" class="ic-btn" data-rmbairro aria-label="Tirar bairro">✕</button></div>`); const ins = $$('#bairrosBox [data-bnome]'); ins[ins.length - 1].focus(); return; }
  if (d.rmbairro !== undefined){ t.closest('.bairro-row').remove(); return; }
  if (d.publicar !== undefined){ publicarNoSite(); return; }
  if (d.conexaogh !== undefined){ abrirConexaoGH(); return; }
  if (t.id === 'novoKit'){ formKit(null); return; }
  if (t.id === 'novoCupom'){
    modal(`<h2>Novo cupom</h2><form id="fCupomNovo"><div class="g2"><div><label class="lbl">Código</label><input class="in" id="ncCod" placeholder="Ex.: OLEO10" style="text-transform:uppercase" autocomplete="off"></div><div><label class="lbl">Desconto (%)</label><input class="in" id="ncPct" inputmode="decimal" placeholder="Ex.: 10"></div></div><div class="msg-erro hide" id="eNc"></div><div class="acoes-m"><button type="button" class="btn btn-linha" data-fechar>Cancelar</button><button class="btn btn-ouro" type="submit">Criar cupom</button></div></form>`, m => {
      m.querySelector('#fCupomNovo').onsubmit = ev => { ev.preventDefault(); const er = m.querySelector('#eNc');
        const cod = m.querySelector('#ncCod').value.trim().toUpperCase().replace(/\s+/g, ''); const pct = parseMoney(m.querySelector('#ncPct').value);
        if (!/^[A-Z0-9_-]{3,20}$/.test(cod)){ er.textContent = 'Use de 3 a 20 letras ou números, sem espaço.'; er.classList.remove('hide'); return; }
        if ((D.cupons || []).some(c => c.codigo === cod)){ er.textContent = 'Já existe um cupom com esse código.'; er.classList.remove('hide'); return; }
        if (isNaN(pct) || pct <= 0 || pct > 90){ er.textContent = 'O desconto precisa ser entre 1% e 90%.'; er.classList.remove('hide'); return; }
        D.cupons = D.cupons || []; D.cupons.push({ codigo: cod, pct: Math.round(pct * 100) / 100, ativo: true }); salvarRascunho(); fecharModal(); renderPainel(); toast(`Cupom ${cod} criado!`); };
    }); return; }
  if (d.delcupom){ if (await confirmar(`Apagar o cupom <b>${esc(d.delcupom)}</b>?`, 'Apagar cupom')){ D.cupons = (D.cupons || []).filter(c => c.codigo !== d.delcupom); salvarRascunho(); renderPainel(); toast('Cupom apagado.'); } return; }
  if (d.editkit){ formKit(kitPorId(d.editkit)); return; }
  if (d.delkit){ const k = kitPorId(d.delkit); if (k && await confirmar(`Apagar o kit <b>${esc(k.nome)}</b>?`, 'Apagar kit')){ D.kits = D.kits.filter(x => x.id !== k.id); salvarRascunho(); renderPainel(); toast('Kit apagado.'); } return; }
  if (t.id === 'encerrarOfertas'){ if (await confirmar('Encerrar todas as ofertas? Os produtos voltam ao preço normal.', 'Encerrar ofertas')){ D.produtos.forEach(p => { p.oferta = false; }); salvarRascunho(); renderPainel(); toast('Ofertas encerradas.'); } return; }
  if (t.id === 'novoProd'){ if (!D.categorias.length){ toast('Crie uma categoria primeiro.'); return; } formProduto(null); return; }
  if (d.editar){ formProduto(prod(d.editar)); return; }
  if (d.delprod){ const p = prod(d.delprod); if (p && await confirmar(`Tirar <b>${esc(p.nome)}</b> do estoque?`, 'Tirar produto')){ D.produtos = D.produtos.filter(x => x.id !== p.id); salvarRascunho(); renderPainel(); toast('Produto removido.'); } return; }
  if (d.movcat){ const [i, dir] = d.movcat.split('|').map(Number); const j = i + dir; if (j >= 0 && j < D.categorias.length){ [D.categorias[i], D.categorias[j]] = [D.categorias[j], D.categorias[i]]; salvarRascunho(); renderPainel(); } return; }
  if (d.delcat){ const c = D.categorias.find(x => x.id === d.delcat); const n = D.produtos.filter(p => p.cat === c.id).length;
    if (await confirmar(n ? `A categoria <b>${esc(c.nome)}</b> tem ${n} produto(s). Apagar a categoria <b>e os produtos dela</b>?` : `Apagar a categoria <b>${esc(c.nome)}</b>?`, 'Apagar')){
      D.categorias = D.categorias.filter(x => x.id !== c.id); D.produtos = D.produtos.filter(p => p.cat !== c.id); salvarRascunho(); renderPainel(); } return; }
  if (t.id === 'salvarEstoque'){
    if (!D.atualizado) D.atualizado = Date.now(); LS.set('pc_rascunho', semSupabase(D));
    try { const blob = new Blob([arquivoEstoque()], {type:'text/javascript'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'estoque.js'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('estoque.js gerado! Agora suba no GitHub.'); }
    catch(err){ copiar(arquivoEstoque(), 'Conteúdo copiado!'); }
    return;
  }
  if (t.id === 'copiarEstoque'){ if (!D.atualizado) D.atualizado = Date.now(); LS.set('pc_rascunho', semSupabase(D)); copiar(arquivoEstoque(), 'Conteúdo do estoque.js copiado!'); return; }
  if (t.id === 'zerarNum'){
    if (!admSessao()){ toast('Entre primeiro na aba 📋 Pedidos com o e-mail do Supabase.'); return; }
    if (!(await confirmar('Recomeçar a numeração? O próximo pedido de <b>qualquer cliente</b> será o <b>Nº 01</b>.', 'Recomeçar do 01', false, 'Não'))) return;
    try { await admFetch('rpc/reiniciar_numeracao_pedidos', { method: 'POST', body: '{}' }); toast('Numeração recomeçada: o próximo pedido é o Nº 01.'); }
    catch(e){ toast(e.message === 'LOGIN' ? 'Entre de novo na aba 📋 Pedidos.' : e.message); }
    carregarProximoNumero(); return;
  }
  if (t.id === 'apagarHist'){ if (await confirmar('Apagar todos os pedidos guardados neste aparelho? Isso não pode ser desfeito.', 'Apagar histórico')){ LS.set('pc_pedidos', []); toast('Histórico apagado.'); renderPainel(); } return; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'fCupom'){ e.preventDefault(); aplicarCupom(); return; } if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card[data-abrir]')){ e.preventDefault(); abrirDetalhe(e.target.dataset.abrir); } if (e.key === 'Escape' && $('#modalHost').innerHTML && !$('#senhaIn')) fecharModal(); });
// Mudanças em campos do painel e do formulário
document.addEventListener('change', async e => {
  const tg = e.target;
  if (tg.id === 'fPriv'){ if (tg.checked) $('#ePriv').classList.add('hide'); return; }
  if (tg.id === 'cCep'){ buscarCep(); return; }
  if (tg.id === 'sbEstMin'){ const q = parseInt(tg.value.replace(/\D/g, ''), 10); if (isNaN(q)){ toast('Digite só números.'); renderPainel(true); return; }
    if (await admGravar('loja_config?id=eq.1', 'PATCH', { estoque_minimo: q }, `Alerta de estoque: ${q} un. ou menos.`)) await sincronizarSupabase(); renderPainel(true); return; }
  if (tg.dataset && (tg.dataset.sbpreco || tg.dataset.sbqtd || tg.dataset.sboferta || tg.dataset.sbcupomativo) || tg.id === 'sbPixDesc'){
    if (tg.dataset.sbpreco){ const v = parseMoney(tg.value); if (isNaN(v) || v <= 0){ toast('Digite um preço válido (ex.: 29,90).'); renderPainel(true); return; } admSalvarPeca(tg.dataset.sbpreco, { preco: Math.round(v * 100) / 100 }, `Preço salvo: ${brl(v)}`); }
    else if (tg.dataset.sbqtd){ const q = parseInt(tg.value.replace(/\D/g, ''), 10); if (isNaN(q)){ toast('Digite só números no estoque.'); renderPainel(true); return; } admSalvarPeca(tg.dataset.sbqtd, { estoque: q }, `Estoque salvo: ${q} un.`); }
    else if (tg.dataset.sboferta){ const v = parseMoney(tg.value); const ss = sbPecas && sbPecas[codNorm(tg.dataset.sboferta)];
      if (tg.value.trim() === '' || isNaN(v) || v <= 0) admSalvarPeca(tg.dataset.sboferta, { preco_oferta: null }, 'Oferta encerrada.');
      else if (ss && v >= Number(ss.preco)){ toast('O preço da oferta precisa ser menor que o preço normal.'); renderPainel(true); }
      else admSalvarPeca(tg.dataset.sboferta, { preco_oferta: Math.round(v * 100) / 100 }, `Oferta salva: ${brl(v)}`); }
    else if (tg.dataset.sbcupomativo){ const c = tg.dataset.sbcupomativo; if (await admGravar(`cupons?codigo=eq.${encodeURIComponent(c)}`, 'PATCH', { ativo: tg.checked }, tg.checked ? 'Cupom ligado.' : 'Cupom desligado.')) admCarregarCupons(); else renderPainel(true); }
    else if (tg.id === 'sbPixDesc'){ const v = parseMoney(tg.value); const pct = isNaN(v) ? 0 : Math.max(0, Math.min(90, Math.round(v * 100) / 100));
      if (await admGravar('loja_config?id=eq.1', 'PATCH', { desconto_pix: pct }, pct ? `Desconto no Pix: ${pct}%` : 'Sem desconto no Pix.')) await sincronizarSupabase(); renderPainel(true); }
    return;
  }
  const t = e.target;
  if (t.dataset.cupomativo){ const c = (D.cupons || []).find(x => x.codigo === t.dataset.cupomativo); if (c){ c.ativo = t.checked; salvarRascunho(); renderPainel(); toast(t.checked ? 'Cupom ligado.' : 'Cupom desligado.'); } return; }
  if (t.id === 'filtroPed'){ filtroPed = t.value; renderPainel(); return; }
  if (t.dataset.statussel){ const hist = LS.get('pc_pedidos', []); const o = hist.find(x => x.id === t.dataset.statussel); if (o){ o.status = t.value; LS.set('pc_pedidos', hist); renderPainel(); toast(`Pedido Nº ${o.num}: ${t.value}`); } return; }
  if (t.dataset.qtdest){
    const p = prod(t.dataset.qtdest); if (!p) return;
    const txt = t.value.trim();
    if (txt === ''){ delete p.qtdEstoque; salvarRascunho(); renderPainel(); toast('Quantidade apagada.'); return; }
    const q = parseInt(txt.replace(/\D/g, ''), 10);
    if (isNaN(q)){ toast('Digite só números na quantidade.'); t.value = p.qtdEstoque != null ? p.qtdEstoque : ''; return; }
    p.qtdEstoque = q;
    if (q === 0 && !p.falta){ p.falta = true; toast('Estoque zerado: o produto ficou em falta.'); }
    else if (q > 0 && p.falta){ p.falta = false; toast(`Estoque: ${q} un. O produto voltou a ficar disponível.`); }
    else toast(`Estoque: ${q} un.`);
    salvarRascunho(); renderPainel(); return;
  }
  if (t.id === 'cPixDesc'){ const v = parseMoney(t.value); D.loja.descontoPix = isNaN(v) ? 0 : Math.max(0, Math.min(90, Math.round(v * 100) / 100)); salvarRascunho(); renderPainel(); toast(D.loja.descontoPix ? `Desconto no Pix: ${D.loja.descontoPix}%` : 'Sem desconto no Pix.'); return; }
  if (t.dataset.kitativo){ const k = kitPorId(t.dataset.kitativo); if (k){ k.ativo = t.checked; salvarRascunho(); renderPainel(); toast(t.checked ? 'Kit ligado.' : 'Kit desligado.'); } return; }
  if (t.dataset.promoativo){ const p = prod(t.dataset.promoativo); if (p){ p.oferta = t.checked; salvarRascunho(); renderPainel(); toast(t.checked ? (temOferta(p) ? 'Oferta ligada!' : 'Agora digite o preço da oferta.') : 'Oferta desligada.'); } return; }
  if (t.dataset.promopreco){ const p = prod(t.dataset.promopreco); if (p){ const v = parseMoney(t.value); p.precoOferta = isNaN(v) ? 0 : Math.round(v*100)/100; if (p.precoOferta) p.oferta = true; salvarRascunho(); renderPainel(); toast(temOferta(p) ? 'Oferta salva!' : 'O preço da oferta precisa ser menor que o normal.'); } return; }
  if (t.dataset.promoopt){ const [id, i] = t.dataset.promoopt.split('|'); const p = prod(id); const o = p && p.opcoes[+i]; if (o){ const v = parseMoney(t.value); o.precoOferta = isNaN(v) ? 0 : Math.round(v*100)/100; if (o.precoOferta) p.oferta = true; salvarRascunho(); renderPainel(); toast(precoOferta(p, o) ? 'Oferta salva!' : 'O preço da oferta precisa ser menor que o normal.'); } return; }
  if (t.dataset.maisvendido){ const p = prod(t.dataset.maisvendido); if (p){ p.maisVendido = t.checked; salvarRascunho(); renderPainel(); toast(t.checked ? 'Selo ⭐ Mais vendido ligado.' : 'Selo Mais vendido tirado.'); } return; }
  if (t.dataset.falta){ const p = prod(t.dataset.falta); if (p){ p.falta = t.checked; salvarRascunho(); renderPainel(); toast(t.checked ? 'Marcado como em falta.' : 'Disponível de novo.'); } return; }
  if (t.dataset.rencat){ const c = D.categorias.find(x => x.id === t.dataset.rencat); const v = t.value.trim(); if (c && v){ c.nome = v; salvarRascunho(); renderPainel(); toast('Categoria renomeada.'); } return; }
  if (t.name === 'pag'){ mostrarSubPag(); renderValores(); atualizarTroco(); return; }
  if (t.name === 'receber'){ renderEntregaSub(); renderValores(); atualizarTroco(); return; }
  if (t.id === 'fBairro'){ if (t.value !== '') { $('#eBairro').classList.add('hide'); t.classList.remove('erro'); } renderValores(); atualizarTroco(); return; }
  if (t.name === 'lemMeses'){ renderLembrete(); return; }
  if (t.name === 'cartao'){ $('#eCartao').classList.add('hide'); return; }
  if (t.id === 'fSemTroco'){ atualizarTroco(); return; }
});
document.addEventListener('input', e => {
  if (e.target.id === 'fTroco') atualizarTroco();
  if (e.target.classList.contains('erro') && e.target.value.trim()) e.target.classList.remove('erro');
  if (e.target.id === 'fNome' && e.target.value.trim().length >= 2) $('#eNome').classList.add('hide');
  if (e.target.id === 'cCpf'){ const p = e.target.selectionStart === e.target.value.length; e.target.value = cpfMask(e.target.value); }
  if (e.target.id === 'cCep' && soDig(e.target.value).length === 8) buscarCep();
  if (e.target.id === 'fTel' && e.target.value.replace(/\D/g, '').length >= 10) $('#eTel').classList.add('hide');
  if (e.target.id === 'fEndereco' && e.target.value.trim().length >= 5) $('#eEndereco').classList.add('hide');
});
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'coForm') return finalizar(e);
  if (f.id === 'fCliEntrar' || f.id === 'fCliCriar' || f.id === 'fCliCompletar' || f.id === 'fCliEditar' || f.id === 'fNovaSenha'){
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); const txt = btn.textContent; btn.disabled = true; btn.textContent = 'Aguarde…';
    try {
      if (f.id === 'fCliEntrar'){
        const j = await cliAuth('token?grant_type=password', { email: $('#cEmail').value.trim(), password: $('#cSenha').value }); cliGuardar(j);
        await cliCarregarCadastro(); toast('Você entrou na sua conta!'); if (!voltarDaConta()) renderConta();
      } else if (f.id === 'fCliCriar'){
        const { d, er } = lerCadastro(true); if (er.length) throw new Error('Confira: ' + er.join(', ') + '.');
        const email = $('#cEmail').value.trim();
        const j = await cliAuth('signup', { email, password: $('#cSenha').value, data: { nome: d.nome } });
        if (!j.access_token){ contaAba = 'entrar'; contaMsg = `Conta criada! Enviamos um e-mail de confirmação para <b>${esc(email)}</b>. Confirme e depois entre aqui para completar o cadastro.`; renderConta(); return; }
        cliGuardar(j);
        try { await salvarCadastro(Object.assign({ email }, d), true); }
        catch(err2){ cliCad = null; await cliCarregarCadastro(); renderConta(); setTimeout(() => mostrarErroCad(traduzErro(err2.message)), 50); return; }
        toast('Conta criada! 🎉'); if (!voltarDaConta()){ contaMsg = 'Conta criada com sucesso!'; renderConta(); }
      } else if (f.id === 'fCliCompletar' || f.id === 'fCliEditar'){
        const { d, er } = lerCadastro(false); if (er.length) throw new Error('Confira: ' + er.join(', ') + '.');
        await salvarCadastro(d, f.id === 'fCliCompletar'); toast('Cadastro salvo!');
        if (!voltarDaConta()){ contaMsg = 'Dados salvos.'; renderConta(); }
      } else if (f.id === 'fNovaSenha'){
        const nv = $('#cNova').value; if (nv.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        const tk = await cliToken(); await cliAuth('user', { password: nv }, { method: 'PUT', headers: { Authorization: 'Bearer ' + tk } });
        contaRecuperar = false; contaMsg = 'Senha alterada com sucesso!'; renderConta();
      }
    } catch(err){ mostrarErroCad(traduzErro(err.message)); }
    if (document.body.contains(btn)){ btn.disabled = false; btn.textContent = txt; }
    return;
  }
  if (f.id === 'fAdmLogin'){
    e.preventDefault(); const er = $('#eAdm'); const btn = $('#admEntrar');
    const email = $('#admEmail').value.trim(), senha = $('#admSenha').value;
    if (!email || !senha){ er.textContent = 'Digite o e-mail e a senha.'; er.classList.remove('hide'); return; }
    btn.disabled = true; btn.textContent = 'Entrando…';
    try { await admAuth({ email, password: senha }, 'password'); admErro = ''; admLista = null; admUltimoId = null; renderPainel(); }
    catch(err){ er.textContent = err.message; er.classList.remove('hide'); btn.disabled = false; btn.textContent = 'Entrar'; }
    return;
  }
  if (f.id === 'fNovaCat'){ e.preventDefault(); const n = $('#novaCatNome').value.trim(); if (!n) return; let id = norm(n).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || uid(); if (D.categorias.find(c => c.id === id)) id += '-' + uid().slice(0,3); D.categorias.push({ id, nome: n }); salvarRascunho(); renderPainel(); toast('Categoria criada!'); return; }
  if (f.id === 'fTrocaSenha'){ e.preventDefault(); const er = $('#eTroca'); const a = $('#sAtual').value, n1 = $('#sNova').value, n2 = $('#sNova2').value;
    if (sha256(a) !== D.loja.senhaHash){ er.textContent = 'A senha atual está errada.'; er.classList.remove('hide'); return; }
    if (n1.length < 4){ er.textContent = 'A nova senha precisa ter pelo menos 4 caracteres.'; er.classList.remove('hide'); return; }
    if (n1 !== n2){ er.textContent = 'As duas novas senhas não são iguais.'; er.classList.remove('hide'); return; }
    D.loja.senhaHash = sha256(n1); salvarRascunho(); renderPainel(); toast('Senha trocada! Salve o estoque para valer em todos os aparelhos.'); return; }
  if (f.id === 'fLoja'){ e.preventDefault(); const zp = id => { let d = $(id).value.replace(/\D/g,''); if (d && d.length <= 11) d = '55' + d; return d; };
    D.loja.whatsapp = [zp('#cZap1'), zp('#cZap2')].filter(Boolean); D.loja.pixChave = $('#cPix').value.trim(); D.loja.pixTipo = $('#cPixTipo').value;
    D.loja.pixNome = $('#cPixNome').value.trim() || 'PONTO CAR'; D.loja.pixCidade = $('#cPixCidade').value.trim() || 'SAO PAULO'; D.loja.frase = $('#cFrase').value.trim() || 'O ponto certo do seu carro'; D.loja.endereco = $('#cEnd').value.trim(); D.loja.horario = $('#cHor').value.trim(); D.loja.horarios = {}; [0,1,2,3,4,5,6].forEach(dd => { const on = document.querySelector(`[data-hordia="${dd}"]`).checked; const a = document.querySelector(`[data-horini="${dd}"]`).value, b = document.querySelector(`[data-horfim="${dd}"]`).value; D.loja.horarios[dd] = on && a && b && paraMin(b) > paraMin(a) ? [a, b] : null; });
    D.loja.bairros = Array.from(document.querySelectorAll('.bairro-row')).map(r => ({ nome: r.querySelector('[data-bnome]').value.trim(), taxa: Math.max(0, Math.round((parseMoney(r.querySelector('[data-btaxa]').value) || 0) * 100) / 100) })).filter(b => b.nome);
    D.loja.instagram = $('#cInsta').value.trim(); D.loja.facebook = $('#cFace').value.trim(); D.loja.tiktok = $('#cTiktok').value.trim();
    $('#pixChaveTxt').textContent = D.loja.pixChave; salvarRascunho(); renderPainel(); toast('Dados da loja salvos!'); return; }
});

/* ---------- Início ---------- */
setInterval(() => { if (temHorarios() && PAGINA === 'loja'){ renderCarroBar(); renderLoja(); } }, 60000);
if ($('#pixChaveTxt')) $('#pixChaveTxt').textContent = D.loja.pixChave;// Parâmetros da página (?q= na vitrine, ?id= no produto, ?form=1 no carrinho, ?voltar=pedido na conta)
const QS = new URLSearchParams(location.search);
if (PAGINA === 'loja' && QS.get('q')){ busca = QS.get('q'); $('#q').value = busca; $('#limparBusca').classList.remove('hide'); }
if (PAGINA === 'produto') detalheAberto = QS.get('id');
if (PAGINA === 'carrinho' && QS.get('form') === '1') formAberto = true;
if (PAGINA === 'conta' && QS.get('voltar') === 'pedido') contaVoltar = 'pedido';
mostrarSubPag();
rota();
sincronizarSupabase();
cliCarregarCadastro();
