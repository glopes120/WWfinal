# 🔑 APIs Mais Estáveis - Guia Completo de Configuração

## 🎯 Nova Solução Implementada!

Substituí o Yahoo Finance por APIs **MUITO MAIS ESTÁVEIS** que:
- ✅ Funcionam melhor com CORS
- ✅ São mais rápidas e confiáveis  
- ✅ Têm rate limits generosos
- ✅ Não travam a aplicação

## 📊 Ordem de Prioridade (Sistema tenta nesta ordem)

## 🎯 APIs Recomendadas (Por Ordem de Prioridade)

### 1. **Finnhub** ⭐ RECOMENDADO - MUITO ESTÁVEL!
- ✅ **CORS habilitado** (funciona direto do navegador!)
- ✅ **Gratuita**: 60 requisições/minuto
- ✅ **Muito estável** e confiável
- ✅ **Sem necessidade de cartão**

**Como obter:**
1. Vá para: https://finnhub.io/register
2. Crie conta (30 segundos)
3. Vá em "API Key" no dashboard
4. Copie sua API key
5. Adicione ao `.env`:
   ```env
   VITE_FINNHUB_API_KEY=sua_chave_aqui
   ```

---

### 2. **Twelve Data** ⭐ MUITO BOM!
- ✅ **CORS habilitado**
- ✅ **Gratuita**: 800 requisições/dia
- ✅ **Muito estável**
- ✅ **Fácil de usar**

**Como obter:**
1. Vá para: https://twelvedata.com/
2. Clique em "Get Started Free"
3. Crie conta
4. Vá em "API Keys" no dashboard
5. Copie sua API key
6. Adicione ao `.env`:
   ```env
   VITE_TWELVE_DATA_API_KEY=sua_chave_aqui
   ```

---

### 3. **Alpha Vantage** (Já conhecida)
- ✅ **Gratuita**: 25 requisições/dia, 5/minuto
- ⚠️ Rate limits mais restritivos
- ✅ **Funciona bem quando disponível**

**Como obter:**
1. Vá para: https://www.alphavantage.co/support/#api-key
2. Preencha o formulário (30 segundos)
3. Você recebe a key imediatamente
4. Adicione ao `.env`:
   ```env
   VITE_ALPHA_VANTAGE_API_KEY=sua_chave_aqui
   ```

---

## 📝 Arquivo .env Completo

Crie um arquivo `.env` na raiz do projeto:

```env
# Ativar APIs reais (true por padrão, mas pode definir explicitamente)
VITE_USE_REAL_PRICES=true

# Finnhub (RECOMENDADO - muito estável!)
VITE_FINNHUB_API_KEY=sua_chave_finnhub_aqui

# Twelve Data (também muito bom!)
VITE_TWELVE_DATA_API_KEY=sua_chave_twelve_aqui

# Alpha Vantage (opcional)
VITE_ALPHA_VANTAGE_API_KEY=sua_chave_alphavantage_aqui
```

---

## 🚀 Ordem de Prioridade das APIs

O sistema tenta na seguinte ordem (a primeira que funcionar é usada):

1. **CoinGecko** (Criptomoedas - BTC, ETH) ✅ SEM API KEY NECESSÁRIA!
2. **Finnhub** (Ações/ETFs) - Se tiver API key
3. **Twelve Data** (Ações/ETFs) - Se tiver API key
4. **Alpha Vantage** (Ações/ETFs) - Se tiver API key
5. **Yahoo Finance** (Último recurso - pode ter CORS)

---

## 💡 Por que Finnhub é Recomendado?

✅ **CORS habilitado** - Funciona direto do navegador sem problemas
✅ **60 req/min** - Suficiente para uso normal
✅ **Muito estável** - Raramente tem downtime
✅ **Gratuita** - Sem necessidade de cartão
✅ **Fácil setup** - 2 minutos para configurar

---

## ⚡ Setup Rápido (1 minuto)

1. **Finnhub** (mais fácil):
   - https://finnhub.io/register
   - Copie API key
   - Adicione ao `.env`: `VITE_FINNHUB_API_KEY=abc123...`
   - Reinicie o servidor

2. **Pronto!** Agora as ações terão preços reais! 🎉

---

## 🔍 Como Testar se Está Funcionando?

1. Abra o Marketplace ou Portfolio
2. Veja o banner no topo:
   - 🟢 **Verde** = Usando preços reais!
   - 🟡 **Amarelo** = Usando simulação (APIs não configuradas)
3. Verifique o console (F12):
   - Se ver `[MarketData] Finnhub unavailable...` = API key não configurada
   - Se não ver erros = Funcionando!

---

## 📊 Comparação de APIs

| API | CORS? | Rate Limit | Estabilidade | Recomendado? |
|-----|-------|------------|--------------|--------------|
| **Finnhub** | ✅ Sim | 60/min | ⭐⭐⭐⭐⭐ | ✅ SIM! |
| **Twelve Data** | ✅ Sim | 800/dia | ⭐⭐⭐⭐ | ✅ SIM! |
| **Alpha Vantage** | ✅ Sim | 25/dia | ⭐⭐⭐ | ⚠️ Ok |
| **Yahoo Finance** | ❌ Não | Variável | ⭐⭐ | ❌ Não recomendado |
| **CoinGecko** | ✅ Sim | Variável | ⭐⭐⭐⭐⭐ | ✅ Para crypto! |

---

## 🎯 Resultado

Com **Finnhub** ou **Twelve Data** configurado:
- ✅ Preços reais de ações funcionando perfeitamente!
- ✅ Sem problemas de CORS
- ✅ Muito mais estável que Yahoo Finance
- ✅ Atualizações em tempo real
- ✅ Nunca trava!

**Recomendação**: Configure pelo menos **Finnhub** (gratuito e muito fácil!)
