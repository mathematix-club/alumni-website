# 🎓 Alumni Archive Hub

A modern, serverless alumni directory designed to manage and display university alumni batches. It features a clean, professional "Card & Glass" UI for the public directory and a secure, feature-rich admin panel for data management.

## ✨ Features

### 🏛 Public Directory
* **Modern Aesthetic:** Clean "Card-Table" hybrid design using **Inter** typography and generous whitespace.
* **Glass Sidebar:** A sticky, floating sidebar with a glass-morphism effect for easy navigation between batches.
* **Mobile Optimized:** Fully responsive design with a slide-out hamburger menu on mobile devices.
* **Smart Display:** Automatically groups students by batch and displays research interests, supervisors, and live contact links.

### 🛡 Admin Panel
* **Secure Access:** Protected by **Firebase Authentication** (Email/Password).
* **CRUD Operations:** Add, Edit, and Delete student entries effortlessly.
* **Smart Data Entry:** Dropdowns for "Programme", "Start Year", and "End Year" are automatically parsed into standardized batch strings (e.g., *"Int. MSc. 2021-26"*).
* **Image Uploads:** Integrated **Cloudinary** support for drag-and-drop photo uploads (with a 1MB size limit to save bandwidth).

---

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3 (Custom + Bootstrap 5.3), JavaScript (ES6 Modules).
* **Backend:** Google Firebase (Firestore Database & Authentication).
* **Storage:** Cloudinary (Free Tier) for image hosting.
* **Hosting:** GitHub Pages (Zero-config deployment).

---

## 📂 Project Structure

```text
/
├── index.html          # Public Homepage (The Directory)
├── admin.html          # Protected Admin Dashboard
├── css/
│   └── style.css       # Unified styling for both pages
├── js/
│   ├── config.js       # Firebase & App Configuration
│   ├── home.js         # Logic for fetching & rendering the directory
│   └── admin.js        # Logic for CRUD, Auth, and Cloudinary Uploads
└── README.md           # Documentation
```

---

## 🚀 Comprehensive Documentation & Wiki

All detailed documentation regarding setup, feature guides, and administration has been abstracted into the dedicated `docs/` folder in this repository. 

*   **[📖 User Guide](docs/user-guide.md):** Learn how to query the database, request profile updates, and join the network.
*   **[🛡️ Admin Guide](docs/admin-guide.md):** Master the command center, navigate the dual-pane UI, and manage public queues.
*   **[⚙️ Developer Guide](docs/developer-guide.md):** Full backend migration tutorials, Firebase security rules setup, and Cloudinary configuration.
---

## 🖥️ Local Development

Because this project uses ES6 Modules (`type="module"`), you cannot simply double-click `index.html`. You must run a local server.

### VS Code:

1. Install the Live Server extension.
2. Right-click index.html -> Open with Live Server.

### Python:

1. Open terminal in the project folder.
2. Run: python3 -m http.server.
3. Go to http://localhost:8000.

---

## 🛡️ License
This project is open-source and available under the [MIT License](https://choosealicense.com/licenses/mit/).