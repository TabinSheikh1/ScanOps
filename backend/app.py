from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)

# 🔍 Risk Engine
def get_risk(port):
    risks = {
        "21": ("High", "FTP is insecure (plaintext credentials)"),
        "22": ("Medium", "SSH exposed (check for brute-force risk)"),
        "23": ("Critical", "Telnet is highly insecure"),
        "80": ("Low", "HTTP service running"),
        "443": ("Low", "HTTPS secure communication"),
        "445": ("High", "SMB vulnerable to attacks"),
        "3389": ("Medium", "RDP exposed to internet"),
    }
    return risks.get(port, ("Low", "No major risk detected"))

# 🧠 Parse Nmap Output
def parse_nmap(output):
    lines = output.split("\n")
    results = []

    for line in lines:
        if "/tcp" in line:
            parts = line.split()
            port = parts[0].split("/")[0]
            state = parts[1]
            service = parts[2]

            risk, desc = get_risk(port)

            results.append({
                "port": port,
                "state": state,
                "service": service,
                "risk": risk,
                "description": desc
            })

    return results

@app.route('/scan', methods=['POST'])
def scan():
    target = request.json.get('target')

    if not target:
        return jsonify({"error": "No target provided"}), 400

    result = subprocess.getoutput(f"nmap -F {target}")
    parsed = parse_nmap(result)

    return jsonify(parsed)

if __name__ == "__main__":
    app.run(debug=True)