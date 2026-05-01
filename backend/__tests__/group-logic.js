function validateGroup(name, amount) {
    if (name.length < 3) return "Name too short";
    if (amount <= 0) return "Amount must be positive";
    return "Valid";
}

// Export for Jest testing
if (typeof module !== 'undefined') {
    module.exports = { validateGroup };
}
