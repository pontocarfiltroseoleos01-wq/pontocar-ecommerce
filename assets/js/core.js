'use strict';
/* Ponto Car — utilidades, dados da loja (estoque.js), modais, avisos e política de privacidade */

/* =================================================================
   PONTO CAR — loja de filtros e óleos
   ================================================================= */
'use strict';
const API_CONTADOR = 'https://abacus.jasoncameron.dev';
const PAGINA = document.body.dataset.pagina || 'loja';  // loja | produto | carrinho | conta | meus | admin
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl = n => (Number(n)||0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const pad = n => String(n).padStart(2, '0');
const uid = () => Math.random().toString(36).slice(2, 9);
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function parseMoney(s){
  s = String(s ?? '').trim().replace(/[^\d,.\-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s);
}
function fone(n){ const d = String(n).replace(/\D/g,'').replace(/^55/, ''); return d.length === 11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : d; }

/* ---------- SHA-256 (senha do painel) ---------- */
function sha256(ascii){
  function rr(v,a){return (v>>>a)|(v<<(32-a));}
  ascii = unescape(encodeURIComponent(ascii));
  const mp = Math.pow, maxWord = mp(2,32); let i,j,result=''; const words=[]; const bitLen = ascii.length*8;
  let hash=[], k=[]; let pc=0; const isComp={};
  for (let c=2; pc<64; c++){ if(!isComp[c]){ for(i=0;i<313;i+=c) isComp[i]=c; hash[pc]=(mp(c,.5)*maxWord)|0; k[pc++]=(mp(c,1/3)*maxWord)|0; } }
  ascii += '\x80'; while (ascii.length%64 - 56) ascii += '\x00';
  for (i=0;i<ascii.length;i++){ j=ascii.charCodeAt(i); words[i>>2] |= j << ((3-i)%4)*8; }
  words[words.length] = ((bitLen/maxWord)|0); words[words.length] = bitLen;
  for (j=0;j<words.length;){
    const w = words.slice(j, j+=16); const old = hash; hash = hash.slice(0,8);
    for (i=0;i<64;i++){
      const w15=w[i-15], w2=w[i-2], a=hash[0], e=hash[4];
      const t1 = hash[7] + (rr(e,6)^rr(e,11)^rr(e,25)) + ((e&hash[5])^((~e)&hash[6])) + k[i]
        + (w[i] = (i<16) ? w[i] : (w[i-16] + (rr(w15,7)^rr(w15,18)^(w15>>>3)) + w[i-7] + (rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
      const t2 = (rr(a,2)^rr(a,13)^rr(a,22)) + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash = [(t1+t2)|0].concat(hash); hash[4] = (hash[4]+t1)|0;
    }
    for (i=0;i<8;i++) hash[i] = (hash[i]+old[i])|0;
  }
  for (i=0;i<8;i++) for (j=3;j+1;j--){ const b=(hash[i]>>(j*8))&255; result += ((b<16)?'0':'') + b.toString(16); }
  return result;
}

/* ---------- Dados (estoque.js + rascunho do dono) ---------- */
const PADRAO = {
  atualizado: 0,
  loja: { nome:'Ponto Car', frase:'O ponto certo do seu carro', whatsapp:['5516994253489','5516992029422'],
    pixChave:'16994253489', pixTipo:'telefone', pixNome:'PONTO CAR', pixCidade:'SAO PAULO',
    senhaHash:'ed946f65d2c785d90e827c5ffd879ce3b49c68d4c88013074176a7e73bc58bcf', contador:'pontocar-cab15a8fdab7', endereco:'', horario:'', instagram:'', facebook:'', tiktok:'', descontoPix:0, horarios:null, bairros:[] },
  categorias: [], produtos: []
};
const BASE = window.PONTOCAR ? clone(window.PONTOCAR) : clone(PADRAO);
BASE.loja = Object.assign({}, PADRAO.loja, BASE.loja || {});
BASE.categorias = BASE.categorias || []; BASE.produtos = BASE.produtos || []; BASE.kits = BASE.kits || []; BASE.cupons = BASE.cupons || [];
let D;
(function carregar(){
  const r = LS.get('pc_rascunho', null);
  if (r && (r.atualizado||0) > (BASE.atualizado||0)) { D = r; D.loja = Object.assign({}, PADRAO.loja, D.loja||{}); }
  else { D = clone(BASE); if (r) LS.del('pc_rascunho'); }
  D.kits = D.kits || []; D.cupons = D.cupons || [];
})();
const temPendente = () => (D.atualizado||0) > Math.max(BASE.atualizado||0, LS.get('pc_publicado', 0)||0);
function salvarRascunho(){ D.atualizado = Date.now(); if (!LS.set('pc_rascunho', semSupabase(D))) toast('A memória deste aparelho encheu. Clique em 🚀 Publicar no site agora e use fotos menores.'); renderLoja(); }
/* Foto do computador: reduz e transforma em texto (vai junto no estoque.js) */
function lerImagem(file){
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('tipo'));
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const max = 600; const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}

const catNome = id => (D.categorias.find(c => c.id === id) || {}).nome || 'Outros';
const prod = id => D.produtos.find(p => p.id === id);

/* ---------- Redes sociais ---------- */
const REDES = [
  { k:'instagram', nome:'Instagram', ico:'📸', url: h => 'https://www.instagram.com/' + h },
  { k:'facebook',  nome:'Facebook',  ico:'👍', url: h => 'https://www.facebook.com/' + h },
  { k:'tiktok',    nome:'TikTok',    ico:'🎵', url: h => 'https://www.tiktok.com/@' + h }
];
function redeLink(r, v){ v = String(v || '').trim(); if (!v) return ''; if (/^https?:\/\//i.test(v)) return v; v = v.replace(/^@/, '').replace(/^(www\.)?(instagram|facebook|tiktok)\.com\/@?/i, '').replace(/\/+$/, ''); return v ? r.url(v) : ''; }
function redeNome(v){ v = String(v || '').trim(); const m = v.match(/(?:\.com\/)@?([^\/?#]+)/); return '@' + (m ? m[1] : v.replace(/^@/, '')); }
function redesHTML(){
  return REDES.filter(r => D.loja[r.k]).map(r => `<a class="rede" target="_blank" rel="noopener" href="${esc(redeLink(r, D.loja[r.k]))}"><span>${r.ico}</span> ${r.nome} <small>${esc(redeNome(D.loja[r.k]))}</small></a>`).join('');
}
function mapaLink(){ return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(D.loja.endereco || ''); }
function zapLink(texto, i = 0){ const n = (D.loja.whatsapp[i] || D.loja.whatsapp[0] || '').replace(/\D/g,''); return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`; }

/* ---------- Política de privacidade (LGPD) ---------- */
function textoPrivacidade(){
  const L = D.loja; const zaps = (L.whatsapp || []).filter(Boolean).map(fone);
  const contato = zaps.length ? `pelo WhatsApp ${zaps.map(esc).join(' ou ')}` : 'pelos nossos canais de atendimento';
  return `<div class="priv-txt">
    <p><b>Última atualização:</b> 17/11/2026</p>
    <h3>1. Quem somos</h3>
    <p>A <b>Ponto Car</b>${L.endereco ? ` (${esc(L.endereco)})` : ''} é a responsável (controladora) pelos dados pessoais coletados neste site, nos termos da Lei Geral de Proteção de Dados — Lei nº 13.709/2018 (LGPD).</p>
    <h3>2. Quais dados coletamos</h3>
    <p>Quando você faz um pedido, coletamos:</p>
    <ul><li>no <b>cadastro</b>: nome completo, CPF, e-mail, telefone e endereço; a senha fica guardada de forma criptografada e nem a loja consegue vê-la;</li><li>no <b>pedido</b>: dados do carro (marca, modelo, ano, versão), itens, forma de pagamento escolhida, cupom, endereço de entrega e observações.</li></ul>
    <p>O <b>CPF</b> é usado para identificar quem fez a compra, evitar fraudes e emitir a nota fiscal. Não pedimos dados de cartão: o pagamento é feito na entrega, na retirada ou por Pix direto para a loja.</p>
    <h3>3. Para que usamos</h3>
    <ul><li>criar e manter a sua conta de cliente;</li><li>registrar, separar e entregar o seu pedido;</li><li>emitir nota fiscal;</li><li>conferir se as peças servem no seu carro;</li><li>falar com você sobre o pedido (telefone ou WhatsApp);</li><li>cumprir obrigações legais, como as fiscais e as do Código de Defesa do Consumidor;</li><li>proteger o site contra pedidos falsos.</li></ul>
    <p>Fazemos isso com base na execução do contrato de compra (art. 7º, V, da LGPD), no cumprimento de obrigação legal (art. 7º, II) e no legítimo interesse de prevenir fraudes (art. 7º, IX). <b>Não vendemos seus dados</b> e não os usamos para propaganda sem a sua autorização.</p>
    <h3>4. Com quem os dados são compartilhados</h3>
    <ul><li><b>Supabase</b>: serviço onde fica o banco de dados dos pedidos. Os servidores podem ficar fora do Brasil, com as garantias previstas no art. 33 da LGPD.</li><li><b>GitHub Pages</b>: serviço que hospeda este site.</li><li><b>Google Fonts</b>: o site carrega as letras (fontes) do Google, que pode receber o endereço IP do seu aparelho.</li><li><b>WhatsApp</b>: só quando você escolhe falar com a loja por lá.</li><li>Autoridades públicas, quando a lei exigir.</li></ul>
    <h3>5. Dados guardados no seu aparelho</h3>
    <p>Para facilitar, o site guarda no navegador do <b>seu</b> aparelho o carrinho, o acesso à sua conta (para você não precisar entrar toda vez) e a lista dos seus pedidos. Você pode apagar tudo limpando os dados do navegador. Não usamos cookies de propaganda nem de rastreamento.</p>
    <h3>6. Por quanto tempo guardamos</h3>
    <p>Pelo tempo necessário para atender o pedido e cumprir obrigações legais (por exemplo, prazos fiscais e de garantia). Depois disso, os dados são apagados ou anonimizados.</p>
    <h3>7. Seus direitos</h3>
    <p>Pelo art. 18 da LGPD, você pode pedir: confirmação de que tratamos seus dados; acesso a eles; correção de dados incompletos ou errados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre com quem compartilhamos; e revisão desta política. Você pode ver e corrigir os seus dados em <b>👤 Minha conta</b> e também <b>excluir a sua conta</b> por lá. Para os demais pedidos, fale com a gente ${contato}. Você também pode reclamar na Autoridade Nacional de Proteção de Dados (ANPD).</p>
    <h3>8. Segurança</h3>
    <p>Só a loja, com login e senha, consegue ver os pedidos. O site usa conexão segura (HTTPS) e regras no banco de dados que impedem uma pessoa de ver os dados de outra.</p>
    <h3>9. Mudanças nesta política</h3>
    <p>Se esta política mudar, a nova versão será publicada nesta página, com a data atualizada.</p>
  </div>`;
}
function abrirPrivacidade(){ modal(`<h2>🔒 Política de Privacidade</h2>${textoPrivacidade()}<div class="acoes-m"><button class="btn btn-ouro" type="button" data-fechar>Entendi</button></div>`); }

/* ---------- Utilidades de UI ---------- */
let tToast;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('on'), 2600); }
async function copiar(texto, msg = 'Copiado!'){
  try { await navigator.clipboard.writeText(texto); toast(msg); return; } catch(e){}
  try { const ta = document.createElement('textarea'); ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (ok){ toast(msg); return; } } catch(e){}
  modal(`<h2>Copie o texto</h2><p style="color:var(--muted);margin-top:0">Segure no texto e escolha “Copiar”.</p><textarea class="in" style="min-height:220px" readonly>${esc(texto)}</textarea><div class="acoes-m"><button class="btn btn-ouro" data-fechar>Fechar</button></div>`);
}
function modal(html, onAbrir){
  const host = $('#modalHost');
  host.innerHTML = `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const bg = host.firstElementChild;
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-fechar]')) fecharModal(); });
  if (onAbrir) onAbrir(bg.firstElementChild);
  const f = bg.querySelector('input,textarea,select,button'); if (f) setTimeout(() => f.focus(), 30);
  return bg.firstElementChild;
}
function fecharModal(){ $('#modalHost').innerHTML = ''; if (PAGINA !== 'produto') detalheAberto = null; }
function confirmar(msg, sim = 'Sim', perigo = true, nao = 'Cancelar'){
  return new Promise(res => {
    modal(`<h2>Confirmar</h2><p>${msg}</p><div class="acoes-m"><button class="btn btn-linha" data-r="0">${esc(nao)}</button><button class="btn ${perigo ? 'btn-perigo' : 'btn-ouro'}" data-r="1">${esc(sim)}</button></div>`, m => {
      m.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { fecharModal(); res(b.dataset.r === '1'); });
    });
  });
}
