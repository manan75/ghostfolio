import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

function load(file) {
  return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function match(method, pathname, pattern) {
  if (method !== pattern.method) return null;

  const patternParts = pattern.path.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

const routes = [
  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/info',
    handler: (_params, _body) => load('info.json')
  },

  // ─── Auth ───────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/auth/anonymous',
    handler: () => ({ authToken: 'mock-jwt-token' })
  },
  {
    method: 'GET',
    path: '/api/v1/auth/anonymous/:token',
    handler: () => ({ authToken: 'mock-jwt-token' })
  },

  // ─── User ───────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/user',
    handler: () => load('user.json')
  },
  {
    method: 'PUT',
    path: '/api/v1/user/setting',
    handler: () => load('user.json')
  },
  {
    method: 'POST',
    path: '/api/v1/user',
    handler: () => ({
      accessToken: 'mock-access-token',
      authToken: 'mock-jwt-token',
      role: 'ADMIN'
    }),
    status: 201
  },
  {
    method: 'POST',
    path: '/api/v1/user/access-token',
    handler: () => ({ accessToken: 'mock-access-token-rotated' })
  },

  // ─── Accounts ───────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/account',
    handler: () => load('accounts.json')
  },
  {
    method: 'GET',
    path: '/api/v1/account/:id',
    handler: (params) => {
      const accounts = load('accounts.json');
      return (
        accounts.accounts.find((a) => a.id === params.id) ??
        accounts.accounts[0]
      );
    }
  },
  {
    method: 'GET',
    path: '/api/v1/account/:id/balances',
    handler: () => ({ balances: [] })
  },
  {
    method: 'POST',
    path: '/api/v1/account',
    handler: () => ({ id: 'mock-new-account' }),
    status: 201
  },
  {
    method: 'PUT',
    path: '/api/v1/account/:id',
    handler: () => ({ id: 'mock-account' })
  },
  {
    method: 'DELETE',
    path: '/api/v1/account/:id',
    handler: () => ({ id: 'mock-account' })
  },
  {
    method: 'POST',
    path: '/api/v1/account/transfer-balance',
    handler: () => ({}),
    status: 201
  },
  {
    method: 'POST',
    path: '/api/v1/account-balance',
    handler: () => ({ id: 'mock-balance' }),
    status: 201
  },
  {
    method: 'DELETE',
    path: '/api/v1/account-balance/:id',
    handler: () => ({ id: 'mock-balance' })
  },

  // ─── Activities ─────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/activities',
    handler: () => load('activities.json')
  },
  {
    method: 'GET',
    path: '/api/v1/activities/:id',
    handler: () => {
      const { activities } = load('activities.json');
      return activities[0];
    }
  },
  {
    method: 'POST',
    path: '/api/v1/activities',
    handler: () => ({ id: 'mock-activity' }),
    status: 201
  },
  {
    method: 'PUT',
    path: '/api/v1/activities/:id',
    handler: () => ({ id: 'mock-activity' })
  },
  {
    method: 'DELETE',
    path: '/api/v1/activities',
    handler: () => 0
  },
  {
    method: 'DELETE',
    path: '/api/v1/activities/:id',
    handler: () => ({ id: 'mock-activity' })
  },

  // ─── Portfolio ──────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/portfolio/details',
    handler: () => load('portfolio-details.json')
  },
  {
    method: 'GET',
    path: '/api/v1/portfolio/holdings',
    handler: () => load('portfolio-holdings.json')
  },
  {
    method: 'GET',
    path: '/api/v2/portfolio/performance',
    handler: () => load('portfolio-performance.json')
  },
  {
    method: 'GET',
    path: '/api/v1/portfolio/dividends',
    handler: () => load('portfolio-dividends.json')
  },
  {
    method: 'GET',
    path: '/api/v1/portfolio/investments',
    handler: () => load('portfolio-investments.json')
  },
  {
    method: 'GET',
    path: '/api/v1/portfolio/report',
    handler: () => load('portfolio-report.json')
  },
  {
    method: 'GET',
    path: '/api/v1/portfolio/holding/:dataSource/:symbol',
    handler: () => load('holding-detail.json')
  },
  {
    method: 'PUT',
    path: '/api/v1/portfolio/holding/:dataSource/:symbol/tags',
    handler: () => ({})
  },

  // ─── Benchmarks ─────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/benchmarks',
    handler: () => load('benchmarks.json')
  },
  {
    method: 'GET',
    path: '/api/v1/benchmarks/:dataSource/:symbol/:date',
    handler: () => ({ marketData: [] })
  },
  {
    method: 'POST',
    path: '/api/v1/benchmarks',
    handler: () => ({}),
    status: 201
  },
  {
    method: 'DELETE',
    path: '/api/v1/benchmarks/:dataSource/:symbol',
    handler: () => ({})
  },

  // ─── Market Data ────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/market-data/markets',
    handler: () => load('market-data-markets.json')
  },
  {
    method: 'GET',
    path: '/api/v1/market-data/:dataSource/:symbol',
    handler: () => ({ marketData: [] })
  },
  {
    method: 'POST',
    path: '/api/v1/market-data/:dataSource/:symbol',
    handler: () => ({}),
    status: 201
  },

  // ─── Tags ───────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/tags',
    handler: () => load('tags.json')
  },
  {
    method: 'POST',
    path: '/api/v1/tags',
    handler: () => ({ id: 'mock-tag', name: 'New Tag' }),
    status: 201
  },
  {
    method: 'PUT',
    path: '/api/v1/tags/:id',
    handler: () => ({ id: 'mock-tag' })
  },
  {
    method: 'DELETE',
    path: '/api/v1/tags/:id',
    handler: () => ({ id: 'mock-tag' })
  },

  // ─── Watchlist ──────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/watchlist',
    handler: () => load('watchlist.json')
  },
  {
    method: 'POST',
    path: '/api/v1/watchlist',
    handler: () => ({}),
    status: 201
  },
  {
    method: 'DELETE',
    path: '/api/v1/watchlist/:dataSource/:symbol',
    handler: () => ({})
  },

  // ─── Platforms ──────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/platforms',
    handler: () => load('platforms.json')
  },
  {
    method: 'GET',
    path: '/api/v1/platform',
    handler: () => load('platforms.json').platforms
  },
  {
    method: 'POST',
    path: '/api/v1/platform',
    handler: () => ({ id: 'mock-platform' }),
    status: 201
  },
  {
    method: 'PUT',
    path: '/api/v1/platform/:id',
    handler: () => ({ id: 'mock-platform' })
  },
  {
    method: 'DELETE',
    path: '/api/v1/platform/:id',
    handler: () => ({})
  },

  // ─── Symbol / Lookup ────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/symbol/lookup',
    handler: () => ({
      items: [
        {
          assetClass: 'EQUITY',
          assetSubClass: 'STOCK',
          currency: 'USD',
          dataProviderInfo: { name: 'Yahoo Finance' },
          dataSource: 'YAHOO',
          name: 'Apple Inc.',
          symbol: 'AAPL'
        },
        {
          assetClass: 'EQUITY',
          assetSubClass: 'ETF',
          currency: 'USD',
          dataProviderInfo: { name: 'Yahoo Finance' },
          dataSource: 'YAHOO',
          name: 'Vanguard S&P 500 ETF',
          symbol: 'VOO'
        }
      ]
    })
  },
  {
    method: 'GET',
    path: '/api/v1/symbol/:dataSource/:symbol',
    handler: () => ({
      currency: 'USD',
      dataSource: 'YAHOO',
      historicalData: [],
      marketPrice: 150.0,
      marketState: 'closed',
      name: 'Mock Symbol'
    })
  },
  {
    method: 'GET',
    path: '/api/v1/symbol/:dataSource/:symbol/:dateString',
    handler: () => ({ marketPrice: 150.0 })
  },

  // ─── Exchange Rates ─────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/exchange-rate/:symbol/:date',
    handler: () => ({ marketPrice: 1.0 })
  },

  // ─── Access ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/access',
    handler: () => []
  },
  {
    method: 'POST',
    path: '/api/v1/access',
    handler: () => ({ id: 'mock-access' }),
    status: 201
  },
  {
    method: 'PUT',
    path: '/api/v1/access/:id',
    handler: () => ({ id: 'mock-access' })
  },
  {
    method: 'DELETE',
    path: '/api/v1/access/:id',
    handler: () => ({ id: 'mock-access' })
  },

  // ─── Export ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/export',
    handler: () => load('export.json')
  },

  // ─── Import ─────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/import',
    handler: () => ({ activities: [] }),
    status: 201
  },
  {
    method: 'GET',
    path: '/api/v1/import/dividends/:dataSource/:symbol',
    handler: () => ({ activities: [] })
  },

  // ─── Asset ──────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/asset/:dataSource/:symbol',
    handler: () => ({
      assetClass: 'EQUITY',
      assetSubClass: 'STOCK',
      countries: [],
      currency: 'USD',
      dataSource: 'YAHOO',
      holdings: [],
      marketData: [],
      name: 'Mock Asset',
      sectors: [],
      symbol: 'MOCK'
    })
  },

  // ─── Health ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/health',
    handler: () => ({ status: 'OK' })
  },
  {
    method: 'GET',
    path: '/api/v1/health/data-provider/:dataSource',
    handler: () => ({ status: 'OK' })
  },

  // ─── AI Prompt ──────────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/ai/prompt/:mode',
    handler: () => ({
      prompt:
        'This is a mock AI prompt. The portfolio contains diversified assets across US stocks, international ETFs, bonds, and cryptocurrency.'
    })
  },

  // ─── Cache ──────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/cache/flush',
    handler: () => ({})
  },

  // ─── API Keys ───────────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/api-keys',
    handler: () => ({ apiKey: 'mock-api-key-1234' })
  },

  // ─── Public Portfolio ───────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/public/:accessId/portfolio',
    handler: () => ({
      holdings: {},
      performance: {
        '1d': { relativeChange: 0.0012 },
        ytd: { relativeChange: 0.0845 },
        max: { relativeChange: 0.3521 }
      }
    })
  },

  // ─── Admin (basic stubs) ────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/admin',
    handler: () => ({
      exchangeRates: [{ label: 'USD/EUR', value: 0.92 }],
      settings: {}
    })
  },
  {
    method: 'GET',
    path: '/api/v1/admin/market-data',
    handler: () => ({ count: 0, marketData: [] })
  },
  {
    method: 'GET',
    path: '/api/v1/admin/user',
    handler: () => ({ count: 1, users: [] })
  },
  {
    method: 'GET',
    path: '/api/v1/admin/user/:id',
    handler: () => load('user.json')
  },
  {
    method: 'GET',
    path: '/api/v1/admin/queue/job',
    handler: () => ({ jobs: [] })
  },
  {
    method: 'GET',
    path: '/api/v1/admin/queue/job/:id/execute',
    handler: () => ({})
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/queue/job/:id',
    handler: () => ({})
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/queue/job',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/gather',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/gather/max',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/gather/profile-data',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/gather/profile-data/:dataSource/:symbol',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/gather/:dataSource/:symbol',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/profile-data/:dataSource/:symbol',
    handler: () => ({})
  },
  {
    method: 'PATCH',
    path: '/api/v1/admin/profile-data/:dataSource/:symbol',
    handler: () => ({})
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/profile-data/:dataSource/:symbol',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/admin/market-data/:dataSource/:symbol/test',
    handler: () => ({ price: 150.0 })
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/settings/:key',
    handler: () => ({})
  },
  {
    method: 'GET',
    path: '/api/v1/admin/demo-user/sync',
    handler: () => ({})
  },

  // ─── Subscription ──────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/subscription/stripe/checkout-session',
    handler: () => ({ sessionId: 'mock-session' })
  },
  {
    method: 'POST',
    path: '/api/v1/subscription/redeem-coupon',
    handler: () => ({}),
    status: 201
  },

  // ─── Data Providers ─────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v2/data-providers/ghostfolio/status',
    handler: () => ({ dailyRequests: 0, dailyRequestsMax: 100 })
  },

  // ─── WebAuthn stubs ─────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/auth/webauthn/generate-registration-options',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/auth/webauthn/verify-attestation',
    handler: () => ({})
  },
  {
    method: 'GET',
    path: '/api/v1/auth/webauthn/generate-authentication-options',
    handler: () => ({})
  },
  {
    method: 'POST',
    path: '/api/v1/auth/webauthn/verify-authentication',
    handler: () => ({ authToken: 'mock-jwt-token' })
  },
  {
    method: 'DELETE',
    path: '/api/v1/auth-device/:id',
    handler: () => ({})
  }
];

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS headers for dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-timezone, x-token'
  );

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Try to match a route
  for (const route of routes) {
    const params = match(method, pathname, route);
    if (params !== null) {
      // Collect body for POST/PUT/PATCH
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let parsedBody = null;
        try {
          parsedBody = body ? JSON.parse(body) : null;
        } catch {
          // ignore parse errors
        }

        try {
          const result = route.handler(params, parsedBody);
          json(res, result, route.status ?? 200);
        } catch (err) {
          console.error(`[mock-api] Error handling ${method} ${pathname}:`, err);
          json(res, { error: 'Internal mock server error' }, 500);
        }
      });
      return;
    }
  }

  // Catch-all for unmapped /api routes
  if (pathname.startsWith('/api')) {
    console.warn(`[mock-api] Unmapped route: ${method} ${pathname}`);
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      json(res, {});
    });
    return;
  }

  // Non-API routes get 404
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3333;

server.listen(PORT, () => {
  console.log(`\n  Mock API server running on http://localhost:${PORT}`);
  console.log('  Serving notional data for frontend-only development\n');
});
