import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";

const isLogin = async (req, res, next) => {
  try {
    const token =
      req.cookies.jwt ||
      req.headers.cookie
        ?.split(";")
        .find((cookie) => cookie.trim().startsWith("jwt="))
        ?.split("=")[1];

    if (!token)
      return res
        .status(401)
        .send({ success: false, message: "Please Login First" });

    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decode)
      return res
        .status(401)
        .send({ success: false, message: "User unauthorized - invalid token" });

    const user = await User.findById(decode.userId).select("-password");
    if (!user) 
      return res.status(401).send({ success: false, message: "User not found" });
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ success: false, message: "Authentication failed", error: error.message });
    console.log("ISLOGIN ERROR:", error);
  }
};

export default isLogin;