import requests

if __name__ == '__main__':
    with open('tests/repo_for_test_upload.zip', 'rb') as f:
        response = requests.post('http://localhost:8000/repo/upload', files={'file': f})

    repo_info = response.json()
    print(repo_info)

    repo_tree = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/tree")
    print(repo_tree.json())

    repo_modules = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/modules")
    print(repo_modules.json())

    repo_summary = requests.get(f"http://localhost:8000/repo/{repo_info['repo_id']}/summary")
    print(repo_summary.json())