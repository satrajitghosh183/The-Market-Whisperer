const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to validate US stock tickers
function isValidUSTicker(ticker) {
    // Basic validation: 1-5 uppercase letters, no special characters or common non-US suffixes
    if (!ticker || typeof ticker !== 'string') return false;
    const cleanedTicker = ticker.toUpperCase().trim();

    // Exclude common non-US suffixes, indices, crypto, etc.
    const invalidSuffixes = [
        '.KS', '.L', '.T', '.HK', '.SS', '.SZ', '.PA', '.DE', '.TO', '.V', '.AX', '.NZ',
        '.SA', '.MX', '.BA', '.IS', '.TA', '.VI', '.IR', '.QA', '.BC', '.SN', '.JK',
        '.SI', '.SG', '.TW', '.VN', '.AT', '.ME', '.MI', '.OL', '.ST', '.HE', '.CO',
        '.IC', '.PR', '.WA', '.BR', '.MC', '.LS', '.AS', '.VX', '.CH', '.SW', '.TG',
        '.IL', '.TL', '.BE', '.HA', '.MU', '.F', '.DU', '.HM', '.SG', '.GR', '.VI',
        '.CR', '.VS', '.PF', '.PA', '.PL', '.BP', '.BO', '.NS', '.CM', '.CF', '.CN',
        '.PK', '.OB', '.OTC', '.PNK', '.PRV', '.PVT', // Private/OTC markers
        '^', '=', '-', // Indices, crypto, currency pairs
    ];

    if (invalidSuffixes.some(suffix => cleanedTicker.endsWith(suffix))) {
        return false;
    }

    // Check if it looks like a US stock ticker (1-5 uppercase letters, no numbers or special chars)
    return /^[A-Z]{1,5}$/.test(cleanedTicker);
}

// Helper function to generate stock suggestions based on news
function generateStockSuggestion(article, isMarketNews = false) {
    const title = (article.title || '').toLowerCase();
    const summary = (article.summary || '').toLowerCase();
    const text = title + ' ' + summary;

    // Positive indicators
    const positiveWords = [
        'surge', 'rally', 'gain', 'profit', 'beat', 'exceed', 'growth', 'up',
        'soar', 'jump', 'rise', 'bullish', 'breakthrough', 'success', 'record',
        'earnings beat', 'upgrade', 'innovation', 'partnership', 'expansion', 'strong'
    ];

    // Negative indicators
    const negativeWords = [
        'fall', 'drop', 'loss', 'miss', 'decline', 'down', 'crash', 'plunge',
        'bearish', 'concern', 'worry', 'cut', 'downgrade', 'layoff', 'lawsuit',
        'investigation', 'scandal', 'warning', 'recession', 'weak'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
    });

    const relatedTickers = (article.relatedTickers || []).filter(isValidUSTicker);
    const mainTicker = relatedTickers[0] || 'the stock';

    let action = 'HOLD';
    let confidence = 'Low';
    let reason = `Neutral sentiment. Monitor ${mainTicker} for clearer signals.`;

    if (positiveCount > negativeCount) {
        action = 'BUY';
        confidence = positiveCount > 2 ? 'High' : 'Medium';
        reason = `Positive sentiment detected. News suggests upward momentum for ${mainTicker}.`;
    } else if (negativeCount > positiveCount) {
        action = 'SELL';
        confidence = negativeCount > 2 ? 'High' : 'Medium';
        reason = `Negative sentiment detected. Consider reducing exposure to ${mainTicker}.`;
    }

    // Generate a default summary if none is provided by the API
    let finalSummary = article.summary;
    if (!finalSummary || finalSummary.trim() === '') {
        if (isMarketNews) {
            finalSummary = `Read the full article for details about ${mainTicker} and recent market developments.`;
        } else {
            finalSummary = `Click to read more about this ${mainTicker} news story and its potential market impact.`;
        }
    }

    return {
        action,
        confidence,
        reason,
        tickers: relatedTickers,
        summary: finalSummary,
    };
}

// @desc    Get latest market news
// @route   GET /api/news/market
// @access  Public
router.get('/market', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const tickers = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX'];
        const allArticles = [];

        for (const ticker of tickers) {
            try {
                const response = await axios.get(
                    `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=1&newsCount=3&enableFuzzyQuery=false`,
                    { timeout: 5000 }
                );

                if (response.data?.news) {
                    const filteredNews = response.data.news.filter(item =>
                        (item.relatedTickers || [ticker]).some(t => isValidUSTicker(t))
                    );
                    allArticles.push(...filteredNews.map(item => ({
                        title: item.title,
                        summary: item.summary || '',
                        url: item.link,
                        source: item.publisher,
                        published: new Date(item.providerPublishTime * 1000).toISOString(),
                        relatedTickers: (item.relatedTickers || [ticker]).filter(isValidUSTicker),
                        thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
                    })));
                }
            } catch (err) {
                console.error(`Error fetching news for ${ticker}:`, err.message);
            }
        }

        const uniqueArticles = Array.from(
            new Map(allArticles.map(item => [item.url, item])).values()
        );

        uniqueArticles.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

        const articlesWithSuggestions = uniqueArticles.map(article => {
            const suggestion = generateStockSuggestion(article, true);
            return { ...article, suggestion };
        });

        res.json({
            articles: articlesWithSuggestions.slice(0, parseInt(limit)),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching market news:', error.message);
        res.status(500).json({ message: 'Failed to fetch market news', error: error.message });
    }
});

// @desc    Get news for specific ticker
// @route   GET /api/news/ticker/:ticker
// @access  Public
router.get('/ticker/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        if (!isValidUSTicker(ticker)) {
            return res.status(400).json({ message: 'Invalid or unsupported US stock ticker' });
        }

        const response = await axios.get(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=1&newsCount=10&enableFuzzyQuery=false`,
            { timeout: 5000 }
        );

        if (!response.data?.news) {
            return res.json({ articles: [] });
        }

        const articles = response.data.news.map(item => ({
            title: item.title,
            summary: item.summary || '',
            url: item.link,
            source: item.publisher,
            published: new Date(item.providerPublishTime * 1000).toISOString(),
            relatedTickers: (item.relatedTickers || [ticker]).filter(isValidUSTicker),
            thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
        }));

        const articlesWithSuggestions = articles.map(article => {
            const suggestion = generateStockSuggestion(article, false);
            return { ...article, suggestion };
        });

        res.json({ articles: articlesWithSuggestions });
    } catch (error) {
        console.error(`Error fetching news for ${req.params.ticker}:`, error.message);
        res.status(500).json({ message: 'Failed to fetch news', error: error.message });
    }
});

module.exports = router;

