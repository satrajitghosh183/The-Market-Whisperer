const axios = require('axios');

// URL for your running Python service
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

/**
 * Gets quant score and analysis for a ticker
 * @param {string} ticker The stock ticker
 * @returns {object} The scoring object from the Python service
 */
const getQuantAnalysis = async (ticker) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/generate_score`, { ticker });
        return response.data;
    } catch (error) {
        console.error(`Error calling Quant Service for ${ticker}:`, error.message);
        throw new Error('Quant Engine is unavailable');
    }
};

module.exports = { getQuantAnalysis };