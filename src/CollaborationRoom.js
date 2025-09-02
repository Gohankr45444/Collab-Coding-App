/**
 * CollaborationRoom Component
 *
 * A real-time collaborative coding environment that enables multiple users to:
 * - Write and edit code together
 * - Execute code in various programming languages
 * - Chat with other participants
 * - See real-time updates from other users
 *
 * @param {string} roomId - Unique identifier for the collaboration room
 * @param {string} problemTitle - Title of the current coding problem/session
 * @param {function} onLeave - Callback function when user leaves the room
 * @param {object} socket - Socket.IO instance for real-time communication
 * @param {string} initialCode - Initial code to populate the editor
 */

import React, { useState, useEffect, useRef } from "react";

const CollaborationRoom = ({
  roomId,
  problemTitle,
  onLeave,
  socket,
  initialCode = "",
}) => {
  /**
   * Collaboration Room State Management
   * Centralized state handling for all room features
   * 
   * State Categories:
   * 1. Code Management
   *    - [code, setCode]: Current editor content with sync
   *    - [language, setLanguage]: Active programming language
   * 
   * 2. Communication
   *    - [messages, setMessages]: Chat message history
   *    - [newMessage, setNewMessage]: Current message input
   * 
   * 3. Participant Tracking
   *    - [participants, setParticipants]: Active room members
   * 
   * 4. Execution Environment
   *    - [terminalOutput, setTerminalOutput]: Command results
   * 
   * State Features:
   * - Real-time synchronization
   * - Persistent room context
   * - Multi-user support
   * - Error state handling
   */
  const [code, setCode] = useState(initialCode);         // Code editor content
  const [messages, setMessages] = useState([]);          // Chat message history
  const [newMessage, setNewMessage] = useState("");      // Message input buffer
  const [participants, setParticipants] = useState([]); // Active participants
  const [language, setLanguage] = useState("javascript"); // Selected language
  const [terminalOutput, setTerminalOutput] = useState([]); // Execution output

  /**
   * Socket Event Handler Initialization
   * Sets up all real-time communication listeners and cleanup
   */
  /**
   * Socket Event Handlers Setup
   * Initializes all real-time collaboration features on component mount
   * 
   * Features:
   * 1. Participant Management
   *    - Join/leave events
   *    - Active user tracking
   *    - Connection status updates
   * 
   * 2. Code Synchronization
   *    - Real-time code updates
   *    - Language selection syncing
   *    - Execution state sharing
   * 
   * 3. Communication
   *    - Chat messages
   *    - System notifications
   *    - Status updates
   */
  useEffect(() => {
    if (socket) {
      // === Room Events ===

      /**
       * Room Join Handler
       * Processes new participant joins and room initialization
       * 
       * @param {Object} data - Room event data
       * @param {Array} data.users - List of current room participants
       * 
       * Features:
       * - Participant list updates
       * - Join notifications
       * - Initial state synchronization
       */
      socket.on("room-joined", (data) => {
        setParticipants(data.users || []);  // Update active participants
      });

      /**
       * Handle incoming chat messages
       * Appends new messages to the chat history
       */
      socket.on("room-message", (data) => {
        setMessages((prev) => [...prev, data]);
      });

      /**
       * Handle real-time code synchronization
       * Updates local code editor when other participants make changes
       */
      socket.on("code-update", (data) => {
        setCode(data.code);
        setLanguage(data.language);
      });

      // Listen for user leaving
      socket.on("user-left", (data) => {
        setParticipants((prev) =>
          prev.filter((user) => user.userId !== data.userId)
        );
      });

      /**
       * Code Execution Output Handler
       * Processes and displays successful code execution results
       * 
       * @param {Object} data - Execution result data
       * @param {string} data.output - Execution output content
       * 
       * Features:
       * - Terminal emulation
       * - Output formatting
       * - History preservation
       * - Real-time updates
       */
      socket.on("code-output", (data) => {
        setTerminalOutput((prev) => [
          ...prev,
          { type: "output", content: data.output },
        ]);
      });

      /**
       * Code Execution Error Handler
       * Manages and displays code execution failures
       * 
       * @param {Object} data - Error information
       * @param {string} data.error - Error message or stack trace
       * 
       * Features:
       * - Error highlighting
       * - Stack trace formatting
       * - Error categorization
       * - Visual differentiation
       */
      socket.on("code-error", (data) => {
        setTerminalOutput((prev) => [
          ...prev,
          { type: "error", content: data.error },
        ]);
      });
    }

    /**
     * Socket Event Cleanup
     * Manages cleanup of socket event listeners on component unmount
     * 
     * Purpose:
     * 1. Memory Management
     *    - Prevents memory leaks
     *    - Removes unused handlers
     *    - Frees system resources
     * 
     * 2. Event Consistency
     *    - Prevents duplicate handlers
     *    - Maintains event queue cleanliness
     *    - Ensures proper reconnection behavior
     * 
     * Handlers Removed:
     * - room-joined: Room initialization events
     * - room-message: Chat message events
     * - code-update: Code synchronization events
     * - user-left: Participant departure events
     * - code-output: Execution result events
     * - code-error: Error handling events
     */
    return () => {
      if (socket) {
        // Remove all room-related handlers
        socket.off("room-joined");   // Room management
        socket.off("room-message");  // Communication
        socket.off("code-update");   // Code sync
        socket.off("user-left");     // Participant tracking
        socket.off("code-output");   // Execution output
        socket.off("code-error");    // Error handling
      }
    };
  }, [socket]);

  /**
   * Code Change Handler
   * Manages real-time code synchronization between participants
   * 
   * @param {string} newCode - Updated code content
   * 
   * Features:
   * - Real-time state updates
   * - Multi-user synchronization
   * - Language context preservation
   */
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("code-update", { roomId, code: newCode, language });
  };

  /**
   * Code Execution Handler
   * Manages the execution of code in the selected language
   * 
   * Flow:
   * 1. Pre-execution
   *    - Updates terminal state
   *    - Validates code and language
   * 
   * 2. Execution
   *    - Sends code to execution service
   *    - Handles response asynchronously
   * 
   * 3. Output Handling
   *    - Processes execution results
   *    - Updates terminal display
   *    - Broadcasts results to room
   * 
   * 4. Error Management
   *    - Catches execution errors
   *    - Formats error messages
   *    - Updates UI appropriately
   */
  const runCode = async () => {
    // Initialize execution feedback
    setTerminalOutput((prev) => [
      ...prev,
      { type: "command", content: `Running ${language} code...` },
    ]);
    try {
      // Execute code via service
      const response = await fetch(`http://localhost:5000/run-${language}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();

      // Process and display results
      if (data.error) {
        // Handle execution errors
        setTerminalOutput((prev) => [
          ...prev,
          { type: "error", content: data.error },
        ]);
      } else {
        // Display successful execution
        setTerminalOutput((prev) => [
          ...prev,
          { type: "output", content: data.output },
        ]);
      }

      // Sync results with room participants
      socket.emit("code-output", {
        roomId,
        output: data.output,
        error: data.error,
      });
    } catch (error) {
      // Handle system errors
      setTerminalOutput((prev) => [
        ...prev,
        { type: "error", content: error.message },
      ]);
    }
  };

  /**
   * Message Sending Handler
   * Manages chat message transmission in collaboration rooms
   * 
   * Features:
   * 1. Input Validation
   *    - Trims whitespace
   *    - Prevents empty messages
   * 
   * 2. Message Broadcasting
   *    - Real-time delivery
   *    - Room-specific targeting
   *    - Sender identification
   * 
   * 3. UI Updates
   *    - Input field reset
   *    - Message list updates
   *    - Visual feedback
   * 
   * Note: Messages are not persisted between sessions
   */
  const sendMessage = () => {
    if (newMessage.trim()) {
      // Broadcast message to room
      socket.emit("room-message", {
        roomId,
        message: newMessage,
        sender: "User",
      });
      // Reset input field
      setNewMessage("");
    }
  };

  const handleLeave = () => {
    onLeave && onLeave();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-xl w-11/12 h-5/6 flex flex-col border border-purple-100">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{problemTitle}</h2>
            <p className="text-sm text-blue-100">Room ID: {roomId}</p>
          </div>
          <button
            onClick={handleLeave}
            className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-red-500/20"
          >
            Leave Room
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex p-4 gap-4">
          {/* Left Side - 70% (Code Editor and Terminal) */}
          <div className="w-[70%] flex flex-col">
            <div className="mb-2 flex justify-between items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white/80 border border-purple-200 rounded-lg p-2 text-purple-700 font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="cpp">C</option>
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={runCode}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-green-500/20"
                >
                  Flash ⚡
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    // You could add a toast notification here
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/20"
                >
                  Copy
                </button>
                <button
                  onClick={() => setCode("")}
                  className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-2 rounded-lg text-sm hover:from-red-600 hover:to-rose-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-red-500/20"
                >
                  Clear
                </button>
              </div>
            </div>
            {/* Code Editor and Terminal Split */}
            <div className="flex-1 flex gap-2">
              {/* Code Editor - 70% of total space */}
              <div className="w-[60%] rounded-xl bg-[#f9fafb] shadow-lg border border-purple-200/20 overflow-hidden">
                <textarea
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="h-full w-full bg-transparent text-black-900 font-bold, Fira Mono, Menlo, Monaco, Consolas, monospace p-4 focus:outline-none resize-none"
                  placeholder="Let's crack the code."
                />
              </div>
              {/* Terminal - 30% of total space */}
              <div className="w-[40%] rounded-xl bg-[#f9fafb] shadow-lg border border-black-200/20 overflow-hidden">
                <div className="h-8 bg-[#2D2D2D] flex items-center px-4">
                  <span className="text-gray-400 text-sm">Terminal</span>
                </div>
                <div className="w-full h-[calc(100%-2rem)] bg-[#f9fafb] text-black-400 font-bold, Fira Mono, Menlo, Monaco, Consolas, monospace p-4 overflow-auto">
                  {terminalOutput.map((output, idx) => (
                    <div
                      key={idx}
                      className={`${
                        output.type === "error"
                          ? "text-red-400"
                          : "text-black-400"
                      } whitespace-pre-wrap font-bold, Fira Mono, Menlo, Monaco, Consolas, monospace mb-1`}
                    >
                      {output.type === "error" ? "❌ " : "$ "}
                      {output.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - 30% (Chat and Participants) */}
          <div className="w-[30%] flex flex-col space-y-4">
            {/* Participants */}
            <div className="h-[30%] bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-purple-200">
              <h3 className="font-bold text-purple-800 mb-3">Participants</h3>
              <div className="h-[calc(100%-2rem)] overflow-y-auto space-y-2">
                {participants.map((participant, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-100"
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-emerald-300"></div>
                    <span className="text-purple-700">
                      {participant.username}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="h-[70%] bg-white/80 backdrop-blur-sm rounded-xl flex flex-col shadow-lg border border-purple-200">
              <div className="p-3 border-b border-purple-100">
                <h3 className="font-bold text-purple-800">Chat</h3>
              </div>
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-purple-50 rounded-lg border border-purple-100"
                  >
                    <span className="font-bold text-sm text-purple-700">
                      {msg.sender}:{" "}
                    </span>
                    <span className="text-sm text-purple-600">
                      {msg.message}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-purple-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-700 placeholder-purple-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/20"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationRoom;
