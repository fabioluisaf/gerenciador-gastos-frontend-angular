# Changelog

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
