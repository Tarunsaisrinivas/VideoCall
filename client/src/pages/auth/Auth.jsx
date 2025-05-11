import React, { useState } from 'react'
import toast,{Toaster} from 'react-hot-toast';
import {FaUser,FaEnvelope,FaLock} from 'react-icons/fa';
import apiClient from '../../apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from "../../context/UserContextApi";
const Auth = ({type}) => {
     const { updateUser } = useUser();
  const navigate = useNavigate();
  const [formData,setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'male',
  });
  const [loading,setLoading ] = useState(false);
  
  const handleChange = (e) =>{
    setFormData({...formData,[e.target.name]:e.target.value})
  }

   const handleSubmit = async (e) => {
     e.preventDefault();
     if (type === "signup" && formData.password !== formData.confirmPassword) {
       toast.error("Passwords do not match!");
       return;
     }
     setLoading(true);
     try {
       const endpoint = type === "signup" ? "/auth/signup" : "/auth/login";
       const response = await apiClient.post(endpoint, formData);
       toast.success(response.data.message || "Success!");
       if (type === "signup") {
         navigate("/login");
       }
       if (type === "login") {
         updateUser(response.data);
         // The token is automatically set in cookies by the server
         // No need to manually set it here since we're using withCredentials: true
         navigate("/");
       }
     } catch (error) {
       toast.error(error.response?.data?.message || "Something went wrong!");
     } finally {
       setLoading(false);
     }
   };

  return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md m-2 border border-white/20">
                <h2 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {type === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {type === 'signup' && (
                        <>
                            <div className="flex items-center border border-white/20 rounded-xl p-3 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                                <FaUser className="text-purple-300 mr-3 text-lg" />
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Full Name"
                                    className="w-full bg-transparent focus:outline-none text-white placeholder-gray-300"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="flex items-center border border-white/20 rounded-xl p-3 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                                <FaUser className="text-purple-300 mr-3 text-lg" />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username (e.g., Jondo99)"
                                    className="w-full bg-transparent focus:outline-none text-white placeholder-gray-300"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </>
                    )}
                    <div className="flex items-center border border-white/20 rounded-xl p-3 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                        <FaEnvelope className="text-purple-300 mr-3 text-lg" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            className="w-full bg-transparent focus:outline-none text-white placeholder-gray-300"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="flex items-center border border-white/20 rounded-xl p-3 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                        <FaLock className="text-purple-300 mr-3 text-lg" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="w-full bg-transparent focus:outline-none text-white placeholder-gray-300"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {type === 'signup' && (
                        <div className="flex items-center border border-white/20 rounded-xl p-3 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10">
                            <FaLock className="text-purple-300 mr-3 text-lg" />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                className="w-full bg-transparent focus:outline-none text-white placeholder-gray-300"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}
                    {type === 'signup' && (
                        <div className="flex items-center space-x-6 text-white">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="gender"
                                    value="male"
                                    checked={formData.gender === 'male'}
                                    onChange={handleChange}
                                    className="mr-2 accent-purple-400"
                                />
                                Male
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="gender"
                                    value="female"
                                    checked={formData.gender === 'female'}
                                    onChange={handleChange}
                                    className="mr-2 accent-purple-400"
                                />
                                Female
                            </label>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : type === 'signup' ? 'Create Account' : 'Sign In'}
                    </button>
                </form>
                <p className="text-center text-sm mt-6 text-white/80">
                    {type === 'signup' ? (
                        <>
                            Already have an account?{' '}
                            <Link to="/login">
                                <span className="text-purple-300 hover:text-purple-200 font-medium transition-colors">Sign In</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            Don't have an account?{' '}
                            <Link to="/signup">
                                <span className="text-purple-300 hover:text-purple-200 font-medium transition-colors">Create Account</span>
                            </Link>
                        </>
                    )}
                </p>
            </div>
            <Toaster 
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#1F2937',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                }}
            />
        </div>
  )
}

export default Auth
