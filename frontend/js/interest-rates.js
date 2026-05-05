// js/interest-rates.js - Complete working version

// Current real SA rates (March 2026)
const CURRENT_REPO_RATE = 6.75;    // SARB repo rate
const CURRENT_PRIME_RATE = 10.25;  // Prime rate (Repo + 3.5%)

// Function to calculate compound growth with monthly contributions
function calculateProjectedSavings(monthlyContribution, months, annualInterestRate) {
    const monthlyRate = annualInterestRate / 100 / 12;
    let futureValue = 0;
    
    for (let i = 0; i < months; i++) {
        futureValue = (futureValue + monthlyContribution) * (1 + monthlyRate);
    }
    
    return futureValue;
}

// Update the UI with rates
function updateInterestRateDisplay() {
    console.log("Updating interest rate display...");
    
    const primeElem = document.getElementById('prime-rate');
    const repoElem = document.getElementById('repo-rate');
    const lastUpdatedElem = document.getElementById('rate-last-updated');
    
    if (primeElem) {
        primeElem.textContent = `${CURRENT_PRIME_RATE}%`;
        console.log(`Prime rate set to: ${CURRENT_PRIME_RATE}%`);
    } else {
        console.error("Could not find element: prime-rate");
    }
    
    if (repoElem) {
        repoElem.textContent = `${CURRENT_REPO_RATE}%`;
        console.log(`Repo rate set to: ${CURRENT_REPO_RATE}%`);
    } else {
        console.error("Could not find element: repo-rate");
    }
    
    if (lastUpdatedElem) {
        const today = new Date();
        lastUpdatedElem.textContent = `Last updated: ${today.toLocaleDateString('en-ZA')}`;
    }
    
    // Store rates globally for calculator
    window.currentPrimeRate = CURRENT_PRIME_RATE;
}

// Calculate and display projection
function calculateAndDisplayProjection() {
    const amountInput = document.getElementById('savings-amount');
    const monthsInput = document.getElementById('savings-months');
    const projectedElem = document.getElementById('projected-savings');
    
    if (!amountInput || !monthsInput || !projectedElem) {
        console.error("Calculator elements not found");
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    const months = parseInt(monthsInput.value);
    const rate = window.currentPrimeRate || CURRENT_PRIME_RATE;
    
    if (isNaN(amount) || isNaN(months)) {
        projectedElem.textContent = 'R0';
        return;
    }
    
    const projected = calculateProjectedSavings(amount, months, rate);
    projectedElem.textContent = `R ${projected.toFixed(2)}`;
    console.log(`Projected: R${projected.toFixed(2)} for R${amount}/month over ${months} months at ${rate}%`);
}

// Initialize everything when page loads
function initInterestRates() {
    console.log("Initializing interest rates module...");
    updateInterestRateDisplay();
    
    // Set up calculator button
    const calcBtn = document.getElementById('calculate-projection');
    if (calcBtn) {
        calcBtn.addEventListener('click', calculateAndDisplayProjection);
        console.log("Calculator button event attached");
    } else {
        console.error("Could not find calculate-projection button");
    }
    
    // Set up auto-calculation on input change
    const amountInput = document.getElementById('savings-amount');
    const monthsInput = document.getElementById('savings-months');
    
    if (amountInput) {
        amountInput.addEventListener('input', calculateAndDisplayProjection);
    }
    if (monthsInput) {
        monthsInput.addEventListener('input', calculateAndDisplayProjection);
    }
    
    // Run initial calculation
    calculateAndDisplayProjection();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInterestRates);
} else {
    // DOM is already loaded
    initInterestRates();
}