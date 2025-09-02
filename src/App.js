/**
 * @fileoverview Main Application Component
 * This is the root component of the SkillConnect application.
 * It handles authentication, real-time collaboration, problem management,
 * and overall application state.
 */

import React, { useState, useEffect } from "react";
import AuthPage from "./AuthPage";
import problemIcon from "./images/R2.png";
import profileIcon from "./images/R1.jpg";
import io from "socket.io-client";
import CollaborationRoom from "./CollaborationRoom";
import AnimatedBackground from "./components/AnimatedBackground";
import AnimatedLogo from "./components/AnimatedLogo";
import "./styles/animations.css";

/**
 * Socket.IO Configuration
 * Sets up real-time communication with the backend server
 * - Enables automatic reconnection
 * - Configures exponential backoff for reconnection attempts
 * - Limits maximum reconnection attempts
 */
const socket = io("http://localhost:5000", {
  reconnection: true,          // Enable auto-reconnection
  reconnectionDelay: 1000,     // Initial delay between attempts (1s)
  reconnectionDelayMax: 5000,  // Maximum delay between attempts (5s)
  reconnectionAttempts: 5,     // Maximum number of reconnection attempts
});

/**
 * Main App Component
 * Core features:
 * 1. Authentication and user management
 * 2. Real-time collaboration rooms
 * 3. DSA problem management
 * 4. Notification system
 * 5. Invitation handling
 */

/**
 * Custom Animation Definitions
 * Defines keyframe animations for various UI transitions:
 * 1. fadeOut - Smooth opacity transition for elements being removed
 * 2. slideDown - Vertical entrance animation for dropdowns and notifications
 * 3. slideIn - Horizontal entrance animation for sidebars and modals
 */
const animations = `
  /* Fade out animation - Used for dismissing elements */
  @keyframes fadeOut {
    0% {
      opacity: 1;
    }
    70% {
      opacity: 1;  /* Hold opacity for 70% of duration */
    }
    100% {
      opacity: 0;
    }
  }

  /* Slide down animation - Used for dropdown menus */
  @keyframes slideDown {
    0% {
      transform: translateY(-10px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Slide in animation - Used for side panels */
  @keyframes slideIn {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

/**
 * Inject animation styles into document head
 * This ensures our custom animations are available globally
 */
const style = document.createElement("style");
style.textContent = animations;
document.head.appendChild(style);

/**
 * Register Custom Animations with Tailwind
 * Makes animations available through Tailwind's utility classes
 * @example
 * <div className="animate-fadeOut">...</div>
 * <div className="animate-slideDown">...</div>
 * <div className="animate-slideIn">...</div>
 */
const registerTailwindAnimations = () => {
  if (typeof window !== "undefined") {
    window.tailwind = {
      ...window.tailwind,
      theme: {
        ...window.tailwind?.theme,
        animation: {
          fadeOut: "fadeOut 3s forwards",      // 3s duration for fade out
          slideDown: "slideDown 0.3s ease-out forwards",  // Quick dropdown
          slideIn: "slideIn 0.3s ease-out forwards",      // Smooth entrance
        },
      },
    };
  }
};

// Register animations if we're in the browser
registerTailwindAnimations();

/**
 * DSA Problem Database
 * Organized collection of Data Structures and Algorithms problems
 * categorized by topics and difficulty levels.
 * 
 * Structure:
 * - Topics as main categories
 * - Each problem contains:
 *   - Unique ID
 *   - Title
 *   - Difficulty (Easy/Medium/Hard)
 *   - Detailed description
 * 
 * Used for:
 * - Problem selection in collaboration rooms
 * - Practice problem suggestions
 * - Difficulty-based learning paths
 */
const dsaProblemsByTopic = {
  // Counting Problems Category
  Counting: [
    {
      id: "count1",
      title: "Majority Element",
      difficulty: "Easy",
      description:
        "Find the element that appears more than n/2 times in an array of n elements using the Boyer-Moore voting algorithm.",
    },
    {
      id: "count2",
      title: "Find All Duplicates",
      difficulty: "Medium",
      description:
        "Given an array of integers where each value appears once or twice, find all elements that appear twice in O(n) time and O(1) space.",
    },
    {
      id: "count3",
      title: "Maximum Frequency Stack",
      difficulty: "Hard",
      description:
        "Design a stack-like data structure that pushes elements and pops the most frequent element. If there's a tie, return the most recent.",
    },
  ],
  Enumeration: [
    {
      id: "enum1",
      title: "Count Primes",
      difficulty: "Easy",
      description:
        "Count the number of prime numbers less than a given non-negative number n using the Sieve of Eratosthenes.",
    },
    {
      id: "enum2",
      title: "Gray Code",
      difficulty: "Medium",
      description:
        "Generate n-bit gray codes, where successive values differ in exactly one bit position.",
    },
    {
      id: "enum3",
      title: "Numbers With Repeated Digits",
      difficulty: "Hard",
      description:
        "Given a positive integer N, return the number of positive integers less than or equal to N that have at least one repeated digit.",
    },
  ],
  Array: [
    {
      id: "array1",
      title: "Two Sum",
      difficulty: "Easy",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    },
    {
      id: "array2",
      title: "Best Time to Buy and Sell Stock",
      difficulty: "Medium",
      description:
        "Given an array prices where prices[i] is the price of a given stock on the ith day, maximize your profit by choosing a single day to buy and a future day to sell.",
    },
    {
      id: "array3",
      title: "First Missing Positive",
      difficulty: "Hard",
      description:
        "Given an unsorted integer array nums, return the smallest missing positive integer. Must run in O(n) time and use constant extra space.",
    },
  ],
  String: [
    {
      id: "string1",
      title: "Valid Anagram",
      difficulty: "Easy",
      description:
        "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    },
  ],
};

export default function App() {
  /**
   * UI State Management
   * Controls visibility and interaction states of various UI components
   */
  const [showModal, setShowModal] = useState(false);          // Controls modal visibility
  const [showForgot, setShowForgot] = useState(false);       // Controls forgot password UI
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);  // Shows signup success message
  
  /**
   * Authentication State
   * Manages user authentication status
   */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  /**
   * Problem Management State
   * Handles DSA problem selection and display
   */
  const [showDSAProblems, setShowDSAProblems] = useState(false);  // Controls problem list visibility
  const [selectedProblem, setSelectedProblem] = useState(null);    // Currently selected problem
  const [selectedTopic, setSelectedTopic] = useState(null);        // Selected problem category
  
  /**
   * Navigation and Layout State
   * Manages page navigation and scroll positions
   */
  const [currentPage, setCurrentPage] = useState("home");
  const [topicsScrollPosition, setTopicsScrollPosition] = useState(0);
  
  /**
   * Notification System State
   * Handles system notifications and connection status
   */
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  /**
   * Collaboration and Invitation Management
   * Handles real-time collaboration features and invitation system
   */
  const [receivedInvites, setReceivedInvites] = useState([]);     // List of received invitations
  const [showInvitePopup, setShowInvitePopup] = useState(false);  // Controls invite popup visibility
  const [currentInvite, setCurrentInvite] = useState(null);       // Currently displayed invite
  const [inviteQueue, setInviteQueue] = useState([]);             // Queue of pending invites
  const [activeRoom, setActiveRoom] = useState(null);             // Current collaboration room

  /**
   * Room Exit Handler
   * Manages the cleanup and state updates when a user leaves a room
   * 
   * Flow:
   * 1. Server Notification
   *    - Emits leave-room event
   *    - Updates room participant list
   * 
   * 2. State Cleanup
   *    - Resets active room
   *    - Clears code editor
   *    - Removes room-specific listeners
   * 
   * 3. UI Updates
   *    - Shows exit confirmation
   *    - Updates navigation state
   *    - Cleans up collaborative features
   * 
   * Error Handling:
   * - Validates room state before cleanup
   * - Ensures graceful degradation
   * - Maintains data consistency
   */
  const handleLeaveRoom = () => {
    if (activeRoom) {
      // Notify server about user leaving
      socket.emit("leave-room", { roomId: activeRoom.roomId });
      // Reset room state
      setActiveRoom(null);
    }
  };

  /**
   * Processes user response to collaboration invites
   * @param {Object} invite - The invitation object
   * @param {boolean} accepted - Whether the invite was accepted
   * 
   * Handles both acceptance and rejection:
   * - For acceptance:
   *   1. Creates unique room ID
   *   2. Notifies sender
   *   3. Joins collaboration room
   * - For rejection:
   *   1. Notifies sender
   *   2. Updates invite status
   */
  const handleInviteResponse = (invite, accepted) => {
    if (accepted) {
      // Generate unique room ID for the session
      const roomId = `room_${invite.id}`;
      // Notify sender of acceptance
      socket.emit("accept-invite", {
        inviteId: invite.id,
        senderId: invite.senderId,
        title: invite.title,
        roomId: roomId,
      });

      // Join the collaboration room
      socket.emit("join-room", {
        roomId: roomId,
        userId: socket.id,
        username: "User",
        problemTitle: invite.title,
      });
      // Update the status of the invite in the received invites list
      setReceivedInvites((prev) =>
        prev.map((item) =>
          item.id === invite.id ? { ...item, status: "accepted" } : item
        )
      );
    } else {
      socket.emit("reject-invite", {
        inviteId: invite.id,
        senderId: invite.senderId,
      });
      // Update the status of the invite in the received invites list
      setReceivedInvites((prev) =>
        prev.map((item) =>
          item.id === invite.id ? { ...item, status: "rejected" } : item
        )
      );
    }

    // Remove from queue and show next invite if exists
    setInviteQueue((prev) => {
      const newQueue = prev.filter((item) => item.id !== invite.id);
      if (newQueue.length > 0) {
        setCurrentInvite(newQueue[0]);
        setShowInvitePopup(true);
      } else {
        setShowInvitePopup(false);
        setCurrentInvite(null);
      }
      return newQueue;
    });
  };

  /**
   * Socket.IO Event Handler Setup
   * Establishes all real-time communication handlers on component mount
   * 
   * Handles:
   * 1. Connection lifecycle events
   * 2. Room management
   * 3. Invite system
   * 4. Error handling
   * 5. Notification system
   */
  useEffect(() => {
    /**
     * Connection Lifecycle Handlers
     * Manages socket connection states and presence system
     * 
     * Connection States:
     * 1. Initial Connection
     *    - Establishes socket connection
     *    - Updates connection state
     *    - Registers user presence
     * 
     * 2. Disconnection
     *    - Handles graceful disconnects
     *    - Updates UI state
     *    - Prepares for reconnection
     * 
     * Features:
     * - Auto-presence registration
     * - Temporary user identification
     * - Connection state tracking
     * - Event logging
     */
    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      
      // Register user in presence system
      socket.emit("user_online", {
        userId: "user-" + Date.now(),  // Unique temporary identifier
        userName: "User",              // Default display name
      });
    });

    /**
     * Disconnection Handler
     * Manages cleanup and state updates on connection loss
     * 
     * Actions:
     * - Logs disconnect event
     * - Updates connection state
     * - Prepares for potential reconnection
     */
    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    /**
     * Connection Error Handler
     * Manages socket connection failures and error recovery
     * 
     * Features:
     * 1. Error Logging
     *    - Console output for debugging
     *    - Error state tracking
     * 
     * 2. User Feedback
     *    - Visual notifications
     *    - Reconnection status updates
     * 
     * 3. Error Recovery
     *    - Automatic reconnection attempts
     *    - Error state cleanup
     *    
     * @param {Error} error - Socket.IO error object
     * 
     * Error Types Handled:
     * - Network connectivity issues
     * - Server unavailability
     * - Authentication failures
     * - Protocol mismatches
     */
    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      // Add user-friendly error notification to queue
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: "Connection error. Retrying...",
          type: "error",
        },
      ]);
    });

    /**
     * Room Management Handlers
     * Handle events related to collaboration rooms
     */
    /**
     * Room Join Handler
     * Manages successful room join operations
     * 
     * @param {Object} data - Room join event data
     * @param {string} data.roomId - Unique room identifier
     * @param {string} data.username - Username of joining participant
     * @param {string} data.problemTitle - Title of problem being collaborated on
     * @param {Array} [data.users] - List of current room participants
     * 
     * Actions:
     * 1. Creates success notification
     * 2. Updates active room state
     * 3. Initializes participant tracking
     */
    socket.on("room-joined", (data) => {
      console.log("Joined room:", data);
      const { roomId, username, problemTitle } = data;
      
      // Create success notification with participant info
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: `${username} joined the room for problem: ${problemTitle}`,
          type: "success",
        },
      ]);
      
      // Initialize room state with participant tracking
      setActiveRoom({
        roomId,
        problemTitle,
        participants: data.users || [],  // Initialize participants list
      });
    });

    /**
     * Invite Acceptance Handler
     * Manages response when someone accepts our collaboration invite
     * 
     * Flow:
     * 1. Receives acceptance confirmation
     * 2. Extracts room details
     * 3. Joins the collaboration room
     * 4. Sets up for collaborative coding
     * 
     * @param {Object} data - Acceptance data
     * @param {string} data.roomId - Unique room identifier
     * @param {string} data.acceptedBy - ID of user who accepted
     * @param {string} data.problemTitle - Title of problem to collaborate on
     */
    /**
     * Invite Acceptance Handler
     * Manages the workflow when an invite is accepted by another user
     * 
     * @param {Object} data - Acceptance event data
     * @param {string} data.roomId - Collaboration room identifier
     * @param {string} data.acceptedBy - ID of accepting user
     * @param {string} data.problemTitle - Problem to collaborate on
     * 
     * Flow:
     * 1. Validates acceptance data
     * 2. Joins collaboration room
     * 3. Initializes sender's environment
     * 4. Sets up bidirectional communication
     * 
     * Notifications:
     * - Logs acceptance for debugging
     * - Updates room state for tracking
     */
    socket.on("invite-accepted", (data) => {
      console.log("Invite accepted:", data);
      const { roomId, acceptedBy, problemTitle } = data;
      
      // Initialize sender's room participation
      socket.emit("join-room", {
        roomId: roomId,
        userId: socket.id,
        username: "User",
        problemTitle: problemTitle,
      });
    });

    /**
     * Invitation Reception Handler
     * Processes incoming collaboration invitations and manages the invite queue
     * 
     * Features:
     * 1. Invitation data normalization
     * 2. Queue management
     * 3. Notification system
     * 4. Auto-dismissal
     * 
     * @param {Object} data - Raw invitation data
     * @param {string} data.title - Problem title
     * @param {string} data.note - Optional message
     * @param {string} data.sender - Sender's name
     * @param {string} data.senderId - Sender's unique ID
     * @param {string} data.problemId - Problem identifier
     */
    socket.on("receive-invite", (data) => {
      console.log("Received invite:", data);
      
      // Normalize and structure the invitation data
      const newInvite = {
        id: Date.now(),                    // Unique identifier for this invite
        title: data.title || "Untitled Problem",  // Fallback title
        note: data.note || "Would you like to join this problem-solving session?",
        sender: data.sender || "Anonymous", // Fallback sender name
        senderId: data.senderId,
        timestamp: new Date().toISOString(),
        problemId: data.problemId,
        status: "pending",                 // Initial invite status
      };

      // Store invite in history for tracking
      setReceivedInvites((prev) => [...prev, newInvite]);

      // Queue management with FIFO behavior
      setInviteQueue((prev) => {
        const newQueue = [...prev, newInvite];
        // Show immediately if no other invite is displayed
        if (!currentInvite) {
          setCurrentInvite(newInvite);
          setShowInvitePopup(true);
        }
        return newQueue;
      });

      // Create and show temporary notification
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          message: `New invite from ${newInvite.sender}!`,
          type: "invite",
        },
      ]);

      // Auto-dismiss notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 5000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("receive-invite");
    };
  }, []);

  /**
   * Scroll Position Management
   * Restores scroll position when DSA problems list is displayed
   * 
   * Features:
   * - Uses requestAnimationFrame for smooth rendering
   * - Maintains user's scroll position between views
   * - Handles DOM updates efficiently
   */
  React.useEffect(() => {
    if (showDSAProblems) {
      // Ensure DOM is ready before scrolling
      requestAnimationFrame(() => {
        const scrollContainer = document.querySelector(
          ".topics-scroll-container"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = topicsScrollPosition;
        }
      });
    }
  }, [showDSAProblems]);

  /**
   * Authentication View
   * Renders authentication flow when user is not authenticated
   * 
   * Components:
   * 1. AuthPage - Main authentication form
   * 2. Success Popup - Shows after successful signup
   * 3. Forgot Password Popup - Password recovery flow
   */
  if (!isAuthenticated) {
    return (
      <>
        {/* Main Authentication Component */}
        <AuthPage
          onLogin={() => setIsAuthenticated(true)}
          onSignup={() => setShowSignupSuccess(true)}
          onForgot={() => setShowForgot(true)}
        />

        {/* Signup Success Modal
            Displayed after successful account creation
            Features:
            - Centered overlay design
            - Success message
            - Login prompt
            - Dismissible
        */}
        {showSignupSuccess && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center w-full max-w-sm">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Account Created!
              </h2>
              <p className="mb-6 text-gray-600">
                Your account has been created successfully. Please log in to
                continue.
              </p>
              <button
                className="w-full bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                onClick={() => setShowSignupSuccess(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Password Recovery Modal
            Provides password reset instructions
            Features:
            - Clear instructions
            - Support contact info
            - Easily dismissible
            - Accessible design
        */}
        {showForgot && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center w-full max-w-sm">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Forgot Password
              </h2>
              <p className="mb-6 text-gray-600">
                Please contact support to reset your password.
              </p>
              <button
                className="w-full bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                onClick={() => setShowForgot(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  {
    /* Main layout in that home page like problem title , invite modal , global lobby , session page */
  }

  /**
   * Problem Detail View
   * Displays detailed information about a selected DSA problem
   * 
   * Features:
   * - Problem description
   * - Solution workspace
   * - Collaboration tools
   * - Navigation controls
   */
  if (selectedProblem) {
    return (
      <DSAProblemDetailPage
        problem={selectedProblem}
        onBack={() => {
          setSelectedProblem(null);
          // Maintain topic context when returning to problem list
        }}
        showModal={showModal}
        setShowModal={setShowModal}
        setNotifications={setNotifications}
      />
    );
  }

  /**
   * Topic Problems View
   * Shows all problems within a selected topic category
   * 
   * Features:
   * - Problem list by difficulty
   * - Problem selection
   * - Scroll position memory
   * - Back navigation
   */
  if (selectedTopic) {
    return (
      <DSATopicProblemsPage
        topic={selectedTopic}
        onBack={() => {
          // Reset problem selection when leaving topic
          setSelectedTopic(null);
          setSelectedProblem(null);
        }}
        onSelectProblem={(problem) => {
          // Preserve scroll position for better UX
          const currentScroll = document.querySelector(
            ".topics-scroll-container"
          )?.scrollTop;
          if (currentScroll) {
            localStorage.setItem(
              "topicsScrollPosition",
              currentScroll.toString()
            );
          }
          // Enrich problem data with topic context
          setSelectedProblem({
            ...problem,
            topic: selectedTopic,
          });
        }}
      />
    );
  }

  /**
   * Topics Overview Page
   * Displays all available DSA topics
   * 
   * Features:
   * - Topic categories
   * - Navigation
   * - Scroll position management
   * - Topic selection
   */
  if (showDSAProblems) {
    return (
      <DSAProblemsPage
        onBack={() => setShowDSAProblems(false)}
        onSelect={(topic) => {
          // Save navigation state
          const currentScroll = document.querySelector(
            ".topics-scroll-container"
          )?.scrollTop;
          if (currentScroll) {
            localStorage.setItem(
              "topicsScrollPosition",
              currentScroll.toString()
            );
          }
          setSelectedTopic(topic);
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col items-center bg-gray-100 overflow-hidden relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Animated Logo */}
      <div className="absolute top-4 left-4 z-10">
        <AnimatedLogo />
      </div>
      
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 pattern-grid opacity-20 z-0" />
      
      {/* Enhanced Invite Popup Notification */}
      {showInvitePopup && currentInvite && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-sm w-full z-50 transform transition-all duration-300 animate-slideIn border border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <h3 className="font-bold text-lg text-gray-900">
                  New Collaboration Invite
                </h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">From</p>
                  <p className="text-sm text-gray-600">
                    {currentInvite.sender}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Problem</p>
                  <p className="text-sm text-gray-600">{currentInvite.title}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Message</p>
                  <p className="text-sm text-gray-600">{currentInvite.note}</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(currentInvite.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleInviteResponse(currentInvite, false)}
              className="ml-4 text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => handleInviteResponse(currentInvite, false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Decline
            </button>
            <button
              onClick={() => handleInviteResponse(currentInvite, true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center"
            >
              <span>Accept</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          {inviteQueue.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
              {inviteQueue.length - 1} more{" "}
              {inviteQueue.length - 1 === 1 ? "invite" : "invites"} pending
            </div>
          )}
        </div>
      )}

      {/* Notification Toasts */}
      {/* General notifications */}

      {/* Existing notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                animation:
                  notification.type === "success"
                    ? "fadeOut 3s forwards"
                    : notification.type === "invite"
                    ? "fadeOut 5s forwards"
                    : "none",
              }}
              className={`${
                notification.type === "success"
                  ? "bg-green-500 text-xs px-3 py-1.5"
                  : notification.type === "invite"
                  ? "bg-blue-500 text-sm px-4 py-2"
                  : "bg-gray-700 px-4 py-2"
              } text-white rounded-lg shadow-lg mb-2 animate-slideDown max-w-[250px] text-center`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Collaboration Room */}
      {activeRoom && (
        <CollaborationRoom
          roomId={activeRoom.roomId}
          problemTitle={activeRoom.problemTitle}
          onLeave={handleLeaveRoom}
          socket={socket}
        />
      )}
      <nav className="w-full max-w-5xl py-4 bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-300 px-8 flex justify-between items-center rounded-lg shadow-sm z-10">
        <div className="flex gap-8">
          <button
            onClick={() => {
              setCurrentPage("home");
              setShowDSAProblems(false);
              setSelectedProblem(null);
            }}
            className={`font-bold hover-scale hover-glow ${
              currentPage === "home"
                ? "text-blue-600 animate-glow"
                : "text-gray-700 hover:text-blue-600"
            } transition-all duration-200`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentPage("discussions")}
            className={`font-bold ${
              currentPage === "discussions"
                ? "text-blue-600"
                : "text-gray-700 hover:text-blue-600"
            } transition-colors duration-200`}
          >
            Discussions
          </button>
          <button
            onClick={() => setCurrentPage("about")}
            className={`font-bold ${
              currentPage === "about"
                ? "text-blue-600"
                : "text-gray-700 hover:text-blue-600"
            } transition-colors duration-200`}
          >
            About Us
          </button>
        </div>
        <div>
          <button
            onClick={() => setCurrentPage("profile")}
            className={`font-bold ${
              currentPage === "profile"
                ? "text-blue-600"
                : "text-gray-700 hover:text-blue-600"
            } transition-colors duration-200 flex items-center gap-2`}
          >
            <img
              src={profileIcon}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            Profile
          </button>
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="grid grid-cols-2 gap-x-32 gap-y-12 content-center">
          <div className="flex flex-col items-center">
            <h1 className="font-bold mb-4">Problem Page</h1>
            <div
              onClick={() => setShowDSAProblems(true)}
              className="cursor-pointer transform transition-all duration-300 hover:scale-[1.05] hover:shadow-lg group"
            >
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-30 transition duration-300" />
                <ProblemPage onInvite={() => {}} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <h1 className="font-bold mb-4">Invite Modal</h1>
            {showModal && <InviteModal onClose={() => setShowModal(false)} />}
            {!showModal && (
              <div className="relative border rounded-lg w-[25rem] h-[15rem] bg-white/90 backdrop-blur-sm p-3 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex flex-col group">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-20 blur transition-all duration-300" />

                {/* Content */}
                <div className="relative z-10">
                  <h2 className="font-bold mb-4 group-hover:text-gray-900 transition-colors duration-300 animate-glow">
                    Invite a Coder
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500" />
                  </h2>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-0.5 group-hover:text-gray-900 transition-colors duration-300">
                        Problem Title
                      </label>
                      <input
                        type="text"
                        placeholder="Title"
                        className="w-full border rounded-lg p-1.5 text-xs bg-white/80 group-hover:border-gray-400 transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-0.5 group-hover:text-gray-900 transition-colors duration-300">
                        Note
                      </label>
                      <textarea
                        placeholder="Note..."
                        className="w-full border rounded-lg p-1.5 text-xs resize-none h-16 bg-white/80 group-hover:border-gray-400 transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="relative px-3 py-1 border rounded-lg text-xs hover:bg-gray-50 transition-all duration-300 hover:shadow-sm overflow-hidden group"
                    >
                      <span className="relative z-10">Cancel</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    </button>
                    <button
                      onClick={() => {
                        const title = document.querySelector(
                          'input[placeholder="Title"]'
                        ).value;
                        const note = document.querySelector(
                          'textarea[placeholder="Note..."]'
                        ).value;
                        socket.emit("send-invite", {
                          title: title || "Untitled Problem",
                          note:
                            note ||
                            "Would you like to join this problem-solving session?",
                          sender: "User",
                        });
                        setShowModal(false);

                        // Show success notification with animation
                        const notificationId = Date.now();
                        setNotifications((prev) => [
                          ...prev,
                          {
                            id: notificationId,
                            message: "Invite sent successfully!",
                            type: "success",
                          },
                        ]);
                        setTimeout(() => {
                          setNotifications((prev) =>
                            prev.filter((n) => n.id !== notificationId)
                          );
                        }, 3000);
                      }}
                      className="relative bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded-lg text-xs transition-all duration-300 hover:scale-105 hover:shadow-md overflow-hidden group"
                    >
                      <span className="relative z-10">Send</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <h1 className="font-bold mb-4">Global Lobby</h1>
            <div className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
              <GlobalLobby receivedInvites={receivedInvites} />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <h1 className="font-bold mb-4">Session Page</h1>
            <div className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
              <SessionPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemPage({ onInvite }) {
  const [showNotification, setShowNotification] = useState(false);

  const handleInvite = () => {
    const inviteData = {
      type: "problem-invite",
      title: "Problem Solving Session",
      note: "Would you like to collaborate on solving this problem?",
      sender: "User",
      message: "New problem solving invitation!",
    };
    socket.emit("send-invite", inviteData);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
    if (onInvite) onInvite();
  };

  return (
    <div className="relative border rounded-lg w-[25rem] h-[15rem] bg-white/90 backdrop-blur-sm flex flex-col overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur transition-all duration-300" />

      {/* Header */}
      <h2 className="relative z-10 font-bold px-3 py-2 border-b text-sm group-hover:text-gray-900 group-hover:border-gray-300 transition-all duration-300 animate-glow">
        Problems
        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500" />
      </h2>

      {/* Main Content */}
      <div className="relative z-10 flex-1 p-3">
        <div className="h-full flex flex-col gap-3">
          {/* Problem Preview Area */}
          <div className="relative border h-24 bg-gray-200/50 rounded-lg overflow-hidden group-hover:shadow-md transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
            <img
              src={problemIcon}
              alt="Problem Icon"
              className="w-full h-full object-cover transform transition-all duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-2 left-2 text-white text-sm font-semibold">
              Latest Problems
            </div>
          </div>

          {/* Problem Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-100/50 rounded-lg p-2 transition-all duration-300 hover:shadow-sm">
              <div className="text-xs text-gray-600">Active Users</div>
              <div className="text-sm font-semibold">24</div>
            </div>
            <div className="bg-gray-100/50 rounded-lg p-2 transition-all duration-300 hover:shadow-sm">
              <div className="text-xs text-gray-600">Problems Solved</div>
              <div className="text-sm font-semibold">156</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="relative z-10 border-t p-2 group-hover:border-gray-300 transition-colors duration-300 backdrop-blur-sm">
        <button
          onClick={handleInvite}
          className="relative bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 w-full rounded-lg transition-all duration-300 hover:shadow-md overflow-hidden group"
        >
          <span className="relative z-10">Start Problem Solving</span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-all duration-300" />
        </button>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-[11px] px-1.5 py-0.5 text-white rounded shadow-sm mb-2 animate-bounce max-w-[140px] text-center font-light tracking-tight">
            Invite sent successfully!
          </div>
        </div>
      )}
    </div>
  );
}

// function InviteModal({ onClose, problemTitle, onSendInvite }) {
//   const [note, setNote] = React.useState("");

//   const handleSend = () => {
//     onSendInvite({ title: problemTitle, note });
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
//       <div className="bg-white rounded-lg p-4 w-[25rem] h-[15rem] flex flex-col">
//         <div className="mb-4">
//           <h2 className="font-bold text-lg">{problemTitle || "Problem Title"}</h2>
//           <div className="border bg-gray-100 rounded-lg h-20 mt-2 p-3">
//             <textarea
//               placeholder="Add a note to describe what you need help with..."
//               className="w-full h-full bg-transparent resize-none outline-none text-sm"
//               value={note}
//               onChange={(e) => setNote(e.target.value)}
//             />
//           </div>
//         </div>
//         <div className="flex-1 flex items-end gap-2">
//           <button
//             className="px-4 py-2 border rounded-lg transition-colors duration-200 hover:bg-gray-50"
//             onClick={onClose}
//           >
//             Cancel
//           </button>
//           <button
//             className="bg-gray-700 hover:bg-gray-800 text-white flex-1 px-4 py-2 rounded-lg transition-colors duration-200"
//             onClick={handleSend}
//           >
//             Send Invite
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

function GlobalLobby({ receivedInvites }) {
  return (
    <div className="relative border rounded-lg w-[25rem] h-[15rem] bg-white/90 backdrop-blur-sm flex flex-col overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur transition-all duration-300" />

      {/* Header */}
      <h2 className="relative z-10 font-bold px-3 py-2 border-b text-sm group-hover:text-gray-900 group-hover:border-gray-300 transition-all duration-300 animate-glow">
        Global Help Requests
        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500" />
      </h2>

      {/* Main Content */}
      <div className="relative z-10 flex-1 p-3">
        <div className="h-full flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {receivedInvites && receivedInvites.length > 0 ? (
            receivedInvites.map((invite, index) => (
              <div
                key={invite.id}
                className="relative bg-gray-100/50 rounded-lg p-2 transition-all duration-300 hover:shadow-md group/item"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover/item:opacity-100 rounded-lg transition-all duration-300" />
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-gray-600 font-semibold transition-all duration-300 group-hover/item:shadow-md">
                    {invite.sender.charAt(0).toUpperCase()}
                  </div>

                  {/* Invite Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate group-hover/item:text-blue-600 transition-colors duration-300">
                      {invite.title}
                    </div>
                    <div className="text-xs text-gray-600 group-hover/item:text-gray-700 transition-colors duration-300">
                      From: {invite.sender}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(invite.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-lg transition-all duration-300 inline-block ${
                        invite.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : invite.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500 text-sm bg-gray-100/50 px-4 py-2 rounded-lg">
                No help requests yet
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="relative z-10 border-t p-2 group-hover:border-gray-300 transition-colors duration-300 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-100/50 rounded-lg p-1.5 text-center">
            <div className="text-xs text-gray-600">Active</div>
            <div className="text-sm font-semibold text-gray-800">{receivedInvites?.filter(i => i.status === "pending").length || 0}</div>
          </div>
          <div className="bg-gray-100/50 rounded-lg p-1.5 text-center">
            <div className="text-xs text-gray-600">Accepted</div>
            <div className="text-sm font-semibold text-green-600">{receivedInvites?.filter(i => i.status === "accepted").length || 0}</div>
          </div>
          <div className="bg-gray-100/50 rounded-lg p-1.5 text-center">
            <div className="text-xs text-gray-600">Declined</div>
            <div className="text-sm font-semibold text-red-600">{receivedInvites?.filter(i => i.status === "rejected").length || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// function GlobalLobby() {
//   return (
//     <div className="border p-4 w-[25rem] h-[15rem] bg-white rounded-lg shadow-sm transition-all duration-300 hover:shadow-xl">
//       <h2 className="font-bold mb-4">Global Help Requests</h2>
//       <div className="h-full flex items-center justify-center text-gray-500">
//         This feature is currently disabled
//       </div>
//     </div>
//   );
// }

function SessionPage() {
  return (
    <div className="relative border rounded-lg w-[25rem] h-[15rem] bg-white/90 backdrop-blur-sm flex flex-col overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur transition-all duration-300" />

      {/* Header */}
      <h2 className="relative z-10 font-bold px-3 py-2 border-b text-sm group-hover:text-gray-900 group-hover:border-gray-300 transition-all duration-300 animate-glow">
        Session Page
        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500" />
      </h2>

      {/* Main Content */}
      <div className="relative z-10 flex-1 p-2">
        {/* Top content area with right sidebar */}
        <div className="grid grid-cols-[1.7fr_1fr] gap-2 mb-2">
          <div className="relative border h-20 bg-gray-200/50 rounded overflow-hidden group-hover:shadow-md transform group-hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
          </div>
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-3 bg-gray-200/50 rounded transform hover:scale-x-105 transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Middle section */}
        <div className="grid grid-cols-[1.7fr_1fr] gap-2 mb-2">
          <div className="border h-6 bg-gray-200/50 rounded transform hover:scale-x-[1.01] transition-all duration-300">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          <div className="h-6 bg-gray-100/50 rounded transform hover:scale-x-[1.01] transition-all duration-300">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Bottom Input Section */}
      <div className="relative z-10 border-t p-2 group-hover:border-gray-300 transition-colors duration-300 backdrop-blur-sm">
        <div className="grid grid-cols-[1.7fr_1fr] gap-2">
          <div className="flex gap-1 items-center">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-grow border rounded p-1 text-xs bg-white/80 group-hover:border-gray-400 transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            <button className="relative bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-300 hover:scale-105 hover:shadow-md overflow-hidden group">
              <span className="relative z-10">Send</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-all duration-300" />
            </button>
          </div>
          <div className="h-6 bg-gray-200/50 rounded transform hover:scale-x-[1.01] transition-all duration-300">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

// {  problemDescriptions in that problem page  }
// Continue the existing dsaProblemsByTopic object
Object.assign(dsaProblemsByTopic, {
  Counting: [
    {
      id: "count1",
      title: "Majority Element",
      difficulty: "Easy",
      description:
        "Find the element that appears more than n/2 times in an array of n elements using the Boyer-Moore voting algorithm.",
    },
    {
      id: "count2",
      title: "Find All Duplicates",
      difficulty: "Medium",
      description:
        "Given an array of integers where each value appears once or twice, find all elements that appear twice in O(n) time and O(1) space.",
    },
    {
      id: "count3",
      title: "Maximum Frequency Stack",
      difficulty: "Hard",
      description:
        "Design a stack-like data structure that pushes elements and pops the most frequent element. If there's a tie, return the most recent.",
    },
  ],
  Enumeration: [
    {
      id: "enum1",
      title: "Count Primes",
      difficulty: "Easy",
      description:
        "Count the number of prime numbers less than a given non-negative number n using the Sieve of Eratosthenes.",
    },
    {
      id: "enum2",
      title: "Gray Code",
      difficulty: "Medium",
      description:
        "Generate n-bit gray codes, where successive values differ in exactly one bit position.",
    },
    {
      id: "enum3",
      title: "Numbers With Repeated Digits",
      difficulty: "Hard",
      description:
        "Given a positive integer N, return the number of positive integers less than or equal to N that have at least one repeated digit.",
    },
  ],
  "Monotonic Stack": [
    {
      id: "mstack1",
      title: "Daily Temperatures",
      difficulty: "Easy",
      description:
        "Given temperatures array, return an array answer such that answer[i] is the number of days you have to wait to get a warmer temperature.",
    },
    {
      id: "mstack2",
      title: "Next Greater Element II",
      difficulty: "Medium",
      description:
        "Given a circular array, return the next greater number for every element in the array.",
    },
    {
      id: "mstack3",
      title: "Maximum Rectangle",
      difficulty: "Hard",
      description:
        "Given a rows x cols binary matrix filled with 0's and 1's, find the largest rectangle containing only 1's and return its area.",
    },
  ],
  "Ordered Set": [
    {
      id: "oset1",
      title: "Contains Duplicate III",
      difficulty: "Easy",
      description:
        "Given an array nums and two integers k and t, return true if there are two distinct indices i and j such that abs(nums[i] - nums[j]) <= t and abs(i - j) <= k.",
    },
    {
      id: "oset2",
      title: "Hand of Straights",
      difficulty: "Medium",
      description:
        "Given an array of integers and W, determine if array can be rearranged into several sequences of length W, where each sequence is strictly increasing.",
    },
    {
      id: "oset3",
      title: "Count of Range Sum",
      difficulty: "Hard",
      description:
        "Given an integer array nums and two integers lower and upper, return the number of range sums that lie in [lower, upper] inclusive.",
    },
  ],
  Combinatorics: [
    {
      id: "comb1",
      title: "Pascal's Triangle",
      difficulty: "Easy",
      description:
        "Generate the first n rows of Pascal's triangle using combinatorial mathematics.",
    },
    {
      id: "comb2",
      title: "Unique Paths II",
      difficulty: "Medium",
      description:
        "Calculate the number of unique paths from top-left to bottom-right in a grid with obstacles using combinatorics.",
    },
    {
      id: "comb3",
      title: "Number of Valid Pickup and Delivery Options",
      difficulty: "Hard",
      description:
        "Given n orders, return the count of all possible valid pickup and delivery sequences.",
    },
  ],
  Bitmask: [
    {
      id: "bitmask1",
      title: "Single Number",
      difficulty: "Easy",
      description:
        "Find the number that appears only once in an array where all other numbers appear exactly twice using XOR operations.",
    },
    {
      id: "bitmask2",
      title: "Subsets",
      difficulty: "Medium",
      description:
        "Generate all possible subsets of a set of distinct integers using bitmask technique.",
    },
    {
      id: "bitmask3",
      title: "Maximum XOR With an Element From Array",
      difficulty: "Hard",
      description:
        "Answer queries about maximum XOR possible with array elements under constraints using Trie and bitmasks.",
    },
  ],
  Array: [
    {
      id: "array1",
      title: "Two Sum",
      difficulty: "Easy",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    },
    {
      id: "array2",
      title: "Best Time to Buy and Sell Stock",
      difficulty: "Medium",
      description:
        "Given an array prices where prices[i] is the price of a given stock on the ith day, maximize your profit by choosing a single day to buy and a future day to sell.",
    },
    {
      id: "array3",
      title: "First Missing Positive",
      difficulty: "Hard",
      description:
        "Given an unsorted integer array nums, return the smallest missing positive integer. Must run in O(n) time and use constant extra space.",
    },
  ],
  String: [
    {
      id: "string1",
      title: "Valid Anagram",
      difficulty: "Easy",
      description:
        "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    },
    {
      id: "string2",
      title: "Longest Palindromic Substring",
      difficulty: "Medium",
      description:
        "Given a string s, return the longest palindromic substring in s.",
    },
    {
      id: "string3",
      title: "Regular Expression Matching",
      difficulty: "Hard",
      description:
        "Given a string s and a pattern p, implement regular expression matching with support for '.' and '*' characters.",
    },
  ],
  "Hash Table": [
    {
      id: "hash1",
      title: "First Unique Character",
      difficulty: "Easy",
      description:
        "Given a string s, find the first non-repeating character and return its index. If it doesn't exist, return -1.",
    },
    {
      id: "hash2",
      title: "Group Anagrams",
      difficulty: "Medium",
      description:
        "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
    },
    {
      id: "hash3",
      title: "Longest Consecutive Sequence",
      difficulty: "Hard",
      description:
        "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence in O(n) time.",
    },
  ],
  "Dynamic Programming": [
    {
      id: "dp1",
      title: "Climbing Stairs",
      difficulty: "Easy",
      description:
        "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. How many distinct ways can you climb to the top?",
    },
    {
      id: "dp2",
      title: "Unique Paths",
      difficulty: "Medium",
      description:
        "A robot is located at the top-left corner of a m x n grid. The robot can only move either down or right. How many possible unique paths are there to reach the bottom-right corner?",
    },
    {
      id: "dp3",
      title: "Edit Distance",
      difficulty: "Hard",
      description:
        "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.",
    },
  ],
  Math: [
    {
      id: "math1",
      title: "Power of Two",
      difficulty: "Easy",
      description:
        "Given an integer n, return true if it is a power of two. Otherwise, return false.",
    },
    {
      id: "math2",
      title: "Fraction to Recurring Decimal",
      difficulty: "Medium",
      description:
        "Given two integers representing the numerator and denominator of a fraction, return the fraction in string format.",
    },
    {
      id: "math3",
      title: "Basic Calculator",
      difficulty: "Hard",
      description:
        "Implement a basic calculator to evaluate a simple expression string containing only non-negative integers, +, -, *, / operators and empty spaces.",
    },
  ],
  Tree: [
    {
      id: "tree1",
      title: "Same Tree",
      difficulty: "Easy",
      description:
        "Given the roots of two binary trees p and q, write a function to check if they are the same or not.",
    },
    {
      id: "tree2",
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      description:
        "Given the root of a binary tree, return the level order traversal of its nodes' values.",
    },
    {
      id: "tree3",
      title: "Binary Tree Maximum Path Sum",
      difficulty: "Hard",
      description:
        "Given the root of a binary tree, return the maximum path sum of any non-empty path.",
    },
  ],
  Graph: [
    {
      id: "graph1",
      title: "Find Center of Star Graph",
      difficulty: "Easy",
      description: "Given a star graph, return the center node of the graph.",
    },
    {
      id: "graph2",
      title: "Course Schedule",
      difficulty: "Medium",
      description:
        "Given numCourses and prerequisites, determine if it's possible to finish all courses.",
    },
    {
      id: "graph3",
      title: "Word Ladder",
      difficulty: "Hard",
      description:
        "Given two words and a dictionary, find the length of shortest transformation sequence from beginWord to endWord.",
    },
  ],
  "Binary Search": [
    {
      id: "bs1",
      title: "Search Insert Position",
      difficulty: "Easy",
      description:
        "Given a sorted array and a target value, return the index if found. If not, return the index where it would be if it were inserted in order.",
    },
    {
      id: "bs2",
      title: "Find Peak Element",
      difficulty: "Medium",
      description:
        "Find a peak element in an array. An element is a peak if it's greater than its neighbors.",
    },
    {
      id: "bs3",
      title: "Split Array Largest Sum",
      difficulty: "Hard",
      description:
        "Split an array into m subarrays such that the largest sum among these subarrays is minimized.",
    },
  ],
  Stack: [
    {
      id: "stack1",
      title: "Valid Parentheses",
      difficulty: "Easy",
      description:
        "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    },
    {
      id: "stack2",
      title: "Min Stack",
      difficulty: "Medium",
      description:
        "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
    },
    {
      id: "stack3",
      title: "Longest Valid Parentheses",
      difficulty: "Hard",
      description:
        "Given a string containing just '(' and ')', find the length of the longest valid parentheses substring.",
    },
  ],
  Queue: [
    {
      id: "queue1",
      title: "Number of Recent Calls",
      difficulty: "Easy",
      description:
        "Implement the RecentCounter class to count recent requests within a certain time frame.",
    },
    {
      id: "queue2",
      title: "Design Circular Deque",
      difficulty: "Medium",
      description:
        "Design your implementation of the circular double-ended queue (deque).",
    },
    {
      id: "queue3",
      title: "Sliding Window Maximum",
      difficulty: "Hard",
      description:
        "Given an array nums and a sliding window of size k, find the maximum element in each window.",
    },
  ],
  Heap: [
    {
      id: "heap1",
      title: "Last Stone Weight",
      difficulty: "Easy",
      description:
        "Given an array of stones where stones[i] is the weight of the ith stone, smash two heaviest stones together until one or no stone is left.",
    },
    {
      id: "heap2",
      title: "K Closest Points to Origin",
      difficulty: "Medium",
      description:
        "Given an array of points in the 2D plane and an integer K, return the K closest points to the origin (0, 0).",
    },
    {
      id: "heap3",
      title: "Find Median from Data Stream",
      difficulty: "Hard",
      description:
        "Design a data structure that supports adding integers and finding the median of all added numbers in O(log n) time.",
    },
  ],
  Greedy: [
    {
      id: "greedy1",
      title: "Assign Cookies",
      difficulty: "Easy",
      description:
        "Assign cookies to children to maximize the number of content children, each child having a greed factor.",
    },
    {
      id: "greedy2",
      title: "Task Scheduler",
      difficulty: "Medium",
      description:
        "Given tasks and a cooldown period n, return the minimum number of units of time to complete all tasks.",
    },
    {
      id: "greedy3",
      title: "Maximum Performance of a Team",
      difficulty: "Hard",
      description:
        "Select at most k workers to maximize team performance, considering speed and efficiency factors.",
    },
  ],
  Backtracking: [
    {
      id: "back1",
      title: "Letter Case Permutation",
      difficulty: "Easy",
      description:
        "Given a string s, return all possible strings we could create by changing cases of letters.",
    },
    {
      id: "back2",
      title: "Permutations",
      difficulty: "Medium",
      description:
        "Given an array nums of distinct integers, return all possible permutations.",
    },
    {
      id: "back3",
      title: "N-Queens",
      difficulty: "Hard",
      description:
        "Place N queens on an N×N chessboard such that no two queens threaten each other.",
    },
  ],
  "Bit Manipulation": [
    {
      id: "bit1",
      title: "Number of 1 Bits",
      difficulty: "Easy",
      description:
        "Write a function that takes an integer and returns the number of '1' bits it has.",
    },
    {
      id: "bit2",
      title: "Single Number III",
      difficulty: "Medium",
      description:
        "Given an integer array where exactly two elements appear only once and all other elements appear twice, find the two elements.",
    },
    {
      id: "bit3",
      title: "Maximum XOR of Two Numbers",
      difficulty: "Hard",
      description:
        "Given an integer array nums, return the maximum result of nums[i] XOR nums[j] for all possible pairs.",
    },
  ],
  Trie: [
    {
      id: "trie1",
      title: "Longest Common Prefix",
      difficulty: "Easy",
      description:
        "Find the longest common prefix string amongst an array of strings.",
    },
    {
      id: "trie2",
      title: "Implement Trie",
      difficulty: "Medium",
      description:
        "Implement a trie with insert, search, and startsWith methods.",
    },
    {
      id: "trie3",
      title: "Word Search II",
      difficulty: "Hard",
      description:
        "Given an m x n board of characters and a list of strings words, return all words on the board using Trie.",
    },
  ],
  Design: [
    {
      id: "design1",
      title: "Design HashMap",
      difficulty: "Easy",
      description:
        "Design a HashMap without using any built-in hash table libraries.",
    },
    {
      id: "design2",
      title: "LRU Cache",
      difficulty: "Medium",
      description:
        "Design and implement a data structure for Least Recently Used (LRU) cache.",
    },
    {
      id: "design3",
      title: "Design In-Memory File System",
      difficulty: "Hard",
      description:
        "Design an in-memory file system supporting basic operations like ls, mkdir, addContentToFile, and readContentFromFile.",
    },
  ],
  "Two Pointers": [
    {
      id: "tp1",
      title: "Move Zeroes",
      difficulty: "Easy",
      description:
        "Given an integer array nums, move all 0's to the end while maintaining the relative order of non-zero elements.",
    },
    {
      id: "tp2",
      title: "3Sum",
      difficulty: "Medium",
      description:
        "Given an array nums, find all unique triplets that sum to zero.",
    },
    {
      id: "tp3",
      title: "Trapping Rain Water",
      difficulty: "Hard",
      description:
        "Given n non-negative integers representing an elevation map, compute how much water it can trap after raining.",
    },
  ],
  "Sliding Window": [
    {
      id: "sw1",
      title: "Contains Duplicate II",
      difficulty: "Easy",
      description:
        "Given an array nums and k, determine if there are two distinct indices i and j with absolute difference at most k where nums[i] = nums[j].",
    },
    {
      id: "sw2",
      title: "Longest Repeating Character Replacement",
      difficulty: "Medium",
      description:
        "Given a string s and an integer k, return the length of the longest substring containing the same letter after replacing at most k characters.",
    },
    {
      id: "sw3",
      title: "Minimum Window Substring",
      difficulty: "Hard",
      description:
        "Given strings s and t, return the minimum window substring of s that contains all characters of t.",
    },
  ],
  Recursion: [
    {
      id: "rec1",
      title: "Fibonacci Number",
      difficulty: "Easy",
      description: "Calculate the nth Fibonacci number using recursion.",
    },
    {
      id: "rec2",
      title: "Generate Parentheses",
      difficulty: "Medium",
      description:
        "Given n pairs of parentheses, generate all combinations of well-formed parentheses.",
    },
    {
      id: "rec3",
      title: "Different Ways to Add Parentheses",
      difficulty: "Hard",
      description:
        "Given a string expression with numbers and operators, add parentheses to get all possible results.",
    },
  ],
  "Binary Tree": [
    {
      id: "bt1",
      title: "Symmetric Tree",
      difficulty: "Easy",
      description:
        "Given the root of a binary tree, check whether it is a mirror of itself.",
    },
    {
      id: "bt2",
      title: "Construct Binary Tree from Inorder and Postorder",
      difficulty: "Medium",
      description:
        "Given inorder and postorder traversal arrays, construct the unique binary tree.",
    },
    {
      id: "bt3",
      title: "Serialize and Deserialize Binary Tree",
      difficulty: "Hard",
      description:
        "Design an algorithm to serialize and deserialize a binary tree.",
    },
  ],
  "Binary Search Tree": [
    {
      id: "bst1",
      title: "Search in a Binary Search Tree",
      difficulty: "Easy",
      description:
        "Given a BST and a target value, return the subtree rooted at target value.",
    },
    {
      id: "bst2",
      title: "Validate Binary Search Tree",
      difficulty: "Medium",
      description:
        "Given a binary tree, determine if it is a valid binary search tree (BST).",
    },
    {
      id: "bst3",
      title: "Recovery Binary Search Tree",
      difficulty: "Hard",
      description:
        "Given a BST where two nodes are swapped, recover the tree without changing its structure.",
    },
  ],
  "Rolling Hash": [
    {
      id: "rh1",
      title: "Repeated Substring Pattern",
      difficulty: "Easy",
      description:
        "Determine if a string can be constructed by taking a substring and appending it multiple times.",
    },
    {
      id: "rh2",
      title: "Longest Happy Prefix",
      difficulty: "Medium",
      description:
        "Find the longest prefix that is also a suffix using rolling hash technique.",
    },
    {
      id: "rh3",
      title: "Distinct Echo Substrings",
      difficulty: "Hard",
      description:
        "Count number of distinct substrings that are echo sequences using rolling hash.",
    },
  ],
  "Game Theory": [
    {
      id: "gt1",
      title: "Nim Game",
      difficulty: "Easy",
      description:
        "Determine if you can win a game where players take turns removing stones from piles.",
    },
    {
      id: "gt2",
      title: "Can I Win",
      difficulty: "Medium",
      description:
        "Given a maximum number and a desired total, determine if first player can force a win.",
    },
    {
      id: "gt3",
      title: "Stone Game III",
      difficulty: "Hard",
      description:
        "Find the difference in scores in a game where players can take up to 3 stones.",
    },
  ],
  Interactive: [
    {
      id: "int1",
      title: "Guess Number Higher or Lower",
      difficulty: "Easy",
      description:
        "Guess a number while minimizing the number of tries using binary search.",
    },
    {
      id: "int2",
      title: "Find the Array",
      difficulty: "Medium",
      description:
        "Reconstruct an array with minimum number of interactive queries.",
    },
    {
      id: "int3",
      title: "Guess the Word",
      difficulty: "Hard",
      description:
        "Find a hidden word by making guesses and getting feedback on matching letters.",
    },
  ],
  "Data Stream": [
    {
      id: "ds1",
      title: "Moving Average from Data Stream",
      difficulty: "Easy",
      description:
        "Calculate moving average of all values in a sliding window.",
    },
    {
      id: "ds2",
      title: "Online Stock Span",
      difficulty: "Medium",
      description:
        "Design an algorithm that collects daily price quotes and returns span of stock's price.",
    },
    {
      id: "ds3",
      title: "Sliding Window Median",
      difficulty: "Hard",
      description: "Find median in all sliding windows of size k in an array.",
    },
  ],
  "Monotonic Queue": [
    {
      id: "mq1",
      title: "Sliding Window Maximum",
      difficulty: "Easy",
      description:
        "Find maximum element in all sliding windows of size k using monotonic queue.",
    },
    {
      id: "mq2",
      title: "Shortest Subarray with Sum at Least K",
      difficulty: "Medium",
      description:
        "Find shortest subarray with sum at least K using monotonic queue.",
    },
    {
      id: "mq3",
      title: "Constrained Subsequence Sum",
      difficulty: "Hard",
      description:
        "Find maximum sum of subsequence with constraints using monotonic queue.",
    },
  ],
  Brainteaser: [
    {
      id: "brain1",
      title: "Bulb Switcher",
      difficulty: "Easy",
      description:
        "Find how many bulbs are on after n rounds of switching bulbs based on divisors.",
    },
    {
      id: "brain2",
      title: "Water and Jug Problem",
      difficulty: "Medium",
      description:
        "Determine if target amount of water can be measured using two jugs.",
    },
    {
      id: "brain3",
      title: "Minimum Moves to Equal Array Elements II",
      difficulty: "Hard",
      description:
        "Find minimum moves required to make all array elements equal using math.",
    },
  ],
  "Doubly-Linked List": [
    {
      id: "dll1",
      title: "Design Browser History",
      difficulty: "Easy",
      description:
        "Implement browser history feature using doubly linked list.",
    },
    {
      id: "dll2",
      title: "Design Skiplist",
      difficulty: "Medium",
      description:
        "Implement skiplist with O(log n) search/insertion/deletion.",
    },
    {
      id: "dll3",
      title: "All O(1) Data Structure",
      difficulty: "Hard",
      description:
        "Design data structure supporting constant time operations using doubly linked lists.",
    },
  ],
  Randomized: [
    {
      id: "rand1",
      title: "Random Pick Index",
      difficulty: "Easy",
      description:
        "Randomly pick an index where target equals array value with equal probability.",
    },
    {
      id: "rand2",
      title: "Random Pick with Weight",
      difficulty: "Medium",
      description: "Pick an index with probability proportional to its weight.",
    },
    {
      id: "rand3",
      title: "Random Point in Non-overlapping Rectangles",
      difficulty: "Hard",
      description:
        "Generate random points in rectangles with uniform distribution.",
    },
  ],
  "Merge Sort": [
    {
      id: "ms1",
      title: "Merge Sorted Array",
      difficulty: "Easy",
      description:
        "Merge two sorted arrays into first array in ascending order.",
    },
    {
      id: "ms2",
      title: "Sort List",
      difficulty: "Medium",
      description:
        "Sort a linked list using merge sort algorithm in O(n log n) time.",
    },
    {
      id: "ms3",
      title: "Count of Smaller Numbers After Self",
      difficulty: "Hard",
      description:
        "Count smaller numbers after self using merge sort with index tracking.",
    },
  ],
  "Counting Sort": [
    {
      id: "cs1",
      title: "Sort Colors",
      difficulty: "Easy",
      description:
        "Sort array containing only 0s, 1s, and 2s using counting sort.",
    },
    {
      id: "cs2",
      title: "H-Index",
      difficulty: "Medium",
      description: "Calculate h-index of researcher using counting sort.",
    },
    {
      id: "cs3",
      title: "Maximum Gap",
      difficulty: "Hard",
      description:
        "Find maximum gap between successive elements in sorted array using counting sort.",
    },
  ],
  Iterator: [
    {
      id: "iter1",
      title: "Binary Search Tree Iterator",
      difficulty: "Easy",
      description:
        "Implement iterator over BST that supports hasNext() and next() operations.",
    },
    {
      id: "iter2",
      title: "Flatten Nested List Iterator",
      difficulty: "Medium",
      description: "Design iterator to flatten nested list of integers.",
    },
    {
      id: "iter3",
      title: "Design Snake Game",
      difficulty: "Hard",
      description: "Implement Snake game with iterator pattern for movement.",
    },
  ],
  Concurrency: [
    {
      id: "conc1",
      title: "Print in Order",
      difficulty: "Easy",
      description: "Print numbers in order using multiple threads.",
    },
    {
      id: "conc2",
      title: "Design Bounded Blocking Queue",
      difficulty: "Medium",
      description: "Implement thread-safe bounded blocking queue.",
    },
    {
      id: "conc3",
      title: "The Dining Philosophers",
      difficulty: "Hard",
      description: "Solve dining philosophers problem avoiding deadlock.",
    },
  ],
  Probability: [
    {
      id: "prob1",
      title: "Random Pick with Weight",
      difficulty: "Easy",
      description:
        "Pick an index randomly with weight given by the array values.",
    },
    {
      id: "prob2",
      title: "Random Point in Non-overlapping Rectangles",
      difficulty: "Medium",
      description:
        "Generate random points in given rectangles with uniform distribution.",
    },
    {
      id: "prob3",
      title: "Random Pick with Blacklist",
      difficulty: "Hard",
      description:
        "Pick a random number excluding blacklisted numbers efficiently.",
    },
  ],
  Quickselect: [
    {
      id: "qs1",
      title: "Kth Largest Element in Array",
      difficulty: "Easy",
      description: "Find kth largest element using quickselect algorithm.",
    },
    {
      id: "qs2",
      title: "Find Median from Data Stream",
      difficulty: "Medium",
      description:
        "Design data structure that can find median efficiently using quickselect.",
    },
    {
      id: "qs3",
      title: "Find Kth Smallest Pair Distance",
      difficulty: "Hard",
      description:
        "Find kth smallest distance among all pairs in array using quickselect.",
    },
  ],
  "Suffix Array": [
    {
      id: "sa1",
      title: "Longest Repeating Substring",
      difficulty: "Easy",
      description:
        "Find longest substring that appears at least twice using suffix array.",
    },
    {
      id: "sa2",
      title: "Longest Common Substring",
      difficulty: "Medium",
      description:
        "Find longest common substring between two strings using suffix array.",
    },
    {
      id: "sa3",
      title: "Shortest Palindrome",
      difficulty: "Hard",
      description:
        "Find shortest palindrome by adding characters in front using suffix array.",
    },
  ],
  "Line Sweep": [
    {
      id: "ls1",
      title: "Meeting Rooms",
      difficulty: "Easy",
      description:
        "Determine if a person can attend all meetings using line sweep.",
    },
    {
      id: "ls2",
      title: "Meeting Rooms II",
      difficulty: "Medium",
      description: "Find minimum number of conference rooms required.",
    },
    {
      id: "ls3",
      title: "Rectangle Area II",
      difficulty: "Hard",
      description: "Find total area covered by rectangles using line sweep.",
    },
    {
      id: "ls4",
      title: "The Skyline Problem",
      difficulty: "Hard",
      description:
        "Find skyline formed by buildings using line sweep algorithm.",
    },
  ],
  "Minimum Spanning Tree": [
    {
      id: "mst1",
      title: "Connect All Points",
      difficulty: "Easy",
      description:
        "Find minimum cost to connect all points using Kruskal's algorithm.",
    },
    {
      id: "mst2",
      title: "Min Cost to Connect All Points",
      difficulty: "Medium",
      description: "Connect cities with minimum cost using Prim's algorithm.",
    },
    {
      id: "mst3",
      title: "Optimize Water Distribution",
      difficulty: "Hard",
      description:
        "Optimize water distribution in village using minimum spanning tree.",
    },
  ],
  "Bucket Sort": [
    {
      id: "bs1",
      title: "Top K Frequent Elements",
      difficulty: "Easy",
      description: "Find k most frequent elements using bucket sort.",
    },
    {
      id: "bs2",
      title: "Maximum Gap",
      difficulty: "Medium",
      description:
        "Find maximum gap between successive elements using bucket sort.",
    },
    {
      id: "bs3",
      title: "Find Median from Data Stream",
      difficulty: "Hard",
      description: "Maintain running median using bucket sort approach.",
    },
  ],
  Shell: [
    {
      id: "shell1",
      title: "Word Frequency",
      difficulty: "Easy",
      description: "Count frequency of each word in file using shell commands.",
    },
    {
      id: "shell2",
      title: "Valid Phone Numbers",
      difficulty: "Medium",
      description:
        "Extract valid phone numbers from file using regex in shell.",
    },
    {
      id: "shell3",
      title: "Transpose File",
      difficulty: "Hard",
      description: "Transpose content of file using shell commands.",
    },
  ],
  "Reservoir Sampling": [
    {
      id: "rs1",
      title: "Random Node in List",
      difficulty: "Easy",
      description:
        "Return random node from linked list using reservoir sampling.",
    },
    {
      id: "rs2",
      title: "Random Pick Index",
      difficulty: "Medium",
      description:
        "Pick random index for target value using reservoir sampling.",
    },
    {
      id: "rs3",
      title: "Random Pick with Blacklist",
      difficulty: "Hard",
      description:
        "Pick random number excluding blacklist using reservoir sampling.",
    },
  ],
  "Strongly Connected Component": [
    {
      id: "scc1",
      title: "Find Mother Vertex",
      difficulty: "Easy",
      description:
        "Find mother vertex in directed graph using Kosaraju's algorithm.",
    },
    {
      id: "scc2",
      title: "Maximum Employees to Be Invited",
      difficulty: "Medium",
      description: "Find maximum employees that can be invited using SCCs.",
    },
    {
      id: "scc3",
      title: "Maximum Number of Non-overlapping Substrings",
      difficulty: "Hard",
      description: "Find maximum non-overlapping valid substrings using SCC.",
    },
  ],
  "Eulerian Circuit": [
    {
      id: "ec1",
      title: "Valid Path",
      difficulty: "Easy",
      description: "Determine if graph has valid path visiting each edge once.",
    },
    {
      id: "ec2",
      title: "Reconstruct Itinerary",
      difficulty: "Medium",
      description:
        "Find valid itinerary visiting all edges using Hierholzer's algorithm.",
    },
    {
      id: "ec3",
      title: "Cracking the Safe",
      difficulty: "Hard",
      description:
        "Find shortest string containing all possible combinations using de Bruijn graph.",
    },
  ],
  "Radix Sort": [
    {
      id: "radix1",
      title: "Sort Array by Increasing Frequency",
      difficulty: "Easy",
      description: "Sort array elements by frequency using radix sort.",
    },
    {
      id: "radix2",
      title: "Maximum Gap",
      difficulty: "Medium",
      description:
        "Find maximum gap between successive elements using radix sort.",
    },
    {
      id: "radix3",
      title: "Sort Array by Shifting",
      difficulty: "Hard",
      description: "Sort array using minimum number of right circular shifts.",
    },
  ],
  "Rejection Sampling": [
    {
      id: "rejs1",
      title: "Random Point in Circle",
      difficulty: "Easy",
      description:
        "Generate random points in circle with uniform distribution.",
    },
    {
      id: "rejs2",
      title: "Generate Random Point in a Circle",
      difficulty: "Medium",
      description: "Implement efficient rejection sampling for circle.",
    },
    {
      id: "rejs3",
      title: "Random Point in Non-overlapping Rectangles",
      difficulty: "Hard",
      description:
        "Generate random points in rectangles using rejection sampling.",
    },
  ],
  "Depth-First Search": [
    {
      id: "dfs1",
      title: "Flood Fill",
      difficulty: "Easy",
      description:
        "Given a 2D image, flood fill starting from a pixel with a new color.",
    },
    {
      id: "dfs2",
      title: "Number of Islands",
      difficulty: "Medium",
      description:
        "Given a 2D grid of '1's (land) and '0's (water), count the number of islands.",
    },
    {
      id: "dfs3",
      title: "Critical Connections in a Network",
      difficulty: "Hard",
      description:
        "Find all critical edges in a network where removing any critical edge will create more connected components.",
    },
  ],
  "Breadth-First Search": [
    {
      id: "bfs1",
      title: "Average of Levels in Binary Tree",
      difficulty: "Easy",
      description:
        "Given a binary tree, return the average value of nodes on each level.",
    },
    {
      id: "bfs2",
      title: "Shortest Path in Binary Matrix",
      difficulty: "Medium",
      description:
        "Find the shortest path from top-left to bottom-right in a binary matrix where 1 means blocked.",
    },
    {
      id: "bfs3",
      title: "Bus Routes",
      difficulty: "Hard",
      description:
        "Given bus routes and start/end stops, return minimum number of buses to reach destination.",
    },
  ],
  "Union Find": [
    {
      id: "uf1",
      title: "Number of Provinces",
      difficulty: "Easy",
      description:
        "Given a matrix of direct connections between cities, find the number of provinces.",
    },
    {
      id: "uf2",
      title: "Redundant Connection",
      difficulty: "Medium",
      description:
        "In a graph that started as a tree, return an edge that can be removed to make it a tree again.",
    },
    {
      id: "uf3",
      title: "Similar String Groups",
      difficulty: "Hard",
      description:
        "Given an array of strings, group similar strings together using union-find.",
    },
  ],
  Sorting: [
    {
      id: "sort1",
      title: "Merge Sorted Array",
      difficulty: "Easy",
      description:
        "Merge two sorted arrays nums1 and nums2 into a single sorted array.",
    },
    {
      id: "sort2",
      title: "Sort Colors",
      difficulty: "Medium",
      description:
        "Given an array with red, white, and blue objects, sort them in-place.",
    },
    {
      id: "sort3",
      title: "Count of Smaller Numbers After Self",
      difficulty: "Hard",
      description:
        "For each element, count smaller elements that come after it in the array.",
    },
  ],
  "Divide and Conquer": [
    {
      id: "dc1",
      title: "Maximum Subarray",
      difficulty: "Easy",
      description:
        "Find the contiguous subarray with the largest sum using divide and conquer.",
    },
    {
      id: "dc2",
      title: "Different Ways to Add Parentheses",
      difficulty: "Medium",
      description:
        "Given a string with numbers and operators, compute all possible results by adding parentheses.",
    },
    {
      id: "dc3",
      title: "Burst Balloons",
      difficulty: "Hard",
      description:
        "Given n balloons with numbers, burst them one by one to maximize the coins obtained.",
    },
  ],
  Geometry: [
    {
      id: "geo1",
      title: "Valid Square",
      difficulty: "Easy",
      description:
        "Given coordinates of four points, determine if they form a valid square.",
    },
    {
      id: "geo2",
      title: "Erect the Fence",
      difficulty: "Medium",
      description:
        "Find the convex hull of a set of points using the Graham Scan algorithm.",
    },
    {
      id: "geo3",
      title: "Max Points on a Line",
      difficulty: "Hard",
      description:
        "Given n points on a 2D plane, find the maximum number of points that lie on the same straight line.",
    },
  ],
  "Binary Indexed Tree": [
    {
      id: "bit1",
      title: "Range Sum Query",
      difficulty: "Easy",
      description:
        "Implement a Binary Indexed Tree to efficiently handle range sum queries and point updates.",
    },
    {
      id: "bit2",
      title: "Count of Smaller Numbers After Self",
      difficulty: "Medium",
      description:
        "Given an array nums, count for each nums[i] how many numbers to its right are smaller using BIT.",
    },
    {
      id: "bit3",
      title: "Range Sum Query 2D - Mutable",
      difficulty: "Hard",
      description:
        "Handle efficient updates and queries on a 2D matrix using Binary Indexed Tree.",
    },
  ],
  Memoization: [
    {
      id: "memo1",
      title: "Fibonacci with Memoization",
      difficulty: "Easy",
      description:
        "Calculate the nth Fibonacci number using memoization to avoid redundant calculations.",
    },
    {
      id: "memo2",
      title: "Knight Probability in Chessboard",
      difficulty: "Medium",
      description:
        "Calculate the probability that a knight remains on the board after k moves using memoization.",
    },
    {
      id: "memo3",
      title: "Stickers to Spell Word",
      difficulty: "Hard",
      description:
        "Given a list of sticker strings, find minimum stickers needed to spell out target string using memoization.",
    },
  ],
  "Hash Function": [
    {
      id: "hashfn1",
      title: "Valid Anagram",
      difficulty: "Easy",
      description:
        "Design a hash function to efficiently check if two strings are anagrams.",
    },
    {
      id: "hashfn2",
      title: "Group Shifted Strings",
      difficulty: "Medium",
      description:
        "Design a hash function to group strings that can be shifted to match each other.",
    },
    {
      id: "hashfn3",
      title: "Longest Duplicate Substring",
      difficulty: "Hard",
      description:
        "Find the longest substring that appears at least twice in a string using Rabin-Karp hash.",
    },
  ],
  "Shortest Path": [
    {
      id: "sp1",
      title: "Network Delay Time",
      difficulty: "Easy",
      description:
        "Find the minimum time for a signal to reach all nodes using Dijkstra's algorithm.",
    },
    {
      id: "sp2",
      title: "Cheapest Flights Within K Stops",
      difficulty: "Medium",
      description:
        "Find the cheapest price from src to dst with at most k stops using Bellman-Ford.",
    },
    {
      id: "sp3",
      title: "Path With Minimum Effort",
      difficulty: "Hard",
      description:
        "Find path from top-left to bottom-right with minimum maximum absolute difference using Dijkstra.",
    },
  ],
  "String Matching": [
    {
      id: "sm1",
      title: "Implement strStr()",
      difficulty: "Easy",
      description:
        "Implement KMP algorithm to find the first occurrence of a substring.",
    },
    {
      id: "sm2",
      title: "Repeated String Match",
      difficulty: "Medium",
      description:
        "Find minimum times A needs to be repeated such that B becomes a substring using KMP.",
    },
    {
      id: "sm3",
      title: "Shortest Palindrome",
      difficulty: "Hard",
      description:
        "Find shortest palindrome by adding characters in front using KMP algorithm.",
    },
    {
      id: "sm4",
      title: "Longest Happy Prefix",
      difficulty: "Hard",
      description:
        "Find the longest prefix of a string that is also a suffix using KMP.",
    },
  ],
  "Topological Sort": [
    {
      id: "ts1",
      title: "Course Schedule",
      difficulty: "Easy",
      description:
        "Determine if it's possible to finish all courses given prerequisites using topological sort.",
    },
    {
      id: "ts2",
      title: "Alien Dictionary",
      difficulty: "Medium",
      description:
        "Given a sorted dictionary of alien language, find order of characters using topological sort.",
    },
    {
      id: "ts3",
      title: "Sequence Reconstruction",
      difficulty: "Hard",
      description:
        "Check if sequences can uniquely reconstruct the original sequence using topological sort.",
    },
  ],
  "Segment Tree": [
    {
      id: "st1",
      title: "Range Sum Query - Immutable",
      difficulty: "Easy",
      description:
        "Given an integer array nums, handle multiple queries of the sum of elements between indices left and right.",
    },
    {
      id: "st2",
      title: "Range Sum Query - Mutable",
      difficulty: "Medium",
      description:
        "Handle sum queries and value updates efficiently using a segment tree.",
    },
    {
      id: "st3",
      title: "Count of Range Sum",
      difficulty: "Hard",
      description:
        "Given an integer array nums and two integers lower and upper, return the number of range sums in [lower, upper].",
    },
  ],
  "Binary Indexed Tree": [
    {
      id: "bit1",
      title: "Count of Smaller Numbers",
      difficulty: "Easy",
      description:
        "Create a Binary Indexed Tree to count numbers less than the current number.",
    },
    {
      id: "bit2",
      title: "Range Sum Query - Mutable (BIT)",
      difficulty: "Medium",
      description:
        "Implement range sum queries with updates using Binary Indexed Tree.",
    },
    {
      id: "bit3",
      title: "Count of Range Queries",
      difficulty: "Hard",
      description:
        "Handle multiple range queries efficiently using Binary Indexed Tree.",
    },
  ],
  "Monotonic Stack": [
    {
      id: "ms1",
      title: "Daily Temperatures",
      difficulty: "Easy",
      description:
        "Given temperatures array, return array of days to wait for warmer temperature.",
    },
    {
      id: "ms2",
      title: "Next Greater Element II",
      difficulty: "Medium",
      description:
        "Find the next greater element for every element in a circular array.",
    },
    {
      id: "ms3",
      title: "Maximum Rectangle in Histogram",
      difficulty: "Hard",
      description: "Find the largest rectangular area possible in a histogram.",
    },
  ],
  "Monotonic Queue": [
    {
      id: "mq1",
      title: "Sliding Window Maximum",
      difficulty: "Easy",
      description: "Find maximum element in each sliding window of size k.",
    },
    {
      id: "mq2",
      title: "Shortest Subarray with Sum at Least K",
      difficulty: "Medium",
      description: "Find shortest subarray with sum ≥ K using monotonic queue.",
    },
    {
      id: "mq3",
      title: "Constrained Subsequence Sum",
      difficulty: "Hard",
      description:
        "Maximum sum of subsequence with constraint on adjacent elements.",
    },
  ],
  "Line Sweep": [
    {
      id: "ls1",
      title: "Meeting Rooms",
      difficulty: "Easy",
      description:
        "Determine if a person can attend all meetings given interval array.",
    },
    {
      id: "ls2",
      title: "Meeting Rooms II",
      difficulty: "Medium",
      description: "Find minimum number of conference rooms required.",
    },
    {
      id: "ls3",
      title: "Rectangle Area II",
      difficulty: "Hard",
      description: "Find total area covered by rectangles using line sweep.",
    },
  ],
  "Suffix Array": [
    {
      id: "sa1",
      title: "Longest Common Prefix Array",
      difficulty: "Easy",
      description: "Build suffix array and find longest common prefix array.",
    },
    {
      id: "sa2",
      title: "Repeated String Match",
      difficulty: "Medium",
      description: "Find minimum times A needs to be repeated to contain B.",
    },
    {
      id: "sa3",
      title: "Longest Repeating Substring",
      difficulty: "Hard",
      description:
        "Find the longest repeating substring in a string using suffix array.",
    },
  ],
  "Rolling Hash": [
    {
      id: "rh1",
      title: "Implement strStr()",
      difficulty: "Easy",
      description: "Implement string matching using rolling hash (Rabin-Karp).",
    },
    {
      id: "rh2",
      title: "Repeated DNA Sequences",
      difficulty: "Medium",
      description:
        "Find all 10-letter sequences that occur more than once in DNA.",
    },
    {
      id: "rh3",
      title: "Longest Duplicate Substring",
      difficulty: "Hard",
      description: "Find the longest substring that appears at least twice.",
    },
  ],
  Sorting: [
    {
      id: "sort1",
      title: "Sort Colors",
      difficulty: "Easy",
      description:
        "Given an array with red, white, and blue objects (represented as 0, 1, and 2), sort them in-place so that objects of the same color are adjacent.",
    },
    {
      id: "sort2",
      title: "Merge Intervals",
      difficulty: "Medium",
      description:
        "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals and return the non-overlapping intervals.",
    },
    {
      id: "sort3",
      title: "Count of Smaller Numbers After Self",
      difficulty: "Hard",
      description:
        "Given an integer array nums, return an integer array counts where counts[i] is the number of smaller elements to the right of nums[i].",
    },
  ],
  Tree: [
    {
      id: "tree1",
      title: "Same Tree",
      difficulty: "Easy",
      description:
        "Given the roots of two binary trees p and q, check if they are the same tree. Two binary trees are considered the same if they are structurally identical and have the same values.",
    },
    {
      id: "tree2",
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      description:
        "Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).",
    },
    {
      id: "tree3",
      title: "Binary Tree Maximum Path Sum",
      difficulty: "Hard",
      description:
        "Given the root of a binary tree, return the maximum path sum of any non-empty path. A path is a sequence of nodes where each pair of adjacent nodes has an edge connecting them.",
    },
  ],
  "Number Theory": [
    {
      id: "nt1",
      title: "Count Primes",
      difficulty: "Easy",
      description: "Count the number of prime numbers less than n.",
    },
    {
      id: "nt2",
      title: "Ugly Number II",
      difficulty: "Medium",
      description: "Find the nth ugly number (prime factors only 2, 3, 5).",
    },
    {
      id: "nt3",
      title: "Number of Beautiful Partitions",
      difficulty: "Hard",
      description:
        "Count ways to partition array with prime number properties.",
    },
  ],
  "Game Theory": [
    {
      id: "gt1",
      title: "Nim Game",
      difficulty: "Easy",
      description:
        "Determine if you can win a Nim game given number of stones.",
    },
    {
      id: "gt2",
      title: "Can I Win",
      difficulty: "Medium",
      description:
        "Determine if first player can win with given maxChoosableInteger.",
    },
    {
      id: "gt3",
      title: "Stone Game III",
      difficulty: "Hard",
      description: "Find winner in stone game with complex rules.",
    },
  ],
  Bitmask: [
    {
      id: "bm1",
      title: "Number of Steps to Reduce to Zero",
      difficulty: "Easy",
      description:
        "Given an integer num, return the number of steps to reduce it to zero. In one step, if the current number is even, divide it by 2; otherwise, subtract 1. Use bitwise operations for efficient solution.",
    },
    {
      id: "bm2",
      title: "Maximum Product of Word Lengths",
      difficulty: "Medium",
      description:
        "Given a string array words, return the maximum value of length(word[i]) * length(word[j]) where the two words do not share common letters. Use bit manipulation to optimize character checking.",
    },
    {
      id: "bm3",
      title: "Maximum Score After XORing Subsets",
      difficulty: "Hard",
      description:
        "Given an array nums, find the maximum possible score. Score is calculated by XORing all elements in a subset and multiplying it by the subset size. Find the optimal subset using bitmask technique.",
    },
  ],
  Combinatorics: [
    {
      id: "comb1",
      title: "Pascal's Triangle",
      difficulty: "Easy",
      description: "Generate the first n rows of Pascal's triangle.",
    },
    {
      id: "comb2",
      title: "Combination Sum III",
      difficulty: "Medium",
      description: "Find all combinations of k numbers that add up to n.",
    },
    {
      id: "comb3",
      title: "Number of Ways to Wear Different Hats",
      difficulty: "Hard",
      description:
        "Count ways n people can wear n hats with given preferences.",
    },
  ],
  "Shortest Path": [
    {
      id: "sp1",
      title: "Path With Minimum Effort",
      difficulty: "Easy",
      description:
        "Find path with minimum absolute difference between adjacent cells.",
    },
    {
      id: "sp2",
      title: "Network Delay Time",
      difficulty: "Medium",
      description: "Find time for all nodes to receive signal using Dijkstra.",
    },
    {
      id: "sp3",
      title: "Cheapest Flights Within K Stops",
      difficulty: "Hard",
      description: "Find cheapest price from src to dst with at most K stops.",
    },
  ],
  Matrix: [
    {
      id: "mat1",
      title: "Matrix Diagonal Sum",
      difficulty: "Easy",
      description:
        "Given a square matrix, return the sum of the matrix diagonals.",
    },
    {
      id: "mat2",
      title: "Rotate Image",
      difficulty: "Medium",
      description: "Rotate an n x n matrix 90 degrees clockwise in-place.",
    },
    {
      id: "mat3",
      title: "Sudoku Solver",
      difficulty: "Hard",
      description:
        "Write a program to solve a Sudoku puzzle by filling empty cells.",
    },
  ],
  "Linked List": [
    {
      id: "ll1",
      title: "Middle of the Linked List",
      difficulty: "Easy",
      description: "Given a linked list, return the middle node.",
    },
    {
      id: "ll2",
      title: "Add Two Numbers",
      difficulty: "Medium",
      description: "Add two numbers represented by linked lists.",
    },
    {
      id: "ll3",
      title: "Reverse Nodes in k-Group",
      difficulty: "Hard",
      description: "Given linked list, reverse the nodes of list k at a time.",
    },
  ],
  Simulation: [
    {
      id: "sim1",
      title: "Robot Return to Origin",
      difficulty: "Easy",
      description:
        "Determine if robot returns to origin after sequence of moves.",
    },
    {
      id: "sim2",
      title: "Game of Life",
      difficulty: "Medium",
      description:
        "Given board state, return next state following Game of Life rules.",
    },
    {
      id: "sim3",
      title: "N-Queens II",
      difficulty: "Hard",
      description: "Count all distinct solutions to the n-queens puzzle.",
    },
  ],
  Stack: [
    {
      id: "stack1",
      title: "Valid Parentheses",
      difficulty: "Easy",
      description:
        "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Opening brackets must be closed in the correct order.",
    },
    {
      id: "stack2",
      title: "Min Stack",
      difficulty: "Medium",
      description:
        "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time. All operations must be in O(1) time.",
    },
    {
      id: "stack3",
      title: "Basic Calculator",
      difficulty: "Hard",
      description:
        "Implement a basic calculator to evaluate a simple expression string containing parentheses, +, -, *, / operators and numbers. Expression evaluation should follow standard operator precedence.",
    },
  ],
  "Prefix Sum": [
    {
      id: "ps1",
      title: "Range Sum Query - Immutable",
      difficulty: "Easy",
      description:
        "Calculate the sum of elements between indices using prefix sum.",
    },
    {
      id: "ps2",
      title: "Continuous Subarray Sum",
      difficulty: "Medium",
      description:
        "Check if array has continuous subarray of size > 2 summing to k.",
    },
    {
      id: "ps3",
      title: "Count Number of Nice Subarrays",
      difficulty: "Hard",
      description:
        "Count subarrays with exactly k odd numbers using prefix sum.",
    },
  ],
  "String Matching": [
    {
      id: "sm1",
      title: "Implement strStr()",
      difficulty: "Easy",
      description: "Return index of first occurrence of needle in haystack.",
    },
    {
      id: "sm2",
      title: "Repeated String Pattern",
      difficulty: "Medium",
      description: "Check if string can be constructed by repeating substring.",
    },
    {
      id: "sm3",
      title: "Shortest Palindrome",
      difficulty: "Hard",
      description: "Find shortest palindrome by adding characters in front.",
    },
  ],
  Shell: [
    {
      id: "sh1",
      title: "Word Frequency",
      difficulty: "Easy",
      description:
        "Write a bash script to calculate word frequency in a text file.",
    },
    {
      id: "sh2",
      title: "Valid Phone Numbers",
      difficulty: "Medium",
      description: "Write a bash script to find valid phone numbers in a file.",
    },
    {
      id: "sh3",
      title: "Transpose File",
      difficulty: "Hard",
      description: "Write a bash script to transpose a text file.",
    },
  ],
  Counting: [
    {
      id: "count1",
      title: "Count Items Matching a Rule",
      difficulty: "Easy",
      description: "Count items in array that match given rule.",
    },
    {
      id: "count2",
      title: "Count Square Submatrices",
      difficulty: "Medium",
      description: "Count square submatrices with all ones.",
    },
    {
      id: "count3",
      title: "Count of Smaller Numbers After Self",
      difficulty: "Hard",
      description: "Count smaller elements after each element in array.",
    },
  ],
  Probability: [
    {
      id: "prob1",
      title: "Random Pick with Weight",
      difficulty: "Easy",
      description: "Pick an index randomly with weight given by w[i].",
    },
    {
      id: "prob2",
      title: "Random Pick Index",
      difficulty: "Medium",
      description: "Return random index i such that target = nums[i].",
    },
    {
      id: "prob3",
      title: "Random Point in Non-overlapping Rectangles",
      difficulty: "Hard",
      description: "Generate random point in given non-overlapping rectangles.",
    },
  ],
  "Reservoir Sampling": [
    {
      id: "rs1",
      title: "Random Node in Linked List",
      difficulty: "Easy",
      description:
        "Given a singly linked list, return a random node's value with equal probability. You can only traverse the linked list once.",
    },
    {
      id: "rs2",
      title: "Random K Items from Stream",
      difficulty: "Medium",
      description:
        "Select k items from a stream of numbers with equal probability, where the stream length is unknown. You can only traverse the stream once.",
    },
    {
      id: "rs3",
      title: "Web Log Analysis",
      difficulty: "Hard",
      description:
        "Given a continuous stream of web logs, implement a system to maintain a uniform random sample of k logs at any time, with O(1) space complexity beyond the k samples.",
    },
  ],
  "Strongly Connected Component": [
    {
      id: "scc1",
      title: "Connected Cities",
      difficulty: "Easy",
      description:
        "Given a list of one-way flights between cities, determine if you can visit all cities and return to the starting city.",
    },
    {
      id: "scc2",
      title: "Minimum Edge Additions",
      difficulty: "Medium",
      description:
        "Given a directed graph, find the minimum number of edges to add to make the graph strongly connected.",
    },
    {
      id: "scc3",
      title: "Component Hierarchy",
      difficulty: "Hard",
      description:
        "Given a directed graph, find all strongly connected components and organize them in a hierarchical order. If component A can reach component B, A should be higher in the hierarchy.",
    },
  ],
  "Eulerian Circuit": [
    {
      id: "ec1",
      title: "Valid Round Trip",
      difficulty: "Easy",
      description:
        "Given an undirected graph, determine if it's possible to start from any vertex and travel through each edge exactly once, returning to the start.",
    },
    {
      id: "ec2",
      title: "Reconstruct Itinerary",
      difficulty: "Medium",
      description:
        "Given a list of airline tickets with source and destination airports, reconstruct the itinerary that uses all tickets exactly once, starting from 'JFK'.",
    },
    {
      id: "ec3",
      title: "Chinese Postman Problem",
      difficulty: "Hard",
      description:
        "Given a weighted graph representing streets, find the shortest possible route that visits every street at least once and returns to the starting point.",
    },
  ],
  "Radix Sort": [
    {
      id: "radix1",
      title: "Sort Numbers (0-999)",
      difficulty: "Easy",
      description:
        "Implement Radix Sort to sort an array of integers between 0 and 999. The algorithm should process each digit position from least significant to most significant.",
    },
    {
      id: "radix2",
      title: "Sort Strings",
      difficulty: "Medium",
      description:
        "Implement Radix Sort to sort strings of equal length. The algorithm should work with lowercase letters only and process characters from right to left.",
    },
    {
      id: "radix3",
      title: "Custom Radix Sort",
      difficulty: "Hard",
      description:
        "Implement a generalized Radix Sort that can sort objects based on multiple keys with different radixes, maintaining stable sorting for each key.",
    },
  ],
  "Rejection Sampling": [
    {
      id: "reject1",
      title: "Generate Random Point in Circle",
      difficulty: "Easy",
      description:
        "Implement a function that generates a random point inside a circle with radius R, using rejection sampling with a bounding square.",
    },
    {
      id: "reject2",
      title: "Sample from Distribution",
      difficulty: "Medium",
      description:
        "Given a function that generates random numbers from one distribution, implement a function that generates random numbers from another distribution using rejection sampling.",
    },
    {
      id: "reject3",
      title: "Complex Region Sampling",
      difficulty: "Hard",
      description:
        "Implement a function that generates random points within a complex 2D shape defined by mathematical inequalities, using rejection sampling with optimal bounding shape selection.",
    },
  ],
  "Biconnected Component": [
    {
      id: "bcc1",
      title: "Find Cut Vertices",
      difficulty: "Easy",
      description:
        "Given an undirected graph, find all vertices whose removal would increase the number of connected components in the graph.",
    },
    {
      id: "bcc2",
      title: "Network Reliability",
      difficulty: "Medium",
      description:
        "Given a network of computers, find all critical points where a single point of failure could disconnect part of the network. Return the components that would be disconnected.",
    },
    {
      id: "bcc3",
      title: "Component Tree",
      difficulty: "Hard",
      description:
        "Given an undirected graph, construct a tree where each node represents a biconnected component. The tree should show how components are connected through articulation points.",
    },
  ],
});

const problemDescriptions = {
  Array:
    "A collection of elements stored at contiguous memory locations.\n\nSupports random access, making element retrieval efficient (O(1)).\n\nForms the foundation for many algorithms and data structures.",
  String:
    "A sequence of characters, often used for text processing.\n\nSupports operations like searching, pattern matching, and manipulation.\n\nWidely used in parsing, encoding, and algorithmic challenges.",
  "Hash Table":
    "Stores key-value pairs with near O(1) average lookup and insertion.\n\nUses hashing functions to distribute data across buckets.\n\nCommon in implementing maps, sets, and caching.",
  "Dynamic Programming":
    "A technique to solve problems by breaking them into overlapping subproblems.\n\nUses memoization (top-down) or tabulation (bottom-up).\n\nCommonly used for optimization problems like knapsack, LIS, and DP on trees.",
  Math: "Includes number theory, modular arithmetic, GCD, and prime-related algorithms.\n\nEssential for cryptography, probability, and combinatorics problems.\n\nProvides mathematical insights for efficient algorithm design.",
  Sorting:
    "Arranges data in a specific order (ascending/descending).\n\nAlgorithms: QuickSort, MergeSort, HeapSort, Counting Sort, etc.\n\nSorting is often a prerequisite for searching and optimization tasks.",
  Greedy:
    "Builds a solution step by step, always choosing the locally optimal choice.\n\nWorks well for problems like activity selection, Huffman coding, and MST.\n\nNot always optimal, but efficient where it applies.",
  "Depth-First Search":
    "A graph/tree traversal algorithm exploring as far as possible along each branch.\n\nUseful for cycle detection, connected components, and pathfinding.\n\nOften implemented recursively or using a stack.",
  "Binary Search":
    "Efficient searching technique on sorted arrays (O(log n)).\n\nDivides search space into halves at each step.\n\nUsed in problems like finding elements, ranges, or boundaries.",
  Database:
    "Deals with queries and operations on structured data.\n\nInvolves SQL/NoSQL and concepts like indexing and joins.\n\nAlgorithms focus on efficient data retrieval and transaction handling.",
  Matrix:
    "2D representation of data, used in DP, graph problems, and image processing.\n\nSupports operations like rotation, transposition, and multiplication.\n\nCrucial for problems like shortest paths, island counting, and pathfinding.",
  Tree: "A hierarchical structure with nodes connected by edges.\n\nApplications: file systems, compilers, and databases.\n\nVariants include Binary Tree, AVL, Red-Black Tree, etc.",
  "Breadth-First Search":
    "Traversal technique exploring nodes level by level.\n\nUses a queue, ensuring shortest path in unweighted graphs.\n\nCommon in shortest-path algorithms and state-space search.",
  "Bit Manipulation":
    "Uses bitwise operations for efficient computation.\n\nCommon in subset problems, XOR tricks, and low-level optimizations.\n\nHelps in solving space/time-critical problems.",
  "Two Pointers":
    "Uses two indices moving through a structure to solve problems efficiently.\n\nUseful for searching pairs, sliding windows, and partitioning arrays.\n\nReduces nested loops, optimizing runtime to O(n).",
  "Prefix Sum":
    "Stores cumulative sums to answer range queries efficiently.\n\nUsed in subarray sum, frequency analysis, and dynamic ranges.\n\nOften combined with hashing or DP.",
  Heap: "Binary heap structure providing O(log n) insertion and removal.\n\nUsed in scheduling, Dijkstra's shortest path, and median finding.\n\nSupports min-heap and max-heap operations.",
  Simulation:
    "Models a process step-by-step as described in the problem statement.\n\nOften involves implementing rules rather than formulas.\n\nUseful for problems like scheduling, traffic flow, or games.",
  "Binary Tree":
    "A tree with at most two children per node.\n\nTraversals: inorder, preorder, postorder.\n\nFoundation for BSTs, heaps, and balanced search trees.",
  Graph:
    "A collection of nodes (vertices) connected by edges.\n\nCan be directed/undirected, weighted/unweighted.\n\nUsed in pathfinding, networking, and dependency resolution.",
  Stack:
    "A linear data structure that follows the Last-In-First-Out (LIFO) principle.\n\nSupports operations like push, pop, and peek in O(1).\n\nWidely used in expression evaluation, recursion, and backtracking.",
  Counting:
    "Involves determining the frequency or number of occurrences of elements.\n\nUseful in problems like majority element, counting inversions, and frequency maps.\n\nOften combined with hashing, arrays, or prefix sums.",
  "Sliding Window":
    "Maintains a window of elements while traversing a sequence.\n\nUsed for subarray/substring problems like maximum sum or unique characters.\n\nReduces time complexity by avoiding re-computation.",
  Design:
    "Focuses on building systems, APIs, or data structures from scratch.\n\nRequires understanding of scalability, efficiency, and modularity.\n\nCommon problems: LRU cache, Twitter clone, and custom data structures.",
  Enumeration:
    "Involves generating all possible configurations or outcomes.\n\nUseful in combinatorial problems and exhaustive search.\n\nOften combined with pruning or optimization to handle complexity.",
  Backtracking:
    "A recursive algorithm that tries all possibilities and backtracks on failure.\n\nUsed in solving puzzles like Sudoku, N-Queens, and word search.\n\nEnsures completeness but may require pruning to improve efficiency.",
  "Union Find":
    "A structure to track connected components in dynamic graphs.\n\nSupports union and find operations with near O(1) using path compression.\n\nCommonly used in Kruskal's MST and connectivity problems.",
  "Linked List":
    "A linear data structure where elements are linked using pointers.\n\nSupports efficient insertions and deletions compared to arrays.\n\nVariants: singly, doubly, and circular linked lists.",
  "Number Theory":
    "Deals with properties of integers, primes, and modular arithmetic.\n\nApplied in cryptography, hashing, and combinatorial counting.\n\nIncludes GCD, LCM, modular exponentiation, and sieve algorithms.",
  "Ordered Set":
    "A set where elements are stored in sorted order.\n\nSupports fast insertion, deletion, and order-statistics queries.\n\nImplemented using balanced binary search trees.",
  "Monotonic Stack":
    "A stack that maintains elements in increasing or decreasing order.\n\nUseful for problems like Next Greater Element and histogram largest area.\n\nReduces time complexity to linear in range query problems.",
  "Segment Tree":
    "A binary tree structure for range queries and updates.\n\nSupports operations like range sum, min, or max in O(log n).\n\nUseful in dynamic interval problems.",
  Trie: "A tree-like structure used to store strings efficiently.\n\nSupports prefix search, autocomplete, and dictionary problems.\n\nProvides O(m) operations, where m is string length.",
  Combinatorics:
    "Focuses on counting, arrangements, and probability of outcomes.\n\nUsed in problems involving permutations, combinations, and binomial coefficients.\n\nPlays a major role in probability and optimization algorithms.",
  Bitmask:
    "Represents subsets or states using binary representation.\n\nCommon in DP problems like traveling salesman and set covering.\n\nProvides efficient state transitions and memory usage.",
  "Divide and Conquer":
    "Breaks a problem into smaller subproblems, solves recursively, and combines results.\n\nAlgorithms: Merge Sort, Quick Sort, and Binary Search.\n\nImproves efficiency by solving smaller parts independently.",
  Queue:
    "A linear structure following First-In-First-Out (FIFO).\n\nOperations include enqueue and dequeue in O(1).\n\nUsed in BFS, scheduling, and buffering tasks.",
  Recursion:
    "A function calling itself to solve smaller instances of a problem.\n\nSimplifies code for problems with repetitive substructure.\n\nOften paired with backtracking, DP, and divide and conquer.",
  Geometry:
    "Involves algorithms for shapes, distances, and coordinates.\n\nUsed in convex hull, line sweep, and computational geometry.\n\nApplications include graphics, GIS, and robotics.",
  "Binary Indexed Tree":
    "A data structure for cumulative frequency/range queries.\n\nSupports updates and prefix queries in O(log n).\n\nMore space-efficient compared to segment trees.",
  Memoization:
    "A technique to store results of expensive function calls.\n\nPrevents redundant computation in recursive solutions.\n\nCommonly used in dynamic programming for optimization.",
  "Hash Function":
    "Maps input data of arbitrary size to a fixed-size output.\n\nEssential for hashing, cryptography, and data indexing.\n\nA good hash function minimizes collisions.",
  "Binary Search Tree":
    "A binary tree where left child < parent < right child.\n\nSupports efficient insertion, deletion, and searching.\n\nBasis for balanced trees like AVL and Red-Black Tree.",
  "Shortest Path":
    "Algorithms to find the minimum distance between nodes in a graph.\n\nExamples include Dijkstra, Bellman-Ford, and Floyd-Warshall.\n\nUsed in navigation, routing, and networking.",
  "String Matching":
    "Algorithms to find a substring within a larger string.\n\nIncludes KMP, Rabin-Karp, and Z-algorithm.\n\nEssential for searching and pattern recognition.",
  "Topological Sort":
    "Orders nodes of a directed acyclic graph (DAG).\n\nEnsures every directed edge goes from earlier to later node.\n\nUsed in dependency resolution, scheduling, and compilers.",
  "Rolling Hash":
    "A hash function optimized for substrings.\n\nEnables efficient string matching in algorithms like Rabin-Karp.\n\nReduces recomputation by updating hash with sliding windows.",
  "Game Theory":
    "Studies strategies in competitive scenarios.\n\nCommon in problems like Nim game and Grundy numbers.\n\nHelps analyze win/lose positions in two-player games.",
  Interactive:
    "Involves real-time communication with the problem environment.\n\nRequires adaptive algorithms to handle dynamic input.\n\nCommon in coding contests with judge interaction.",
  "Data Stream":
    "Deals with continuous input where storage is limited.\n\nAlgorithms must work in real-time with partial data.\n\nUsed in monitoring, analytics, and streaming platforms.",
  "Monotonic Queue":
    "A queue that maintains elements in increasing or decreasing order.\n\nUseful in sliding window maximum/minimum problems.\n\nEnsures efficient O(n) complexity in range queries.",
  Brainteaser:
    "Logic-based puzzles requiring creative problem-solving.\n\nOften simpler in coding but tricky conceptually.\n\nTests mathematical reasoning and pattern recognition.",
  "Doubly-Linked List":
    "A linked list with pointers to both previous and next nodes.\n\nAllows bidirectional traversal and efficient insertion/deletion.\n\nForms the basis of LRU caches and deque implementations.",
  Randomized:
    "Algorithms that use randomness for efficiency or simplicity.\n\nExamples include randomized quicksort and hashing.\n\nUseful in probabilistic algorithms and Monte Carlo simulations.",
  "Merge Sort":
    "A divide and conquer sorting algorithm.\n\nGuarantees O(n log n) time complexity in all cases.\n\nStable sort, widely used in external sorting.",
  "Counting Sort":
    "A non-comparison-based sorting algorithm.\n\nWorks by counting occurrences of each element.\n\nEfficient for small ranges but not for large diverse data.",
  Iterator:
    "An object for sequential traversal of a container.\n\nAbstracts away implementation details of data structures.\n\nCommon in collections and custom data structures.",
  Concurrency:
    "Running multiple computations simultaneously.\n\nRequires handling of synchronization and shared resources.\n\nImportant in multi-threading, parallelism, and distributed systems.",
  Probability:
    "Deals with uncertainty, randomness, and data analysis.\n\nUsed in randomized algorithms, machine learning, and simulations.\n\nHelps in expectation-based problem solving.",
  Quickselect:
    "An algorithm to find the k-th smallest element in an array.\n\nBased on the partitioning logic of quicksort.\n\nAverage case O(n), worst case O(n²).",
  "Suffix Array":
    "A sorted array of all suffixes of a string.\n\nUseful for pattern matching and string processing.\n\nProvides efficient solutions for problems like LCP (Longest Common Prefix).",
  "Line Sweep":
    "An algorithmic technique that processes events along a line (usually sorted).\n\nCommon in geometry (finding intersections, rectangles overlap).\n\nWorks by maintaining active intervals as the line sweeps across.",
  "Minimum Spanning Tree":
    "A subset of graph edges that connects all vertices with minimum total weight.\n\nAlgorithms: Kruskal's and Prim's.\n\nUsed in network design, clustering, and optimization.",
  "Bucket Sort":
    "A distribution-based sorting algorithm.\n\nDivides elements into buckets, sorts them, and merges.\n\nEfficient for uniformly distributed data.",
  Shell:
    "Problems involving command-line or shell scripting.\n\nFocuses on system-level commands and file operations.\n\nCommon in automation and environment configuration.",
  "Reservoir Sampling":
    "A randomized algorithm for sampling from streaming data.\n\nEnsures equal probability for each element without knowing size in advance.\n\nUseful in big data and streaming applications.",
  "Strongly Connected Component":
    "A subgraph where every vertex is reachable from every other vertex.\n\nFound using Kosaraju's or Tarjan's algorithm.\n\nImportant in analyzing directed graphs.",
  "Eulerian Circuit":
    "A path in a graph that visits every edge exactly once and returns to the start.\n\nExists if all vertices have even degree (for undirected graphs).\n\nApplications include route planning and DNA sequencing.",
  "Radix Sort":
    "A non-comparison sorting algorithm using digit-by-digit sorting.\n\nWorks efficiently for integers and strings.\n\nOften combined with counting sort.",
  "Rejection Sampling":
    "A probabilistic method to generate random samples from a distribution.\n\nInvolves accepting or rejecting candidates based on probability.\n\nCommon in Bayesian inference and simulations.",
  "Biconnected Component":
    "A maximal subgraph where removal of any single vertex does not disconnect it.\n\nFound using DFS and low-link values.\n\nUsed in network reliability and graph analysis.",
};

function DSAProblemsPage({ onBack, onSelect }) {
  const scrollContainerRef = React.useRef(null);

  // Save scroll position whenever user scrolls
  const handleScroll = React.useCallback((e) => {
    localStorage.setItem("topicsScrollPosition", e.target.scrollTop.toString());
  }, []);

  // Restore scroll position when component mounts
  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      const savedPosition = localStorage.getItem("topicsScrollPosition");
      if (savedPosition) {
        // Use setTimeout to ensure the scroll happens after render
        setTimeout(() => {
          scrollContainer.scrollTop = parseInt(savedPosition);
        }, 0);
      }
      scrollContainer.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  const problems = [
    "Array",
    "String",
    "Hash Table",
    "Dynamic Programming",
    "Math",
    "Sorting",
    "Greedy",
    "Depth-First Search",
    "Binary Search",
    "Database",
    "Matrix",
    "Tree",
    "Breadth-First Search",
    "Bit Manipulation",
    "Two Pointers",
    "Prefix Sum",
    "Heap",
    "Simulation",
    "Binary Tree",
    "Graph",
    "Stack",
    "Counting",
    "Sliding Window",
    "Design",
    "Enumeration",
    "Backtracking",
    "Union Find",
    "Linked List",
    "Number Theory",
    "Ordered Set",
    "Monotonic Stack",
    "Segment Tree",
    "Trie",
    "Combinatorics",
    "Bitmask",
    "Divide and Conquer",
    "Queue",
    "Recursion",
    "Geometry",
    "Binary Indexed Tree",
    "Memoization",
    "Hash Function",
    "Binary Search Tree",
    "Shortest Path",
    "String Matching",
    "Topological Sort",
    "Rolling Hash",
    "Game Theory",
    "Interactive",
    "Data Stream",
    "Monotonic Queue",
    "Brainteaser",
    "Doubly-Linked List",
    "Randomized",
    "Merge Sort",
    "Counting Sort",
    "Iterator",
    "Concurrency",
    "Probability",
    "Quickselect",
    "Suffix Array",
    "Line Sweep",
    "Minimum Spanning Tree",
    "Bucket Sort",
    "Shell",
    "Reservoir Sampling",
    "Strongly Connected Component",
    "Eulerian Circuit",
    "Radix Sort",
    "Rejection Sampling",
    "Biconnected Component",
  ];
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6">
      <nav className="w-full max-w-5xl mb-10 bg-white border-b border-gray-300 px-8 py-4 flex justify-between items-center rounded-lg shadow-sm">
        <div className="flex gap-8">
          <button
            onClick={() => onBack()}
            className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200"
          >
            Home
          </button>
          <button className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200">
            Discussions
          </button>
          <button className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200">
            About Us
          </button>
        </div>
        <div>
          <button className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200 flex items-center gap-2">
            <img
              src={profileIcon}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            Profile
          </button>
        </div>
      </nav>
      <div
        className="bg-white rounded-lg shadow-md w-[80%] max-w-7xl flex flex-col"
        style={{ height: "80vh" }}
      >
        <div className="px-8 py-4 border-b flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200"
            onClick={onBack}
          >
            <span>&larr;</span>
            <span>Back to Home</span>
          </button>
          <h2 className="text-xl font-bold">DSA Problems</h2>
          <div className="w-[100px]"></div>
        </div>
        <div
          ref={scrollContainerRef}
          className="p-6 overflow-y-auto flex-1 topics-scroll-container scroll-smooth"
          style={{ scrollBehavior: "auto" }}
        >
          <div className="grid grid-cols-3 gap-6">
            {problems.map((p, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-6 hover:bg-gray-50 cursor-pointer font-semibold transition-all duration-200 hover:shadow-md hover:scale-[1.02] flex flex-col bg-white"
                onClick={() => onSelect(p)}
              >
                <h3 className="text-lg font-bold mb-3 text-gray-800">{p}</h3>
                <p className="text-sm text-gray-600 font-normal mb-4">
                  {problemDescriptions[p]?.split(".")[0]}.
                </p>
                <div className="mt-auto flex justify-end">
                  <span className="text-gray-400 text-sm hover:text-gray-600">
                    Solve &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DSATopicProblemsPage({ topic, onBack, onSelectProblem }) {
  const problems = dsaProblemsByTopic[topic] || [];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6">
      <nav className="w-full max-w-5xl mb-10 bg-white border-b border-gray-300 px-8 py-4 flex justify-between items-center rounded-lg shadow-sm">
        <div className="flex gap-8">
          <button
            onClick={onBack}
            className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200"
          >
            Back
          </button>
        </div>
        <div>
          <button className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200 flex items-center gap-2">
            <img
              src={profileIcon}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            Profile
          </button>
        </div>
      </nav>
      <div
        className="bg-white rounded-lg shadow-md w-[80%] max-w-7xl flex flex-col"
        style={{ height: "80vh" }}
      >
        <div className="px-8 py-4 border-b flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200"
            onClick={onBack}
          >
            <span>&larr;</span>
            <span>Back to Topics</span>
          </button>
          <h2 className="text-xl font-bold">{topic} Problems</h2>
          <div className="w-[100px]"></div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Topic Overview
            </h3>
            <p className="text-gray-600">{problemDescriptions[topic]}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {problems.map((problem) => (
              <div
                key={problem.id}
                className="border rounded-lg p-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:shadow-md"
                onClick={() => onSelectProblem(problem)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-800">
                    {problem.title}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold 
                    ${
                      problem.difficulty === "Easy"
                        ? "bg-green-100 text-green-800"
                        : problem.difficulty === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {problem.description}
                </p>
                <div className="flex justify-end">
                  <span className="text-gray-400 text-sm hover:text-gray-600">
                    Solve Now &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// {  DSAProblemDetailPage in that Code space , code box , invite a coder box, terminal box  }

function DSAProblemDetailPage({
  problem,
  onBack,
  showModal,
  setShowModal,
  setNotifications,
}) {
  const [code, setCode] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [language, setLanguage] = React.useState("c");
  const SimpleCodeEditor = require("react-simple-code-editor").default;
  const highlight = require("prismjs").highlight;
  const Prism = require("prismjs");
  require("prismjs/components/prism-c");
  require("prismjs/components/prism-cpp");
  require("prismjs/components/prism-python");
  require("prismjs/components/prism-javascript");
  require("prismjs/components/prism-java");

  // Handle both string-based topic problems and object-based detailed problems
  const problemInfo =
    typeof problem === "string"
      ? {
          title: problem,
          description: problemDescriptions[problem],
          difficulty: "N/A",
        }
      : problem;
  const handleRun = async () => {
    setLoading(true);
    setOutput("");
    try {
      const endpoint = `http://localhost:5000/run-${language}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setOutput(data.output || "No output");
    } catch (err) {
      setOutput(
        `Error connecting to ${language.toUpperCase()} compiler/interpreter backend.`
      );
    }
    setLoading(false);
  };
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 p-6 dsa-no-scrollbar">
      <nav className="w-full max-w-5xl mb-10 bg-white border-b border-gray-300 px-8 py-4 flex justify-between items-center rounded-lg shadow-sm mx-auto">
        <div className="flex gap-8">
          <button
            onClick={() => onBack()}
            className="font-bold text-gray-700 hover:text-blue-600 transition-colors duration-200"
          >
            Home
          </button>
          <a href="#" className="font-bold text-gray-700 hover:text-blue-600">
            Discussions
          </a>
          <a href="#" className="font-bold text-gray-700 hover:text-blue-600">
            About Us
          </a>
        </div>
        <div>
          <a
            href="#"
            className="font-bold text-gray-700 hover:text-blue-600 flex items-center gap-2"
          >
            <img
              src={profileIcon}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            Profile
          </a>
        </div>
      </nav>
      <div className="flex w-full max-w-6xl mx-auto" style={{ height: "70vh" }}>
        <div
          className="flex flex-col flex-grow bg-white rounded-lg shadow-md p-8"
          style={{ width: "60%", height: "100%", overflow: "hidden" }}
        >
          <div className="flex items-start mb-4">
            <button
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-200"
              onClick={onBack}
            >
              <span>&larr;</span>
              <span>Back to Problems</span>
            </button>
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">{problemInfo.title}</h2>
              {problemInfo.difficulty !== "N/A" && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold 
                  ${
                    problemInfo.difficulty === "Easy"
                      ? "bg-green-100 text-green-800"
                      : problemInfo.difficulty === "Medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {problemInfo.difficulty}
                </span>
              )}
            </div>
            <p className="text-gray-700">{problemInfo.description}</p>
          </div>
          <div className="relative mb-2 flex-grow h-full overflow-hidden">
            <div className="sticky top-0 z-10 bg-white px-2 py-2 mb-2 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setCode(""); // Clear code when changing language
                  }}
                  className="bg-gray-700 text-white border-0 rounded-lg px-4 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    backgroundImage:
                      "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.5rem center",
                    backgroundSize: "1em",
                    paddingRight: "2.5rem",
                  }}
                >
                  <option value="c" className="bg-gray-700 text-white">
                    C
                  </option>
                  <option value="cpp" className="bg-gray-700 text-white">
                    C++
                  </option>
                  <option value="python" className="bg-gray-700 text-white">
                    Python
                  </option>
                  <option value="javascript" className="bg-gray-700 text-white">
                    JavaScript
                  </option>
                  <option value="java" className="bg-gray-700 text-white">
                    Java
                  </option>
                </select>
                <div className="flex gap-2">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={handleRun}
                    disabled={loading}
                  >
                    {loading ? "Running..." : "Flash ⚡"}
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => setCode("")}
                  >
                    Clear
                  </button>
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
            <SimpleCodeEditor
              value={code}
              onValueChange={setCode}
              highlight={(code) =>
                highlight(code, Prism.languages[language], language)
              }
              padding={10}
              style={{
                fontFamily: "Fira Mono, Menlo, Monaco, Consolas, monospace",
                fontSize: 14,
                height: "calc(100% - 50px)", // Account for language selector height
                borderRadius: "0.5rem",
                background: "#f9fafb",
                color: "#222",
                outline: "none",
                marginBottom: "0.5rem",
                overflowY: "auto",
                overflowX: "hidden",
              }}
              placeholder="Let's crack the code."
            />
          </div>
        </div>

        <div
          className="flex flex-col ml-8"
          style={{ width: "40%", height: "100%" }}
        >
          <div
            className="flex flex-col items-stretch justify-start bg-white rounded-lg shadow-md p-2"
            style={{
              height: "40%",
              minHeight: "90px",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
          >
            <h1 className="font-bold mb-1 text-center text-base">
              Invite a Coder
            </h1>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-xs mb-0">
                Problem Title
              </label>
              <input
                type="text"
                placeholder="Title"
                className="border rounded p-1 text-xs mb-0"
                style={{ marginBottom: "2px" }}
                id="invite-title-input"
              />
              <label className="font-semibold text-xs mb-0">Note</label>
              <textarea
                placeholder="Note..."
                className="border rounded p-1 text-xs resize-none mb-0"
                rows={1}
                style={{
                  minHeight: "1.2rem",
                  maxHeight: "2rem",
                  marginBottom: "2px",
                }}
                id="invite-note-input"
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    // Clear inputs
                    document.getElementById("invite-title-input").value = "";
                    document.getElementById("invite-note-input").value = "";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs transition-colors duration-200"
                  onClick={() => {
                    try {
                      const title =
                        document.getElementById("invite-title-input").value;
                      const note =
                        document.getElementById("invite-note-input").value;

                      socket.emit("send-invite", {
                        title: title || problemInfo.title || "Untitled Problem",
                        note:
                          note ||
                          "Would you like to join this problem-solving session?",
                        sender: "User",
                      });

                      // Show succe
                      // ss notification
                      const notificationId = Date.now();
                      setNotifications((prev) => [
                        ...prev,
                        {
                          id: notificationId,
                          message: "Invite sent successfully!",
                          type: "success",
                        },
                      ]);

                      // Clear inputs after successful send
                      document.getElementById("invite-title-input").value = "";
                      document.getElementById("invite-note-input").value = "";

                      setTimeout(() => {
                        setNotifications((prev) =>
                          prev.filter((n) => n.id !== notificationId)
                        );
                      }, 3000);
                    } catch (error) {
                      console.error("Error sending invite:", error);
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <div
            className="bg-gray-900 rounded-lg shadow-md p-4 mt-2 flex flex-col gap-2"
            style={{
              height: "75%",
              minHeight: "120px",
              maxHeight: "100%",
              boxSizing: "border-box",
              overflow: "auto",
            }}
          >
            <div className="flex items-center mb-2">
              <h3 className="font-bold text-white">Terminal</h3>
            </div>
            <div
              className="bg-black text-green-400 font-mono rounded p-2 flex-1 overflow-auto whitespace-pre-wrap text-xs"
              style={{ minHeight: "60px", maxHeight: "calc(100% - 40px)" }}
            >
              {output ? output : "Output..."}
            </div>
            <div className="text-xs text-gray-300 mt-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
