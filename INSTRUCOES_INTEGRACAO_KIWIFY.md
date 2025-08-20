# 📋 Guia Completo de Integração Kiwify

## ✅ Status das Modificações
- [x] Edge Functions atualizadas (sync-subscription e user-registration-webhook)
- [x] Fluxo N8N criado (kiwify-n8n-workflow.json)
- [x] Detecção automática de pagamentos Kiwify
- [x] Prefixo `KW_` implementado para subscription IDs

## 🚀 Passo a Passo Implementação

### **1. Configuração N8N**

#### 1.1. Importar o Fluxo
1. Acesse seu N8N
2. Clique em "Import from File"
3. Selecione o arquivo `kiwify-n8n-workflow.json`
4. O fluxo será importado com todos os nós configurados

#### 1.2. Configurar Credenciais
**Evolution API:**
- Node: `VerificaNumeroWhatsKiwify` e `EnviaWhatsappKiwify`
- Configure suas credenciais da Evolution API

**Gmail:**
- Node: `EnviaEmailKiwify`
- Configure OAuth2 do Gmail

**Supabase:**
- Node: `AtualizaInfoUserKiwify`
- Configure com sua API Key do Supabase

**Tokens HTTP:**
- Configure o Bearer Token para autenticação com Supabase

#### 1.3. Ativar o Webhook
1. Ative o nó `WebhookKiwify`
2. Copie a URL gerada (será algo como: `https://seu-n8n.com/webhook/kiwify-webhook`)
3. Esta URL será usada no Kiwify

### **2. Configuração Kiwify**

#### 2.1. Acessar Painel Kiwify
1. Faça login no seu painel Kiwify
2. Vá em **Configurações** → **Webhooks**
3. Clique em **Adicionar Webhook**

#### 2.2. Configurar Webhook
- **URL do Webhook:** Cole a URL do N8N (step 1.3)
- **Eventos:** Selecione:
  - ✅ `compra_aprovada`
  - ✅ `compra_reembolsada` (opcional)
  - ✅ `assinatura_cancelada` (opcional)
- **Método:** POST
- **Autenticação:** Configure se necessário

#### 2.3. Testar Webhook
1. Use a função "Testar Webhook" do Kiwify
2. Verifique se o N8N recebe os dados
3. Confirme a estrutura dos dados no log do N8N

### **3. Estrutura de Dados Esperada (Kiwify)**

O webhook da Kiwify deve enviar dados no formato:
```json
{
  "event": "compra_aprovada",
  "customer": {
    "email": "cliente@email.com",
    "name": "Nome Cliente",
    "phone": "+5511999999999"
  },
  "product": {
    "id": "produto_id",
    "name": "Nome do Produto"
  },
  "order": {
    "id": "order_123",
    "amount": 5.00,
    "currency": "BRL"
  },
  "subscription": {
    "id": "sub_kiwify_123",
    "status": "active"
  }
}
```

### **4. Validação Backend (Supabase)**

#### 4.1. Edge Functions Atualizadas
As seguintes functions foram modificadas para suportar Kiwify:

**sync-subscription/index.ts:**
- ✅ Detecta IDs que começam com `KW_` ou `kiwify_`
- ✅ Cria dados padrão para assinaturas Kiwify
- ✅ Plano: "Kiwify - Plano Anual"

**user-registration-webhook/index.ts:**
- ✅ Detecta automaticamente provider `kiwify`
- ✅ Mapeia dados do webhook para formato interno
- ✅ Adiciona prefixo `KW_` aos subscription IDs

#### 4.2. Identificação Automática
O sistema detecta Kiwify quando:
- `subscription_id` contém "kiwify"
- `subscription_id` começa com "KW_"
- `payment_provider` = "kiwify"

### **5. Fluxo N8N Detalhado**

#### 5.1. Nós Principais:
1. **WebhookKiwify:** Recebe dados da Kiwify
2. **FiltraDadosKiwify:** Extrai campos necessários
3. **FiltrarEventoCompraAprovada:** Processa apenas compras aprovadas
4. **ChamaWebhookRegistroKiwify:** Chama edge function de registro
5. **VerificaNumeroWhatsKiwify:** Valida número WhatsApp
6. **GeraSenhaAleatoria2:** Gera senha de 7 dígitos
7. **CriaContaKiwify:** Cria conta no Supabase Auth
8. **AtualizaInfoUserKiwify:** Atualiza perfil com dados Kiwify
9. **EnviaWhatsappKiwify:** Envia confirmação WhatsApp
10. **EnviaEmailKiwify:** Envia email com dados de acesso

#### 5.2. Mapeamento de Dados:
- **Email:** `body.customer.email`
- **Nome:** `body.customer.name`
- **Telefone:** `body.customer.phone`
- **Subscription ID:** `KW_` + `body.subscription.id` ou `body.order.id`
- **Event Type:** `body.event`

### **6. Testes e Validação**

#### 6.1. Teste Local
1. Execute uma compra teste na Kiwify
2. Verifique logs do N8N para confirmar recebimento
3. Valide criação de usuário no Supabase
4. Confirme recebimento de email e WhatsApp

#### 6.2. Verificar no Supabase
**Tabela `profiles`:**
- ✅ Campo `assinaturaid` com prefixo `KW_`
- ✅ Campo `customerid` com email do cliente
- ✅ Campo `nome` com nome do cliente

**Tabela `subscriptions`:**
- ✅ `subscription_id` com prefixo `KW_`
- ✅ `status` = "active"
- ✅ `plan_name` = "Kiwify - Plano Anual"
- ✅ `amount` = 5.00

#### 6.3. Logs Importantes
**N8N Logs:**
- Webhook recebido
- Dados extraídos corretamente
- Conta criada com sucesso
- Notificações enviadas

**Supabase Logs:**
- User registration webhook executado
- Sync subscription executado
- Dados salvos corretamente

### **7. Troubleshooting**

#### 7.1. Problemas Comuns
**Webhook não recebe dados:**
- ✅ Verificar URL do webhook no Kiwify
- ✅ Confirmar que N8N está ativo
- ✅ Validar configuração de eventos no Kiwify

**Usuário não é criado:**
- ✅ Verificar credenciais Supabase no N8N
- ✅ Confirmar que edge functions estão funcionando
- ✅ Validar estrutura de dados recebida

**Notificações não são enviadas:**
- ✅ Verificar credenciais Evolution API e Gmail
- ✅ Confirmar que WhatsApp está configurado
- ✅ Validar template de email

#### 7.2. Debug
**Para debugar:**
1. Ativar logs no N8N
2. Verificar console do Supabase
3. Usar Postman/Insomnia para testar webhooks
4. Verificar dados na tabela `profiles` e `subscriptions`

### **8. Monitoramento**

#### 8.1. KPIs para Acompanhar
- Taxa de sucesso dos webhooks
- Tempo de processamento
- Usuários criados vs webhooks recebidos
- Falhas de notificação

#### 8.2. Alertas Recomendados
- Webhook falha por mais de 5 minutos
- Taxa de erro > 5%
- Usuário criado mas notificação falhou

---

## 🎯 Resumo da Implementação

1. **Backend:** ✅ Edge functions atualizadas para suportar Kiwify
2. **N8N:** ✅ Fluxo criado e pronto para importação
3. **Identificação:** ✅ Prefixo `KW_` implementado
4. **Detecção:** ✅ Automática baseada em padrões Kiwify
5. **Testes:** ⏳ Pendente configuração no seu ambiente

**Próximos Passos:**
1. Importar fluxo N8N (`kiwify-n8n-workflow.json`)
2. Configurar credenciais necessárias
3. Configurar webhook no painel Kiwify
4. Realizar teste completo
5. Monitorar primeira semana de funcionamento

**Suporte:**
- ✅ Edge functions deployadas automaticamente
- ✅ Logs implementados para debugging
- ✅ Fallbacks para casos de erro
- ✅ Compatibilidade com sistema existente

---

*Implementação concluída! O sistema agora suporta Kiwify além de Perfect Pay e Asaas.* 🚀