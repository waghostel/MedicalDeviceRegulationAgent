# Hosting Analysis for Medical Device Regulatory Assistant

This document provides an analysis of ideal, cloud-native hosting architectures for the Medical Device Regulatory Assistant project. The designs below assume a willingness to migrate from the local SQLite database to a managed cloud database, which is a necessary step for a production environment.

## Executive Summary & Recommendation

For this project, which consists of a Next.js frontend and a Python (FastAPI) backend, the primary recommendation is to use a Platform-as-a-Service (PaaS) like **Vercel** or **Heroku**.

* **Vercel** is the top choice if you prioritize frontend performance and a tightly integrated, serverless developer experience.
* **Heroku** is an excellent alternative, offering great flexibility and a classic, robust microservices approach that is easy to manage.

Both platforms abstract away most infrastructure complexity, allowing you to focus on application development while providing a clear, scalable path for migrating your database and cache.

More complex but powerful options on **Google Cloud Platform (GCP)** and **Amazon Web Services (AWS)** are also detailed below. They offer greater control and a wider ecosystem of services at the cost of increased setup and management complexity.

---

## Detailed Platform Designs

### Vercel: The Integrated Serverless Platform

Vercel is the creator of Next.js and provides the most seamless hosting experience for it, while also offering first-class support for serverless Python backends.

#### The Design: An Integrated Serverless Project

* **Frontend (Next.js):** Deployed on **Vercel's Edge Network (CDN)** for optimal performance.
* **Backend (FastAPI):** Deployed as **Vercel Serverless Functions**. Python files in an `/api` directory automatically become serverless API endpoints.
* **Database:** **Vercel Postgres**, a serverless PostgreSQL database designed for Vercel.
* **Cache:** **Vercel KV**, a serverless Redis-compatible cache.

```
+------+   +-----------------+   +------------------------+   +--------------------+
| User |-->| Vercel Edge     |-->| Next.js App            |-->| Vercel Postgres    |
+------+   | Network (CDN)   |   +------------------------+   +--------------------+
           +-----------------+              |                      ^
                      |                     |                      |
                      |                     v                      |
                      |   +------------------------+               |
                      |-->| Python Serverless Func |---------------+
                          | (FastAPI Logic)        |
                          +------------------------+
                                     |
                                     v
                          +------------------------+
                          | Vercel KV (Redis)      |
                          +------------------------+
```

#### What Needs to Be Done on Vercel:

1. **Structure Project:** Place your FastAPI route files inside an `/api` directory.
2. **Migrate Database:** Provision **Vercel Postgres** and update your Python code to use a PostgreSQL driver (`psycopg2`) and the provided `POSTGRES_URL` environment variable. Run your SQL scripts to set up the schema.
3. **Migrate Cache:** Provision **Vercel KV** and update your Python code to use a Redis client with the provided environment variables.
4. **Deploy:** Connect your Git repository to Vercel. Vercel will automatically detect the frameworks, build, and deploy the entire application.

### Heroku: The Flexible Microservices Platform

Heroku is renowned for its developer-friendly experience and flexibility, making it ideal for deploying distinct application components as microservices.

#### The Design: A Two-App Microservice Architecture

* **Frontend (Next.js):** Deployed as its own Heroku "App" (e.g., `my-assistant-frontend`), running on a **Web Dyno** (container).
* **Backend (FastAPI):** Deployed as a *second*, independent Heroku "App" (e.g., `my-assistant-backend`), also on a **Web Dyno**.
* **Database:** **Heroku Postgres**, a robust, managed PostgreSQL add-on.
* **Cache:** **Heroku Data for Redis**, a managed Redis add-on.

```
+------+   +----------------+   +------------------------+   +--------------------+
| User |-->| Heroku Router  |-->| Heroku App 1 (Next.js) |-->| Heroku Postgres    |
+------+   |----------------+   +------------------------+   +--------------------+
                      |                    |                      ^
                      |                    v                      |
                      |   +------------------------+              |
                      |-->| Heroku App 2 (FastAPI) |--------------+
                          +------------------------+
                                     |
                                     v
                          +------------------------+
                          | Heroku Data for Redis  |
                          +------------------------+
```

#### What Needs to Be Done on Heroku:

1. **Separate Apps:** Create two apps in your Heroku dashboard (frontend, backend).
2. **Migrate Database:** Provision the **Heroku Postgres** add-on in your backend app. Update your Python code to use the `DATABASE_URL` environment variable provided by Heroku.
3. **Configure Backend:** Add a `Procfile` to tell Heroku how to run the app (`web: uvicorn ...`). Configure **CORS** in FastAPI to accept requests from your frontend app's URL.
4. **Configure Frontend:** Update the Next.js app to point its API requests to the backend app's URL.
5. **Deploy:** Connect your Git repository to each Heroku app and deploy.

---

### Alternative Designs: GCP & AWS

These platforms offer maximum power and flexibility but require more infrastructure knowledge.

#### Google Cloud Platform (GCP): Standard Serverless Architecture

* **Compute:** **Cloud Run** for both the Next.js and FastAPI services.
* **Database:** **Cloud SQL for PostgreSQL**.
* **Cache:** **Memorystore for Redis**.
* **Routing:** **Global External HTTPS Load Balancer** to manage traffic to the two Cloud Run services.
* **Summary:** This is a highly scalable, robust architecture. It requires you to containerize both applications and manage networking, IAM permissions, and database connections manually.

#### Amazon Web Services (AWS): Standard Serverless Architecture

* **Compute:** **AWS App Runner** or **AWS Fargate** for both services.
* **Database:** **Amazon RDS for PostgreSQL**.
* **Cache:** **Amazon ElastiCache for Redis**.
* **Routing:** **Application Load Balancer (ALB)** to route traffic.
* **Summary:** The AWS equivalent of the GCP design. It is incredibly powerful and scalable, used by many large enterprises. Like GCP, it requires more hands-on management of the underlying infrastructure components compared to Vercel or Heroku.

---

## Detailed Task Plan for Deployment

Based on the current codebase structure inside the `medical-device-regulatory-assistant/` directory, here is a more detailed, step-by-step guide for deploying the application.

### Option 1: Vercel Deployment (Recommended)

This approach unifies the frontend and backend into a single Vercel project, leveraging its native serverless capabilities.

**Phase 1: Codebase Restructuring and Preparation**

- [ ] 1.1. Restructure for Vercel Monorepo:
  
  - Create a `vercel.json` file in the root `MedicalDeviceRegulationAgent/` directory. This file will configure Vercel to correctly build both the Next.js frontend and the Python backend from their subdirectories.
  
  - Your `vercel.json` should specify the root directory for the Next.js app and declare the Python serverless functions.
  
  - *Example `vercel.json` structure:*
    
    ```json
    {
      "builds": [
        {
          "src": "medical-device-regulatory-assistant/package.json",
          "use": "@vercel/next"
        },
        {
          "src": "medical-device-regulatory-assistant/api/**/*.py",
          "use": "@vercel/python"
        }
      ]
    }
    ```

- [ ] 1.2. Relocate Backend to `/api`:
  
  - Move the contents of `medical-device-regulatory-assistant/backend/` into a new `medical-device-regulatory-assistant/api/` directory.
  - Vercel automatically treats `.py` files in the `/api` directory as serverless function endpoints. You may need to adjust your FastAPI application structure slightly to fit this model, ensuring each route is a separate function or handled by a main `index.py` in each subdirectory.

- [ ] 1.3. Convert Python Dependencies:
  
  - Vercel uses `requirements.txt` for Python dependencies. Convert your `pyproject.toml` (Poetry) dependencies into a `requirements.txt` file.
  - Place this `requirements.txt` file inside the `medical-device-regulatory-assistant/api/` directory.
  - You can generate it using Poetry: `poetry export -f requirements.txt --output api/requirements.txt --without-hashes`

**Phase 2: Database and Cache Migration**

- [ ] 2.1. Provision Vercel Postgres:
  
  - From your Vercel project dashboard, create a new Vercel Postgres database.
  - Securely copy the provided connection URL (it will be available as an environment variable, e.g., `POSTGRES_URL`).

- [ ] 2.2. Update Backend Code for Postgres:
  
  - Add a PostgreSQL driver to your `requirements.txt`, such as `psycopg2-binary` or `asyncpg`.
  - Modify your database connection logic to use the `POSTGRES_URL` from the environment variables instead of the local SQLite file.
  - Update your Alembic configuration (`alembic.ini`) to point to the new Postgres database URL for running migrations.

- [ ] 2.3. Run Database Migrations:
  
  - You will need to run your Alembic migrations against the new Vercel Postgres database to set up the schema. This can often be done locally by temporarily pointing your environment to the cloud database.

- [ ] 2.4. Provision and Integrate Vercel KV (Redis):
  
  - From the Vercel dashboard, create a new Vercel KV store.
  - Update your backend's Redis connection logic to use the environment variables provided by Vercel (e.g., `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`).

**Phase 3: Deployment**

- [ ] 3.1. Configure Vercel Project:
  
  - Create a new project in Vercel and connect it to your GitHub repository.
  - In the project settings, set the "Root Directory" to `medical-device-regulatory-assistant`.
  - Add all the necessary environment variables (database URLs, API keys, etc.) to the Vercel dashboard.

- [ ] 3.2. Deploy:
  
  - Push your restructured code to your main branch. Vercel will automatically trigger a build and deployment.
  - Monitor the build logs for any errors related to the Next.js or Python builds.

### Option 2: Heroku Deployment

This approach uses containers and keeps the frontend and backend as two separate, managed applications. It leverages the existing `Dockerfile`s.

**Phase 1: Application & Add-on Setup**

- [ ] 1.1. Create Heroku Applications:
  
  - In the Heroku dashboard, create two separate applications: one for the frontend (e.g., `my-assistant-frontend`) and one for the backend (e.g., `my-assistant-backend`).

- [ ] 1.2. Provision Add-ons:
  
  - In the backend application's "Resources" tab, provision a **Heroku Postgres** database.
  - Provision a **Heroku Data for Redis** instance. Heroku will automatically add `DATABASE_URL` and `REDIS_URL` to your app's environment variables.

**Phase 2: Code and Configuration**

- [ ] 2.1. Verify Dockerfiles:
  
  - Review `Dockerfile.frontend` and `Dockerfile.backend` to ensure they are optimized for production (e.g., using multi-stage builds, non-root users).

- [ ] 2.2. Create `heroku.yml` Manifest:
  
  - In your repository root, create a `heroku.yml` file. This file will tell Heroku how to build and release your applications from their respective Dockerfiles.
  
  - *Example `heroku.yml`:*
    
    ```yaml
    build:
      docker:
        web: medical-device-regulatory-assistant/Dockerfile.backend
        frontend: medical-device-regulatory-assistant/Dockerfile.frontend
    release:
      image: web
      command:
        - alembic upgrade head # Run migrations on release
    ```
  
  - *Note:* You will need to configure this YAML to map to your two different Heroku apps, which can be complex. An alternative is to have two separate Git repositories or branches, one for each app. The monorepo setup is more advanced for Heroku.

- [ ] 2.3. Update Backend for Heroku:
  
  - Ensure your FastAPI application is configured to listen on the host and port provided by Heroku (e.g., `0.0.0.0:$PORT`).
  - Update database and Redis connection logic to parse the `DATABASE_URL` and `REDIS_URL` environment variables.
  - Configure CORS in FastAPI to accept requests from your frontend Heroku URL (`https://my-assistant-frontend.herokuapp.com`).

- [ ] 2.4. Update Frontend for Heroku:
  
  - Set the `NEXT_PUBLIC_API_URL` environment variable in the frontend Heroku app to the URL of your backend app (`https://my-assistant-backend.herokuapp.com`).

**Phase 3: Deployment**

- [ ] 3.1. Connect and Deploy:
  - Connect your GitHub repository to both Heroku applications.
  - If using the `heroku.yml` manifest, configure your pipeline. Otherwise, for a simpler setup, you might need to push different branches to different Heroku remotes.
  - Trigger a deployment. Heroku will build the Docker images and deploy them to the respective dynos.

---

## Further Alternatives: Cloudflare and AWS Amplify

Here is an analysis of two more powerful platforms.

### Cloudflare Pages & Workers: The Edge-First Platform

Cloudflare's platform is built for extreme performance by running your code on a global edge network, as close to users as possible.

#### The Design: Edge-Native Frontend, Complex Backend

* **Frontend (Next.js):** Deployed on **Cloudflare Pages**. This provides best-in-class performance for static assets and runs dynamic Next.js features (like API routes or SSR) on Cloudflare Workers automatically.
* **Backend (FastAPI):** This is more complex. A standard FastAPI app cannot run directly on Cloudflare Workers. The recommended approach involves **Cloudflare Hyperdrive**, which pools database connections, allowing a Python Worker to connect to a standard PostgreSQL database.
* **Database:** Any standard **PostgreSQL provider** (like Neon, Supabase, or AWS RDS). Hyperdrive sits in front of it.
* **Cache:** Cloudflare offers its own **KV store**, which is suitable for caching.

```
+------+   +-----------------+   +------------------------+
| User |-->| Cloudflare Edge |-->| Cloudflare Pages       |
+------+   | (CDN)           |   | (Next.js Frontend)     |
           +-----------------+   +------------------------+
                      |                    |
                      |                    v
                      |   +-----------------------------------+
                      |-->| Cloudflare Worker (Python)        |
                          +-----------------------------------+
                                |              ^
                                v              |
                  +------------------------+   |
                  | Cloudflare Hyperdrive  |---+
                  +------------------------+
                          |
                          v
                  +------------------------+
                  | Standard PostgreSQL DB |
                  +------------------------+
```

#### What Needs to Be Done on Cloudflare:

1. **Set Up Frontend on Pages:**
   
   * [ ] Create a Cloudflare account and connect your Git repository to Cloudflare Pages.
   * [ ] Configure the build settings for your Next.js app (Root Directory: `medical-device-regulatory-assistant`, Framework: `Next.js`).

2. **Set Up External Database:**
   
   * [ ] Provision a standard PostgreSQL database from a cloud provider (e.g., Neon, which is serverless and works well with Cloudflare).

3. **Configure Hyperdrive and Backend Worker:**
   
   * [ ] In the Cloudflare dashboard, create a Hyperdrive configuration that points to your new PostgreSQL database. Note the connection string it provides.
   * [ ] Refactor the FastAPI application to run as a Python Worker. This is a significant task. You will need to use the `wrangler` CLI and may need to adapt your code to use an async database driver compatible with Hyperdrive.
   * [ ] Create a `wrangler.toml` file in your backend directory to define the worker, its compatibility flags, and its connection to Hyperdrive.

4. **Deploy and Connect:**
   
   * [ ] Deploy the frontend via Cloudflare Pages by pushing to your Git branch.
   * [ ] Deploy the backend worker using the command `wrangler deploy`.
   * [ ] Configure the frontend by setting an environment variable (`NEXT_PUBLIC_API_URL`) to the URL of your deployed worker.

### AWS Amplify: The Integrated AWS Experience

Amplify is a development framework that simplifies building and deploying full-stack applications on AWS infrastructure. It is excellent for projects that want the power of AWS without managing all the services manually.

#### The Design: Managed AWS Infrastructure

* **Frontend (Next.js):** Deployed via **Amplify Hosting**, which uses AWS CloudFront (CDN) and S3 to serve the app. SSR parts are handled by Lambda@Edge.
* **Backend (FastAPI):** Deployed as a custom container resource using **AWS Fargate**. Amplify will manage the setup of the Application Load Balancer, ECS Task Definition, and Fargate service based on your `Dockerfile.backend`.
* **Database:** **Amazon RDS for PostgreSQL**, a managed and scalable database service.
* **Cache:** **Amazon ElastiCache for Redis**.

```
+------+   +-----------------+   +------------------------+   +--------------------+
| User |-->| AWS CloudFront  |-->| Amplify Hosting        |-->| Amazon RDS         |
+------+   | (CDN)           |   | (S3, Lambda@Edge)      |   | (PostgreSQL)       |
           +-----------------+   +------------------------+   +--------------------+
                      |                    |                      ^
                      |                    v                      |
                      |   +------------------------+              |
                      |-->| Application Load Bal.  |              |
                          +------------------------+              |
                                     |                          |
                                     v                          |
                          +------------------------+              |
                          | AWS Fargate Service    |--------------+
                          | (FastAPI Container)    |
                          +------------------------+
                                     |
                                     v
                          +------------------------+
                          | Amazon ElastiCache     |
                          | (Redis)                |
                          +------------------------+
```

#### What Needs to Be Done on AWS Amplify:

1. **Install and Configure Amplify CLI:**
   
   * [ ] Run `npm install -g @aws-amplify/cli` to install the CLI.
   * [ ] Run `amplify configure` to connect the CLI to your AWS account.

2. **Initialize Amplify Project:**
   
   * [ ] In your project's root directory (`MedicalDeviceRegulationAgent/`), run `amplify init`. Follow the prompts to name your project and environment. Set your root directory to `medical-device-regulatory-assistant`.

3. **Add Frontend Hosting:**
   
   * [ ] Run `amplify add hosting`.
   * [ ] Choose `Amplify Console` and connect your Git repository for a full CI/CD setup.

4. **Add Custom Containerized Backend:**
   
   * [ ] Run `amplify add custom`.
   * [ ] Choose "Container-based..." and select **Fargate**.
   * [ ] When prompted, provide the path to your `Dockerfile.backend`. The CLI will guide you through setting up public access (via a load balancer) and other container settings.

5. **Provision Database and Cache:**
   
   * [ ] Manually provision an **Amazon RDS (Postgres)** database and an **ElastiCache (Redis)** instance in the AWS Console.
   * [ ] Securely store their connection strings and credentials in **AWS Secrets Manager**.

6. **Connect Backend to Database and Deploy:**
   
   * [ ] In the custom resource settings, grant your Fargate task permission to access the secrets in Secrets Manager.
   * [ ] Update your FastAPI code to fetch credentials from AWS Secrets Manager instead of standard environment variables.
   * [ ] Run `amplify push`. This command builds all the defined resources in the cloud. **This can take a significant amount of time.**
   * [ ] Once deployed, update the frontend's `NEXT_PUBLIC_API_URL` environment variable in the Amplify Console to point to the new backend load balancer URL.