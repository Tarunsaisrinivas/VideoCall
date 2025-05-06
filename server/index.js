import express from "express";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import connectDB from "./db/db.js";
import cors from 'cors';
dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: 'http://localhost:5173',
    methods:['GET', 'POST','DELETE', 'PUT', 'PATCH'],
    credentials: true

}));

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.json("hello");
});

app.listen(PORT, () => {
  connectDB();
  console.log(`server is running on port ${PORT}`);
});
