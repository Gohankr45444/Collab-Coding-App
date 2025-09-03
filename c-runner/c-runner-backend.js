/**
 * Code Execution Backend Service
 *
 * This service handles code execution for multiple programming languages in a secure environment.
 * It provides:
 * - Code execution in isolated environments
 * - Package management and dependency installation
 * - Real-time execution output streaming
 * - Error handling and security measures
 * - Support for multiple programming languages
 *
 * @author karanjha000
 * @version 1.0.0
 */

// === Core Dependencies ===
const express = require("express"); // Web server framework
const fs = require("fs"); // File system operations
const { exec } = require("child_process"); // Process execution
const path = require("path"); // Path manipulations
const crypto = require("crypto"); // For secure random values
const cors = require("cors"); // Cross-origin resource sharing
const { Server } = require("socket.io");
const { createServer } = require("http");

// --- Temporary Directory Setup ---
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// === Security Configuration ===
const SECURITY_CONFIG = {
  maxExecutionTime: 10000, // Maximum execution time (ms)
  maxFileSize: 1024 * 1024, // Maximum code file size (1MB)
  sandboxPath: path.join(__dirname, "sandbox"), // Not actively used for isolation in current exec impl
  permissions: {
    // Allowed system commands per language (primarily for reference if stricter parsing was implemented)
    python: ["python", "python3", "pip"],
    javascript: ["node", "npm"],
    java: ["java", "javac", "mvn"],
    cpp: ["g++"],
    c: ["gcc"],
  },
  timeouts: {
    compilation: 5000, // Compilation timeout (ms)
    execution: 3000, // Execution timeout (ms)
    cleanup: 2000, // Cleanup timeout (ms)
    install: 60000, // Default package installation timeout
  },
};

// === Server Setup ===
const app = express();
const httpServer = createServer(app);

// === Middleware ===
app.use(
  cors({
    origin: ["https://collab-coding-app-frontend.onrender.com", "http://localhost:3000"],
    methods: ["POST"],
  })
);

app.use(
  express.json({
    limit: SECURITY_CONFIG.maxFileSize,
  })
);

// Request validation middleware
app.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res
      .status(415)
      .json({ error: "Content-Type must be application/json" });
  }
  next();
});

// Rate limiting middleware (basic implementation)
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const count = requestCounts.get(ip) || { count: 0, timestamp: now };

  if (now - count.timestamp > 60000) {
    // Reset after 1 minute
    count.count = 0;
    count.timestamp = now;
  }

  if (count.count >= 30) {
    // 30 requests per minute limit
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  }

  count.count++;
  requestCounts.set(ip, count);
  next();
});

// Configure Socket.IO with CORS and security options
const io = new Server(httpServer, {
  cors: {
    origin: ["https://collab-coding-app-frontend.onrender.com", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  maxHttpBufferSize: SECURITY_CONFIG.maxFileSize,
});
const PORT = process.env.PORT || 3000;

/**
 * Path to the Python interpreter
 * Uses python3 by default, can be overridden by PYTHON_PATH environment variable
 */
const PYTHON_CMD = process.env.PYTHON_PATH || "python3";

/**
 * === Language-specific Configuration and Package Management ===
 * Defines handlers for package installation, dependency detection, and execution
 * for each supported programming language.
 *
 * Each language config includes:
 * - Package installation commands
 * - Dependency detection logic
 * - Standard library identification
 * - Execution environment setup
 * - Compilation/Execution commands
 * - Timeouts
 */

// Decide compiled binary extension based on platform
const EXT = process.platform === "win32" ? "exe" : "out";

const languageConfigs = {
  cpp: {
    compileCommand: (filename, sandboxDir) => {
      const outputExe = path.join(sandboxDir, `program.${EXT}`);
      return `g++ "${filename}" -o "${outputExe}"`;
    },
    runCommand: (filename, sandboxDir) => {
      const outputExe = path.join(sandboxDir, `program.${EXT}`);
      return `"${outputExe}"`;
    },
  },
  c: {
    compileCommand: (filename, sandboxDir) => {
      const outputExe = path.join(sandboxDir, `program.${EXT}`);
      return `gcc "${filename}" -o "${outputExe}"`;
    },
    runCommand: (filename, sandboxDir) => {
      const outputExe = path.join(sandboxDir, `program.${EXT}`);
      return `"${outputExe}"`;
    },
  },
  python: {
    runCommand: (filename) => `${PYTHON_CMD} "${filename}"`,
  },
  javascript: {
    runCommand: (filename) => `node "${filename}"`,
  },
  java: {
    compileCommand: (filename, sandboxDir) => `javac "${filename}"`,
    runCommand: (filename, sandboxDir) => {
      const className = path.basename(filename, ".java");
      return `java -cp "${sandboxDir}" ${className}`;
    },
    detectClassName: (code) => {
      // Prefer a public class
      let match = code.match(/public\s+class\s+(\w+)/);
      if (match) return match[1];

      // Otherwise pick the first class
      match = code.match(/class\s+(\w+)/);
      if (match) return match[1];

      // Fallback if nothing found
      return "Main";
    },
  },
};



// Helper function to get temporary file path
/*
* function getTempFile(ext) {
*   return path.join(
*     tempDir, // Use the dedicated tempDir
*     `temp_${crypto.randomBytes(8).toString("hex")}.${ext}`
*   );
* }
*/

function createTempDir() {
  const dir = path.join(tempDir, crypto.randomBytes(8).toString("hex"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Helper function to cleanup temporary files
/*
* async function cleanup(files) {
*   for (const f of files) {
*     try {
*       await fs.promises.unlink(f);
*     } catch (err) {
*       if (err.code === "ENOENT") {
*         // File already deleted by another process/request → safe to ignore
*         continue;
*       }
*       if (err.code === "EPERM") {
*         // Retry once after 500ms
*         await new Promise((resolve) => setTimeout(resolve, 500));
*         try {
*           await fs.promises.unlink(f);
*         } catch (e) {
*           if (e.code !== "ENOENT") {
*             console.error(`Failed to cleanup file ${f} after retry:`, e.message);
*           }
*         }
*       } else {
*         console.error(`Failed to cleanup file ${f}:`, err.message);
*       }
*     }
*   }
* }
*/

// Helper function to execute code with timeout
function executeWithTimeout(command, timeout, input = "") {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout, killSignal: "SIGTERM", maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Trim very large outputs
      const MAX_OUTPUT = 5000;
      if (stdout && stdout.length > MAX_OUTPUT) {
        stdout = stdout.slice(0, MAX_OUTPUT) + "\n...output truncated...";
      }
      if (stderr && stderr.length > MAX_OUTPUT) {
        stderr = stderr.slice(0, MAX_OUTPUT) + "\n...error output truncated...";
      }

      if (error) {
        // Pass back BOTH stderr + stdout so compiler/runtime errors are visible
        reject({ stdout, stderr, message: error.message });
      } else {
        resolve(stdout || stderr);
      }
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    // Optional: Debug process exit
    child.on("exit", (code, signal) => {
      if (signal === "SIGTERM") {
        console.log(`Command terminated by timeout: ${command}`);
      }
    });
  });
}



/**
 * Executes code in a specified programming language with safety measures
 *
 * @async
 * @function executeCode
 * @param {string} language - Programming language (python, javascript, java, cpp, c)
 * @param {string} code - Source code to execute (might not be directly used, but for context)
 * @param {string} filename - Name of the file to create and execute
 * @param {string} [outputExe=null] - Optional output executable name for compiled languages
 * @returns {Promise<string>} Execution result containing output
 * @throws {Error} If execution fails, times out, or language is not supported
 */
async function executeCode(language, code, sandboxDir) {
  const config = languageConfigs[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // pick file extension for source file
  let filename = path.join(
    sandboxDir,
    `main.${language === "cpp" ? "cpp" 
          : language === "c" ? "c" 
          : language === "java" ? "java" 
          : language === "javascript" ? "js" 
          : "py"}`
  );

  // write source file
  fs.writeFileSync(filename, code, { mode: 0o644 });

  // Special handling for Java
  if (language === "java") {
    let className = config.detectClassName(code);

    // If no class name detected → force "Main"
    if (!className) {
      className = "Main";
    }

    const javaFile = path.join(sandboxDir, `${className}.java`);

    // Rename file so javac can compile it properly
    fs.renameSync(filename, javaFile);
    filename = javaFile;
  }

  // compile if needed
  if (config.compileCommand) {
    const compileCmd = config.compileCommand(filename, sandboxDir);
    await executeWithTimeout(compileCmd, SECURITY_CONFIG.timeouts.compilation);
  }

  // run program
  const runCmd = config.runCommand(filename, sandboxDir);
  return await executeWithTimeout(runCmd, SECURITY_CONFIG.timeouts.execution);
}



/**
 * Generic handler for code execution across all supported languages
 *
 * @async
 * @function handleCodeExecution
 * @param {string} language - Programming language identifier (python, javascript, java, cpp, c)
 * @param {string} code - Source code to execute
 * @param {Object} res - Express response object for sending results
 * @returns {Promise<void>} Sends execution results through response object
 */
async function handleCodeExecution(language, code, res, input = "") {
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  const sandboxDir = createTempDir();
  try {
    const output = await executeCode(language, code, sandboxDir, input);
    res.json({ output });
  } catch (error) {
    console.error(`Execution error for ${language}:`, error);

    // If error includes stderr/stdout, show that instead of just error.message
    if (typeof error === "object" && (error.stderr || error.stdout)) {
      res.json({ output: (error.stderr || error.stdout || error.message) });
    } else {
      res.json({ output: error.message || "An unknown error occurred." });
    }
  } finally {
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error("Cleanup failed:", cleanupErr.message);
    }
  }
}



// --- Language-specific Endpoints ---
app.post("/run-python", (req, res) =>
  handleCodeExecution("python", req.body.code, res, req.body.input || "")
);

app.post("/run-c", (req, res) =>
  handleCodeExecution("c", req.body.code, res, req.body.input || "")
);

app.post("/run-cpp", (req, res) =>
  handleCodeExecution("cpp", req.body.code, res, req.body.input || "")
);

app.post("/run-javascript", (req, res) =>
  handleCodeExecution("javascript", req.body.code, res, req.body.input || "")
);

app.post("/run-java", (req, res) =>
  handleCodeExecution("java", req.body.code, res, req.body.input || "")
);

// --- Socket.IO Logic ---
const onlineUsers = new Map(); // userId -> { socketId, userName }
// Store current code for each room and language
const activeRooms = new Map(); // roomId -> { users: [{ userId, username, socketId }], problemTitle: string, currentCode: { python: string, javascript: string, ... } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("user_online", ({ userId, userName }) => {
    onlineUsers.set(userId, { socketId: socket.id, userName });
    console.log("User online:", userId, "Name:", userName);
    // Optionally emit a list of online users to all
    io.emit("online_users", Array.from(onlineUsers.values()).map(u => ({ id: u.userId, name: u.userName })));
  });

  socket.on("send-invite", (inviteData) => {
    console.log("Invite received:", inviteData);
    const senderInfo = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
    const enrichedData = {
      ...inviteData,
      senderId: socket.id, // Socket ID of the sender
      id: Date.now(),
      title: inviteData.title || "Untitled Problem",
      note: inviteData.note || "Would you like to join this problem-solving session?",
      sender: senderInfo ? senderInfo.userName : "Anonymous", // Use actual username
    };
    // Emit to a specific user or broadcast if targetId is not specified
    if (inviteData.targetUserId) {
      const targetSocketId = onlineUsers.get(inviteData.targetUserId)?.socketId;
      if (targetSocketId) {
        io.to(targetSocketId).emit("receive-invite", enrichedData);
        console.log(`Invite sent to ${inviteData.targetUserId}`);
      } else {
        console.warn(`Target user ${inviteData.targetUserId} not found online.`);
      }
    } else {
      socket.broadcast.emit("receive-invite", enrichedData);
      console.log("Invite broadcasted to all others.");
    }
  });

  // Handle room joining
  socket.on("join-room", ({ roomId, userId, username, problemTitle, initialCode = {} }) => {
    socket.join(roomId);

    if (!activeRooms.has(roomId)) {
      // Initialize room with problem title and initial code for all languages
      activeRooms.set(roomId, {
        users: [],
        problemTitle: problemTitle,
        currentCode: initialCode, // Store initial code provided by the creator
      });
    }

    const room = activeRooms.get(roomId);
    room.users.push({
      userId,
      username,
      socketId: socket.id,
    });

    // Notify everyone in the room about the new join, including current code and user list
    io.to(roomId).emit("room-joined", {
      roomId,
      username,
      problemTitle,
      users: room.users,
      currentCode: room.currentCode, // Send the current code state to the new joiner
    });

    console.log(`User ${username} joined room ${roomId}. Current users:`, room.users.length);
  });

  // Handle invite acceptance
  socket.on("accept-invite", ({ inviteId, senderId, title, roomId }) => {
    // Notify the sender that their invite was accepted
    io.to(senderId).emit("invite-accepted", {
      roomId,
      acceptedBy: socket.id,
      problemTitle: title,
    });

    console.log(`Invite ${inviteId} accepted. Room ${roomId} created.`);
  });

  // Handle room messages
  socket.on("room-message", ({ roomId, message, sender }) => {
    io.to(roomId).emit("room-message", {
      sender,
      message,
      timestamp: new Date().toISOString(), // Use ISO string for consistent date format
    });
  });

  // Handle room code updates
  socket.on("code-update", ({ roomId, code, language }) => {
    const room = activeRooms.get(roomId);
    if (room) {
      // Update the stored code for the specific language in the room
      room.currentCode[language] = code;
      // Emit to all others in the room
      socket.to(roomId).emit("code-update", { code, language });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove user from online users map
    let disconnectedUserId = null;
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        io.emit("online_users", Array.from(onlineUsers.values()).map(u => ({ id: u.userId, name: u.userName })));
        break;
      }
    }

    // Remove user from any active rooms
    for (const [roomId, room] of activeRooms.entries()) {
      const initialUserCount = room.users.length;
      room.users = room.users.filter((user) => user.socketId !== socket.id);

      if (room.users.length === 0) {
        // If the room is empty, delete it
        activeRooms.delete(roomId);
        console.log(`Room ${roomId} deleted as it is empty.`);
      } else if (initialUserCount > room.users.length) {
        // If a user was actually removed from this room
        // Notify remaining room users about the disconnection
        io.to(roomId).emit("user-left", {
          roomId,
          userId: disconnectedUserId, // Send the actual userId that left
          users: room.users, // Send updated user list
        });
        console.log(`User ${disconnectedUserId} left room ${roomId}. Remaining users:`, room.users.length);
      }
    }
  });
});

// Use httpServer instead of app.listen
httpServer.listen(PORT, () => {
  console.log(`C runner backend listening on port ${PORT}`);
});