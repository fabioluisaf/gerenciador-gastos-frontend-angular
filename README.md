# Gerenciador de gastos

Frontend Angular para o gerenciador de gastos.

## Requisitos

- Node.js compatível com Angular 22: 22.22.3 ou superior na linha 22, 24.15.0 ou superior na linha 24, ou 26.x.
- npm.

## Executar

```powershell
npm.cmd install
npm.cmd start
```

Acesse `http://localhost:4200`. O comando `npm.cmd` evita problemas com a política de execução de scripts do PowerShell no Windows.

Inicie também o backend em `http://localhost:8080`. O servidor Angular encaminha `/api` para ele usando `proxy.conf.cjs`, sem exigir CORS. Reinicie `npm.cmd start` ao alterar esse arquivo. Na implantação, configure o servidor web para encaminhar `/api` ao backend, removendo esse prefixo. Falhas de conexão do proxy local respondem com HTTP 503 para ativar a tela de servidor offline; erros de validação do backend continuam sendo exibidos no formulário.

Para validar a aplicação:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

## Estrutura inicial

- `src/main.ts`: inicia a aplicação.
- `src/app/app.ts` e `src/app/app.html`: composição da página e estado compartilhado de período e filtro.
- `src/app/shared/card.ts`: card reutilizável com projeção de conteúdo.
- `src/app/top-bar/`: navegação superior, painel de totais com conteúdo projetado e controle do tema.
- `src/app/period-selector/`: seleção de mês/ano e rolagem da barra lateral.
- `src/app/expense-filter/`: label do filtro ativo com botão de remoção.
- `src/app/expense-list/`: tabela com rolagem contínua, medição da área visível e modal de detalhes.
- `src/app/expense-summary/`: card reutilizado para totais por pagamento e categoria.
- `src/app/expense-api.ts`: integração HTTP, adaptação dos contratos e paginação dos cadastros/totalizadores.
- `src/app/backend-contracts.ts`: respostas reais do backend, incluindo UUIDs, datas e valores em reais.
- `src/app/expense-editor/`: criação de métodos de pagamento e criação/edição de gastos ou compras parceladas.
- `src/app/shared/payment-options.ts`: opções de pagamento compartilhadas pelos filtros e formulários.
- `src/app/expense-models.ts`: contratos de gastos, filtros, totalizadores e metadados.
- `src/app/expense-utils.ts`: formatação e operações de interface compartilhadas.
- `src/app/app.routes.ts`: rotas, inicialmente vazias.
- `src/app/app.config.ts`: configuração da aplicação e do roteador.

Não há gastos fictícios na aplicação. As fixtures em `src/app/testing/` são exclusivas dos testes. A resposta resumida da API não inclui descrição: a listagem exibe “—” nesse caso, e o modal busca a descrição real pelo endpoint de detalhes.

## Consultas de dados

O frontend envia parâmetros e apresenta as respostas, sem filtrar gastos ou calcular totalizadores. `ExpenseApi` separa as consultas:

- `getMetadata()`: consulta `GET /gastos/periodos` e adapta os meses de 1–12 do servidor aos índices 0–11 da interface.
- `getExpenses({ year, month, filter, page, pageSize })`: página de gastos pronta para o período e filtro selecionados. `filter` é `null` ou `{ field: 'paymentMethod' | 'category', value }`; o valor é fornecido pelo totalizador, separado do nome exibido.
- `getTotals({ year, month })`: totais prontos por pagamento e categoria, independentes do filtro e da paginação.
- `getPaymentMethods()`: consulta todas as páginas de `GET /metodos-pagamento`, incluindo métodos ainda sem gastos.
- `getExpense()`: consulta `GET /gastos/{id}` e, para parcelas, `GET /compras-parceladas/{compraParceladaId}`.

Na carga inicial são consultados os metadados, a lista e os totais. Alterar mês/ano solicita novamente lista e totais; selecionar/remover um filtro ou carregar mais páginas pela rolagem solicita apenas a lista. Após criar, editar ou excluir um gasto com sucesso, a aplicação atualiza lista, totais e períodos disponíveis, preservando o período selecionado enquanto ele ainda existir.

A resposta adaptada da listagem contém `items`, `page`, `pageSize`, `totalItems`, `totalPages`, `firstItem` e `lastItem`. A interface acumula as páginas recebidas sem filtrar ou repaginar os resultados. A camada HTTP traduz a página inicial 1 da interface para a página 0 do backend e respeita os metadados de paginação retornados pelo servidor.

As consultas são independentes, com indicação de carregamento, erros visíveis e botão para tentar novamente. Ao carregar páginas adicionais, as linhas e a posição da rolagem são preservadas, inclusive em caso de erro; tentar novamente repete a página que falhou. Consultas anteriores são canceladas quando seus parâmetros mudam, evitando que respostas antigas sobrescrevam a seleção atual.

As consultas e alterações usam HTTP real. Os filtros de pagamento enviam `metodoPagamentoId`, nunca o nome ou o tipo do método; categorias enviam `categoria`. Os totalizadores e os métodos de pagamento são carregados até a última página. A camada HTTP converte valores em reais para centavos de apresentação, sem calcular totais nem redistribuir parcelas.

O mês solicitado representa a fatura dos gastos de crédito, e não necessariamente o mês da transação. Basta solicitar o período escolhido e apresentar o que o backend devolver, sem calcular o fechamento no frontend. As datas das transações são preservadas.

Gastos ainda não realizados aparecem em tom mais suave. Os totais planejados incluem todos os gastos do período; os realizados incluem apenas os gastos realizados.

Selecione uma linha da listagem para consultar e abrir os detalhes reais do gasto. O título do modal é o nome do gasto em destaque. Abaixo ficam a situação (Realizado com check ou Planejado com relógio) à esquerda da data; quando um gasto planejado não tem data (`day` ausente ou `null`), aparece o mês/ano da fatura selecionada, sem inferir o fechamento a partir da transação. Na linha seguinte, o valor aparece em destaque com a categoria clicável à direita. Clicar na categoria fecha o modal, aplica esse filtro e volta à primeira página, sem recarregar os totalizadores; o foco vai para o label do filtro ativo. A tabela indica “Sem data” nos registros sem data. Nomes e descrições longos são truncados na tabela, mas aparecem completos no modal, que pode ser fechado pelo botão, pela tecla Escape ou clicando fora dele. O total da compra e os valores individuais das parcelas vêm do backend, inclusive quando há diferenças de arredondamento.

Ao passar o mouse sobre um gasto ou navegar pelos seus botões com o teclado, aparecem as ações de editar e deletar à direita; em dispositivos sem hover, elas ficam visíveis. O modal de detalhes tem as duas ações em um rodapé fixo, fora da área rolável.

Deletar abre uma confirmação com foco inicial em Cancelar. Para parcelas, a confirmação informa que a compra inteira, incluindo todas as parcelas, será excluída; excluir somente uma parcela não é permitido pelo backend original. A lista e os totais só são recarregados depois do sucesso de `ExpenseApi.deleteExpense()`. Durante o pedido, a confirmação não pode ser fechada e impede novos envios; em caso de erro, mantém o gasto e permite tentar novamente.

O gasto simples usa `DELETE /gastos/{id}` e a compra parcelada usa `DELETE /compras-parceladas/{purchaseId}`, ambos com sucesso `204 No Content`. O ID da compra vem dos detalhes (`GET /gastos/{id}`, campo `parcela.compraParceladaId`), não do ID da parcela na listagem.

## Criação e edição

O botão + abre o cadastro em um modal com apêndice; o + gira para virar X e fechar, mantendo a posição e o tamanho do botão original. A sidebar alterna entre gasto e método de pagamento. Sem métodos cadastrados, o formulário de gasto fica bloqueado e orienta cadastrar um método primeiro. Após salvar um método, ele fica selecionado no formulário de gasto. Os formulários de criação e edição têm apenas o botão “Salvar” no rodapé, com formato de pílula; o fechamento permanece no botão superior.

Os pagamentos usam as mesmas tags com ícones, degradês e rolagem horizontal do modal de filtros. A categoria é um campo livre, com sugestões vindas dos totalizadores do período selecionado e rolagem horizontal sem setas ou deslocamento do conteúdo.

Gastos realizados exigem data. Crédito sem data exige a fatura; com data, a fatura pode ficar vazia para o backend determinar. Compras parceladas exigem cartão de crédito, data, valor total e quantidade inteira positiva. O cadastro de crédito também solicita os dias de fechamento e vencimento, de 1 a 31.

A edição abre apenas o formulário do gasto selecionado, sem sidebar nem apêndice. Para parcelas, edita a compra inteira, usando sua primeira data e seu valor total reais. Ao manter total e quantidade, os valores individuais existentes são preservados; alterações no parcelamento são calculadas pelo backend. Os pedidos usam `POST`/`PUT /gastos` e `POST`/`PUT /compras-parceladas`; métodos usam `POST /metodos-pagamento`.

Limitação observada na validação com o backend atual: `PUT /compras-parceladas/{id}` retorna HTTP 500 ao alterar o valor total e a quantidade de parcelas, inclusive em uma requisição direta sem o frontend. Editar os demais dados mantendo o parcelamento respondeu HTTP 200. O formulário preserva os campos quando essa falha ocorre; a correção depende do backend, que não foi alterado neste trabalho.

Durante o salvamento, novos envios e o fechamento ficam bloqueados. Erros preservam os campos e permitem nova tentativa; a listagem só muda após confirmação do servidor. Sem conexão, a área principal mostra “Servidor back-end offline” com nova tentativa. Se a consulta de períodos responder sem registros, mostra “Nenhum gasto cadastrado”, mantendo o cadastro acessível.

A área principal do card possui uma única rolagem para todo o conteúdo, incluindo filtros, cabeçalho da tabela e gastos; a tabela não possui rolagem própria. A página permanece parada. As colunas não possuem bordas divisórias; somente as linhas intermediárias têm divisórias horizontais. O degradê das linhas é contínuo e seu hover não sobrepõe a borda externa da lista.

A navegação superior usa os ícones Lucide `chart-no-axes-combined` (Totais) e `plus` (Criar), com nomes acessíveis e dicas de texto. O botão “Totais” abre um painel com os cards de pagamento e categoria e permanece destacado enquanto estiver aberto. O painel tem um apêndice que envolve a área do botão, com junção contínua e arredondada; nessa área, o gráfico vira um ícone de fechar ao passar o mouse, e clicar fecha o painel. Não há botão de fechar no canto direito. Também é possível fechar pela tecla Escape ou clicando fora do painel. Abrir e fechar o painel não gera novas consultas.
A barra superior usa o fundo da página e fica fora do card principal. O seletor de período e a lista ficam juntos nesse card; os totalizadores aparecem somente no painel superior. As barras superior e lateral permanecem visíveis durante a rolagem do conteúdo; em janelas estreitas, a rolagem horizontal também fica restrita à área principal do card, sem rolar a página.

Os cabeçalhos da lista e dos totalizadores compartilham um fundo verde suave, diferente do fundo roxo da página, e se estendem até as bordas e o topo dos cards. A cor acompanha os temas claro e escuro.

## Filtros e paginação

Ao filtrar pelo nome de um pagamento nos detalhes do gasto, a tag de filtro ativo mantém o degradê da instituição e do método, os respectivos ícones e o texto em itálico. O botão de remover continua disponível; filtros de categoria mantêm o visual padrão.

O modal de detalhes abre somente ao selecionar um gasto, sem abertura automática ao carregar a página ou alterar filtros.

Clique nas tags de pagamento ou nas linhas de categoria dos totalizadores para solicitar a lista filtrada e fechar o painel. Apenas um filtro fica ativo por vez, mesmo entre grupos diferentes. O escolhido aparece acima da lista, ao lado do botão de filtros, em um label com botão X à esquerda para remoção; clicar novamente na opção selecionada também remove o filtro. O label permanece visível durante o carregamento da lista.

O botão de filtros usa o ícone Lucide `funnel` e abre um painel compacto com apêndice, seguindo o estilo dos totalizadores. Os grupos de pagamentos e categorias exibem todas as opções retornadas pelos totais do mês selecionado, sem deduzir opções da lista paginada nem consultar cadastros globais. As opções ficam em faixas horizontais com rolagem quando necessário; as barras não têm setas e aparecem no hover ou foco, sem alterar a espessura nem deslocar o conteúdo. Abrir o painel reutiliza os totais carregados; selecionar uma opção fecha o painel e consulta somente a listagem. O painel também apresenta carregamento, erro com nova tentativa e grupos vazios.

A listagem usa páginas fixas de 10 itens, sem controles de página ou tamanho. Após receber a primeira página, mede a altura real das linhas e da área visível para solicitar `ceil(linhas visíveis / 10) + 1` páginas no total, mantendo uma página de reserva e respeitando o limite do backend. Conforme a tabela é rolada ou a janela aumenta, solicita as páginas necessárias sequencialmente, sem repetir pedidos em andamento. Alterar o filtro ou o mês/ano reinicia a lista na primeira página e volta ao topo; o filtro permanece ao trocar de período. A rolagem e os filtros não alteram nem recarregam os totalizadores.

## Período

Na barra lateral, escolha um mês e clique no ano para abrir o seletor. Os anos são exibidos em páginas de nove, começando em 2020 ou no primeiro ano mais antigo retornado pelo backend; apenas anos e meses com gastos podem ser selecionados. O seletor abre na página do ano selecionado. Ao selecionar um ano sem gastos em janeiro, o primeiro mês com gastos é selecionado; caso contrário, ao selecionar o ano atual, o mês atual é selecionado, e, ao selecionar um ano futuro, janeiro é selecionado. Ao abrir a página, é escolhido o mês mais recente com gastos até o mês atual; se não houver gastos nesse intervalo, permanece o mês atual vazio. O mês selecionado fica o mais próximo possível do centro da lista, respeitando seus limites de rolagem.

Ao abrir o seletor de ano, o restante da página escurece, incluindo a lista de meses.
O apêndice do seletor acompanha a posição, a largura e a altura reais do botão que o abre. Seu contorno arredondado é compartilhado com o painel de totais. Clicar fora do painel, inclusive no espaço transparente ao lado do apêndice, fecha o seletor.

Quando a lista de meses é rolada, uma sombra aparece abaixo do seletor de ano, inclusive sobre a barra de rolagem. Não há sombreamento na parte inferior da lista.
Nos navegadores com suporte a `::-webkit-scrollbar-track`, a barra permanece colada à esquerda do card e seu trilho termina 12px antes da borda inferior, evitando o canto arredondado sem encurtar a área dos meses.

## Tema

O tema inicial acompanha a preferência do sistema, inclusive quando ela muda. O botão na barra superior permite alterá-lo manualmente durante a sessão; ao recarregar a página, a preferência do sistema volta a ser usada.

Os ícones de sol, lua e fechar são da biblioteca [Lucide](https://lucide.dev/). As licenças estão em [lucide-license.txt](public/lucide-license.txt).