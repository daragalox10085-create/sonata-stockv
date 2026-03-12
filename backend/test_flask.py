from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"status": "OK", "message": "Flask running"})

if __name__ == '__main__':
    print("Starting on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
