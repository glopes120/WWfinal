# Configuração de Preços em Tempo Real

## 📊 Status Atual

**⚠️ IMPORTANTE: Por padrão, o sistema usa PREÇOS SIMULADOS (funciona perfeitamente!)**

### Por que simulação por padrão?

As APIs de mercado frequentemente têm problemas de **CORS** (Cross-Origin Resource Sharing) quando acessadas diretamente do navegador. Para garantir que a aplicação sempre funcione, os preços simulados são o padrão.

### ✅ Funcionalidades Implementadas

1. **Sistema Híbrido Inteligente**: 
   - Por padrão: Usa preços simulados (sempre funciona)
   - Opcional: Pode ativar preços reais via configuração
   - Auto-fallback: Se APIs falharem, volta automaticamente para simulação

2. **Auto-refresh**: Atualiza preços automaticamente a cada 60 segundos
3. **Cache Inteligente**: Evita muitas requisições desnecessárias (cache de 1 minuto)
4. **Tratamento de Erros Robusto**: Nunca quebra a aplicação, sempre tem fallback
5. **APIs Suportadas** (quando ativadas):
   - ✅ **CoinGecko** (Criptomoedas) - GRATUITA, sem API key
   - ⚠️ **Yahoo Finance** (Ações/ETFs) - Pode ter problemas de CORS
   - ⚠️ **Alpha Vantage** (Ações) - Requer API key gratuita

### ⚠️ Limitações Atuais

- **Yahoo Finance**: Pode ter rate limits (limite de requisições)
- **Alpha Vantage**: Necessita de API key (gratuita, mas com limite de 25 requisições/dia no plano free)
- **CoinGecko**: Funciona bem, mas pode ser mais lenta

## 🚀 Como Ativar Preços Reais (OPCIONAL)

⚠️ **Nota**: Devido a problemas de CORS comuns, os preços simulados são o padrão e funcionam perfeitamente para testes e demonstração.

### Opção 1: Ativar APIs (Pode ter problemas de CORS)

Para tentar usar APIs reais (pode não funcionar devido a CORS):

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione:
   ```env
   VITE_USE_REAL_PRICES=true
   ```
3. Reinicie o servidor

**⚠️ AVISO**: Isso pode causar erros de CORS. Se acontecer, o sistema automaticamente volta para simulação.

### Opção 2: Alpha Vantage (Para mais ações)

1. Vá para [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Obtenha uma API key gratuita (demora ~30 segundos)
3. Adicione ao arquivo `.env` na raiz do projeto:

```env
VITE_ALPHA_VANTAGE_API_KEY=sua_api_key_aqui
```

4. Reinicie o servidor de desenvolvimento

### Opção 3: Outras APIs (Avançado)

Você pode adicionar suporte para outras APIs editando:
- `src/services/marketDataService.js`

Algumas opções:
- **Polygon.io** (gratuita para uso básico)
- **IEX Cloud** (gratuita com limites)
- **Finnhub** (gratuita com rate limits)

## 📈 Como Funciona

1. **Por Padrão**: Usa preços simulados (funciona sempre, sem erros)
2. **Se ativado**: Tenta buscar preços reais primeiro
3. **Se API falhar**: Volta automaticamente para valores simulados (nunca quebra)
4. **Auto-refresh**: Atualiza a cada 60 segundos automaticamente
5. **Cache**: Mantém preços em cache por 1 minuto para evitar muitas requisições
6. **Timeout**: Requisições têm timeout de 5 segundos para não travar

## 🎯 Indicadores Visuais

- **Ponto verde (●)** ao lado do ticker = Preço real do mercado
- **Sem ponto** = Preço simulado (fallback)
- **Banner azul no topo** = Mostra se está usando preços reais ou simulados

## 🔧 Troubleshooting

### Está usando preços simulados?
**✅ Isso é NORMAL e ESPERADO!** Os preços simulados funcionam perfeitamente para:
- Testes e desenvolvimento
- Demonstrações
- Aprendizado da aplicação
- Funcionalidade completa sem dependências externas

### Erros de CORS?
Se tentou ativar preços reais e vê erros de CORS:
- **Isso é esperado** - APIs externas frequentemente bloqueiam requisições do navegador
- **Solução**: Use preços simulados (já é o padrão) OU crie um backend intermediário
- O sistema automaticamente volta para simulação se detectar erros

### Rate Limits? (se usando APIs)
- CoinGecko: ~10-50 requisições/minuto
- Yahoo Finance: Pode variar
- Alpha Vantage: 25 requisições/dia no plano free

### Como saber se está usando preços reais?
- Veja o banner no topo do Marketplace/Portfolio
- Preços reais mostram um ponto verde (●) ao lado do ticker
- Banner verde = preços reais funcionando
- Banner amarelo = usando simulação (padrão)

## 💡 Melhorias Futuras

- [ ] Backend intermediário para evitar CORS
- [ ] WebSockets para atualizações em tempo real
- [ ] Suporte para mais exchanges de cripto
- [ ] Histórico de preços real
- [ ] Alertas de preço

## 📝 Notas Importantes

⚠️ **Para uso em produção**, recomenda-se:
1. Usar um backend intermediário para proteger API keys
2. Implementar rate limiting adequado
3. Considerar planos pagos das APIs para maior confiabilidade
4. Adicionar tratamento de erros mais robusto

---

## 📝 Resumo Final

**Status Atual**: 
- ✅ **Preços simulados por padrão** (funciona perfeitamente, sem erros)
- ⚠️ **Preços reais opcionais** (pode ter problemas de CORS - precisa configuração)

**Recomendação**: 
- Para uso imediato: **Use os preços simulados** (já está ativo)
- Para produção real: Crie um **backend intermediário** para evitar CORS

**Atualização**: Automática a cada 60 segundos (mesmo com simulação)
**Fallback**: Sempre disponível - nunca quebra a aplicação

---

**✅ A aplicação está funcionando perfeitamente com preços simulados!**
