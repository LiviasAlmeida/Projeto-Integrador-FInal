# Flower's Store 🌸 - Projeto Integrador

Site institucional e catálogo online desenvolvido para a loja de moda feminina **Flower's Store**, de propriedade da **Vanessa** (Uberaba - MG).

---

## 👥 Equipe e Divisão de Responsabilidades

O projeto foi dividido em módulos para que cada integrante trabalhe de forma independente em sua página e em seu próprio arquivo CSS, sem conflitos:

| Integrante | Página HTML | Arquivo CSS Dedicado | Descrição |
| :--- | :--- | :--- | :--- |
| **Lívia** | `index.html` | `css/index.css` | Página Inicial e Promoções da Semana com banner de ofertas |
| **Vinícius** | `produtos.html` | `css/produtos.css` | Catálogo completo de roupas dividido por categorias |
| **Lázaro** | `sobre.html` | `css/sobre.css` | História da loja, Missão, Visão e Valores da marca |
| **Mateus** | `contato.html` | `css/contato.css` | Canais de atendimento, WhatsApp oficial, Instagram e mapa |
| **Todos** | Compartilhado | `css/global.css` | Estrutura unificada: Reset, Cabeçalho, Menu, Rodapé e Cores |

---

## 📁 Estrutura de Pastas do Projeto

A organização dos arquivos foi padronizada para manter o repositório limpo e organizado no GitHub:

```text
Flower-s-Store/
│
├── 📁 css/                         # Folhas de estilo organizadas por página
│   ├── global.css                  # Estilos globais (cabeçalho, navegação, rodapé e cores)
│   ├── index.css                   # Estilos da página inicial / promoções (Lívia)
│   ├── produtos.css                # Estilos da página de produtos e filtros (Vinícius)
│   ├── sobre.css                   # Estilos da página sobre a loja (Lázaro)
│   ├── contato.css                 # Estilos da página de contato e mapa (Mateus)
│   ├── admin.css                   # Estilos do painel de controle da lojista
│   └── style.css                   # Indexador central de estilos (importador)
│
├── 📁 js/                          # Scripts da aplicação
│   └── produtos.js                 # Integração inteligente do WhatsApp e catálogo dinâmico
│
├── 📁 data/                        # Dados locais de exemplo
│   ├── config.json                 # Telefone de WhatsApp e configurações da loja
│   └── produtos.json               # Lista inicial de produtos cadastrados
│
├── 📁 imagens/                     # Fotos de produtos, logotipo e ícones
│   ├── Icons/
│   └── [fotos das roupas]
│
├── 📄 index.html                   # Página inicial - Promoções da Semana
├── 📄 produtos.html                # Catálogo de produtos por categoria
├── 📄 sobre.html                   # História da loja e Missão/Visão/Valores
├── 📄 contato.html                 # Contatos, redes sociais e localização
├── 📄 admin.html                   # Painel para upload de CSV e gestão pela dona da loja
│
├── 📄 supabase.sql                 # Script SQL para criar o banco de dados no Supabase
├── 📄 server.js                    # Servidor local Node.js / Express
├── 📄 package.json                 # Dependências e scripts de execução
├── 📄 .gitignore                   # Evita envio de pastas pesadas (como node_modules)
└── 📄 README.md                    # Documentação do projeto
```

---

## 🚀 Como Executar o Projeto

Você pode visualizar e testar o projeto de duas maneiras:

### Opção 1: Direto no Navegador (Sem instalar nada)
- Basta dar dois cliques em qualquer arquivo HTML (`index.html`, `produtos.html`, etc.) ou clicar com o botão direito no VS Code e selecionar **"Open with Live Server"**.

### Opção 2: Servidor Node.js (Com APIs e Painel Admin)
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse no navegador:
   ```text
   http://localhost:3000
   ```

---

## 📱 Recursos Especiais Implementados

1. **Mensagem Inteligente no WhatsApp:**
   - Ao clicar em *"Comprar Agora"* em qualquer peça, o WhatsApp abre automaticamente com o número oficial da loja, o nome do produto, o código de referência e o valor pré-formatados.
2. **Painel da Lojista (`/admin.html`):**
   - Permite à Vanessa baixar uma planilha modelo em `.csv`, editar seus produtos no Excel e republicar no site com 1 clique.
3. **Compatibilidade com Banco de Dados Supabase:**
   - O arquivo `supabase.sql` permite criar a tabela em 1 clique na nuvem caso o grupo queira demonstrar a integração.
