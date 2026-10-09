import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const PRODUTOS_FILE = path.join(DATA_DIR, 'produtos.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Helper to ensure data files exist
async function getProdutos() {
  try {
    if (!existsSync(PRODUTOS_FILE)) return [];
    const content = await fs.readFile(PRODUTOS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Erro ao ler produtos:', err);
    return [];
  }
}

async function saveProdutos(produtos) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PRODUTOS_FILE, JSON.stringify(produtos, null, 2), 'utf-8');
}

async function getConfig() {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return {
        whatsapp: '5534984055063',
        adminUser: 'admin',
        adminPass: 'vanessa123',
        storeName: "Flower's Store"
      };
    }
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      whatsapp: '5534984055063',
      adminUser: 'admin',
      adminPass: 'vanessa123',
      storeName: "Flower's Store"
    };
  }
}

async function saveConfig(config) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// CSV Parser robust for Brazil Excel (semicolon and comma, quotes, accents)
function parseCSV(text) {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') && (headerLine.split(';').length >= headerLine.split(',').length) ? ';' : ',';

  function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const rawHeaders = parseLine(lines[0]).map(h =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, '_').replace(/[^a-z0-9_]/g, '')
  );

  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every(v => v === '')) continue;
    const row = {};
    rawHeaders.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const referencia = row.referencia || row.ref || row.codigo || `REF-${String(i).padStart(3, '0')}`;
    const nome = row.nome || row.produto || row.peca || row.titulo || 'Peça Sem Nome';
    const categoria = (row.categoria || 'geral').toLowerCase();
    const descricao = row.descricao || row.detalhes || '';
    const precoRaw = String(row.preco || '0').replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const preco = parseFloat(precoRaw) || 0;
    const precoOrigRaw = String(row.preco_original || row.preco_antigo || row.de || '').replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const preco_original = precoOrigRaw ? parseFloat(precoOrigRaw) || preco : preco;
    const tag_desconto = row.tag_desconto || row.desconto || '';
    const imagem_url = row.imagem_url || row.imagem || row.foto || 'imagens/logo-flowers-store.jpg';
    const imagem_alt = row.imagem_alt || row.alt || nome;
    const destaque_home = ['true', '1', 'sim', 's', 'yes', 'verdadeiro'].includes(String(row.destaque_home || row.destaque || row.promocao).toLowerCase());
    const ativo = !['false', '0', 'nao', 'não', 'n', 'no', 'falso'].includes(String(row.ativo || 'true').toLowerCase());

    products.push({
      id: i,
      referencia,
      nome,
      categoria,
      descricao,
      preco,
      preco_original,
      tag_desconto,
      imagem_url,
      imagem_alt,
      destaque_home,
      ativo
    });
  }
  return products;
}

function generateCSV(products, delimiter = ';') {
  const headers = ['referencia', 'nome', 'categoria', 'descricao', 'preco', 'preco_original', 'tag_desconto', 'imagem_url', 'imagem_alt', 'destaque_home', 'ativo'];
  const rows = [headers.join(delimiter)];
  for (const p of products) {
    const row = [
      p.referencia || '',
      `"${(p.nome || '').replace(/"/g, '""')}"`,
      p.categoria || '',
      `"${(p.descricao || '').replace(/"/g, '""')}"`,
      String(p.preco || 0).replace('.', ','),
      String(p.preco_original || p.preco || 0).replace('.', ','),
      p.tag_desconto || '',
      p.imagem_url || '',
      `"${(p.imagem_alt || p.nome || '').replace(/"/g, '""')}"`,
      p.destaque_home ? 'SIM' : 'NAO',
      p.ativo ? 'SIM' : 'NAO'
    ];
    rows.push(row.join(delimiter));
  }
  return '\uFEFF' + rows.join('\r\n');
}

// ================= API ROUTES =================

// 1. Listar produtos (Público)
app.get('/api/produtos', async (req, res) => {
  try {
    const produtos = await getProdutos();
    const { categoria, destaque, includeInactive } = req.query;

    let resultado = produtos;
    if (includeInactive !== 'true') {
      resultado = resultado.filter(p => p.ativo !== false);
    }
    if (categoria) {
      resultado = resultado.filter(p => p.categoria.toLowerCase() === String(categoria).toLowerCase());
    }
    if (destaque === 'true') {
      resultado = resultado.filter(p => p.destaque_home === true);
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// 2. Configurações públicas da loja (WhatsApp, Nome, Supabase)
app.get('/api/config', async (req, res) => {
  try {
    const config = await getConfig();
    res.json({
      whatsapp: config.whatsapp || '5534984055063',
      storeName: config.storeName || "Flower's Store",
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseAnonKey: config.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || ''
    });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
});

// 3. Login do Admin
app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  const config = await getConfig();

  if (usuario === config.adminUser && senha === config.adminPass) {
    const token = Buffer.from(`${usuario}:${Date.now()}:${config.adminPass}`).toString('base64');
    return res.json({ success: true, token, usuario });
  }

  return res.status(401).json({ success: false, message: 'Usuário ou senha incorretos' });
});

// Middleware simples de autenticação
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [user, , pass] = decoded.split(':');
    const config = await getConfig();
    if (user === config.adminUser && pass === config.adminPass) {
      return next();
    }
  } catch {}
  return res.status(401).json({ error: 'Sessão inválida ou expirada' });
}

// 4. Atualizar configurações (WhatsApp, Senha, Supabase)
app.post('/api/config', authMiddleware, async (req, res) => {
  try {
    const { whatsapp, novaSenha, supabaseUrl, supabaseAnonKey } = req.body;
    const config = await getConfig();
    if (whatsapp !== undefined && whatsapp !== null) {
      config.whatsapp = whatsapp.replace(/\D/g, '');
    }
    if (supabaseUrl !== undefined && supabaseUrl !== null) {
      config.supabaseUrl = supabaseUrl.trim();
    }
    if (supabaseAnonKey !== undefined && supabaseAnonKey !== null) {
      config.supabaseAnonKey = supabaseAnonKey.trim();
    }
    if (novaSenha && novaSenha.trim().length >= 4) {
      config.adminPass = novaSenha.trim();
    }
    await saveConfig(config);
    res.json({ success: true, message: 'Configurações salvas com sucesso!' });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// 5. Salvar lista completa de produtos (Admin)
app.post('/api/produtos', authMiddleware, async (req, res) => {
  try {
    const { produtos } = req.body;
    if (!Array.isArray(produtos)) {
      return res.status(400).json({ error: 'Formato inválido. Esperava array de produtos.' });
    }
    await saveProdutos(produtos);
    res.json({ success: true, count: produtos.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar produtos' });
  }
});

// 6. Upload de CSV (Admin)
app.post('/api/upload-csv', authMiddleware, async (req, res) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'Conteúdo CSV não fornecido.' });
    }
    const produtos = parseCSV(csvContent);
    if (produtos.length === 0) {
      return res.status(400).json({ error: 'Nenhum produto válido encontrado no arquivo CSV. Verifique o cabeçalho.' });
    }
    await saveProdutos(produtos);
    res.json({ success: true, count: produtos.length, produtos });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar CSV: ' + err.message });
  }
});

// 7. Baixar CSV dos produtos atuais
app.get('/api/export-csv', async (req, res) => {
  try {
    const produtos = await getProdutos();
    const csv = generateCSV(produtos);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="produtos_flowers_store.csv"');
    res.send(csv);
  } catch {
    res.status(500).send('Erro ao exportar CSV');
  }
});

// 8. Baixar Modelo de CSV
app.get('/api/modelo-csv', (req, res) => {
  const exemploProdutos = [
    {
      referencia: "REF-001",
      nome: "Vestido Elegance Floral",
      categoria: "vestidos",
      descricao: "Vestido de seda floral com ótimo caimento e tecido leve",
      preco: 189.90,
      preco_original: 270.00,
      tag_desconto: "-30%",
      imagem_url: "imagens/vestido-longo-azul.png",
      imagem_alt: "Vestido de Seda Floral",
      destaque_home: true,
      ativo: true
    },
    {
      referencia: "REF-002",
      nome: "Bermuda Jeans Clara",
      categoria: "bermudas",
      descricao: "Bermuda feminina clara com corte reto",
      preco: 89.90,
      preco_original: 89.90,
      tag_desconto: "",
      imagem_url: "imagens/bermuda-clara.png",
      imagem_alt: "Bermuda Clara",
      destaque_home: false,
      ativo: true
    },
    {
      referencia: "REF-003",
      nome: "Camiseta Bege Listrada",
      categoria: "camisetas",
      descricao: "Camiseta casual em algodão de toque macio",
      preco: 49.90,
      preco_original: 49.90,
      tag_desconto: "",
      imagem_url: "imagens/camiseta-bege-listrada.png",
      imagem_alt: "Camiseta Bege Listrada",
      destaque_home: false,
      ativo: true
    }
  ];
  const csv = generateCSV(exemploProdutos);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="modelo_produtos_flowers_store.csv"');
  res.send(csv);
});

// ================= STATIC FILES & PAGES =================
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(__dirname));

// Redirecionamentos para compatibilidade com links antigos /FlowersStore
app.get('/FlowersStore', (req, res) => res.redirect('/'));
app.get('/FlowersStore/admin', (req, res) => res.redirect('/admin.html'));
app.get('/FlowersStore/*', (req, res) => {
  const target = req.url.replace(/^\/FlowersStore/, '') || '/';
  res.redirect(target);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Flowers Store server is running on http://0.0.0.0:${PORT}`);
});

export default app;
