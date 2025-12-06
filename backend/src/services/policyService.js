/**
 * Policy Awareness Service
 * Tracks macroeconomic events and policy indicators
 */

export class PolicyService {
  // FOMC meeting dates for 2025-2026
  static FOMC_DATES = [
    '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18',
    '2025-07-30', '2025-09-17', '2025-11-05', '2025-12-17',
    '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
    '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16'
  ];

  // Typical CPI release dates (second Tuesday of each month)
  static getCPIReleaseDates(year = 2025) {
    const dates = [];
    for (let month = 1; month <= 12; month++) {
      const firstDay = new Date(year, month - 1, 1);
      const dayOfWeek = firstDay.getDay();
      // Find second Tuesday
      let daysToAdd = (9 - dayOfWeek) % 7;
      if (daysToAdd < 0) daysToAdd += 7;
      daysToAdd += 7; // Second week
      const cpiDate = new Date(year, month - 1, 1 + daysToAdd);
      dates.push(cpiDate.toISOString().split('T')[0]);
    }
    return dates;
  }

  /**
   * Calculate FOMC proximity flag
   * @param {string} date - Date to check (ISO format)
   * @returns {number} FOMC proximity flag (0-1, higher = closer to meeting)
   */
  static getFOMCProximity(date = null) {
    const checkDate = date ? new Date(date) : new Date();
    const today = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    
    let minDays = Infinity;
    
    for (const fomcDateStr of this.FOMC_DATES) {
      const fomcDate = new Date(fomcDateStr);
      const daysDiff = Math.abs((today - fomcDate) / (1000 * 60 * 60 * 24));
      minDays = Math.min(minDays, daysDiff);
    }

    // Return 1 if within 7 days, decreasing to 0 at 30 days
    if (minDays <= 7) return 1.0;
    if (minDays >= 30) return 0.0;
    return 1.0 - (minDays - 7) / 23; // Linear interpolation
  }

  /**
   * Calculate policy tilt based on sector and current policy environment
   * @param {string} ticker - Stock ticker
   * @param {string} sector - Stock sector (optional)
   * @returns {number} Policy tilt (-1 to 1)
   */
  static getPolicyTilt(ticker, sector = null) {
    // This is a simplified implementation
    // In a real system, this would consider:
    // - Current monetary policy stance
    // - Fiscal policy priorities
    // - Sector-specific policy impacts
    // - Regulatory environment

    // Tech sector generally benefits from low rates
    const techTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];
    if (techTickers.includes(ticker.toUpperCase())) {
      return 0.1; // Slight positive tilt
    }

    // Financial sector benefits from rate hikes
    const financialTickers = ['JPM', 'BAC', 'WFC', 'GS', 'MS'];
    if (financialTickers.includes(ticker.toUpperCase())) {
      return -0.05; // Slight negative tilt (assuming low rate environment)
    }

    // Energy sector sensitive to policy
    const energyTickers = ['XOM', 'CVX', 'COP', 'SLB'];
    if (energyTickers.includes(ticker.toUpperCase())) {
      return 0.0; // Neutral
    }

    return 0.0; // Default neutral
  }

  /**
   * Get CPI proximity (days until next CPI release)
   * @param {string} date - Date to check
   * @returns {number} Days until next CPI release
   */
  static getCPIProximity(date = null) {
    const checkDate = date ? new Date(date) : new Date();
    const cpiDates = this.getCPIReleaseDates(checkDate.getFullYear());
    cpiDates.push(...this.getCPIReleaseDates(checkDate.getFullYear() + 1));

    const today = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    
    for (const cpiDateStr of cpiDates) {
      const cpiDate = new Date(cpiDateStr);
      if (cpiDate >= today) {
        const daysDiff = (cpiDate - today) / (1000 * 60 * 60 * 24);
        // Return normalized value (1 if within 3 days, 0 if > 14 days)
        if (daysDiff <= 3) return 1.0;
        if (daysDiff >= 14) return 0.0;
        return 1.0 - (daysDiff - 3) / 11;
      }
    }

    return 0.0;
  }

  /**
   * Get comprehensive policy context
   * @param {string} ticker - Stock ticker
   * @param {string} date - Date to check
   * @returns {Object} Policy context
   */
  static getPolicyContext(ticker, date = null) {
    return {
      fomcProximity: this.getFOMCProximity(date),
      cpiProximity: this.getCPIProximity(date),
      policyTilt: this.getPolicyTilt(ticker),
      timestamp: date || new Date().toISOString()
    };
  }
}

