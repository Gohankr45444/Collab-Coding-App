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
const languageConfigs = {
  /**
   * Python Language Configuration
   * Handles pip package management and Python execution
   */
  python: {
    install: async (pkg) => {
      // Install in user mode to avoid permission issues
      await executeWithTimeout(`${PYTHON_CMD} -m pip install --user ${pkg}`, SECURITY_CONFIG.timeouts.install);
    },
    detectDependencies: (code) => {
      const imports =
        code.match(
          /^(?:import|from)\s+([\w\d_\.]+)(?:\s+import\s+[\w\d_\.,\s*]+)?/gm
        ) || [];
      const stdLibs = new Set([
        // Basic Python Standard Library (a more comprehensive list than the original)
        "os", "sys", "math", "random", "time", "datetime", "string", "re",
        "json", "collections", "itertools", "functools", "typing", "pathlib",
        "subprocess", "threading", "multiprocessing", "asyncio", "urllib",
        "http", "socket", "email", "xml", "html", "csv", "sqlite3", "pickle",
        "copy", "hashlib", "logging", "argparse", "configparser", "unittest",
        "decimal", "statistics", "uuid", "base64", "contextlib", "dataclasses",
        "enum", "io", "glob", "shutil", "inspect", "ast", "traceback", "gc",
        "weakref", "types", "warnings", "platform", "tempfile", "zipfile",
        "tarfile", "gzip", "bz2", "lzma", "struct", "array", "heapq", "bisect",
        "calendar", "textwrap", "gettext", "locale", "signal", "mmap", "queue",
        "sched", "select", "selectors", "ssl", "ftplib", "poplib", "imaplib",
        "nntplib", "smtplib", "telnetlib", "hmac", "secrets", "urllib3", "getpass",
        "curses", "concurrent", "venv", "doctest", "trace", "numbers", "abc",
        "fnmatch", "fileinput", "shelve", "stat", "asyncore", "asynchat",
        "webbrowser", "pdb", "distutils", "setuptools", // Common build/dev tools
      ]);

      const packages = imports.map((imp) => {
        const match = imp.match(/^from\s+([\w\d_\.]+)|^import\s+([\w\d_\.]+)/);
        return (match[1] || match[2]).split(".")[0];
      });

      return [...new Set(packages)].filter((pkg) => !stdLibs.has(pkg));
    },
    packageFile: "requirements.txt",
    virtualenv: {
      create: async (name) => {
        await executeWithTimeout(`${PYTHON_CMD} -m venv "${name}"`, SECURITY_CONFIG.timeouts.install);
      },
      activate: (name) => {
        return process.platform === "win32"
          ? `${name}\\Scripts\\activate.bat`
          : `. ${name}/bin/activate`;
      },
    },
    timeout: SECURITY_CONFIG.maxExecutionTime, // Default timeout for execution
    compileCommand: (filename) => `${PYTHON_CMD} "${filename}"`,
  },
  /**
   * JavaScript Language Configuration
   * Handles npm package management and Node.js execution
   */
  javascript: {
    install: async (pkg) => {
      // Install package using npm with exact version
      await executeWithTimeout(`npm install ${pkg} --save-exact`, SECURITY_CONFIG.timeouts.install);
    },
    detectDependencies: (code) => {
      const imports = [
        ...(code.match(
          /(?:require|import)\s*\(?['"]([@\w\d\-\/\.]+)['"]\)?/gm
        ) || []),
        ...(code.match(/(?:import\s*{[^}]+}\s*from\s*['"])([^'"]+)/gm) || []),
        ...(code.match(
          /(?:const|let|var)\s*{\s*[^}]+}\s*=\s*require\(['"]([^'"]+)['"]\)/gm
        ) || []),
      ];

      const stdModules = new Set([
        // Node.js Built-in Modules
        "fs", "path", "http", "https", "os", "crypto", "events", "stream",
        "buffer", "util", "url", "querystring", "zlib", "readline", "net",
        "dgram", "dns", "tls", "cluster", "child_process", "worker_threads",
        "assert", "console", "process", "timers", "perf_hooks", "v8",
        "async_hooks", "module",
      ]);

      return [
        ...new Set(
          imports
            .map((imp) => {
              const match = imp.match(/['"]([^'"]+)['"]/);
              return match ? match[1] : null;
            })
            .filter((pkg) => pkg && !stdModules.has(pkg) && !pkg.startsWith("."))
            .map((pkg) => (pkg.startsWith("@") ? pkg : pkg.split("/")[0]))
        ),
      ];
    },
    packageFile: "package.json",
    initPackageJson: {
      name: "code-runner",
      version: "1.0.0",
      private: true,
      type: "module",
    },
    timeout: SECURITY_CONFIG.maxExecutionTime, // Default timeout for execution
    compileCommand: (filename) => `node "${filename}"`,
  },
  /**
   * Java Language Configuration
   * Handles Java compilation and execution. Assumes Maven is installed for dependencies.
   */
  java: {
    install: async (pkg) => {
      const [group, artifact, version] = pkg.split(":");
      // Assumes Maven is installed and accessible in PATH
      await executeWithTimeout(
        `mvn dependency:get -DgroupId=${group} -DartifactId=${artifact} -Dversion=${version}`,
        SECURITY_CONFIG.timeouts.install
      );
    },
    detectDependencies: (code) => {
      const imports = code.match(/import\s+([a-zA-Z0-9_.]+)\s*;/g) || [];
      const stdPackages = new Set([
        // Core Java Packages (more comprehensive list)
        "java.lang", "java.io", "java.util", "java.net", "java.text", "java.math",
        "java.time", "java.sql", "java.security", "java.nio", "java.awt",
        "javax.swing", "java.beans", "java.rmi", "javax.crypto", "javax.imageio",
        "javax.sound", "javax.xml", "javax.sql", "javax.naming", "javax.management",
        "javax.script", "javax.tools", "javax.annotation", "javax.print",
        // Jakarta EE (formerly javax)
        "jakarta.servlet", "jakarta.ejb", "jakarta.persistence", "jakarta.ws.rs",
        "jakarta.mail", "jakarta.json", "jakarta.validation", "jakarta.batch",
        "jakarta.faces", "jakarta.enterprise", "jakarta.interceptor",
        // JavaFX
        "javafx.application", "javafx.scene", "javafx.stage", "javafx.fxml",
        "javafx.controls", "javafx.graphics", "javafx.media", "javafx.web",
        // Some common third-party libs usually not managed by 'import' directly like this (but included for completeness if they were)
        "org.junit", "org.springframework", "com.google.gson", "com.fasterxml.jackson",
      ]);

      return imports
        .map((imp) => imp.match(/import\s+([a-zA-Z0-9_\.]+);/)[1].split(".")[0])
        .filter((pkg) => !stdPackages.has(pkg));
    },
    detectClassName: (code) => {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      if (!classMatch) {
        throw new Error("No public class found in the Java code");
      }
      return classMatch[1];
    },
    packageFile: "pom.xml", // For Maven projects
    compileCommand: (filename) => {
      const className = path.basename(filename, ".java"); // Get class name from filename
      return [
        `javac "${filename}"`,
        `java -cp "${path.dirname(filename)}" ${className}`,
      ];
    },
    timeout: {
      compile: SECURITY_CONFIG.timeouts.compilation,
      run: SECURITY_CONFIG.timeouts.execution,
    },
  },
  /**
   * C++ Language Configuration
   * Handles C++ compilation and execution. Strictly enforces standard headers only.
   */
  cpp: {
    install: async (pkg) => {
      console.log(`C++ relies on system-installed libraries. Package "${pkg}" cannot be installed via this method.`);
      // For more advanced setups, you might integrate vcpkg or Conan here.
      throw new Error(`C++ packages are not supported for automatic installation.`);
    },
    detectDependencies: (code) => {
      // For C++, we're being very strict and only allowing standard headers.
      // This function will throw if a non-standard header is detected.
      const includes = code.match(/#include\s*<([^>]+)>/g) || [];
      const stdHeaders = new Set([
        "iostream", "string", "vector", "map", "set", "queue", "stack", "deque",
        "list", "array", "algorithm", "memory", "functional", "chrono", "thread",
        "mutex", "condition_variable", "future", "random", "regex", "filesystem",
        "iterator", "numeric", "utility", "tuple", "type_traits", "exception",
        "stdexcept", "cassert", "cstdlib", "cstring", "cctype", "cmath", "ctime",
        "cstdio", "fstream", "sstream", "iomanip", "optional", "variant", "any",
        "compare", "version", "source_location", "complex", "ratio", "cfloat",
        "climits", "numbers", "valarray", "bit", "cstddef", "cwchar", "cuchar",
        "cwctype", "clocale", "csetjmp", "csignal", "shared_mutex", "atomic",
        "barrier", "latch", "semaphore", "system_error", "charconv", "format",
        "memory_resource", "execution", "ranges", "span", "coroutine", "concepts",
        "string_view", "u8string_view", "u16string_view", "u32string_view",
        "syncstream", "stacktrace", "expected", "generator", "mdspan", "print",
        "spanstream", "stdfloat", // C++20+ headers
      ]);

      const unsupportedHeaders = includes
        .map((inc) => inc.match(/<([^>]+)>/)[1])
        .filter((header) => !stdHeaders.has(header));

      if (unsupportedHeaders.length > 0) {
        throw new Error(
          `Unsupported headers: ${unsupportedHeaders.join(
            ", "
          )}. Only standard C++ libraries are supported.`
        );
      }
      return []; // No external dependencies to manage in this model
    },
    packageFile: null,
    compileCommand: (filename, outputExe) => {
      const output =
        outputExe ||
        filename.replace(".cpp", process.platform === "win32" ? ".exe" : ".out");
      const defaultFlags = "-std=c++17 -Wall -Wextra -O2";
      const defaultLibs = "-pthread"; // Common for threading
      return [
        `g++ ${defaultFlags} "${filename}" -o "${output}" ${defaultLibs}`,
        process.platform === "win32" ? `"${output}"` : `./${output}`,
      ];
    },
    timeout: {
      compile: SECURITY_CONFIG.timeouts.compilation,
      run: SECURITY_CONFIG.timeouts.execution,
    },
  },
  /**
   * C Language Configuration
   * Handles C compilation and execution. Strictly enforces standard headers only.
   */
  c: {
    install: async (pkg) => {
      console.log(`C relies on system-installed libraries. Package "${pkg}" cannot be installed via this method.`);
      throw new Error(`C packages are not supported for automatic installation.`);
    },
    detectDependencies: (code) => {
      const includes = code.match(/#include\s*[<"]([^>"]+)[>"]/gm) || [];
      const stdHeaders = new Set([
        "stdio.h", "stdlib.h", "string.h", "math.h", "time.h", "ctype.h",
        "stdbool.h", "stdint.h", "float.h", "limits.h", "assert.h", "errno.h",
        "locale.h", "setjmp.h", "signal.h", "stdarg.h", "stddef.h", "sys/types.h",
        "unistd.h", // POSIX standard, often available
      ]);
      const unsupportedHeaders = includes
        .map((inc) => inc.match(/#include\s*[<"]([^>"]+)[>"]/)[1])
        .filter((header) => !stdHeaders.has(header));

      if (unsupportedHeaders.length > 0) {
        throw new Error(
          `Unsupported headers: ${unsupportedHeaders.join(
            ", "
          )}. Only standard C libraries are supported.`
        );
      }
      return [];
    },
    packageFile: null,
    compileCommand: (filename, outputExe) => {
      const output =
        outputExe ||
        filename.replace(".c", process.platform === "win32" ? ".exe" : ".out");
      const defaultFlags = "-Wall -Wextra -std=c11";
      const defaultLibs = "-lm"; // Math library is commonly needed
      return [
        `gcc ${defaultFlags} "${filename}" -o "${output}" ${defaultLibs}`,
        process.platform === "win32" ? `"${output}"` : `./${output}`,
      ];
    },
    timeout: {
      compile: SECURITY_CONFIG.timeouts.compilation,
      run: SECURITY_CONFIG.timeouts.execution,
    },
  },
};

// Helper function to get temporary file path
function getTempFile(ext) {
  return path.join(
    tempDir, // Use the dedicated tempDir
    `temp_${crypto.randomBytes(8).toString("hex")}.${ext}`
  );
}

// Helper function to cleanup temporary files
function cleanup(files) {
  files.forEach((f) => {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch (err) {
        if (err.code === "EPERM") {
          // Wait and try again after 500ms
          setTimeout(() => {
            try {
              fs.unlinkSync(f);
            } catch (e) {
              console.error(`Failed to cleanup file ${f} after retry:`, e.message);
            }
          }, 500);
        } else {
          console.error(`Failed to cleanup file ${f}:`, err.message);
        }
      }
    }
  });
}

// Helper function to execute code with timeout
function executeWithTimeout(command, timeout) {
  return new Promise((resolve, reject) => {
    // Add shell: true for commands that need shell features like piping, wildcards, etc.
    // However, for security, direct commands are generally preferred.
    // For this use case, simple commands like `node`, `python3`, `g++` don't strictly require it.
    // If commands get more complex (e.g., chained with `&&`), `shell: true` might be needed.
    // For now, keep it simple.
    const child = exec(command, { timeout, killSignal: 'SIGTERM' }, (error, stdout, stderr) => {
      if (error) {
        // Include stdout for debugging failed commands, as stderr might be empty.
        reject(stderr || stdout || error.message);
      } else {
        resolve(stdout);
      }
    });

    // Optional: Log child process PID for debugging if needed
    // console.log(`Executing command (PID: ${child.pid}): ${command}`);

    child.on('exit', (code, signal) => {
        if (signal === 'SIGTERM') {
            console.log(`Command terminated by timeout: ${command}`);
            // If the process was terminated, it might not have fully written all output.
            // Consider if stdout/stderr captured at the moment of timeout is sufficient.
            // For now, rely on the error passed to the callback.
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
async function executeCode(language, code, filename, outputExe = null) {
  const config = languageConfigs[language];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Step 1: Dependency Management
  // For C/C++, detectDependencies might throw an error if unsupported headers are found.
  try {
    const dependencies = config.detectDependencies(code);
    const errors = [];
    for (const dep of dependencies) {
      try {
        await config.install(dep);
      } catch (err) {
        errors.push(`Failed to install ${dep}: ${err.message}`);
      }
    }
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
  } catch (error) {
    throw new Error(`Dependency Error: ${error.message}`);
  }

  // Step 2: Compilation and Execution
  const command = config.compileCommand(filename, outputExe);

  if (Array.isArray(command)) {
    // Handle compiled languages (C, C++, Java)
    const [compileCmd, runCmd] = command;

    const compileTimeout =
      typeof config.timeout === "object" && config.timeout.compile
        ? config.timeout.compile
        : SECURITY_CONFIG.timeouts.compilation;
    const runTimeout =
      typeof config.timeout === "object" && config.timeout.run
        ? config.timeout.run
        : SECURITY_CONFIG.timeouts.execution;

    try {
      await executeWithTimeout(compileCmd, compileTimeout); // Compilation phase
      return await executeWithTimeout(runCmd, runTimeout); // Execution phase
    } catch (error) {
      // Differentiate between compilation and runtime errors
      if (error.includes("error:")) { // Simple heuristic for compilation error
         throw new Error(`Compilation Error:\n${error}`);
      }
      throw new Error(`Runtime Error:\n${error}`);
    }
  } else {
    // Handle interpreted languages (Python, JavaScript)
    const execTimeout =
      typeof config.timeout === "number"
        ? config.timeout
        : SECURITY_CONFIG.maxExecutionTime;
    return await executeWithTimeout(command, execTimeout);
  }
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
async function handleCodeExecution(language, code, res) {
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  const config = languageConfigs[language];
  if (!config) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  let filename = getTempFile(language); // Create isolated file
  const filesToCleanup = [filename]; // Track files for cleanup

  try {
    // Write code to temporary file with proper permissions
    fs.writeFileSync(filename, code, { mode: 0o644 });

    // Special handling for Java files: Must match public class name
    if (language === "java") {
      const className = config.detectClassName(code); // Throws if no public class
      const javaFile = path.join(path.dirname(filename), `${className}.java`);
      fs.renameSync(filename, javaFile);
      filename = javaFile; // Update filename for execution
      filesToCleanup[0] = javaFile;
      filesToCleanup.push(
        path.join(path.dirname(javaFile), `${className}.class`)
      ); // Add compiled class file to cleanup
    } else if (language === "cpp" || language === "c") {
      const exeExtension = process.platform === "win32" ? "exe" : "out";
      const outputExe = getTempFile(exeExtension);
      if (process.platform !== "win32") {
        filesToCleanup.push(outputExe); // Add executable to cleanup
        await executeWithTimeout(languageConfigs[language].compileCommand(filename, outputExe)[0], SECURITY_CONFIG.timeouts.compilation);
        await executeWithTimeout(`chmod +x "${outputExe}"`, 1000); // Grant execute permissions
        const output = await executeWithTimeout(languageConfigs[language].compileCommand(filename, outputExe)[1], SECURITY_CONFIG.timeouts.execution);
        return res.json({ output });
      }
      else{
        const output = await executeCode(language, code, filename, outputExe);
        return res.json({ output });
      }
    }

    const output = await executeCode(language, code, filename);
    res.json({ output });
  } catch (error) {
    console.error(`Execution error for ${language}:`, error);
    res.json({ output: error.message || "An unknown error occurred." });
  } finally {
    cleanup(filesToCleanup);
  }
}

// --- Language-specific Endpoints ---
app.post("/run-python", (req, res) =>
  handleCodeExecution("python", req.body.code, res)
);

app.post("/run-c", (req, res) =>
  handleCodeExecution("c", req.body.code, res)
);

app.post("/run-cpp", (req, res) =>
  handleCodeExecution("cpp", req.body.code, res)
);

app.post("/run-javascript", (req, res) =>
  handleCodeExecution("javascript", req.body.code, res)
);

app.post("/run-java", (req, res) =>
  handleCodeExecution("java", req.body.code, res)
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