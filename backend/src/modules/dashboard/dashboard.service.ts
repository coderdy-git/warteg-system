import { DashboardRepository } from './dashboard.repository.js';

export class DashboardService {
  constructor(private readonly repo: DashboardRepository = new DashboardRepository()) {}

  async getDashboardSummary() {
    return this.repo.getSummary();
  }

  async getRecentTransactions() {
    return this.repo.getRecentTransactions(10);
  }
}
