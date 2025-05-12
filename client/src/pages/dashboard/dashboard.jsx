import React, { use, useEffect, useRef, useState } from "react";
import socketInstance from "../components/socketio/VideoCallSocket";
import {
  FaBars,
  FaTimes,
  FaPhoneAlt,
  FaMicrophone,
  FaVideo,
  FaVideoSlash,
  FaMicrophoneSlash,
} from "react-icons/fa";
import Lottie from "lottie-react";
import { Howl } from "howler";
import wavingAnimation from "../../assets/waving.json";
import { FaPhoneSlash } from "react-icons/fa6";
import apiClient from "../../apiClient";
import { useUser } from "../../context/UserContextApi";
import { RiLogoutBoxLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import Peer from "simple-peer";
import { toast, Toaster } from "react-hot-toast";

const Dashboard = () => {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOnline, setUserOnline] = useState([]);
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const myVideo = useRef(null);
  const reciverVideo = useRef(null);
  const connectionRef = useRef(null);
  const hasJoined = useRef(false);

  const [reciveCall, setReciveCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerWating, setCallerWating] = useState(false);

  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setCallrejectorData] = useState(null);

  // 🔹 State to track microphone & video status
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // 🔥 Load ringtone
  const ringtone = new Howl({
    src: ["/ringtone.mp3"], // ✅ Replace with your ringtone file
    loop: false, // ✅ Keep ringing until stopped
    volume: 1.0, // ✅ Full volume
  });

  const socket = socketInstance.getSocket();

 useEffect(() => {
   // Check if `user` and `socket` exist and if the user has not already joined the socket room.
   if (user && socket && !hasJoined.current) {
     console.log("Joining socket room with user ID:", user._id);
     // Emit a "join" event to the server with the user's ID and username.
     socket.emit("join", { id: user._id, name: user.username });
     // Mark `hasJoined.current` as `true` to ensure the user does not join multiple times.
     hasJoined.current = true;
   }

   // Debug socket connection
   socket.on("connect", () => {
     console.log("Socket connected with ID:", socket.id);
   });

   // Listen for the "me" event, which provides the current user's socket ID.
   socket.on("me", (id) => {
     console.log("Received 'me' event with ID:", id);
     setMe(id);
   });

   // Listen for "callToUser" event with improved error handling
   socket.on("callToUser", (data) => {
     console.log("📞 Incoming call received:", data);
     try {
       setReciveCall(true);
       setCaller(data);
       setCallerName(data.name || "Unknown Caller");
       setCallerSignal(data.signal);

       // Make sure the ringtone plays correctly
       ringtone.stop(); // Stop any existing ringtone first
       ringtone.play().catch((err) => {
         console.error("Error playing ringtone:", err);
       });
     } catch (error) {
       console.error("Error handling incoming call:", error);
       toast.error("Problem receiving call. Please refresh the page.");
     }
   });

   // Rest of your event listeners...

   // Cleanup function: Runs when the component unmounts or dependencies change.
   return () => {
     console.log("Cleaning up socket event listeners");
     socket.off("me");
     socket.off("callToUser");
     socket.off("callRejected");
     socket.off("callEnded");
     socket.off("userUnavailable");
     socket.off("userBusy");
     socket.off("online-users");
   };
 }, [user, socket]); // Dependencies: This effect runs whenever `user` or `socket` changes.

 const startCall = async () => {
   try {
     // First check if media devices are available
     const devices = await navigator.mediaDevices.enumerateDevices();
     const hasVideo = devices.some((device) => device.kind === "videoinput");
     const hasAudio = devices.some((device) => device.kind === "audioinput");

     if (!hasVideo || !hasAudio) {
       toast.error(
         "Camera or microphone not found. Please check your device connections."
       );
       return;
     }

     // Verify socket and modalUser are defined before proceeding
     if (!socket) {
       console.error("Socket connection is not available");
       toast.error("Network connection issue. Please refresh the page.");
       return;
     }

     if (!modalUser || !modalUser._id) {
       console.error("Selected user details are missing");
       toast.error(
         "User information is incomplete. Please select the user again."
       );
       return;
     }

     // Request access to the user's media devices (camera & microphone)
     const currentStream = await navigator.mediaDevices.getUserMedia({
       video: {
         width: { ideal: 1280 },
         height: { ideal: 720 },
         facingMode: "user",
       },
       audio: {
         echoCancellation: true,
         noiseSuppression: true,
         autoGainControl: true,
       },
     });

     // Store the stream in state so it can be used later
     setStream(currentStream);

     // Assign the stream to the local video element for preview
     if (myVideo.current) {
       myVideo.current.srcObject = currentStream;
       myVideo.current.muted = true; // Mute local audio to prevent feedback
       myVideo.current.volume = 0; // Set volume to zero to avoid echo
     }

     // Ensure that the audio track is enabled
     currentStream.getAudioTracks().forEach((track) => (track.enabled = true));

     // Close the sidebar (if open) and set the selected user for the call
     setCallRejectedPopUp(false);
     setIsSidebarOpen(false);
     setCallerWating(true); // waiting to join receiver
     setSelectedUser(modalUser._id);

     // Get the socket ID for the current user
     if (!me) {
       console.error("Local socket ID is not set");
       toast.error("Connection issue. Please refresh and try again.");
       return;
     }

     console.log("Creating peer connection as initiator");
     // Create a new Peer connection (WebRTC) as the call initiator
     const peer = new Peer({
       initiator: true,
       trickle: false,
       stream: currentStream,
       config: {
         iceServers: [
           { urls: "stun:stun.l.google.com:19302" },
           { urls: "stun:stun1.l.google.com:19302" },
         ],
       },
     });

     // Handle the "signal" event
     peer.on("signal", (data) => {
       console.log("Generated signal data for call to user:", modalUser._id);
       socket.emit("callToUser", {
         callToUserId: modalUser._id,
         signalData: data,
         from: me,
         name: user.username,
         email: user.email,
         profilepic: user.profilepic,
       });
     });

     // Handle the "stream" event
     peer.on("stream", (remoteStream) => {
       console.log("Received remote stream");
       if (reciverVideo.current) {
         reciverVideo.current.srcObject = remoteStream;
         reciverVideo.current.muted = false;
         reciverVideo.current.volume = 1.0;
       }
     });

     // Handle errors from the peer connection
     peer.on("error", (err) => {
       console.error("Peer connection error:", err);
       toast.error("Connection error. Please try again.");
       endCallCleanup();
     });

     // Listen for "callAccepted" event
     socket.once("callAccepted", (data) => {
       console.log("Call accepted by remote user:", data);
       setCallRejectedPopUp(false);
       setCallAccepted(true);
       setCallerWating(false);
       setCaller(data.from);
       if (data && data.signal) {
         peer.signal(data.signal);
       } else {
         console.error("Received invalid call accepted data:", data);
         toast.error("Connection error. Please try again.");
         endCallCleanup();
       }
     });

     // Store the peer connection reference
     connectionRef.current = peer;
     setShowUserDetailModal(false);
   } catch (error) {
     console.error("Error accessing media devices:", error);

     // Provide specific error messages based on the error type
     if (error.name === "NotAllowedError") {
       toast.error(
         "Camera/microphone access was denied. Please allow access and try again."
       );
     } else if (error.name === "NotFoundError") {
       toast.error(
         "No camera or microphone found. Please check your device connections."
       );
     } else if (error.name === "NotReadableError") {
       toast.error(
         "Camera or microphone is already in use by another application."
       );
     } else if (error.name === "OverconstrainedError") {
       toast.error(
         "Camera doesn't support the requested resolution. Please try again."
       );
     } else {
       toast.error(
         "Failed to access camera/microphone. Please check your device settings."
       );
     }

     // Clean up any partial setup
     endCallCleanup();
   }
 };

  const handelacceptCall = async () => {
    try {
      console.log("Accepting call from:", caller);
      // Stop the ringtone immediately
      ringtone.stop();

      // First check if media devices are available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some((device) => device.kind === "videoinput");
      const hasAudio = devices.some((device) => device.kind === "audioinput");

      if (!hasVideo || !hasAudio) {
        toast.error(
          "Camera or microphone not found. Please check your device connections."
        );
        return;
      }

      // Request access to the user's media devices
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Store the stream in state
      setStream(currentStream);

      // Assign the stream to the local video element
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }

      // Ensure audio track is enabled
      currentStream.getAudioTracks().forEach((track) => (track.enabled = true));

      // Update call state
      setCallAccepted(true);
      setReciveCall(false);
      setCallerWating(false);
      setIsSidebarOpen(false);

      console.log("Creating peer connection as receiver");
      // Create a new Peer connection as the receiver
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      // Handle the "signal" event
      peer.on("signal", (data) => {
        console.log("Generated answer signal:", data);
        socket.emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from,
        });
      });

      // Handle the "stream" event
      peer.on("stream", (remoteStream) => {
        console.log("Received remote stream");
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;
        }
      });

      // Handle errors from the peer connection
      peer.on("error", (err) => {
        console.error("Peer connection error:", err);
        toast.error("Connection error. Please try again.");
        endCallCleanup();
      });

      // If there's an incoming signal, process it
      if (callerSignal) {
        console.log("Processing caller signal:", callerSignal);
        peer.signal(callerSignal);
      } else {
        console.error("No caller signal available!");
        toast.error("Call data is incomplete. Please try again.");
        endCallCleanup();
        return;
      }

      // Store the peer connection reference
      connectionRef.current = peer;
    } catch (error) {
      console.error("Error accepting call:", error);

      // Provide specific error messages based on the error type
      if (error.name === "NotAllowedError") {
        toast.error(
          "Camera/microphone access was denied. Please allow access and try again."
        );
      } else if (error.name === "NotFoundError") {
        toast.error(
          "No camera or microphone found. Please check your device connections."
        );
      } else if (error.name === "NotReadableError") {
        toast.error(
          "Camera or microphone is already in use by another application."
        );
      } else if (error.name === "OverconstrainedError") {
        toast.error(
          "Camera doesn't support the requested resolution. Please try again."
        );
      } else {
        toast.error(
          "Failed to access camera/microphone. Please check your device settings."
        );
      }

      // Clean up and reject the call
      endCallCleanup();
      handelrejectCall();
    }
  };

  const handelrejectCall = () => {
    // ✅ Stop ringtone when call is accepted
    ringtone.stop();
    // ✅ Update the state to indicate that the call is rejected
    setCallerWating(false); //reciver reject the call
    setReciveCall(false); // ✅ The user is no longer receiving a call
    setCallAccepted(false); // ✅ Ensure the call is not accepted

    // ✅ Notify the caller that the call was rejected
    socket.emit("reject-call", {
      to: caller.from, // ✅ The caller's ID (who initiated the call)
      name: user.username, // ✅ The name of the user rejecting the call
      profilepic: user.profilepic, // ✅ Placeholder profile picture of the user rejecting the call
    });
  };

  const handelendCall = () => {
    // ✅ Stop ringtone when call is accepted
    console.log("🔴 Sending call-ended event...");
    // ✅ Stop ringtone when call is accepted
    ringtone.stop();
    // ✅ Notify the other user that the call has ended
    socket.emit("call-ended", {
      to: caller?.from || selectedUser, // ✅ Send call end signal to the caller or selected user
      name: user.username, // ✅ Send the username to inform the other party
    });

    // ✅ Perform cleanup actions after ending the call
    endCallCleanup();
  };

  const endCallCleanup = () => {
    // ✅ Stop all media tracks (video & audio) to release device resources
    console.log("🔴 Stopping all media streams and resetting call...");
    if (stream) {
      stream.getTracks().forEach((track) => track.stop()); // ✅ Stops camera and microphone
    }
    // ✅ Clear the receiver's video (Remote user)
    if (reciverVideo.current) {
      console.log("🔴 Clearing receiver video");
      reciverVideo.current.srcObject = null;
    }
    // ✅ Clear the user's own video
    if (myVideo.current) {
      console.log("🔴 Clearing my video");
      myVideo.current.srcObject = null;
    }
    // ✅ Destroy the peer-to-peer connection if it exists
    connectionRef.current?.destroy();
    // ✅ Reset all relevant states to indicate call has ended
    // ✅ Stop ringtone when call is accepted
    ringtone.stop();
    setCallerWating(false);
    setStream(null); // ✅ Remove video/audio stream
    setReciveCall(false); // ✅ Indicate no ongoing call
    setCallAccepted(false); // ✅ Ensure call is not mistakenly marked as ongoing
    setSelectedUser(null); // ✅ Reset the selected user
    setTimeout(() => {
      window.location.reload(); // ✅ Force reset if cleanup fails
    }, 100);
  };

  // 🎤 Toggle Microphone
  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/user");
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

  const isOnlineUser = (userId) => userOnline.some((u) => u.userId === userId);

  const handelSelectedUser = (userId) => {
    if (callAccepted || reciveCall) {
      alert("You must end the current call before starting a new one.");
      return;
    }
    const selected = filteredUsers.find((user) => user._id === userId);
    setModalUser(selected);
    setShowUserDetailModal(true);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    if (callAccepted || reciveCall) {
      alert("You must end the call before logging out.");
      return;
    }
    try {
      await apiClient.post("/auth/logout");
      socket.off("disconnect");
      socket.disconnect();
      socketInstance.setSocket();
      updateUser(null);
      localStorage.removeItem("userData");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  console.log(callerWating);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-64 h-full p-4 space-y-4 fixed z-20 transition-transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
        />

        {/* User List */}
        <ul className="space-y-4 overflow-y-auto">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                selectedUser === user._id
                  ? "bg-green-600"
                  : "bg-gradient-to-r from-purple-600 to-blue-400"
              }`}
              onClick={() => handelSelectedUser(user._id)}
            >
              <div className="relative">
                <img
                  src={user.profilepic || "/default-avatar.png"}
                  alt={`${user.username}'s profile`}
                  className="w-10 h-10 rounded-full border border-white"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.username}</span>
                <span className="text-xs text-gray-400 truncate w-32">
                  {user.email}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Logout */}
        {user && (
          <div
            onClick={handleLogout}
            className="absolute bottom-2 left-4 right-4 flex items-center gap-2 bg-red-400 px-4 py-1 cursor-pointer rounded-lg"
          >
            <RiLogoutBoxLine />
            Logout
          </div>
        )}
      </aside>

      {/* Main Content */}
      {selectedUser || reciveCall || callAccepted ? (
        <div className="relative w-full h-screen bg-black flex items-center justify-center">
          {/* Remote Video */}
          {callerWating ? (
            <div>
              <div className="flex flex-col items-center">
                <p className="font-black text-xl mb-2">User Details</p>
                <img
                  src={modalUser.profilepic || "/default-avatar.png"}
                  alt="User"
                  className="w-20 h-20 rounded-full border-4 border-blue-500 animate-bounce"
                />
                <h3 className="text-lg font-bold mt-3 text-white">
                  {modalUser.username}
                </h3>
                <p className="text-sm text-gray-300">{modalUser.email}</p>
              </div>
            </div>
          ) : (
            <video
              ref={reciverVideo}
              autoPlay
              className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
            />
          )}
          {/* Local PIP Video */}
          <div className="absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={myVideo}
              autoPlay
              playsInline
              className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg"
            />
          </div>

          {/* Username + Sidebar Button */}
          <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
            <button
              type="button"
              className="md:hidden text-2xl text-white cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {callerName || "Caller"}
          </div>

          {/* Call Controls */}
          <div className="absolute bottom-4 w-full flex justify-center gap-4">
            <button
              type="button"
              className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer"
              onClick={handelendCall}
            >
              <FaPhoneSlash size={24} />
            </button>
            {/* 🎤 Toggle Mic */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                isMicOn ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {isMicOn ? (
                <FaMicrophone size={24} />
              ) : (
                <FaMicrophoneSlash size={24} />
              )}
            </button>

            {/* 📹 Toggle Video */}
            <button
              type="button"
              onClick={toggleCam}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${
                isCamOn ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {isCamOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 md:ml-72 text-white">
          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            className="md:hidden text-2xl text-black mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          {/* Welcome */}
          <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="w-20 h-20">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Hey {user?.username || "Guest"}! 👋
              </h1>
              <p className="text-lg text-gray-300 mt-2">
                Ready to <strong>connect with friends instantly?</strong>
                Just <strong>select a user</strong> and start your video call!
                🎥✨
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm">
            <h2 className="text-lg font-semibold mb-2">
              💡 How to Start a Video Call?
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>📌 Open the sidebar to see online users.</li>
              <li>🔍 Use the search bar to find a specific person.</li>
              <li>🎥 Click on a user to start a video call instantly!</li>
            </ul>
          </div>
        </div>
      )}
      {/*call user pop up */}
      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">User Details</p>
              <img
                src={modalUser.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-20 h-20 rounded-full border-4 border-blue-500"
              />
              <h3 className="text-lg font-bold mt-3">{modalUser.username}</h3>
              <p className="text-sm text-gray-500">{modalUser.email}</p>

              <div className="flex gap-4 mt-5">
                <button
                  onClick={() => {
                    setSelectedUser(modalUser._id);
                    startCall(); // function that handles media and calling
                    setShowUserDetailModal(false);
                  }}
                  className="bg-green-600 text-white px-4 py-1 rounded-lg w-28 flex items-center gap-2 justify-center"
                >
                  Call <FaPhoneAlt />
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="bg-gray-400 text-white px-4 py-1 rounded-lg w-28"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Call rejection PopUp */}
      {callRejectedPopUp && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call Rejected From...</p>
              <img
                src={rejectorData.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{rejectorData.name}</h3>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    startCall(); // function that handles media and calling
                  }}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Call Again <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowUserDetailModal(false);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Back <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Incoming Call Modal */}
      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call From...</p>
              <img
                src={caller?.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{callerName}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Reject <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
