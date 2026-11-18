# Ponto Car — loja virtual

Loja de filtros e óleos da **Ponto Car** ("O ponto certo do seu carro").
Site estático hospedado no **GitHub Pages**, com pedidos, clientes, preços e estoque no **Supabase**.

## Estrutura

```
/pontocar-ecommerce/
│
├── index.html            # Vitrine principal (peças, óleos, filtros, kits e busca)
├── produto.html          # Detalhes da peça e compatibilidade (produto.html?id=...)
├── carrinho.html         # Carrinho, fechamento do pedido e confirmação (#resumo)
├── conta.html            # Minha conta: entrar, criar conta (e-mail, CPF, endereço)
├── meus-pedidos.html     # Pedidos do cliente (acompanhar e cancelar)
├── admin.html            # Painel administrativo (acesso só com o login da loja)
├── estoque.js            # Catálogo: nomes, fotos, descrições, aplicações, kits e dados da loja
│
├── /assets/
│   ├── /css/
│   │   ├── variables.css # Cores, fontes e variáveis globais
│   │   ├── style.css     # Estilos gerais da vitrine
│   │   └── admin.css     # Estilos do painel admin
│   ├── /js/
│   │   ├── core.js       # Utilidades, dados da loja, modais, avisos e política de privacidade
│   │   ├── supabase.js   # Conexão com o banco: preço/estoque, login do cliente e da loja
│   │   ├── catalog.js    # Carregamento de produtos, busca, filtros, kits, ficha e escolha do carro
│   │   ├── cart.js       # Carrinho (localStorage), fechamento do pedido, Pix e confirmação
│   │   ├── conta.js      # Cadastro do cliente e Meus pedidos
│   │   ├── admin.js      # Painel: pedidos, relatórios, peças, promoções, kits e configurações
│   │   └── app.js        # Navegação entre as páginas, eventos e início
│   └── /img/             # Imagens (WebP): mascote, ícones e imagem de compartilhamento
│
└── README.md
```

As páginas carregam os scripts nesta ordem: `estoque.js` → `core.js` → `supabase.js` → `catalog.js` → `cart.js` → `conta.js` → (`admin.js`, só no painel) → `app.js`.

## Onde fica cada informação

| Informação | Onde | Como alterar |
|---|---|---|
| Nome, fotos, descrição, aplicação, categorias e kits | `estoque.js` | `admin.html` → 📦 Estoque / 🧰 Kits → **🚀 Publicar no site** |
| Preço, oferta e quantidade em estoque | Supabase (`pecas`) | `admin.html` → 📦 Estoque / 🏷️ Promoções (vale na hora) |
| Cupons, desconto no Pix e taxa por bairro | Supabase (`cupons`, `loja_config`, `bairros`) | `admin.html` → 🏷️ Promoções / ⚙️ Configurações |
| Pedidos | Supabase (`pedidos`) | `admin.html` → 📋 Pedidos |
| Clientes (CPF, e-mail e endereço) | Supabase (`clientes`) | O próprio cliente, em `conta.html` |

O **código da peça** (por exemplo, `C14200`) liga o produto do `estoque.js` à linha da tabela `pecas` no Supabase.
Um produto sem código cadastrado no Supabase aparece como **indisponível**.

## Publicar no GitHub Pages

1. Envie todos os arquivos e pastas para o repositório `pontocar-ecommerce`, na branch `main`.
2. No repositório, abra **Settings → Pages**. Em **Source**, escolha **Deploy from a branch**, depois **main** e **/ (root)**, e clique em **Save**.
3. O site fica em `https://pontocarfiltroseoleos01-wq.github.io/pontocar-ecommerce/`.

## Ajustes no Supabase para o endereço novo

Em **Authentication → URL Configuration**:

- **Site URL**: `https://pontocarfiltroseoleos01-wq.github.io/pontocar-ecommerce/conta.html`
- **Redirect URLs**: inclua `https://pontocarfiltroseoleos01-wq.github.io/pontocar-ecommerce/**`

Isso é necessário para o link de "Esqueci minha senha", quando um e-mail próprio (SMTP) estiver configurado.

## Segurança

- A chave do Supabase que está nos arquivos é a **pública** (publishable). A proteção dos dados é feita pelas regras **RLS** do banco.
- Nunca coloque a chave **secret** ou **service_role** nos arquivos do site.
- O painel só abre para o usuário administrador cadastrado no Supabase.
