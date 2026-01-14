// Market Data Service - Híbrido: APIs Reais para Crypto, Simulação para o resto
// Crypto: CoinGecko (funciona bem!)
// Stocks/ETFs: Simulação (sem CORS, sempre funciona!)

// Configuration
const USE_REAL_CRYPTO = true; // APIs reais para crypto (CoinGecko funciona!)
const USE_SIMULATION_STOCKS = true; // Simulação para ações/ETFs (mais estável!)

// API para Crypto (CoinGecko funciona bem sem CORS!)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Mapeamento de tickers crypto para CoinGecko IDs
const CRYPTO_MAPPINGS = Object.freeze({
  'BTC': 'bitcoin',
  'ETH': 'ethereum'
});

// Helper para verificar se ticker é crypto
const isCryptoTicker = (ticker) => {
  if (!ticker || typeof ticker !== 'string') return false;
  if (typeof CRYPTO_MAPPINGS === 'undefined' || !CRYPTO_MAPPINGS) return false;
  const tickerUpper = ticker.toUpperCase();
  return CRYPTO_MAPPINGS.hasOwnProperty(tickerUpper);
};

// Helper para obter CoinGecko ID
const getCoinGeckoId = (ticker) => {
  if (!ticker || typeof ticker !== 'string') return null;
  if (typeof CRYPTO_MAPPINGS === 'undefined' || !CRYPTO_MAPPINGS) return null;
  const tickerUpper = ticker.toUpperCase();
  return CRYPTO_MAPPINGS[tickerUpper] || null;
};

// Base de dados de preços simulados (mais realistas)
const PRICE_DATABASE = {
  // Stocks
  'AAPL': { base: 185, name: 'Apple Inc.', volatility: 2.5, trend: 0.1 },
  'MSFT': { base: 410, name: 'Microsoft Corp.', volatility: 2.0, trend: 0.15 },
  'GOOGL': { base: 170, name: 'Alphabet Inc.', volatility: 2.8, trend: 0.12 },
  'AMZN': { base: 180, name: 'Amazon.com Inc.', volatility: 3.0, trend: 0.2 },
  'META': { base: 480, name: 'Meta Platforms', volatility: 3.5, trend: 0.18 },
  'NVDA': { base: 900, name: 'NVIDIA Corp.', volatility: 4.5, trend: 0.25 },
  'TSLA': { base: 240, name: 'Tesla Inc.', volatility: 5.5, trend: -0.1 },
  'NFLX': { base: 620, name: 'Netflix Inc.', volatility: 3.0, trend: 0.05 },
  'AMD': { base: 160, name: 'Adv. Micro Devices', volatility: 4.0, trend: 0.22 },
  'PLTR': { base: 24, name: 'Palantir Tech', volatility: 6.0, trend: 0.3 },
  'COIN': { base: 250, name: 'Coinbase Global', volatility: 7.0, trend: 0.15 },
  'UBER': { base: 75, name: 'Uber Tech', volatility: 3.0, trend: 0.08 },
  'JPM': { base: 195, name: 'JPMorgan Chase', volatility: 1.8, trend: 0.05 },
  'V': { base: 280, name: 'Visa Inc.', volatility: 1.5, trend: 0.06 },
  'DIS': { base: 115, name: 'Walt Disney Co.', volatility: 2.5, trend: 0.03 },
  'KO': { base: 60, name: 'Coca-Cola Co.', volatility: 0.8, trend: 0.02 },
  'PEP': { base: 170, name: 'PepsiCo Inc.', volatility: 0.9, trend: 0.02 },
  'MCD': { base: 270, name: 'McDonald\'s Corp.', volatility: 1.2, trend: 0.04 },
  
  // ETFs
  'SPY': { base: 510, name: 'S&P 500 Index Fund', volatility: 1.0, trend: 0.08 },
  'VOO': { base: 470, name: 'Vanguard S&P 500', volatility: 1.0, trend: 0.08 },
  'QQQ': { base: 440, name: 'Invesco QQQ', volatility: 1.5, trend: 0.12 },
  'TECH': { base: 350, name: 'Tech Growth ETF', volatility: 2.0, trend: 0.15 },
  'EM': { base: 98, name: 'Emerging Markets', volatility: 2.5, trend: 0.06 },
  'VNQ': { base: 87, name: 'Vanguard Real Estate ETF', volatility: 1.5, trend: 0.04 },
  
  // Bonds & REITs
  'BOND': { base: 98, name: 'Bond Fund', volatility: 0.5, trend: 0.01 },
  'REIT': { base: 65, name: 'Real Estate REIT', volatility: 1.8, trend: 0.05 },
  'AGG': { base: 99, name: 'iShares Core US Bond ETF', volatility: 0.3, trend: 0.01 },
  
  // Crypto
  'BTC': { base: 43521, name: 'Bitcoin', volatility: 8.0, trend: 0.2 },
  'ETH': { base: 2284, name: 'Ethereum', volatility: 7.0, trend: 0.18 }
};

// Cache para evitar muitas requisições
const priceCache = new Map();
const CACHE_DURATION = 60000; // 1 minuto em cache

// Timeout para requisições (evita travamento)
const REQUEST_TIMEOUT = 8000; // 8 segundos (aumentado um pouco)

// Helper para gerar preço simulado baseado em seed e tempo
const generateSimulatedPrice = (ticker) => {
  const stock = PRICE_DATABASE[ticker] || { 
    base: 100, 
    name: ticker, 
    volatility: 2.0, 
    trend: 0 
  };
  
  const today = new Date();
  // Seed baseado no ticker e data (garante consistência durante o dia)
  let seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + 
             today.getFullYear() * 365 + 
             today.getMonth() * 30 + 
             today.getDate();
  
  // Gerador pseudo-aleatório determinístico
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return (seed / 233280) - 0.5; // -0.5 a 0.5
  };
  
  // Preço base com tendência (trend acumula ao longo do tempo)
  const hoursSinceStartOfDay = today.getHours() + today.getMinutes() / 60;
  const trendAdjustment = stock.trend * (hoursSinceStartOfDay / 24);
  
  // Volatilidade diária (maior variação)
  const dailyVolatility = stock.volatility * (1 + Math.sin(hoursSinceStartOfDay * Math.PI / 12) * 0.3);
  const randomChange = random() * (stock.base * (dailyVolatility / 100));
  
  // Preço atual = base + tendência + variação aleatória
  let currentPrice = stock.base * (1 + trendAdjustment) + randomChange;
  
  // Garantir que não fica negativo ou muito baixo
  if (currentPrice < stock.base * 0.1) {
    currentPrice = stock.base * 0.1;
  }
  
  // Calcular mudança percentual do dia
  const baseWithTrend = stock.base * (1 + trendAdjustment);
  const prevClose = baseWithTrend * (1 - (dailyVolatility / 100) * 0.3); // Simula preço de fechamento anterior
  const change = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
  
  // Volume simulado (formato string)
  const volumeMultiplier = stock.base > 1000 ? 1 : stock.base > 100 ? 10 : 100;
  const volumeValue = Math.abs(randomChange) * volumeMultiplier * 1000000;
  const volumeStr = volumeValue >= 1000000000 
    ? `${(volumeValue / 1000000000).toFixed(1)}B`
    : volumeValue >= 1000000
    ? `${(volumeValue / 1000000).toFixed(1)}M`
    : `${(volumeValue / 1000).toFixed(1)}K`;
  
  return {
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    volume: volumeStr,
    name: stock.name,
    source: 'simulated',
    timestamp: Date.now()
  };
};

// Helper para verificar se cache é válido
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

// Helper para fazer fetch com timeout e retry
const fetchWithTimeout = async (url, options = {}, timeout = REQUEST_TIMEOUT, retries = 1) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit', // Não envia cookies (evita problemas CORS)
      headers: {
        'Accept': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok && retries > 0 && response.status >= 500) {
      // Retry em caso de erro do servidor
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithTimeout(url, options, timeout, retries - 1);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    // Se for erro de rede e ainda tiver retries, tenta novamente
    if (retries > 0 && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithTimeout(url, options, timeout, retries - 1);
    }
    
    throw error;
  }
};

// Buscar preço REAL de crypto via CoinGecko (funciona bem!)
export const fetchCryptoPrice = async (ticker) => {
  if (!USE_REAL_CRYPTO) {
    // Se desabilitado, usa simulação
    const simulated = generateSimulatedPrice(ticker);
    return {
      price: simulated.price,
      change: simulated.change,
      volume24h: simulated.volume,
      name: simulated.name,
      source: 'simulated',
      timestamp: Date.now()
    };
  }

  try {
    const cacheKey = `crypto_${ticker}`;
    const cached = priceCache.get(cacheKey);
    
    // Cache de 1 minuto para CoinGecko
    if (isCacheValid(cached)) {
      return cached.data;
    }

    const coinId = getCoinGeckoId(ticker);
    if (!coinId) {
      // Se não for BTC ou ETH, usa simulação
      const simulated = generateSimulatedPrice(ticker);
      return {
        price: simulated.price,
        change: simulated.change,
        volume24h: simulated.volume,
        name: simulated.name,
        source: 'simulated',
        timestamp: Date.now()
      };
    }

    // Tenta buscar preço REAL via CoinGecko
    const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    }, REQUEST_TIMEOUT, 0);

    if (!response.ok) {
      throw new Error(`CoinGecko error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error || !data[coinId] || typeof data[coinId].usd !== 'number') {
      throw new Error('Invalid CoinGecko response');
    }

    const coinData = data[coinId];
    
    // Formatar volume 24h se disponível
    let volumeStr = '0B';
    if (coinData.usd_24h_vol) {
      const vol = coinData.usd_24h_vol;
      if (vol >= 1000000000) {
        volumeStr = `${(vol / 1000000000).toFixed(1)}B`;
      } else if (vol >= 1000000) {
        volumeStr = `${(vol / 1000000).toFixed(1)}M`;
      }
    }
    
    const result = {
      price: parseFloat(coinData.usd.toFixed(2)),
      change: parseFloat((coinData.usd_24h_change || 0).toFixed(2)),
      volume24h: volumeStr,
      name: PRICE_DATABASE[ticker.toUpperCase()]?.name || ticker,
      source: 'coingecko',
      timestamp: Date.now()
    };

    priceCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
    
  } catch (error) {
    // Se falhar, usa simulação como fallback
    if (import.meta.env.DEV) {
      console.warn(`[MarketData] CoinGecko failed for ${ticker}, using simulation:`, error.message);
    }
    
    const simulated = generateSimulatedPrice(ticker);
    return {
      price: simulated.price,
      change: simulated.change,
      volume24h: simulated.volume,
      name: simulated.name,
      source: 'simulated',
      timestamp: Date.now()
    };
  }
};


// Buscar preço simulado de ação (sempre funciona!)
export const fetchStockPriceSimulated = async (ticker) => {
  try {
    const cacheKey = `stock_${ticker}`;
    const cached = priceCache.get(cacheKey);
    
    // Atualiza a cada 30 segundos para simular movimento de preço
    if (isCacheValid(cached) && (Date.now() - cached.timestamp) < 30000) {
      return cached.data;
    }

    // Simula delay de rede (opcional)
    await new Promise(resolve => setTimeout(resolve, 100));

    const simulated = generateSimulatedPrice(ticker);
    
    const result = {
      price: simulated.price,
      change: simulated.change,
      volume: simulated.volume,
      name: simulated.name,
      source: 'simulated',
      timestamp: Date.now()
    };

    priceCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[MarketData] Simulation error for ${ticker}:`, error);
    return null;
  }
};


// Função principal - APIs REAIS para Crypto, SIMULAÇÃO para o resto
export const fetchMarketPrice = async (ticker, category = 'stocks') => {
  try {
    // Crypto: Tenta API REAL primeiro (CoinGecko funciona bem!)
    const tickerUpper = ticker.toUpperCase();
    const isCrypto = category === 'crypto' || isCryptoTicker(ticker);
    
    if (isCrypto) {
      const cryptoData = await Promise.race([
        fetchCryptoPrice(ticker),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
        )
      ]);
      
      if (cryptoData && cryptoData.price && cryptoData.price > 0) {
        return cryptoData;
      }
    }

    // Ações/ETFs: SEMPRE usa simulação (mais estável, sem CORS!)
    if (category === 'stocks' || category === 'etfs' || category === 'reits' || category === 'bonds') {
      const stockData = await fetchStockPriceSimulated(ticker);
      if (stockData) return stockData;
    }

    // Se não encontrou no database, cria um genérico simulado
    const genericPrice = generateSimulatedPrice(ticker);
    return {
      price: genericPrice.price,
      change: genericPrice.change,
      volume: genericPrice.volume || '0M',
      source: 'simulated',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`[MarketData] Error for ${ticker}:`, error);
    // Fallback: simulação básica
    const fallback = generateSimulatedPrice(ticker);
    return {
      price: fallback.price,
      change: fallback.change,
      volume: fallback.volume || '0M',
      source: 'simulated',
      timestamp: Date.now()
    };
  }
};

// Limpar cache manualmente
export const clearPriceCache = () => {
  priceCache.clear();
};

// Obter estatísticas do cache
export const getCacheStats = () => {
  return {
    size: priceCache.size,
    entries: Array.from(priceCache.keys()),
    useRealPrices: USE_REAL_PRICES
  };
};

// Verificar se APIs reais estão habilitadas
export const isRealPricesEnabled = () => {
  return USE_REAL_CRYPTO; // Retorna true se crypto está usando APIs reais
};
