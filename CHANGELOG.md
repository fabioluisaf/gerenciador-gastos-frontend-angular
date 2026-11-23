# Changelog

## 2.2.1
- Modais e painéis só fecham quando o clique começa e termina fora deles; arrastar de dentro para fora (ou o contrário) não fecha mais.
- Botão de duplicar ao lado do de remover em cada gasto do grupo planejado; a cópia entra logo abaixo, já com o nome em foco.
- Caixas de texto arredondadas como os seletores.

## 2.2.0
- Grupos de gastos planejados na aba Grupo do botão Criar: criar, editar, excluir e aplicar grupos com vários gastos de uma vez.
- Aplicar um grupo lança os gastos planejados numa fatura (cartão e mês) ou numa data (qualquer método), com revisão antes: dá para desmarcar itens e ajustar o valor só naquele lançamento.
- Fatura com as seções Parcelas, Planejados sem data, Planejados com data (do mais antigo para o mais novo) e Realizados (do mais novo para o mais antigo), cada uma com a soma dos seus gastos ao lado do nome.
- Seleção de gastos na fatura, com um card flutuante acima da barra mostrando quantos estão selecionados e o total.
- Lista de categorias da fatura arrastável com o mouse; o seletor de situação (Todos, Realizados, Planejados) saiu.
- Card da fatura ao lado da lista de gastos com um resumo da fatura anterior e da próxima (mês, realizado e total planejado).
- No celular, as abas do card de criação mostram só o texto, para caberem as quatro.
- A versão aparece no log de inicialização do container; a Pipeline grava a tag na imagem.
- Requer o backend 2.2.0.

## 2.1.0
- Busca de gastos por nome pela lupa no cabeçalho da lista, sem diferenciar maiúsculas nem acentos; o nome buscado vira um filtro removível.
- Com filtros ativos, a lista mostra o total dos gastos filtrados no mês do topo, no painel e no card resumido.
- Em telas largas, a lista ganha uma coluna com a fatura do mês, começando pelo cartão mais usado.
- Fatura com os gastos agrupados em Parcelas, Planejados sem data e Com data (por dia), cada grupo recolhível.
- Fatura com filtros por nome, categoria e situação (realizado ou planejado) e total dos filtrados.
- Totais da fatura no formato do card de totais (realizado de realizado mais planejado), e os gastos da fatura deixam de repetir o método de pagamento.
- Copiar gasto pelo menu de ações: abre a criação preenchida, com a data vazia e o calendário aberto.
- Valor de cada parcela editável na criação e na edição de compras parceladas; o total passa a ser a soma das parcelas.
- Categoria sem o balão de sugestão do navegador: digitar filtra as categorias já usadas.
- No primeiro clique no valor, o cursor vai para o fim do número.
- Seletor de cor próprio para a instituição financeira, com quadrado de cor, barra de matiz e campo hex, além das cores prontas.
- Botão "Baixar backup" nas Configurações, que baixa um zip com um CSV por tabela.
- Corrigido: arrastar um método de pagamento com o mouse não solta mais sozinho.
- Requer o backend 2.1.0.

## 2.0.1
- Compras parceladas mostram "em Nx" à direita do valor na lista de gastos.
- Na fatura, a parcela aparece no fim do nome do gasto, como "2/10".

## 2.0.0
- **Interface refeita do zero**, pensada primeiro para o celular: navegação por uma barra flutuante (Gastos, Métodos de pagamento, Criar, Faturas e Configurações), com transições animadas entre as telas.
- Lista de gastos realizados e planejados com rolagem infinita, separada por mês e dia, com filtros por categoria e método de pagamento e totais do mês (painel lateral no computador, card resumido e gaveta no celular).
- Gastos planejados sem data aparecem no mês da fatura em que foram planejados.
- Métodos de pagamento como cartões empilhados: o mais usado fica no topo e os métodos são ordenados por tipo e frequência de uso, inclusive nos totais.
- Tela de faturas por cartão de crédito, com situação (aberta, fechada ou encerrada), datas de fechamento e vencimento, total lançado e planejado e os gastos de cada fatura.
- Criação de gastos (avulsos, parcelados e planejados), métodos de pagamento e instituições financeiras em um card com abas, com mês da fatura opcional, sugestão das categorias já usadas e prévia do cartão.
- Edição de gastos e métodos de pagamento pelo menu de ações ou arrastando o item para a direita; exclusão arrastando para a esquerda.
- Configurações de tema (sistema, claro ou escuro) e de tamanho de fonte.
- Seletores com indicador deslizante e seletor de datas próprio, no visual do app.
- Requer o backend 2.0.0.

## 1.1.0
- Modais de criação e edição padronizados com os detalhes, com seleção de categorias e pagamentos por tags.
- Valores individuais das parcelas com validação da soma, prévia das faturas e recálculo automático na edição.
- Alteração do estado realizado/planejado para todas as parcelas da compra.
- Campos obrigatórios ou inválidos destacados; parcelamento limitado a cartões de crédito e até 1000 parcelas.
- Datas no formato brasileiro, com calendário e seletor de fatura integrados ao tema.
- Ajustes de tipografia, campos de texto expansíveis, botões de ação, hover e encaixe do apêndice de criação.

## 1.0.0
- Consulta e navegação dos gastos por mês e ano, com detalhes e filtros por categoria ou método de pagamento.
- Resumos de valores planejados e realizados por categoria e método de pagamento.
- Cadastro, edição e exclusão de gastos, incluindo compras parceladas e consulta de suas parcelas.
- Cadastro de métodos de pagamento: crédito, débito, Pix, boleto, DOC e TED.
- Alternância entre temas claro e escuro e indicação de indisponibilidade do servidor.
