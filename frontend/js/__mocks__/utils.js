module.exports = {
  formatCurrency: jest.fn((amount) => `R ${Number(amount).toFixed(2)}`),
  formatDate: jest.fn((date) => new Date(date).toLocaleDateString('en-ZA')),
  showToast: jest.fn(),
};
