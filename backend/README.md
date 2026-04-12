## Local development database and Docker

- For developmet and local testing, we use two local Postgres databases running in Docker.
- The `docker-compose.yml` file is included.
- Install Docker Desktop (if on Windows or macOS).
- After cloning the repo for the first time, make sure to cd into `/backend` (it's where the `docker-compose` file is) and then run either one of the below (or both) commands:
  - `docker compose up db_dev -d` (This runs the develpment database)
  - `docker compose up db_test -d` (This runs the test database)
- After that each time Docker Desktop runs both these containers will also run.
- To stop that, run `docker compose stop` from the same `/backend` directory where the `docker-compose.yml` lives.
