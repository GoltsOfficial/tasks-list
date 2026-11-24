from tests.helpers import register_and_login


def test_openapi_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "FastAPI"


def test_tasks_require_auth(client):
    response = client.get("/tasks")
    assert response.status_code == 401


def test_register_login_and_list_tasks(client):
    register = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "qwerty123"},
    )
    assert register.status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "qwerty123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    tasks = client.get("/tasks", headers={"Authorization": f"Bearer {token}"})
    assert tasks.status_code == 200
    assert tasks.json() == []


def test_create_task(client):
    headers = register_and_login(client, "alice@example.com", "qwerty123")

    response = client.post(
        "/tasks",
        json={"title": "Купить молоко", "done": False},
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["title"] == "Купить молоко"
    assert body["done"] is False


def test_register_duplicate_email_409(client):
    payload = {"email": "alice@example.com", "password": "qwerty123"}
    client.post("/auth/register", json=payload)

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409


def test_user_cannot_see_other_users_tasks(client):
    bob = register_and_login(client, "bob@example.com", "qwerty123")
    client.post("/tasks", json={"title": "Bob's secret"}, headers=bob)

    alice = register_and_login(client, "alice@example.com", "qwerty123")
    response = client.get("/tasks", headers=alice)

    assert response.status_code == 200
    assert response.json() == []
