import requests

if __name__ == '__main__':
    with open('tests/TripTie.zip', 'rb') as f:
        response = requests.post('http://localhost:8000/repo/upload', files={'file': f})

    repo_info = response.json()
    print(repo_info)

    repo_root_structure = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/structure")
    print(repo_root_structure.json())

    repo_backend_structure = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/structure/backend")
    print(repo_backend_structure.json())

    repo_database_structure = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/structure/database")
    print(repo_database_structure.json())

    repo_frontend_structure = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/structure/frontend")
    print(repo_frontend_structure.json())