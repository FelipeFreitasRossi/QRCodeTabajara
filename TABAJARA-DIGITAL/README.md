# Tabajara Digital — Cardápio digital

Cardápio digital do restaurante Tabajara (São Carlos, SP). O cliente abre `/cardapio` no celular, sem instalar aplicativo nem se cadastrar. O QR Code impresso nas mesas deve apontar para esse endereço (ex.: `https://seudominio.com.br/cardapio`).

| Parte | Tecnologias |
|---|---|
| Frontend | React, TypeScript, Vite, CSS Modules, Lucide React |
| Backend | Python, FastAPI, Beanie (ODM), API REST |
| Banco | MongoDB |

## O que já funciona

**Site do cliente**
- Cardápio em `/cardapio` com busca, categorias, Destaque da Casa, fotos, ingredientes, alergênicos e efeitos de scroll.
- Carrinho (salvo no aparelho) e página **/carrinho** para finalizar: nome, mesa e observações.
- Pedido enviado ao restaurante e página **/pedido/{código}** para acompanhar o status (atualiza sozinha).
- Preços sempre recalculados no servidor; itens indisponíveis são bloqueados.
- **QR Code por mesa**: cada mesa tem um QR (`/m/{código}`) que abre o cardápio já com a mesa identificada.
- Rodapé com destaque do **Instagram @tabajaragrill** (configurável em `frontend/src/config/brand.ts`, junto com endereço, horários, telefone e WhatsApp).
- **Foto em cada seção** (comidas e bebidas): no canto da seção, alternando de lado (direita, esquerda…), ocupando um quadrante da seção (metade da largura × metade da altura = 25% da área) e sumindo aos poucos num degradê radial a partir do canto, com leve parallax. Envie/troque/remova em Painel → Categorias (miniatura ao lado do nome). Seção sem foto aparece normalmente. Para colocar as fotos de exemplo num banco já existente: `python -m scripts.migrate` (só preenche seções que ainda não têm foto).
- Preços e pontos com tipografia própria para números (algarismos alinhados, R$ e centavos menores).
- **Favoritos** com o coração, salvos na **conta do Clube** (só com login): o cliente reencontra os pratos na próxima visita, em qualquer celular. Sem login, o coração abre o convite para entrar e favorita o prato logo depois. Atalho "Seus favoritos" no topo do cardápio.
- Animação do produto **voando até o carrinho** e efeitos de scroll (respeitam "reduzir movimento" do celular).

**Clube Tabajara (fidelidade)**
- Na finalização: *"Você tem cadastro?"* → entrar com **CPF + PIN** ou criar o cadastro ali mesmo e já pontuar o pedido.
- Pontos calculados **no servidor** e creditados quando o pedido é marcado como **entregue** (cancelar depois estorna).
- Área **/clube**: cartão de membro 3D, saldo com contador estilo caça-níquel, pontos a caminho, extrato e dados.
- CPF guardado como hash (HMAC) + final para exibição; PIN com bcrypt; bloqueio de 15 min após 5 erros.
- **Login só da visita** (padrão): vale no máximo 3 h no servidor, some ao fechar a página e sai sozinho após 30 min sem uso. A caixinha **"Manter conectado neste celular"** (desmarcada) estende para 30 dias (`CUSTOMER_VISIT_HOURS` / `CUSTOMER_TOKEN_DAYS`).
- Ao escanear o QR num aparelho com conta salva, o carrinho e a área do Clube perguntam **"Continuar como Marina?"**; o pedido só é enviado depois da resposta. Nome e mesa digitados ficam só na visita.
- Aviso de privacidade em **/privacidade** (revisar o texto com o jurídico).
- **Recompensas**: catálogo no painel (mínimo configurável, padrão 1.000 pontos). O cliente resgata no carrinho ou na aba "Recompensas" do /clube; o item vai junto no pedido (R$ 0, marcado para a cozinha). Pontos são debitados no envio (atômico, sem saldo negativo) e **devolvidos se o pedido for cancelado**, junto com o estoque.
- **Presente de aniversário**: o cliente informa dia e mês (no cadastro ou no /clube, uma única vez). No mês do aniversário ganha o prato escolhido no painel, **uma vez por ano**. Antifraude: carência de 30 dias desde que a data foi informada (configurável); a equipe pode corrigir a data conferindo documento. Pedido cancelado libera o presente de novo.
- Pedido cancelado não pode ser reaberto no painel (pontos e presentes já voltaram para o cliente).

**Painel administrativo (`/admin`)**
- Login com e-mail e senha (JWT, senha com bcrypt, limite de tentativas).
- Painel com resumo do dia (pedidos, vendas, em andamento).
- **Pedidos em tempo real**: novos, em preparo e prontos, com aviso sonoro e contador na aba.
- **Produtos**: criar, editar, excluir, foto (otimizada automaticamente em WebP), preço, disponível/indisponível, Destaque da Casa, ordem de exibição, prévia de como aparece no cardápio.
- **Categorias** e **Mesas**: criar, editar, ordenar, ativar/desativar.
- **QR Codes**: baixar o PNG de cada mesa para imprimir, copiar o link ou gerar um novo (invalida o antigo).
- **Clube**: regras (pontos por real, pedido mínimo, pausar), busca de clientes, ajuste manual de pontos com motivo, redefinir PIN e excluir dados pessoais (LGPD).

## Como rodar (Windows / cmd)

### Backend
```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
Edite o `.env` (URL do MongoDB, `JWT_SECRET`, `CPF_HASH_KEY` e `PUBLIC_SITE_URL`). Depois:
```cmd
python -m scripts.seed
python -m scripts.create_admin
python -m uvicorn app.main:app --reload
```
- **Já tinha o banco de uma versão anterior?** Rode uma vez `python -m scripts.migrate`: só gera o QR das mesas que não têm e cria os índices novos. Não apaga nada.
- `PUBLIC_SITE_URL` é o endereço que vai dentro do QR Code. Em produção, coloque o domínio real **antes de imprimir** os QR Codes.
- `CPF_HASH_KEY`: gere uma chave longa e **nunca troque depois** de ter clientes (os CPFs cadastrados deixariam de ser encontrados).
- Testes das regras do Clube: `python -m pytest`
- `create_admin` pergunta nome, e-mail e senha do administrador (rode de novo para trocar a senha).
- Documentação da API: http://localhost:8000/docs
- O seed cria um cardápio de **exemplo** (não é o cardápio oficial). Pode rodar de novo sem duplicar.
- O seed também baixa **fotos ilustrativas** do banco gratuito Pexels (licença livre para uso comercial), otimizadas em WebP, para `backend/uploads/`. Precisa de internet na primeira vez. Troque pelas fotos reais dos pratos assim que possível.

### Frontend
```cmd
cd frontend
npm install
npm run dev
```
- Cardápio: http://localhost:5173/cardapio
- Painel: http://localhost:5173/admin

Para testar no celular (mesma rede Wi-Fi): `npm run dev -- --host` e abra o endereço "Network" que aparecer, ex.: `http://192.168.0.10:5173/cardapio`.

## API

Documentação interativa completa em http://localhost:8000/docs.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/public/cardapio` | público | Cardápio completo |
| GET | `/api/public/mesas` | público | Mesas ativas |
| POST | `/api/public/pedidos` | público | Enviar pedido |
| GET | `/api/public/pedidos/{codigo}` | público | Acompanhar pedido |
| POST | `/api/auth/login` | público | Login do painel |
| GET | `/api/admin/dashboard` | admin | Resumo do dia |
| GET/POST/PUT/DELETE | `/api/admin/categories` | admin | Categorias (+ `PUT /order`) |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/products` | admin | Produtos (+ `PUT /order`, `POST/DELETE /{id}/image`) |
| GET, PATCH `/{id}/status` | `/api/admin/orders` | admin | Pedidos |
| GET/POST/PUT/DELETE | `/api/admin/tables` | admin | Mesas (+ `GET /{id}/qrcode.png`, `POST /{id}/qrcode/regenerate`) |
| GET | `/api/public/mesas/qr/{codigo}` | público | Mesa do QR Code |
| GET / POST `/estimate` | `/api/public/club` | público | Regras do Clube / pontos que o carrinho vale |
| POST | `/api/customers/register`, `/api/customers/login` | público | Cadastro e login do Clube (CPF + PIN) |
| GET/PUT | `/api/customers/me` | cliente | Dados do cliente |
| GET, PUT/DELETE `/{produto}` | `/api/customers/me/favorites` | cliente | Pratos favoritos |
| GET | `/api/club/me`, `/api/club/me/transactions` | cliente | Saldo, pontos a caminho e extrato |
| GET/PUT | `/api/admin/club/settings` | admin | Regras do Clube (inclui mínimo das recompensas e aniversário) |
| GET | `/api/public/club/rewards` | público | Catálogo de recompensas |
| GET | `/api/club/me/birthday` · PUT `/api/customers/me/birthday` | cliente | Presente de aniversário / informar a data (uma vez) |
| GET/POST/PUT/DELETE (+ `/image`) | `/api/admin/club/rewards` | admin | Recompensas |
| GET, POST `/{id}/points`, `/{id}/pin`, `/{id}/anonymize` | `/api/admin/club/customers` | admin | Clientes do Clube |

## Banco de dados (MongoDB)

| Coleção | Campos principais | Índices únicos |
|---|---|---|
| `categories` | name, slug, description, position | slug |
| `products` | name, slug, category_id, description, price_cents, image_url, ingredients, allergens, featured, available, position | (category_id, slug) |
| `tables` | number, slug, label, active | slug, number |
| `orders` | code, table_number, customer_name, notes, items (nome e preço copiados), total_cents, status | code |
| `admin_users` | name, email, password_hash, role, active | email |

Preços em centavos (inteiros) para evitar erros de arredondamento. Os índices são criados automaticamente pelo Beanie ao iniciar a API e impedem categorias e produtos duplicados.

## Estrutura

```
backend/
  app/
    api/routes/     rotas (health, public; depois auth e admin)
    core/           configurações (.env)
    db/             conexão com MongoDB
    models/         documentos do banco
    schemas/        formatos de resposta da API
    services/       regras de negócio
    main.py
  scripts/          seed de dados de exemplo
  uploads/          fotos dos produtos
frontend/
  src/
    components/     layout, menu, ui
    hooks/          scroll, busca, carregamento
    pages/          MenuPage, NotFoundPage
    routes/         rotas da aplicação
    services/       comunicação com a API
    styles/         tokens (cores, fontes) e estilos globais
    types/          tipos TypeScript
    utils/          formatação, busca, utilidades de DOM
```

## Identidade visual

Cores, fontes e espaçamentos ficam em `frontend/src/styles/tokens.css`. Nome, cidade e a foto de capa (opcional) ficam em `frontend/src/config/brand.ts`. O logotipo é provisório (texto): coloque o logo oficial em `frontend/public/logo.svg` e siga o comentário em `src/components/ui/Logo.tsx`.


## Segurança

O que o sistema já faz:
- Senhas do painel e PINs do Clube com **bcrypt**; CPF guardado como hash (HMAC) + só os últimos dígitos.
- **Bloqueio por conta**: painel após 8 senhas erradas, Clube após 5 PINs errados (15 min). Mesma mensagem e mesmo tempo de resposta para conta inexistente (não dá para descobrir e-mails ou CPFs cadastrados).
- Tokens separados para painel e cliente, com validade; **trocar a senha do painel ou redefinir o PIN derruba as sessões abertas**.
- Preços, pontos, resgates, estoque e presente de aniversário sempre calculados e conferidos no **servidor**.
- Uploads só JPG/PNG/WebP, até 8 MB, recodificados em WebP (remove metadados e conteúdo escondido) e com proteção contra "bombas" de imagem.
- Cabeçalhos de segurança na API (nosniff, sem iframe, CSP, HSTS em produção), corpo de requisição limitado, CORS só para o endereço do site, documentação `/docs` desligada em produção.
- No site publicado (`npm run build`): CSP que bloqueia scripts de terceiros e sem sourcemaps.
- Ao iniciar, a API confere a configuração: em desenvolvimento avisa no terminal; em produção **não sobe** com chave fraca, sem `CPF_HASH_KEY` ou sem https.

Antes de colocar no ar (checklist):
1. `ENVIRONMENT=production`, `JWT_SECRET` e `CPF_HASH_KEY` longos e diferentes (gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`). Se você já tem clientes e `CPF_HASH_KEY` estava vazio, use nele o valor **atual** do `JWT_SECRET`.
2. Site e API só em **https**. `PUBLIC_SITE_URL` e `CORS_ORIGINS` com o endereço https do site.
3. Atrás de proxy/hospedagem: `uvicorn app.main:app --proxy-headers --forwarded-allow-ips="<ip do proxy>"` (para o limite de tentativas ver o IP real).
4. MongoDB Atlas: usuário só com permissão no banco `tabajara`, lista de IPs liberados só com o servidor, backup ativado.
5. Na hospedagem do site, adicione o cabeçalho `X-Frame-Options: DENY` (impede o site de ser embutido em outra página).
6. Crie o admin com senha forte (mínimo 10 caracteres) e não compartilhe o login: cada pessoa da equipe com o seu.
