import User from "../models/userSchema.js";
import bcrypt from "bcryptjs";
import jwtToken from "../utils/jwtToken.js";

export const SignUp = async (req, res) => {
  try {
    const { fullName, username, email, password, gender, profilepic } =
      req.body;
    const user = await User.findOne({ username });
    if (user)
      return res
        .status(500)
        .send({ success: false, message: "UserName Already Exists" });
    const emailpresent = await User.findOne({ email });
    if (emailpresent)
      return res
        .status(500)
        .send({ success: false, message: "User Already Exists With this Email" });
    const hashPassword = bcrypt.hashSync(password, 10);
    const boyProfilePic =
      profilepic ||
      `https://avatar.iran.liara.run/public/boy?username=${username}`;
    const girlProfilePic =
      profilepic ||
      `https://avatar.iran.liara.run/public/girl?username=${username}`;

    const newUser = new User({
      fullName,
      username,
      email,
      password: hashPassword,
      gender,
      profilepic: gender === "male" ? boyProfilePic : girlProfilePic,
    });
    if (newUser) {
      await newUser.save();
      jwtToken(newUser._id, res);
    } else {
      res.status(500).send({ success: false, message: "Invalid User Data" });
    }
    res.status(201).send({
      _id: newUser._id,
      fullName: newUser.fullName,
      username: newUser.username,
      profilepic: newUser.profilepic,
      email: newUser.email,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error,
    });
    console.log(error);
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(500)
        .send({ success: false, message: "Email Doesn't Exist. Please Register" });
    const comparePassword = bcrypt.compareSync(password, user.password || "");
    if (!comparePassword)
      return res
        .status(500)
        .send({
          success: false,
          message: "Email Or Password Doesn't Match",
        });
    const token = jwtToken(user._id, res);
    console.log(token);

    res.status(200).send({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      profilepic: user.profilepic,
      email: user.email,
      message: "Successfully Logged In",
      token,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error,
    });
    console.log(error);
  }
};

export const LogOut = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      path: "/",
    });
    res.status(200).json({ 
      success: true,
      message: "Successfully logged out" 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message
    });
    console.log("Logout Error:", error);
  }
};
