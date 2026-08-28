import { getLatestInterestRates } from './supabase-client.js';

const FALLBACK_RATES = Object.freeze({
  repo_rate: 6.75,
  prime_rate: 10.25,
  source: 'cached portfolio data',
  fetched_at: null,
});

export function calculateProjectedSavings(monthlyContribution, months, annualInterestRate) {
  const contribution = Number(monthlyContribution);
  const duration = Number(months);
  const annualRate = Number(annualInterestRate);

  if (!Number.isFinite(contribution) || contribution <= 0) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(annualRate) || annualRate < 0) return 0;

  const monthlyRate = annualRate / 100 / 12;
  let futureValue = 0;
  for (let month = 0; month < Math.floor(duration); month += 1) {
    futureValue = (futureValue + contribution) * (1 + monthlyRate);
  }
  return futureValue;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function displayRates(rates) {
  const prime = Number(rates.prime_rate);
  const repo = Number(rates.repo_rate);
  window.currentPrimeRate = Number.isFinite(prime) ? prime : FALLBACK_RATES.prime_rate;
  window.currentRepoRate = Number.isFinite(repo) ? repo : FALLBACK_RATES.repo_rate;

  setText('prime-rate', `${window.currentPrimeRate}%`);
  setText('repo-rate', `${window.currentRepoRate}%`);
  setText('rate-source', rates.source || FALLBACK_RATES.source);

  const date = rates.fetched_at ? new Date(rates.fetched_at) : new Date();
  setText('rate-last-updated', `Last updated: ${date.toLocaleDateString('en-ZA')}`);
}

export function calculateAndDisplayProjection() {
  const amountInput = document.getElementById('savings-amount');
  const monthsInput = document.getElementById('savings-months');
  const projectedElement = document.getElementById('projected-savings');
  if (!amountInput || !monthsInput || !projectedElement) return;

  const amount = Number(amountInput.value);
  const months = Number(monthsInput.value);
  const rate = Number(window.currentPrimeRate ?? FALLBACK_RATES.prime_rate);
  const projected = calculateProjectedSavings(amount, months, rate);

  projectedElement.textContent = `R ${projected.toFixed(2)}`;
  setText('projection-note', `Based on the current ${rate}% prime rate with monthly compounding`);
}

export async function initInterestRates() {
  const primeElement = document.getElementById('prime-rate');
  const repoElement = document.getElementById('repo-rate');
  if (!primeElement && !repoElement) return;

  setText('prime-rate', '...');
  setText('repo-rate', '...');

  let rates;
  try {
    rates = await getLatestInterestRates();
  } catch (error) {
    console.warn('Live interest rates are unavailable; using cached values.', error);
    rates = FALLBACK_RATES;
  }

  displayRates(rates || FALLBACK_RATES);

  const calculateButton = document.getElementById('calculate-projection');
  const amountInput = document.getElementById('savings-amount');
  const monthsInput = document.getElementById('savings-months');

  if (calculateButton && !calculateButton.dataset.projectionBound) {
    calculateButton.addEventListener('click', calculateAndDisplayProjection);
    calculateButton.dataset.projectionBound = 'true';
  }
  if (amountInput && !amountInput.dataset.projectionBound) {
    amountInput.addEventListener('input', calculateAndDisplayProjection);
    amountInput.dataset.projectionBound = 'true';
  }
  if (monthsInput && !monthsInput.dataset.projectionBound) {
    monthsInput.addEventListener('input', calculateAndDisplayProjection);
    monthsInput.dataset.projectionBound = 'true';
  }

  calculateAndDisplayProjection();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInterestRates, { once: true });
  } else {
    initInterestRates();
  }
}
