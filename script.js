document.addEventListener('DOMContentLoaded', () => {
  // --- Constants & Config ---
  const CONFIG = {
    colors: {
      primary: '#4f46e5',
      primaryFade: 'rgba(79, 70, 229, 0.1)',
      grid: 'rgba(148, 163, 184, 0.1)',
      text: '#94a3b8'
    },
    debounceTime: 300
  };

  const USD_INR_API = "https://open.er-api.com/v6/latest/USD";
  let usdRate = null;
  let portfolioChart = null;

  // --- Utility Functions ---
  
  // Debounce for real-time calculation
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // Format currency (INR/USD) compact or standard
  const formatMoney = (amount, currency = 'INR', compact = false) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard'
    }).format(amount);
  };

  const parseInput = (id) => {
    const val = document.getElementById(id).value.replace(/,/g, '');
    return parseFloat(val) || 0;
  };

  // --- View Switching ---
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      item.classList.add('active');
      const tabId = item.dataset.tab;
      document.getElementById(tabId).classList.add('active');
      
      // Trigger resize for charts when tab becomes visible
      if(tabId === 'portfolio-tab' && portfolioChart) {
        portfolioChart.resize();
      }
    });
  });

  // --- Portfolio Logic ---

  const updatePortfolio = () => {
    const initial = parseInput('initialAmount');
    const contribution = parseInput('annualContribution');
    const rate = parseInput('rate') / 100;
    const years = Math.min(parseInput('years'), 60); // Cap at 60 years

    // Validation visual feedback
    if (years <= 0) return;

    let totalInvested = initial;
    let currentVal = initial;
    const labels = ['Year 0'];
    const data = [initial];

    for (let i = 1; i <= years; i++) {
      currentVal = (currentVal + contribution) * (1 + rate);
      totalInvested += contribution;
      labels.push(`Yr ${i}`);
      data.push(Math.round(currentVal));
    }

    // Update DOM
    document.getElementById('finalValue').textContent = formatMoney(currentVal);
    document.getElementById('totalProfit').textContent = formatMoney(currentVal - totalInvested);
    document.getElementById('totalInvested').textContent = formatMoney(totalInvested);

    renderChart(labels, data);
  };

  const renderChart = (labels, data) => {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, CONFIG.colors.primaryFade);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    if (portfolioChart) portfolioChart.destroy();

    portfolioChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Portfolio Value',
          data: data,
          borderColor: CONFIG.colors.primary,
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            callbacks: {
              label: (ctx) => formatMoney(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 6, color: CONFIG.colors.text }
          },
          y: {
            border: { display: false },
            grid: { color: CONFIG.colors.grid },
            ticks: {
              color: CONFIG.colors.text,
              callback: (val) => new Intl.NumberFormat('en-IN', { notation: "compact", compactDisplay: "short" }).format(val)
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  };

  // --- Valuation Logic ---

  const updateValuation = () => {
    const revenue = parseInput('revenue');
    const growth = parseInput('growth');
    const margin = parseInput('margin');
    const ltv = parseInput('ltv');
    const cac = parseInput('cac');

    if (revenue === 0) return;

    // Algorithm
    let baseMult = 1.0;
    
    // Growth impact (Weight: High)
    if (growth > 100) baseMult += 4;
    else if (growth > 50) baseMult += 2.5;
    else if (growth > 20) baseMult += 1.5;
    else if (growth > 0) baseMult += 0.5;

    // Margin impact (Weight: Medium)
    if (margin > 30) baseMult += 2;
    else if (margin > 10) baseMult += 1;
    else if (margin < -20) baseMult -= 0.5;

    // Cap
    const multiple = Math.min(Math.max(baseMult, 0.5), 15);
    const valINR = revenue * multiple;

    // Update DOM
    document.getElementById('multiple').textContent = multiple.toFixed(1) + 'x Revenue';
    document.getElementById('valuation').textContent = formatMoney(valINR, 'INR', true); // Compact
    
    if (usdRate) {
      document.getElementById('valuationUsd').textContent = formatMoney(valINR * usdRate, 'USD', true);
    }

    // Dynamic Insight Text
    let insight = "";
    if (growth > 50 && margin > 10) {
      insight = "🦄 Premium Profile: High growth with healthy margins. Likely commands top-tier venture multiples.";
    } else if (growth > 50 && margin < 0) {
      insight = "🚀 High Growth / Cash Burn: Valuation is driven by growth momentum. Path to profitability is key.";
    } else if (growth < 20 && margin > 20) {
      insight = "💰 Cash Cow: Lower growth but high profitability. Valuation based on EBITDA/PE rather than Revenue.";
    } else {
      insight = "📊 Standard Profile: Valuation will depend heavily on narrative, team, and market size.";
    }
    document.getElementById('profile').textContent = insight;

    // LTV:CAC Logic
    const ltvSection = document.getElementById('ltv-cac-container');
    if (ltv > 0 && cac > 0) {
      ltvSection.classList.remove('hidden');
      const ratio = ltv / cac;
      const ratioEl = document.getElementById('ltvCacRatio');
      const noteEl = document.getElementById('ltvCacNote');
      
      ratioEl.textContent = ratio.toFixed(1) + 'x';
      
      if (ratio > 3) {
        ratioEl.style.color = 'var(--success)';
        noteEl.textContent = "Excellent unit economics. Scale spend aggressively.";
      } else if (ratio < 1) {
        ratioEl.style.color = '#ef4444';
        noteEl.textContent = "Unprofitable unit economics. Fix retention or pricing.";
      } else {
        ratioEl.style.color = 'var(--text-main)';
        noteEl.textContent = "Healthy range (3x is the industry gold standard).";
      }
    } else {
      ltvSection.classList.add('hidden');
    }
  };

  // --- Initialization & Events ---

  // 1. Fetch FX
  fetch(USD_INR_API)
    .then(r => r.json())
    .then(data => {
      const rate = data.rates.INR; // 1 USD = X INR
      usdRate = 1 / rate; // We need INR to USD multiplier
      document.getElementById('fxRateDisplay').textContent = `1 USD = ₹${rate.toFixed(2)}`;
      
      // Re-run valuation if data entered before fetch finished
      updateValuation();
    })
    .catch(() => {
      document.getElementById('fxRateDisplay').textContent = "FX Offline";
    });

  // 2. Attach Listeners (Debounced)
  const portfolioInputs = ['initialAmount', 'annualContribution', 'rate', 'years'];
  const valuationInputs = ['revenue', 'growth', 'margin', 'ltv', 'cac'];

  portfolioInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', debounce(updatePortfolio, CONFIG.debounceTime));
  });

  valuationInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', debounce(updateValuation, CONFIG.debounceTime));
  });

  // 3. Formatting helpers for inputs (Add commas on blur)
  const formatInputOnBlur = (e) => {
    const val = e.target.value.replace(/,/g, '');
    if(val && !isNaN(val)) {
      e.target.value = Number(val).toLocaleString('en-IN');
    }
  };
  
  ['initialAmount', 'annualContribution', 'revenue', 'ltv', 'cac'].forEach(id => {
    document.getElementById(id).addEventListener('blur', formatInputOnBlur);
  });

  // Initial Run
  updatePortfolio();
});