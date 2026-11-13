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
- `src/app/expense-api.ts`: camada de consultas assíncronas, atualmente atendidas por mocks.
- `src/app/expense-models.ts`: contratos de gastos, filtros, totalizadores e metadados.
- `src/app/expense-utils.ts`: formatação e operações de interface compartilhadas.
- `src/app/app.routes.ts`: rotas, inicialmente vazias.
- `src/app/app.config.ts`: configuração da aplicação e do roteador.

A integração com o backend será implementada nas próximas etapas.

A listagem, os períodos disponíveis e os totais usam respostas fictícias isoladas em `src/app/mock-expenses.ts`. Esse arquivo simula o backend: somente nele há agrupamento por fatura, filtragem, paginação e preparação dos totalizadores, que chegam prontos aos componentes. Há gastos e faturas de janeiro de 2026 a julho de 2027 e um gasto em setembro de 2029; nos demais períodos, a listagem e os totais ficam vazios. A descrição exibida também é fictícia, pois a resposta resumida da API não a inclui.

## Consultas de dados

O frontend envia parâmetros e apresenta as respostas, sem filtrar gastos ou calcular totalizadores. `ExpenseApi` separa as consultas:

- `getMetadata()`: período inicial e meses/anos disponíveis, incluindo o mês sugerido ao selecionar cada ano.
- `getExpenses({ year, month, filter, page, pageSize })`: página de gastos pronta para o período e filtro selecionados. `filter` é `null` ou `{ field: 'paymentMethod' | 'category', value }`; o valor é fornecido pelo totalizador, separado do nome exibido.
- `getTotals({ year, month })`: totais prontos por pagamento e categoria, independentes do filtro e da paginação.

Na carga inicial são consultados os metadados, a lista e os totais. Alterar mês/ano solicita novamente lista e totais; selecionar/remover um filtro ou carregar mais páginas pela rolagem solicita apenas a lista. Após salvar um novo gasto com sucesso, o futuro fluxo de cadastro deve chamar `App.onExpenseAdded()` para reiniciar a lista e recarregar os totais. O cadastro ainda não está implementado.

A resposta da listagem contém `items`, `page`, `pageSize`, `totalItems`, `totalPages`, `firstItem` e `lastItem`. A interface acumula as páginas recebidas sem filtrar ou repaginar os resultados. As consultas começam na página 1 e respeitam o limite de páginas informado pelo backend; para um resultado vazio, o mock retorna página 0 de 0 e contadores zerados.

As consultas são independentes, com indicação de carregamento, erros visíveis e botão para tentar novamente. Ao carregar páginas adicionais, as linhas e a posição da rolagem são preservadas, inclusive em caso de erro; tentar novamente repete a página que falhou. Consultas anteriores são canceladas quando seus parâmetros mudam, evitando que respostas antigas sobrescrevam a seleção atual.

Por enquanto, as consultas retornam `Observable` com respostas mockadas, **sem tráfego HTTP real**. Ao integrar o backend, substitua a implementação de `ExpenseApi` por chamadas HTTP, ajustando os contratos à API real. Não mova a filtragem nem o cálculo dos totais para os componentes. Os meses nos contratos atuais usam índices de 0 a 11 e os valores monetários são recebidos em centavos.

O mês solicitado representa a fatura dos gastos de crédito, e não necessariamente o mês da transação. No cartão fictício, o fechamento é dia 18: a fatura de novembro inclui gastos de crédito de 18/10 até 17/11; o próprio dia 18/11 já pertence à fatura de dezembro. As datas das transações são preservadas. Pix e débito continuam no mês civil. Essa redistribuição existe somente no simulador: na integração real, basta solicitar a fatura escolhida e apresentar o que o backend devolver, sem calcular o fechamento no frontend.

Gastos ainda não realizados aparecem em tom mais suave. Os totais planejados incluem todos os gastos do período; os realizados incluem apenas os gastos realizados.

Selecione uma linha da listagem para abrir os detalhes do gasto. O título do modal é o nome do gasto em destaque. Abaixo ficam a situação (Realizado com check ou Planejado com relógio) à esquerda da data; quando um gasto planejado não tem data (`day` ausente ou `null`), aparece o mês/ano da fatura selecionada, sem inferir o fechamento a partir da transação. Na linha seguinte, o valor aparece em destaque com a categoria clicável à direita. Clicar na categoria fecha o modal, aplica esse filtro e volta à primeira página, sem recarregar os totalizadores; o foco vai para o label do filtro ativo. A tabela indica “Sem data” nos registros sem data. Nomes e descrições longos são truncados na tabela, mas aparecem completos no modal, que pode ser fechado pelo botão, pela tecla Escape ou clicando fora dele. Os detalhes usam dados fictícios até a integração com o endpoint correspondente.

A área principal do card possui uma única rolagem para todo o conteúdo, incluindo filtros, cabeçalho da tabela e gastos; a tabela não possui rolagem própria. A página permanece parada. A última linha não possui divisória inferior.

A navegação superior usa os ícones Lucide `chart-no-axes-combined` (Totais) e `plus` (Criar), com nomes acessíveis e dicas de texto. O botão “Totais” abre um painel com os cards de pagamento e categoria e permanece destacado enquanto estiver aberto. O painel tem um apêndice que envolve a área do botão, com junção contínua e arredondada; nessa área, o gráfico vira um ícone de fechar ao passar o mouse, e clicar fecha o painel. Não há botão de fechar no canto direito. Também é possível fechar pela tecla Escape ou clicando fora do painel. Abrir e fechar o painel não gera novas consultas. O botão de criação está desativado até a funcionalidade ser implementada.
A barra superior usa o fundo da página e fica fora do card principal. O seletor de período e a lista ficam juntos nesse card; os totalizadores aparecem somente no painel superior. As barras superior e lateral permanecem visíveis durante a rolagem do conteúdo; em janelas estreitas, a rolagem horizontal também fica restrita à área principal do card, sem rolar a página.

Os cabeçalhos da lista e dos totalizadores compartilham um fundo verde suave, diferente do fundo roxo da página, e se estendem até as bordas e o topo dos cards. A cor acompanha os temas claro e escuro.

## Filtros e paginação

Ao filtrar pelo nome de um pagamento nos detalhes do gasto, a tag de filtro ativo mantém o degradê da instituição e do método, os respectivos ícones e o texto em itálico. O botão de remover continua disponível; filtros de categoria mantêm o visual padrão.

Temporariamente, o primeiro gasto abre automaticamente no modal ao carregar a aplicação em desenvolvimento. A prévia é controlada por `AUTO_OPEN_EXPENSE_PREVIEW` em `src/app/app.ts` e fica desativada em produção. Fechar o modal ou mudar filtros/páginas não repete a abertura; uma carga inicial sem gastos não abre o modal.

Após redistribuir os gastos de crédito pelo fechamento, os mocks de 2026 incluem setembro com 43 gastos (5 páginas), outubro com 20 (2 páginas), novembro com 24 (3 páginas) e dezembro com 32 (4 páginas), usando 10 itens por página. Os totalizadores desses meses acompanham as faturas, sem alterar as datas fictícias.

Os gastos extras de paginação têm nomes e descrições distintos, sem duplicar a compra parcelada. Essa compra aparece uma vez por fatura, de maio de 2026 a abril de 2027, com a parcela correspondente de `1/12` a `12/12`; fora desse intervalo ela não aparece.

Para comparar nomes curtos e longos, “Fone” aparece em duas parcelas de R$ 150,00: `1/2` em novembro de 2026 e `2/2` em dezembro de 2026.

O gasto planejado “Plano de internet residencial de alta velocidade” de novembro de 2026 não tem data (`day: null`), permanecendo na fatura de novembro. O modal mostra apenas o mês e o ano (“Novembro de 2026”), com a primeira letra do mês maiúscula e sem o prefixo “Fatura de”.

Clique nas tags de pagamento ou nas linhas de categoria dos totalizadores para solicitar a lista filtrada e fechar o painel. Apenas um filtro fica ativo por vez, mesmo entre grupos diferentes. O escolhido aparece acima da lista, ao lado do botão de filtros, em um label com botão X à esquerda para remoção; clicar novamente no totalizador selecionado também remove o filtro. O label permanece visível durante o carregamento da lista. O botão de filtros usa o ícone Lucide `list-filter` e ainda não possui ação.

A listagem usa páginas fixas de 10 itens, sem controles de página ou tamanho. Após receber a primeira página, mede a altura real das linhas e da área visível para solicitar `ceil(linhas visíveis / 10) + 1` páginas no total, mantendo uma página de reserva e respeitando o limite do backend. Conforme a tabela é rolada ou a janela aumenta, solicita as páginas necessárias sequencialmente, sem repetir pedidos em andamento. Alterar o filtro ou o mês/ano reinicia a lista na primeira página e volta ao topo; o filtro permanece ao trocar de período. A rolagem e os filtros não alteram nem recarregam os totalizadores.

## Período

Na barra lateral, escolha um mês e clique no ano para abrir o seletor. Os anos são exibidos em páginas de nove, começando em 2020; apenas anos e meses com gastos podem ser selecionados. O seletor abre na página do ano selecionado. Ao selecionar um ano sem gastos em janeiro, o primeiro mês com gastos é selecionado; caso contrário, ao selecionar o ano atual, o mês atual é selecionado, e, ao selecionar um ano futuro, janeiro é selecionado. Ao abrir a página, é escolhido o mês mais recente com gastos até o mês atual; se não houver gastos nesse intervalo, permanece o mês atual vazio. O mês selecionado fica o mais próximo possível do centro da lista, respeitando seus limites de rolagem.

Ao abrir o seletor de ano, o restante da página escurece, incluindo a lista de meses.

Quando a lista de meses é rolada, uma sombra aparece abaixo do seletor de ano, inclusive sobre a barra de rolagem. Não há sombreamento na parte inferior da lista.
Nos navegadores com suporte a `::-webkit-scrollbar-track`, a barra permanece colada à esquerda do card e seu trilho termina 12px antes da borda inferior, evitando o canto arredondado sem encurtar a área dos meses.

## Tema

O tema inicial acompanha a preferência do sistema, inclusive quando ela muda. O botão na barra superior permite alterá-lo manualmente durante a sessão; ao recarregar a página, a preferência do sistema volta a ser usada.

Os ícones de sol, lua e fechar são da biblioteca [Lucide](https://lucide.dev/). As licenças estão em [lucide-license.txt](public/lucide-license.txt).