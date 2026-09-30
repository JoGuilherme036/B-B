# Central Comercial Humana Saúde + B&B — V10 (2026-09-30)

**Aplicação de consulta comercial offline-first em português (pt-BR).** A base documental original foi mantida sem alteração. Antes de contratar, confira a vigência comercial, os preços, a rede e as regras diretamente com as fontes/operadora: o sistema não oferece atualização de dados em tempo real.

## Abrir o aplicativo

**Site estático:** extraia este ZIP preservando a estrutura e publique `index.html` na raiz de uma hospedagem HTTPS estática. Mantenha as pastas `css/`, `js/`, `data/`, `assets/`, `icons/`, `service-worker.js`, `manifest.webmanifest` e `favicon.ico` juntos. O service worker usa cache V10 e é aplicável à instalação pelo navegador em HTTPS, após a primeira visita conectada. Não implante um `index.html` novo mantendo CSS/JS/cache da versão anterior.

**Sem conexão, HTML único:** abra `Central_Comercial_Humana_BB_OFFLINE_NEXT_RELEASE.html` em navegador compatível. Todos os arquivos necessários à interface, os logotipos e a base de preços são integrados ao documento. Não é necessário instalar um servidor para consultar a base. Downloads e armazenamento locais podem variar por navegador; o modo `file://` não habilita service worker.

**No iPhone:** o menu inferior organiza as áreas, a cotação rápida aparece no início, e em Planos e valores, informe estado, contratação, plano e idade. A faixa correspondente será selecionada. Use `Lista` para comparar preços com menos rolagem, `Detalhes` para leitura ampliada ou `Tabela completa` para todas as faixas; em `Ações da tabela`, encontre ampliação, arquivo de exportação e a fonte. O HTML único deve ser aberto no Safari para testar a compatibilidade de downloads no dispositivo; a abertura pelo app Arquivos não foi certificada.

## Módulos e fontes

Mantidas as dez áreas originais: Início; Consulta de planos; Campanhas; Carências; Coparticipação; Procedimentos; Adesão; Rede; Odontológico; Fontes. Campanhas e redes são dados históricos/locais. A presença de uma informação não significa que uma oferta esteja vigente hoje.

## Exportação e versão

Os formatos XLSX nativo, CSV e PDF mantêm o fluxo existente, e as configurações exportadas devem corresponder aos filtros ativos. A base utilizada tem **114 configurações, 1.140 faixas etárias comerciais, 18 campanhas e 94 procedimentos**, SHA-256 `cfe78bf96052db78c9113977ec2107fc49a7f1d32f5be85ee2a4e38c103ca69d`. A versão da interface é `2026.09.30.10`; ela não deve ser confundida com a data de atualização das condições comerciais.

## Reproduzir testes

Com Python, Playwright e Chromium disponíveis: `python tests/test_v10.py` e `python tests/extended_regression.py` (o último requer o snapshot HTML da V9 em `baseline_v9/`). Ambos os testes usam montagem em memória porque o ambiente de geração bloqueou navegação de navegador para `localhost` e `file://`. A validação estática pode ser executada com `python tests/verify_release_v10.py`. Para capturar todos os módulos: `python tests/capture_modules.py`.

## Compatibilidade, recuperação e limitações

O núcleo offline foi exercitado no Chromium automatizado. O Safari em iPhone físico, leitores de tela reais, instalação/atualização de PWA em HTTPS e impressão física exigem testes adicionais. Se uma instalação antiga de PWA mostrar dados/arquivos misturados, feche abas antigas, atualize o site com conexão e verifique se os arquivos e o cache instalado são da mesma versão. Remover os dados do site como último recurso apagará preferências e consultas locais; faça isso somente se aceitar perdê-las. Não interprete a etiqueta `Offline` como conferência online de vigência comercial.

Consulte `MASTER_AUDIT_BEFORE_AFTER.md`, `QA_REPORT.md` e `CHANGELOG.md` para evidências e itens ainda pendentes.
