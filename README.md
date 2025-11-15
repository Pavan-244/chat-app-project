# Chat App Project (ChatGPT-Style Application)

A simplified ChatGPT-style full-stack application built using **React**, **JavaScript**, **TailwindCSS**, and **Node.js (Express)**.  
The app mimics a conversational interface similar to ChatGPT, with session management, structured tabular responses, theme toggling, and a collapsible sidebar.

---

## ✨ Features

### 🖥️ Frontend (React + TailwindCSS)
- **Landing Page** – Start a new chat session.
- **Collapsible Sidebar**
  - Displays all chat sessions
  - Create “New Chat”
  - User info panel
- **Chat Interface**
  - Ask questions and fetch mock responses
  - Answers displayed in **tabular view** + description
  - Include **Like (👍)** and **Dislike (👎)** feedback options
- **Dark / Light Theme Toggle**
  - Switch instantly between themes
  - Complete UI updates (background, text, components)
- **Fully Responsive** on mobile, tablet, and desktop

---

## 🗂️ Session Management
- New chat → Generates a **new session ID**
- URL updates with session ID  
  `example: /chat/12345`
- Sidebar displays session titles or IDs
- Clicking any session loads its entire history
- All chat history stored locally in JSON (no database)

---

## 🔧 Backend (Node.js + Express)
- Serves mock JSON data (no external DB)
- **API Endpoints**
  - `POST /api/new-session` → Returns new session ID
  - `POST /api/ask` → Returns dummy output (table + text)
  - `GET /api/sessions` → Returns all sessions
  - `GET /api/sessions/:id` → Full session history
- Data stored in `mock-data/` folder for easy testing

---

## 🛠️ Tech Stack

### **Frontend**
- React  
- JavaScript  
- TailwindCSS  
- React Router  

### **Backend**
- Node.js  
- Express.js  
- Mock JSON files  

---

## 🚀 Run Frontend & Backend Together

This project includes a **PowerShell script (`run-dev.ps1`)** that automatically starts both:

- Backend server  
- Frontend development server  

### ▶️ Run using one command:

From the project root:

```powershell
./run-dev.ps1
