# Tabajara · Chamar atendente

Site separado do cardápio, usado só pelo **QR "Chamar atendente"** de cada mesa.
O cliente toca em **Chamar atendente**, **Pedir a conta** ou **Ajuda com o pedido** e o chamado aparece na hora
no painel Admin (aba **Chamados**), que continua no frontend principal (`../frontend`).

Usa a **mesma API e o mesmo banco** do cardápio. Não tem cardápio, carrinho nem links para o resto do site.

## Rodar no computador

```
cd frontend-chamar
npm install
npm run dev
```

Abre em `http://localhost:5174` **direto nos botões**. Sem o QR, o **cliente escolhe a mesa**: pelo botão
"Escolha sua mesa", no topo, ou ao tocar numa opção (abre a escolha e o chamado já segue com a mesa).
A mesa fica lembrada só naquela aba; tocar no botão da mesa troca.

Com o QR, o endereço é `…/chamar/<código da mesa>`: a página já abre com a mesa, sem perguntar.

Escolher a mesa fica liberado **só em desenvolvimento** (`ENVIRONMENT=development`). No site publicado fica
bloqueado (pede o QR), porque qualquer pessoa, mesmo fora do restaurante, poderia escolher uma mesa e chamar.
Para liberar mesmo assim (ex.: enquanto os QR não ficam prontos), coloque `CALL_BY_NUMBER=true` na API.

No `backend/.env`, para os QR de chamar apontarem para este site e a API aceitá-lo:

```
CALL_SITE_URL=http://localhost:5174
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

## Publicar

Já está no `render.yaml` (serviço `tabajara-chamar`). Depois de publicado, confira no serviço `tabajara-api`:
`CALL_SITE_URL` = endereço deste site e `CORS_ORIGINS` com os **dois** sites separados por vírgula.
