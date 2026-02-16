# 🕌 Digital Halal Merchant Network – Ethiopia

<p align="center">

<img src="https://img.shields.io/badge/version-2.0.0-blue.svg?cacheSeconds=2592000" />
<img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/License-MIT-green.svg" />

</p>

A trusted digital platform connecting **halal-certified merchants, consumers, and regulatory bodies** in Ethiopia.

> Built to formalize Ethiopia’s halal economy and create a transparent verification system managed by Majlis (Ethiopian Islamic Affairs Supreme Council).

---

## 📌 Overview

The Digital Halal Merchant Network helps:

- 🛍️ Consumers find verified halal businesses
- 🏪 Merchants create digital storefronts
- 👑 Majlis verify and manage halal certifications

This platform introduces **trust, transparency, and digital accessibility** into Ethiopia’s halal marketplace.

---

## ✨ Key Features

### 👥 For Consumers

- Browse verified halal merchants
- Search products by category, price, and location
- Halal verification badges
- Shopping cart & checkout
- Order tracking
- Reviews & ratings
- Multilingual support

### 🏪 For Merchants

- Digital storefront creation
- Product CRUD operations
- Inventory tracking
- Order management
- Upload halal certificates
- Sales analytics dashboard

### 👑 For Admin (Majlis)

- Merchant verification system
- Certificate approval & expiry tracking
- User management
- Platform analytics
- Dispute resolution

---

## 🛠 Tech Stack

### Frontend

- React
- React Router
- Redux Toolkit
- TailwindCSS
- Axios
- Formik + Yup

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Bcrypt
- Multer
- Nodemailer

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (v6+)
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/suadabrar/digital-halal-network.git
cd digital-halal-network
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

---

## 🔐 Environment Variables

### Backend (.env)

```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📂 Project Structure

```
digital-halal-network/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── cloudinary.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Merchant.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Certificate.js
│   │   └── Review.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── merchantRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── merchantController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── adminController.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── roleCheck.js
│   │   └── upload.js
│   │
│   ├── utils/
│   │   ├── sendEmail.js
│   │   └── generateToken.js
│   │
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── common/
│   │   │   │   ├── Loader.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   └── Pagination.jsx
│   │   │   └── forms/
│   │   │       ├── ProductForm.jsx
│   │   │       └── MerchantRegisterForm.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Shop.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── MerchantDashboard.jsx
│   │   │   │   └── AdminDashboard.jsx
│   │   │   └── Auth/
│   │   │       ├── Login.jsx
│   │   │       └── Register.jsx
│   │   │
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   └── slices/
│   │   │       ├── authSlice.js
│   │   │       ├── cartSlice.js
│   │   │       └── productSlice.js
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── authService.js
│   │   │
│   │   ├── App.js
│   │   └── index.js
│   │
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🔄 User Flow

### Consumer

Register → Browse → Add to Cart → Checkout → Track Order → Review

### Merchant

Register → Apply → Upload Certificates → Get Verified → Add Products → Manage Orders

### Admin

Login → Review Merchants → Approve/Reject → Monitor Platform

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

---

## 📄 License

MIT License

---

## ❤️ Built for Ethiopia’s Halal Community
