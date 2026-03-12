from flask import Flask, jsonify
from waitress import serve

app = Flask(__name__)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"status": "OK", "message": "Flask + Waitress running"})

if __name__ == '__main__':
    print("Starting on http://127.0.0.1:8080")
    serve(app, host='127.0.0.1', port=8080, threads=4)
