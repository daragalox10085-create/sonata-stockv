import subprocess
import time
import sys

def start_flask():
    while True:
        print("Starting Flask backend...")
        process = subprocess.Popen(
            [sys.executable, "app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        try:
            stdout, stderr = process.communicate()
            if process.returncode != 0:
                print(f"Backend crashed, code: {process.returncode}")
                if stderr:
                    print(f"Error: {stderr.decode('utf-8', errors='ignore')}")
        except Exception as e:
            print(f"Exception: {e}")
        
        print("Restarting in 5 seconds...")
        time.sleep(5)

if __name__ == '__main__':
    start_flask()
