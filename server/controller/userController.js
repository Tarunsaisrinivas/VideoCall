import User from "../models/userSchema.js";
import jwt from "jsonwebtoken";

// Get all users (excluding current logged-in user)
export const getAllUsers = async (req, res) => {
  try {
    const currentUserID = req.user._id;
    if (!currentUserID) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const users = await User.find(
      { _id: { $ne: currentUserID } },
      "profilepic email username"
    );
    
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
};
// Search user by username or email
export const getUserByUsernameOrEmail = async (req, res) => {
  const { query } = req.query;
  if (!query)
    return res
      .status(400)
      .json({ success: false, message: "Query is required." });

  try {
    const user = await User.findOne(
      { $or: [{ username: query }, { email: query }] },
      "fullname email username"
    );

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(
      id,
      "fullname email username gender profilepic"
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Invalid user ID." });
  }
};
