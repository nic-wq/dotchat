# dotchat

Uma aplicação de chat segura ponto-a-ponto desenvolvida com Electron, oferecendo criptografia end-to-end para comunicações privadas através de redes locais ou pela internet.

## Visão Geral

O dotchat é uma aplicação desktop leve que permite mensagens seguras em tempo real entre duas partes sem depender de serviços externos. A aplicação cria um servidor WebSocket local que pode ser acessado por clientes remotos, com todas as comunicações protegidas por criptografia end-to-end utilizando a biblioteca criptográfica NaCl.

## Principais Funcionalidades

- **Modo Servidor**: Crie e hospede uma sala de chat privada
- **Modo Cliente**: Conecte-se a salas de chat existentes via endpoints WebSocket
- **Criptografia End-to-End**: Criptografia automática de mensagens usando TweetNaCl/NaCl Box
- **Multiplataforma**: Compatível com Windows, macOS e Linux
- **Flexibilidade de Rede**: Suporta conexões localhost, LAN e internet
- **Zero Dependências**: Aplicação autocontida sem requisitos de serviços externos

## Instalação e Configuração

### Pré-requisitos
- Node.js (v16 ou superior)
- Gerenciador de pacotes npm ou yarn

### Instalação
```bash
# Clone o repositório
git clone <url-do-repositorio>
cd dotchat

# Instale as dependências
npm install

# Execute a aplicação
npm start
```

## Utilização

### Modo Servidor (Anfitrião)
1. Selecione "Servir" na interface principal
2. Configure a porta do servidor (padrão: 3000) e seu nome de exibição
3. Clique em "Iniciar Servidor" para iniciar o servidor WebSocket
4. Compartilhe as URLs de endpoint geradas com seu parceiro de comunicação
5. Clique em "Entrar no chat" para participar da sua própria sala hospedada

### Modo Cliente (Convidado)
1. Selecione "Entrar" na interface principal
2. Insira o endpoint WebSocket fornecido pelo anfitrião (formato: `ws://host:porta/ws`)
3. Forneça seu nome de exibição
4. Clique em "Entrar" para estabelecer a conexão

## Arquitetura de Segurança

### Implementação de Criptografia
O dotchat implementa criptografia end-to-end utilizando a biblioteca criptográfica TweetNaCl:

- **Troca de Chaves**: Chaves públicas são automaticamente trocadas ao estabelecer a conexão
- **Criptografia de Mensagens**: Todas as mensagens são criptografadas localmente antes da transmissão
- **Perfect Forward Secrecy**: Novos pares de chaves são gerados para cada sessão
- **Sem Armazenamento no Servidor**: Mensagens e chaves nunca são armazenadas no servidor

### Considerações de Segurança
- **Limitação de Duas Partes**: Projetado para comunicação segura entre exatamente dois participantes
- **Baseado em Sessão**: Sem histórico persistente de mensagens ou autenticação de usuário
- **Exposição de Rede**: Anfitriões devem estar cientes das implicações de firewall e segurança de rede
- **Modelo de Confiança**: A segurança depende da troca segura do endpoint WebSocket inicial

## Distribuição de Build

### Linux AppImage
```bash
npm run build:appimage
```

### Build Universal
```bash
npm run build
```

Os artefatos de build estarão disponíveis no diretório `dist/`.

## Especificações Técnicas

### Stack Tecnológico
- **Frontend**: HTML/CSS/JavaScript vanilla
- **Backend**: Node.js com Express e WebSocket (ws)
- **Framework Desktop**: Electron
- **Criptografia**: TweetNaCl para criptografia end-to-end
- **Sistema de Build**: electron-builder

### Estrutura do Projeto
- `main.js` - Processo principal do Electron e implementação do servidor WebSocket
- `preload.js` - Ponte IPC segura e interface criptográfica
- `renderer/` - Componentes da interface do usuário e lógica do lado cliente
- `package.json` - Configuração do projeto e dependências

### Configuração de Rede
A aplicação gera automaticamente endpoints de conexão para:
- **localhost**: `ws://localhost:porta/ws`
- **Endereços LAN**: `ws://192.168.x.x:porta/ws`
- **hostname**: `ws://hostname:porta/ws`

## Referência da API

### Tipos de Mensagem WebSocket
- `presence:join` - Anúncio de presença do usuário
- `message` - Mensagem de texto simples (fallback)
- `message:e2e` - Payload de mensagem criptografada
- `crypto:pubkey` - Troca de chave pública
- `system` - Notificações do sistema geradas pelo servidor

### Métodos IPC do Electron
- `serve:start` - Inicializar servidor WebSocket
- `serve:stop` - Encerrar servidor WebSocket

## Configuração

### Personalização de Ambiente
A porta do servidor e vinculação de rede podem ser configuradas através da interface da aplicação. Para configuração avançada, modifique os parâmetros relevantes em `main.js`.

### Personalização da Interface
O estilo da interface pode ser modificado através das propriedades CSS customizadas em `renderer/styles.css`.

## Limitações

- **Limite de Participantes**: Suporta exatamente dois participantes por sessão
- **Sem Persistência**: Mensagens não são armazenadas e são perdidas quando a sessão termina
- **Sem Autenticação**: Controle de acesso limitado ao conhecimento do endpoint WebSocket
- **Dependência de Rede**: Requer conectividade de rede estável entre os participantes

## Contribuindo

Contribuições são bem-vindas. Por favor, certifique-se de que qualquer pull request:
- Siga o estilo de código e padrões existentes
- Inclua documentação apropriada
- Aborde considerações de segurança para quaisquer mudanças criptográficas
- Inclua testes para novas funcionalidades

## Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo LICENSE para detalhes.

## Suporte

Para questões técnicas ou solicitações de recursos, utilize o rastreador de issues do projeto.
