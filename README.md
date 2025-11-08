# 🚀 Spaces – Freelancer Platform

**Spaces** is a modern web-based freelancer platform that connects top talent with the right clients through an advanced matchmaking system.  
It empowers freelancers and clients across all levels and geographies to collaborate seamlessly and grow together.

---

## ✨ Key Features

- 🧑‍💼 **Freelancer & Client Dashboards** – Personalized workspaces for managing jobs, payments, and communication.
- ⚖️ **Dispute Resolution System** – Transparent and structured handling of conflicts between clients and freelancers.
- 🔍 **Advanced Search & Matching** – Find the right freelancer or client with intelligent filters and matching logic.
- 📢 **Job Posting & Talent Discovery** – Clients can post jobs, and freelancers can showcase their expertise.
- 💬 **Real-Time Messaging (Upcoming)** – Instant communication between freelancers and clients.

---

## 🧠 Tech Stack

| Layer               | Technology                           |
| ------------------- | ------------------------------------ |
| **Frontend**        | HTML, CSS, JavaScript                |
| **Backend**         | Node.js, Express.js                  |
| **Database**        | PostgreSQL, Supabase                 |
| **Version Control** | Git & GitHub                         |
| **Deployment**      | Vercel (Frontend) & Render (Backend) |

---

## ⚙️ Getting Started

Follow these steps to run **Spaces** locally.

### 🔹 1. Clone the Repository

```bash
git clone https://github.com/your-username/spaces.git
cd spaces
```

### 🔹 2. Install Dependencies

- npm install

### 🔹 3. Configure Environment Variables

Create a .env file in the project root and add your configuration:

DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_db_name
DB_PORT=5432
JWT_SECRET=your_secret_key
ADMIN_CREATION_SECRET=your_admin_secret

### 💡 Make sure PostgreSQL and Supabase are set up before running the backend.

### 4. Start the Server

node server.js
