import requests

url = "http://127.0.0.1:8000/upload"
data = {
    "user_id": "+919207114070"
}
files = {
    "file": ("test.txt", b"hello world")
}

response = requests.post(url, data=data, files=files)
print(response.status_code)
print(response.text)
