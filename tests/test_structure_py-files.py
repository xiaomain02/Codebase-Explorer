import requests

if __name__ == '__main__':
    with open('tests/TripTie.zip', 'rb') as f:
        response = requests.post('http://localhost:8000/repo/upload', files={'file': f})

    repo_info = response.json()
    print(repo_info)

    repo_structure = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/structure")
    print(repo_structure.json())