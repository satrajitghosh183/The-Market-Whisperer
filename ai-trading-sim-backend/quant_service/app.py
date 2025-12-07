from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/generate_score', methods=['POST'])
def generate_score():
    data = request.json
    ticker = data.get('ticker')
    
    # ---
    # YOUR ENTIRE QUANTITATIVE ENGINE LOGIC GOES HERE
    # (Section 6: Fetch features, apply weights, etc.)
    # score = 0.35 * mom_60 + ...
    # ---
    
    # Dummy data
    score_details = {
        "ticker": ticker,
        "score": 0.78,
        "components": {
            "mom60": 0.35,
            "price_ma100": 0.20,
            "sentMean3d": 0.10
        },
        "recommendation": "Long"
    }
    return jsonify(score_details)

if __name__ == '__main__':
    app.run(port=5001, debug=True)