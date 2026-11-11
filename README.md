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
- `src/app/app.ts` e `src/app/app.html`: componente principal e seu template.
- `src/app/app.routes.ts`: rotas, inicialmente vazias.
- `src/app/app.config.ts`: configuração da aplicação e do roteador.

A integração com o backend será implementada nas próximas etapas.