import requests
import time

payload = {
    "company_name": f"SEMS Foundation {time.time()}",
    "industry_id": 5, 
    "plan_id": 1,
    "owner_name": "Kartik Sharma",
    "email": f"kartik{time.time()}@gmail.com",
    "password": "password123"
}

try:
    res = requests.post("http://localhost:8000/api/v1/auth/signup/", json=payload)
    print("STATUS CODE:", res.status_code)
    
    with open("test_signup_error3.html", "w", encoding="utf-8") as f:
        f.write(res.text)
    print("Saved response to test_signup_error3.html")
except Exception as e:
    print(f"Request failed: {e}")
