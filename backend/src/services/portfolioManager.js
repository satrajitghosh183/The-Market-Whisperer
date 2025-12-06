export class PortfolioManager {
  static calculateTotalValue(positions) {
    return positions.reduce((total, position) => {
      return total + (position.shares * (position.currentPrice || position.avgCost));
    }, 0);
  }
  
  static calculateUnrealizedPnL(positions) {
    return positions.reduce((pnl, position) => {
      const currentValue = position.shares * (position.currentPrice || position.avgCost);
      const costBasis = position.shares * position.avgCost;
      return pnl + (currentValue - costBasis);
    }, 0);
  }
  
  static generateRebalanceInstructions(portfolio, positions) {
    const instructions = [];
    const currentWeights = {};
    const totalValue = this.calculateTotalValue(positions);
    
    // Calculate current weights
    positions.forEach(position => {
      const value = position.shares * (position.currentPrice || position.avgCost);
      currentWeights[position.ticker] = totalValue > 0 ? value / totalValue : 0;
    });
    
    // Compare with target weights
    Object.keys(portfolio.targetWeights || {}).forEach(ticker => {
      const targetWeight = portfolio.targetWeights[ticker];
      const currentWeight = currentWeights[ticker] || 0;
      const diff = targetWeight - currentWeight;
      
      if (Math.abs(diff) > 0.01) { // Rebalance threshold 1%
        const targetValue = totalValue * targetWeight;
        const currentValue = totalValue * currentWeight;
        const valueDiff = targetValue - currentValue;
        
        instructions.push({
          ticker,
          action: valueDiff > 0 ? 'buy' : 'sell',
          valueChange: Math.abs(valueDiff),
          weightChange: diff,
          currentWeight,
          targetWeight
        });
      }
    });
    
    return instructions;
  }
  
  static markToMarket(positions, priceData) {
    return positions.map(position => {
      const currentPrice = priceData[position.ticker] || position.avgCost;
      const currentValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgCost;
      const unrealizedPnL = currentValue - costBasis;
      
      return {
        ...position,
        currentPrice,
        currentValue,
        unrealizedPnL
      };
    });
  }
}

