// Utilitário de Produtos e Integração WhatsApp inteligente / Supabase para a Flower's Store

window.flowersStoreWhatsapp = '5534984055063';
let supabaseClient = null;

// Carrega scripts sob demanda
function carregarScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Inicializa cliente do Supabase
async function inicializarSupabase(url, key) {
  if (!url || !key) return null;
  try {
    if (!window.supabase) {
      await carregarScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    }
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(url, key);
      return supabaseClient;
    }
  } catch (err) {
    console.warn('Não foi possível conectar ao Supabase:', err);
  }
  return null;
}

// 1. Carrega configuração da loja (WhatsApp e Supabase)
async function carregarConfigLoja() {
  const localZap = localStorage.getItem('flowers_whatsapp');
  if (localZap) {
    window.flowersStoreWhatsapp = localZap.replace(/\D/g, '');
  }

  const localSupabaseUrl = localStorage.getItem('flowers_supabase_url');
  const localSupabaseKey = localStorage.getItem('flowers_supabase_key');
  if (localSupabaseUrl && localSupabaseKey) {
    await inicializarSupabase(localSupabaseUrl, localSupabaseKey);
  }

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.whatsapp && !localZap) {
        window.flowersStoreWhatsapp = data.whatsapp.replace(/\D/g, '');
      }
      if (data.supabaseUrl && data.supabaseAnonKey && !localSupabaseUrl) {
        await inicializarSupabase(data.supabaseUrl, data.supabaseAnonKey);
      }
    }
  } catch (err) {
    // Vercel estático sem backend
  }
}

// Busca produtos: Supabase > localStorage > API > data/produtos.json
async function obterListaProdutos(filtroDestaque = false) {
  if (supabaseClient) {
    try {
      let query = supabaseClient.from('produtos').select('*').eq('ativo', true).order('id', { ascending: true });
      if (filtroDestaque) {
        query = query.eq('destaque_home', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Erro ao consultar Supabase:', err);
    }
  }

  // 2. localStorage se atualizado pelo Admin no navegador
  const localProdutos = localStorage.getItem('flowers_produtos');
  if (localProdutos) {
    try {
      const prods = JSON.parse(localProdutos);
      if (Array.isArray(prods) && prods.length > 0) {
        let filtrados = prods.filter(p => p.ativo !== false);
        if (filtroDestaque) filtrados = filtrados.filter(p => p.destaque_home === true);
        return filtrados;
      }
    } catch (e) {}
  }

  // 3. API backend local
  try {
    const url = filtroDestaque ? '/api/produtos?destaque=true' : '/api/produtos';
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  // 4. Arquivo data/produtos.json direto (funciona perfeitamente no Vercel)
  try {
    const res = await fetch('data/produtos.json');
    if (res.ok) {
      const prods = await res.json();
      if (Array.isArray(prods) && prods.length > 0) {
        let filtrados = prods.filter(p => p.ativo !== false);
        if (filtroDestaque) filtrados = filtrados.filter(p => p.destaque_home === true);
        return filtrados;
      }
    }
  } catch (err) {}

  return [];
}

// 2. Dispara a mensagem inteligente no WhatsApp
function comprarNoWhatsApp(produto) {
  const precoNum = typeof produto.preco === 'number' ? produto.preco : parseFloat(String(produto.preco).replace('R$', '').replace(',', '.'));
  const precoFormatado = isNaN(precoNum)
    ? (produto.preco || 'Sob consulta')
    : precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const ref = produto.referencia || 'REF-GERAL';
  const desc = produto.descricao ? `\n*Detalhes:* ${produto.descricao}` : '';
  const descTag = produto.tag_desconto ? ` (${produto.tag_desconto} OFF)` : '';

  const mensagem = `Olá, Flower's Store!
Tenho interesse na seguinte peça do site:

*${produto.nome}*
*Referência:* ${ref}
*Valor:* ${precoFormatado}${descTag}${desc}

Gostaria de saber se ainda está disponível no meu tamanho e como finalizar o pedido!`;

  const numero = window.flowersStoreWhatsapp || '5534984055063';
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

// 3. Formata card de produto HTML dinâmico
function criarCardProduto(p, isPromocao = false) {
  const precoNum = typeof p.preco === 'number' ? p.preco : parseFloat(String(p.preco).replace('R$', '').replace(',', '.'));
  const precoFormatado = isNaN(precoNum) ? p.preco : precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tagDescontoHtml = p.tag_desconto
    ? `<span class="tag-desconto">${p.tag_desconto}</span>`
    : '';

  const refBadge = p.referencia
    ? `<span class="tag-referencia" style="display:inline-block; font-size:0.75rem; color:var(--secondary-color); font-weight:600; margin-bottom:4px;">Ref: ${p.referencia}</span>`
    : '';

  const classePromo = (isPromocao || p.destaque_home || p.tag_desconto) ? 'produto produto-promocao' : 'produto';

  return `
    <article class="${classePromo}" data-ref="${p.referencia || ''}">
      ${tagDescontoHtml}
      <img src="${p.imagem_url || 'imagens/logo-flowers-store.jpg'}" alt="${p.imagem_alt || p.nome}" class="fotos" loading="lazy">
      ${refBadge}
      <h3>${p.nome}</h3>
      <p class="preco">${precoFormatado}</p>
      <button type="button" class="btn-comprar" onclick="comprarNoWhatsApp(${JSON.stringify(p).replace(/"/g, '&quot;')})">
        <i class="bi bi-whatsapp"></i> Comprar Agora
      </button>
    </article>
  `;
}

// 4. Renderiza produtos na página Home (index.html)
async function renderizarHome() {
  const container = document.getElementById('grade-promocoes') || document.querySelector('.grade-produtos-geral');
  if (!container) return;

  const produtos = await obterListaProdutos(true);
  if (produtos && produtos.length > 0) {
    container.innerHTML = produtos.map(p => criarCardProduto(p, true)).join('');
    return;
  }

  // Fallback para os botões estáticos
  vincularBotoesEstaticos(container);
}

// 5. Renderiza produtos na página de Produtos (produtos.html)
async function renderizarProdutos() {
  const containerVestidos = document.getElementById('grade-vestidos');
  const containerBermudas = document.getElementById('grade-bermudas');
  const containerCamisetas = document.getElementById('grade-camisetas');

  if (containerVestidos || containerBermudas || containerCamisetas) {
    const produtos = await obterListaProdutos(false);
    if (produtos && produtos.length > 0) {
      const vestidos = produtos.filter(p => (p.categoria || '').toLowerCase().includes('vestid'));
      const bermudas = produtos.filter(p => (p.categoria || '').toLowerCase().includes('bermud') || (p.categoria || '').toLowerCase().includes('short'));
      const camisetas = produtos.filter(p => (p.categoria || '').toLowerCase().includes('camis') || (p.categoria || '').toLowerCase().includes('blusa'));

      if (containerVestidos) containerVestidos.innerHTML = vestidos.map(p => criarCardProduto(p)).join('');
      if (containerBermudas) containerBermudas.innerHTML = bermudas.map(p => criarCardProduto(p)).join('');
      if (containerCamisetas) containerCamisetas.innerHTML = camisetas.map(p => criarCardProduto(p)).join('');
      return;
    }
  }

  // Fallback para artigos estáticos
  document.querySelectorAll('.pagina-produtos .produto').forEach(art => {
    vincularCardEstatico(art);
  });
}

// Vincula cards estáticos para disparar o WhatsApp inteligente
function vincularCardEstatico(card) {
  const btn = card.querySelector('button');
  if (!btn || btn.getAttribute('data-bound')) return;
  btn.setAttribute('data-bound', 'true');

  const nome = card.querySelector('h3')?.innerText?.trim() || 'Peça da Loja';
  const preco = card.querySelector('.preco')?.innerText?.trim() || 'Sob consulta';
  const tagDesconto = card.querySelector('.tag-desconto')?.innerText?.trim() || '';
  const ref = card.getAttribute('data-ref') || ('REF-' + nome.substring(0, 3).toUpperCase());

  btn.innerHTML = `<i class="bi bi-whatsapp"></i> Comprar Agora`;
  btn.addEventListener('click', () => {
    comprarNoWhatsApp({
      nome,
      preco,
      referencia: ref,
      tag_desconto: tagDesconto
    });
  });
}

function vincularBotoesEstaticos(container) {
  if (!container) return;
  container.querySelectorAll('.produto').forEach(card => {
    vincularCardEstatico(card);
  });
}

// Inicialização automática ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
  await carregarConfigLoja();

  if (document.querySelector('.pagina-home')) {
    renderizarHome();
  }

  if (document.querySelector('.pagina-produtos')) {
    renderizarProdutos();
  }
});
