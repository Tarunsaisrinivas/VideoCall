import User from "../models/userSchema.js";

export const Signup = async (req, res) => {
  try {
    const { fullName, email, password, gender, profilepic } = req.body;
    const user = await User.findOne({ username });
    if (user)
      return res
        .status(500)
        .json({
          success: false,
          message: "User already exists with the username",
        });
        const emailpresent = await User.findOne({ email });
        if(emailpresent) return res.status(500).json({
          success: false,
          message: "User already exists with the email",
        });
        
  } catch (error) {
    console.log("Signup:", error);
  }
};
