// ==================== MOCK DATA ====================
export const mockUser = {
  id: 'user-001',
  name: 'Thabo Mokoena',
  email: 'thabo@example.com',
  role: 'admin',
  avatar: 'TM'
};

export const mockGroups = [
  { id: 'group-001', name: 'Soweto Savings Club',        members: 12, contribution: 500,  frequency: 'Monthly',   totalSavings: 45000, nextPayout: '2026-02-15', status: 'active' },
  { id: 'group-002', name: 'Family Unity Stokvel',        members: 8,  contribution: 1000, frequency: 'Monthly',   totalSavings: 72000, nextPayout: '2026-02-01', status: 'active' },
  { id: 'group-003', name: 'Young Professionals Network', members: 15, contribution: 750,  frequency: 'Bi-weekly', totalSavings: 33750, nextPayout: '2026-01-25', status: 'active' }
];

export const mockContributions = [
  { id: 'c001', member: 'Thabo Mokoena', date: '2026-01-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c002', member: 'Thabo Mokoena', date: '2025-12-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c003', member: 'Thabo Mokoena', date: '2025-11-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c004', member: 'Thabo Mokoena', date: '2025-10-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c005', member: 'Thabo Mokoena', date: '2025-09-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c006', member: 'Thabo Mokoena', date: '2025-08-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c007', member: 'Thabo Mokoena', date: '2025-07-15', amount: 500, status: 'Pending',   group: 'Soweto Savings Club' },
  { id: 'c008', member: 'Thabo Mokoena', date: '2025-06-15', amount: 500, status: 'Late',      group: 'Soweto Savings Club' }
];

export const mockInvites = [
  { id: 'inv001', email: 'sipho@example.com',   status: 'pending',  sentAt: '2026-01-10' },
  { id: 'inv002', email: 'nomsa@example.com',   status: 'accepted', sentAt: '2026-01-08' },
  { id: 'inv003', email: 'bongani@example.com', status: 'pending',  sentAt: '2026-01-12' }
];
