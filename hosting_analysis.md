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
+------+   +----------------+   +------------------------+   +--------------------+
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