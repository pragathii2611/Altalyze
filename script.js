// ---------- TAB SWITCHING ----------
const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = item.getAttribute("data-tab");

    navItems.forEach((i) => i.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));

    item.classList.add("active");
    document.getElementById(targetId).classList.add("active");
  });
});

// ---------- HELPERS ----------
function parseNumericInput(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[, ]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatINR(amount) {
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatUSD(amount) {
  return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ---------- PORTFOLIO PROFIT SIMULATOR ----------
const portfolioForm = document.getElementById("portfolio-form");
const portfolioResultBox = document.getElementById("portfolio-result");
const totalInvestedEl = document.getElementById("totalInvested");
const finalValueEl = document.getElementById("finalValue");
const totalProfitEl = document.getElementById("totalProfit");

const chartContainer = document.getElementById("chart-container");
const chartCanvas = document.getElementById("portfolioChart");
let portfolioChart = null;

portfolioForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const initial = parseNumericInput(
    document.getElementById("initialAmount").value
  );
  const yearlyContribution = parseNumericInput(
    document.getElementById("annualContribution").value || 0
  );
  const ratePercent = parseNumericInput(
    document.getElementById("rate").value
  );
  const years = parseNumericInput(
    document.getElementById("years").value
  );

  if (
    initial < 0 ||
    yearlyContribution < 0 ||
    ratePercent < 0 ||
    years <= 0
  ) {
    alert("Please enter valid positive values.");
    return;
  }

  const r = ratePercent / 100;

  const futureInitial = initial * Math.pow(1 + r, years);

  let futureContribution = 0;
  if (yearlyContribution > 0 && r > 0) {
    futureContribution =
      yearlyContribution * ((Math.pow(1 + r, years) - 1) / r);
  } else if (yearlyContribution > 0 && r === 0) {
    futureContribution = yearlyContribution * years;
  }

  const finalValue = futureInitial + futureContribution;
  const totalInvested = initial + yearlyContribution * years;
  const profit = finalValue - totalInvested;

  totalInvestedEl.textContent = formatINR(Math.round(totalInvested));
  finalValueEl.textContent = formatINR(Math.round(finalValue));
  totalProfitEl.textContent = formatINR(Math.round(profit));

  portfolioResultBox.classList.remove("hidden");

  const labels = [];
  const dataPoints = [];

  for (let year = 0; year <= years; year++) {
    labels.push(year === 0 ? "0" : String(year));

    const valueInitial = initial * Math.pow(1 + r, year);
    let valueContribution = 0;

    if (yearlyContribution > 0 && r > 0) {
      valueContribution =
        yearlyContribution * ((Math.pow(1 + r, year) - 1) / r);
    } else if (yearlyContribution > 0 && r === 0) {
      valueContribution = yearlyContribution * year;
    }

    const value = valueInitial + valueContribution;
    dataPoints.push(Math.round(value));
  }

  chartContainer.classList.remove("hidden");

  if (portfolioChart) {
    portfolioChart.destroy();
  }

  portfolioChart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Portfolio value (₹)",
          data: dataPoints,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatINR(context.parsed.y)
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(209, 213, 219, 0.6)" },
          ticks: {
            color: "#6b7280",
            font: { size: 11 }
          }
        },
        y: {
          grid: { color: "rgba(229, 231, 235, 0.9)" },
          ticks: {
            color: "#6b7280",
            font: { size: 11 },
            callback: (value) => {
              const v = Number(value);
              if (v >= 10000000) return v / 10000000 + " Cr";
              if (v >= 100000) return v / 100000 + " L";
              return v / 1000 + " K";
            }
          }
        }
      }
    }
  });
});

// ---------- STARTUP VALUATION CALCULATOR + FX API ----------
const valuationForm = document.getElementById("valuation-form");
const valuationResultBox = document.getElementById("valuation-result");
const multipleEl = document.getElementById("multiple");
const valuationEl = document.getElementById("valuation");
const valuationUsdEl = document.getElementById("valuationUsd");
const profileEl = document.getElementById("profile");

const ltvCacSection = document.getElementById("ltv-cac-section");
const ltvCacRatioEl = document.getElementById("ltvCacRatio");
const ltvCacNoteEl = document.getElementById("ltvCacNote");

const fxRateDisplay = document.getElementById("fxRateDisplay");

let usdInrRate = null;

// Fetch live USD/INR rate using a public API
async function fetchFxRate() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    const rate = data?.rates?.INR;
    if (rate) {
      usdInrRate = rate;
      fxRateDisplay.textContent = rate.toFixed(2);
    } else {
      usdInrRate = null;
      fxRateDisplay.textContent = "Not available";
    }
  } catch (err) {
    usdInrRate = null;
    fxRateDisplay.textContent = "Not available";
  }
}

fetchFxRate();

valuationForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const revenue = parseNumericInput(
    document.getElementById("revenue").value
  );
  const growth = parseNumericInput(
    document.getElementById("growth").value
  );
  const margin = parseNumericInput(
    document.getElementById("margin").value
  );
  const ltv = parseNumericInput(
    document.getElementById("ltv").value || 0
  );
  const cac = parseNumericInput(
    document.getElementById("cac").value || 0
  );

  if (!Number.isFinite(revenue) || revenue <= 0) {
    alert(
      "Please enter a valid positive revenue number (for example: 5000000, not 50,00,000)."
    );
    return;
  }

  // Growth buckets
  let growthScore;
  if (growth < 10) growthScore = 1;
  else if (growth < 25) growthScore = 2;
  else growthScore = 3;

  // Margin buckets
  let marginScore;
  if (margin < 0) marginScore = 0;
  else if (margin < 10) marginScore = 1;
  else if (margin < 20) marginScore = 2;
  else marginScore = 3;

  const baseMultiple = 1.5;
  let suggestedMultiple = baseMultiple + growthScore + marginScore;

  if (suggestedMultiple < 1) suggestedMultiple = 1;
  if (suggestedMultiple > 10) suggestedMultiple = 10;

  const valuationInr = revenue * suggestedMultiple;

  let profileText = "";
  if (growth < 10 && margin < 10) {
    profileText =
      "Steady or early-stage profile with conservative growth and limited profitability. Multiples are typically constrained.";
  } else if (growth >= 10 && growth < 30 && margin >= 10) {
    profileText =
      "Balanced profile with reasonable growth and improving margins. This can support a healthy, defensible multiple.";
  } else if (growth >= 30 && margin >= 15) {
    profileText =
      "Compelling profile with high growth and attractive margins. This is often where premium multiples are considered.";
  } else if (growth >= 30 && margin < 0) {
    profileText =
      "High growth but loss-making. Valuation depends heavily on the market’s belief in the path to profitability.";
  } else {
    profileText =
      "Signals are mixed. The appropriate multiple is likely to be negotiated case by case, depending on sector and investor appetite.";
  }

  multipleEl.textContent = suggestedMultiple.toFixed(1);
  valuationEl.textContent = formatINR(Math.round(valuationInr));

  if (usdInrRate) {
    const valuationUsd = valuationInr / usdInrRate;
    valuationUsdEl.textContent = formatUSD(Math.round(valuationUsd));
  } else {
    valuationUsdEl.textContent = "Conversion unavailable";
  }

  profileEl.textContent = profileText;

  if (ltv > 0 && cac > 0) {
    const ratio = ltv / cac;
    ltvCacRatioEl.textContent = ratio.toFixed(2);

    let note;
    if (ratio < 1) {
      note =
        "The unit economics are currently unfavourable: acquiring a customer costs more than the value captured over their lifetime.";
    } else if (ratio >= 1 && ratio < 3) {
      note =
        "The unit economics are reasonable. Many early-stage companies operate in this band while refining acquisition and retention.";
    } else {
      note =
        "The unit economics appear attractive. A strong LTV/CAC ratio can justify continued reinvestment in growth and may support higher valuation expectations.";
    }

    ltvCacNoteEl.textContent = note;
    ltvCacSection.classList.remove("hidden");
  } else {
    ltvCacSection.classList.add("hidden");
  }

  valuationResultBox.classList.remove("hidden");
});