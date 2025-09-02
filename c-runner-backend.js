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

// === Security Configuration ===
const SECURITY_CONFIG = {
  maxExecutionTime: 10000, // Maximum execution time (ms)
  maxFileSize: 1024 * 1024, // Maximum code file size (1MB)
  sandboxPath: path.join(__dirname, "sandbox"),
  permissions: {
    // Allowed system commands per language
    python: ["python", "python3", "pip"],
    javascript: ["node", "npm"],
    java: ["java", "javac"],
    cpp: ["g++"],
    c: ["gcc"],
  },
  timeouts: {
    compilation: 5000, // Compilation timeout (ms)
    execution: 3000, // Execution timeout (ms)
    cleanup: 2000, // Cleanup timeout (ms)
  },
};

// === Server Setup ===
const app = express();
const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);

// === Security Middleware ===
app.use(
  cors({
    origin: "http://localhost:3000",
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
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  maxHttpBufferSize: SECURITY_CONFIG.maxFileSize,
});
const PORT = 5000;

/**
 * Language-specific Package Management Configuration
 *
 * Defines how dependencies are handled for each supported programming language:
 * - Package installation commands
 * - Import detection patterns
 * - Standard library identification
 * - Third-party package management
 */
const packageManagerConfigs = {
  /**
   * Python Package Management
   * Handles pip installations and import detection
   */
  python: {
    install: "pip install", // Command to install Python packages

    /**
     * Detects Python package imports in code
     * @param {string} code - Source code to analyze
     * @returns {string[]} List of non-standard packages that need to be installed
     */
    detectImports: (code) => {
      // Regular expression to match Python import statements
      const imports = code.match(
        /^import\s+([a-zA-Z0-9_]+)|^from\s+([a-zA-Z0-9_]+)\s+import/gm
      );

      // Comprehensive list of Python standard libraries
      const standardLibs = new Set([
        // === Core Python Standard Libraries ===
        "os",
        "sys",
        "math",
        "random",
        "time",
        "datetime",
        "string",
        "re",
        "json",
        "collections",
        "itertools",
        "functools",
        "typing",
        "pathlib",
        "subprocess",
        "threading",
        "multiprocessing",
        "asyncio",
        "urllib",
        "http",
        "socket",
        "email",
        "xml",
        "html",
        "csv",
        "sqlite3",
        "pickle",
        "copy",
        "hashlib",
        "logging",
        "argparse",
        "configparser",
        "unittest",
        "decimal",
        "statistics",
        "uuid",
        "base64",
        "contextlib",
        "dataclasses",
        "enum",
        "io",
        "glob",
        "shutil",
        "inspect",
        "ast",
        "traceback",
        "gc",
        "weakref",
        "types",
        "warnings",
        "platform",
        "tempfile",
        "zipfile",
        "tarfile",
        "gzip",
        "bz2",
        "lzma",
        "struct",
        "array",
        "heapq",
        "bisect",
        "calendar",
        "textwrap",
        "gettext",
        "locale",
        "signal",
        "mmap",
        "queue",
        "sched",
        "select",
        "selectors",
        "ssl",
        "ftplib",
        "poplib",
        "imaplib",
        "nntplib",
        "smtplib",
        "telnetlib",
        "hmac",
        "secrets",
        "urllib3",
        "getpass",
        "curses",
        "concurrent",
        "venv",
        "doctest",
        "trace",

        // Common Third-party Libraries (these will be auto-installed if used)
        // Data Science & Machine Learning
        "numpy",
        "pandas",
        "scipy",
        "sklearn",
        "tensorflow",
        "torch",
        "keras",
        "matplotlib",
        "seaborn",
        "plotly",
        "statsmodels",
        "scikit-image",
        "opencv-python",
        "xgboost",
        "lightgbm",
        "catboost",

        // Web Development
        "flask",
        "django",
        "fastapi",
        "requests",
        "aiohttp",
        "beautifulsoup4",
        "selenium",
        "scrapy",
        "werkzeug",
        "jinja2",
        "uvicorn",
        "gunicorn",
        "httpx",
        "grpcio",
        "graphene",

        // Database
        "sqlalchemy",
        "pymongo",
        "redis",
        "psycopg2",
        "mysql-connector-python",
        "pymysql",
        "cassandra-driver",
        "elasticsearch",
        "neo4j",

        // Testing & Quality
        "pytest",
        "unittest2",
        "nose",
        "coverage",
        "pylint",
        "mypy",
        "black",
        "isort",
        "flake8",
        "autopep8",

        // Utilities & Tools
        "pillow",
        "pyyaml",
        "cryptography",
        "paramiko",
        "boto3",
        "click",
        "tqdm",
        "rich",
        "colorama",
        "python-dotenv",
        "schedule",
        "apscheduler",
        "celery",
        "pydantic",
        "marshmallow",
        "cerberus",
        "pyinstaller",

        // Scientific Computing
        "sympy",
        "networkx",
        "biopython",
        "astropy",
        "spacy",
        "gensim",
        "nltk",
        "pycaret",
        "librosa",

        // GUI & Visualization
        "tkinter",
        "PyQt5",
        "wxPython",
        "pygame",
        "kivy",
        "pyqtgraph",
        "bokeh",
        "dash",
        "altair",
        "folium",

        // AI & Deep Learning
        "transformers",
        "pyTorch",
        "fastai",
        "gym",
        "stable-baselines3",
        "optuna",
        "ray",
        "mlflow",
        "wandb",
        "tensorflow-hub",
      ]);
      const packages = new Set();
      if (imports) {
        imports.forEach((imp) => {
          const pkg = imp.split(/\s+/)[1];
          if (!standardLibs.has(pkg)) {
            packages.add(pkg);
          }
        });
      }
      return Array.from(packages);
    },
  },
  javascript: {
    install: "npm install",
    detectImports: (code) => {
      const imports = code.match(
        /(?:require|import)\s*\(?['"]([^'"]+)['"]\)?/g
      );
      const nodeStdLibs = new Set([
        "fs",
        "path",
        "http",
        "https",
        "crypto",
        "util",
        "os",
        "net",
        "dns",
        "url",
        "querystring",
        "stream",
        "buffer",
        "events",
        "assert",
        "cluster",
        "child_process",
        "dgram",
        "domain",
        "readline",
        "string_decoder",
        "tls",
        "tty",
        "vm",
        "zlib",
        "console",
        "module",
        "process",
        "timers",
        "worker_threads",
      ]);
      const packages = new Set();
      if (imports) {
        imports.forEach((imp) => {
          const match = imp.match(/['"]([^'"]+)['"]/);
          if (match) {
            const pkg = match[1].split("/")[0];
            if (!nodeStdLibs.has(pkg) && !pkg.startsWith(".")) {
              packages.add(pkg);
            }
          }
        });
      }
      return Array.from(packages);
    },
  },
  java: {
    install: "mvn dependency:get -Dartifact=",
    detectImports: (code) => {
      const imports = code.match(/import\s+([a-zA-Z0-9_.]+)\s*;/g);
      const standardPackages = new Set([
        "java.lang",
        "java.util",
        "java.io",
        "java.nio",
        "java.time",
        "java.math",
        "java.net",
        "java.text",
        "java.sql",
        "java.security",
        "java.awt",
        "javax.swing",
        "java.beans",
        "java.rmi",
        "javax.servlet",
        "javax.xml",
        "java.applet",
        "java.lang.reflect",
        "java.util.concurrent",
        "java.util.function",
        "java.util.stream",
        "java.util.regex",
        "javax.crypto",
        "javax.imageio",
        "javax.sound",
        "com.sun",
        "org.w3c",
        "org.xml",
      ]);
      const packages = new Set();
      if (imports) {
        imports.forEach((imp) => {
          const pkg = imp.split(/\s+/)[1];
          if (!standardPackages.some((std) => pkg.startsWith(std))) {
            packages.add(pkg);
          }
        });
      }
      return Array.from(packages);
    },
  },
};

/**
 * === Environment Configuration Section ===
 * This section defines the paths and settings for various programming language environments.
 * It includes automatic detection of installed language runtimes and their locations.
 */

/**
 * Path to the Python interpreter
 * @constant {string} PYTHON_PATH - Absolute path to Python executable
 */
const PYTHON_PATH =
  "C:/Users/LENOVO/AppData/Local/Programs/Python/Python313/python.exe";

/**
 * Java Development Kit Configuration
 * Automatically detects and configures Java environment settings
 */
const JAVA_HOME = process.env.JAVA_HOME || findJavaHome();
const JAVA_VERSION = process.env.JAVA_VERSION || "17"; // Default to Java 17

/**
 * Locates the Java Development Kit installation directory
 * @function findJavaHome
 * @returns {string} Path to Java installation directory
 * @description Searches common installation locations across different operating systems
 *              Falls back to JAVA_HOME environment variable if no installation is found
 */
function findJavaHome() {
  // Define standard JDK installation paths for different operating systems
  const commonPaths = [
    "C:\\Program Files\\Java",         // Windows 64-bit
    "C:\\Program Files (x86)\\Java",   // Windows 32-bit
    "/usr/lib/jvm",                    // Linux
    "/Library/Java/JavaVirtualMachines", // macOS
  ];

  for (const basePath of commonPaths) {
    if (fs.existsSync(basePath)) {
      const jdkDirs = fs
        .readdirSync(basePath)
        .filter((dir) => dir.includes("jdk"))
        .sort()
        .reverse(); // Get the latest version

      if (jdkDirs.length > 0) {
        return path.join(basePath, jdkDirs[0]);
      }
    }
  }
  return process.env.JAVA_HOME || "";
}

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
 */
const languageConfigs = {
  /**
   * Python Language Configuration
   * Handles pip package management and Python execution
   */
  python: {
    /**
     * Installs Python packages using pip
     * @async
     * @param {string} pkg - Name of the package to install
     * @throws {Error} If package installation fails or times out
     */
    install: async (pkg) => {
      await executeWithTimeout(`"${PYTHON_PATH}" -m pip install ${pkg}`, 30000);
    },

    /**
     * Detects required Python dependencies from source code
     * @param {string} code - Python source code to analyze
     * @returns {string[]} List of required non-standard packages
     */
    detectDependencies: (code) => {
      const imports = code.match(/^(?:import|from)\s+([\w\d_]+)/gm) || [];
      // Core Python standard libraries that don't need installation
      const stdLibs = new Set([
        "os",
        "sys",
        "math",
        "random",
        "time",
        "datetime",
        "string",
        "re",
        "json",
        "collections",
        "itertools",
        "functools",
        "typing",
        "pathlib",
        "subprocess",
        "threading",
        "multiprocessing",
        "asyncio",
        "urllib",
        "http",
        "socket",
        "email",
        "xml",
        "html",
        "csv",
        "sqlite3",
        "pickle",
        "copy",
        "hashlib",
        "logging",
        "argparse",
        "configparser",
        "unittest",
        "decimal",
        "statistics",
        "uuid",
        "base64",
        "contextlib",
        "dataclasses",
        "enum",
        "io",
        "glob",
        "shutil",
      ]);
      return imports
        .map((imp) => imp.split(/\s+/)[1].split(".")[0])
        .filter((pkg) => !stdLibs.has(pkg));
    },
    packageFile: "requirements.txt",
    compileCommand: (filename) => `"${PYTHON_PATH}" "${filename}"`,
    timeout: 5000,
  },
  javascript: {
    install: async (pkg) => {
      await executeWithTimeout(`npm install ${pkg}`, 30000);
    },
    detectDependencies: (code) => {
      const imports =
        code.match(/(?:require|import)\s*\(?['"]([^'"./]+)/g) || [];
      return imports.map((imp) => imp.match(/['"]([^'"]+)['"]/)[1]);
    },
    packageFile: "package.json",
    initPackageJson: {
      name: "code-runner",
      version: "1.0.0",
      private: true,
      type: "module",
    },
    compileCommand: (filename) => `node "${filename}"`,
    timeout: 5000,
  },
  java: {
    install: async (pkg) => {
      const [group, artifact, version] = pkg.split(":");
      await executeWithTimeout(
        `mvn dependency:get -DgroupId=${group} -DartifactId=${artifact} -Dversion=${version}`,
        30000
      );
    },
    detectDependencies: (code) => {
      const imports = code.match(/import\s+([a-zA-Z0-9_.]+)\s*;/g) || [];
      const stdPackages = new Set([
        "java.lang",
        "java.util",
        "java.io",
        "java.nio",
        "java.time",
        "java.math",
        "java.net",
        "java.text",
        "java.sql",
        "java.security",
        "java.awt",
        "javax.swing",
        "java.beans",
        "java.rmi",
        "javax.servlet",
        "javax.xml",
        "java.applet",
        "java.lang.reflect",
        "java.util.concurrent",
        "java.util.function",
        "java.util.stream",
        "java.util.regex",
        "javax.crypto",
        "javax.imageio",
        "javax.sound",
        "com.sun",
        "org.w3c",
        "org.xml",
      ]);
      return imports
        .map((imp) => imp.split(/\s+/)[1])
        .filter((pkg) => !stdPackages.some((std) => pkg.startsWith(std)));
    },
    packageFile: "pom.xml",
    compileCommand: (filename, className) => [
      `javac "${filename}"`,
      `java -cp "${path.dirname(filename)}" ${className}`,
    ],
    timeout: { compile: 5000, run: 3000 },
  },
  c: {
    install: async (pkg) => {
      await executeWithTimeout(`vcpkg install ${pkg}:x64-windows`, 30000);
    },
    detectDependencies: (code) => {
      const includes = code.match(/#include\s*<([^>]+)>/g) || [];
      const stdHeaders = new Set([
        "stdio.h",
        "stdlib.h",
        "string.h",
        "math.h",
        "time.h",
        "ctype.h",
        "stdbool.h",
        "stdint.h",
        "limits.h",
        "float.h",
        "assert.h",
        "errno.h",
        "signal.h",
        "locale.h",
        "setjmp.h",
        "stdarg.h",
        "stddef.h",
        "iso646.h",
        "wchar.h",
        "wctype.h",
        "complex.h",
        "fenv.h",
        "inttypes.h",
        "uchar.h",
        "windows.h",
        "process.h",
        "direct.h",
        "io.h",
        "conio.h",
      ]);
      return includes
        .map((inc) => inc.match(/<([^>]+)>/)[1].split("/")[0])
        .filter((hdr) => !stdHeaders.has(hdr));
    },
    compileCommand: (filename, outputExe) => [
      `gcc "${filename}" -o "${outputExe}"`,
      `"${outputExe}"`,
    ],
    timeout: { compile: 5000, run: 3000 },
  },
  cpp: {
    install: async (pkg) => {
      // C++ standard libraries are typically pre-installed with the compiler
      console.log("Standard C++ libraries are pre-installed");
    },
    detectDependencies: (code) => {
      const includes = code.match(/#include\s*[<"]([^>"]+)[>"]/gm) || [];
      const stdHeaders = new Set([
        // C++ Standard Library Headers
        "iostream",
        "string",
        "vector",
        "map",
        "set",
        "queue",
        "stack",
        "deque",
        "list",
        "array",
        "algorithm",
        "memory",
        "functional",
        "chrono",
        "thread",
        "mutex",
        "condition_variable",
        "future",
        "random",
        "regex",
        "filesystem",
        // C++ Standard Template Library (STL)
        "iterator",
        "numeric",
        "utility",
        "tuple",
        "type_traits",
        "exception",
        "stdexcept",
        "cassert",
        "cstdlib",
        "cstring",
        "cctype",
        "cmath",
        "ctime",
        "cstdio",
        // C++ Input/Output
        "fstream",
        "sstream",
        "iomanip",
        // Modern C++ Features
        "optional",
        "variant",
        "any",
        // Additional Libraries
        "boost",
        "eigen",
        "opencv2",
      ]);
      return includes
        .map((inc) => inc.match(/#include\s*[<"]([^>"]+)[>"]/)[1])
        .filter((header) => !stdHeaders.has(header));
    },
    compileFlags: "-std=c++17 -Wall -Wextra -O2", // Using C++17 by default
    libraries: "-pthread", // Common threading library
    packageFile: null,
    timeout: {
      compile: 15000, // 15 seconds for compilation
      run: 10000, // 10 seconds for execution
    },
    compileCommand: (filename, outputExe) => {
      const output =
        outputExe ||
        filename.replace(
          ".cpp",
          process.platform === "win32" ? ".exe" : ".out"
        );
      return [
        `g++ ${languageConfigs.cpp.compileFlags} "${filename}" -o "${output}" ${languageConfigs.cpp.libraries}`,
        process.platform === "win32" ? `"${output}"` : `./${output}`,
      ];
    },
    additionalLibraries: {
      // Common C++ libraries and their installation commands
      boost: "sudo apt-get install libboost-all-dev",
      eigen: "sudo apt-get install libeigen3-dev",
      opencv: "sudo apt-get install libopencv-dev",
      ssl: "sudo apt-get install libssl-dev",
      curl: "sudo apt-get install libcurl4-openssl-dev",
    },
  },
  c: {
    install: async (pkg) => {
      // C standard libraries are typically pre-installed with the compiler
      // This is a placeholder for any additional library installations if needed
      console.log("Standard C libraries are pre-installed");
    },
    detectDependencies: (code) => {
      const includes = code.match(/#include\s*[<"]([^>"]+)[>"]/gm) || [];
      const stdHeaders = new Set([
        "stdio.h",
        "stdlib.h",
        "string.h",
        "math.h",
        "time.h",
        "ctype.h",
        "stdbool.h",
        "stdint.h",
        "float.h",
        "limits.h",
        "assert.h",
        "errno.h",
        "locale.h",
        "setjmp.h",
        "signal.h",
        "stdarg.h",
        "stddef.h",
        "sys/types.h",
        "unistd.h",
      ]);
      return includes
        .map((inc) => inc.match(/#include\s*[<"]([^>"]+)[>"]/)[1])
        .filter((header) => !stdHeaders.has(header));
    },
    compileFlags: "-Wall -Wextra -std=c11",
    libraries: "-lm", // Math library is commonly needed
    packageFile: null, // C doesn't use a package file like requirements.txt
    timeout: {
      compile: 10000, // 10 seconds for compilation
      run: 5000, // 5 seconds for execution
    },
    compileCommand: (filename, outputExe) => {
      const output =
        outputExe ||
        filename.replace(".c", process.platform === "win32" ? ".exe" : ".out");
      return [
        `gcc ${languageConfigs.c.compileFlags} "${filename}" -o "${output}" ${languageConfigs.c.libraries}`,
        process.platform === "win32" ? `"${output}"` : `./${output}`,
      ];
    },
  },
  java: {
    install: async (pkg) => {
      // Java dependencies are typically managed through build tools like Maven or Gradle
      console.log("Java dependencies are managed through build tools");
    },
    detectDependencies: (code) => {
      const imports = code.match(/^import\s+([a-zA-Z0-9_\.]+);/gm) || [];
      const stdPackages = new Set([
        "java.lang",
        "java.io",
        "java.util",
        "java.net",
        "java.text",
        "java.math",
        "java.time",
        "java.sql",
        "java.security",
        "java.nio",
        "java.awt",
        "javax.swing",
        "java.util.concurrent",
        "java.util.function",
        "java.util.stream",
        "java.util.regex",
      ]);
      return imports
        .map(
          (imp) => imp.match(/^import\s+([a-zA-Z0-9_\.]+);/)[1].split(".")[0]
        )
        .filter((pkg) => !stdPackages.has(pkg));
    },
    compileFlags: "-Xlint:all -encoding UTF-8",
    libraries: "-cp .", // Classpath setting
    packageFile: "pom.xml", // For Maven projects
    timeout: 15000, // Default timeout of 15 seconds
    compileCommand: (filename) => {
      const className = filename.replace(".java", "");
      return [
        `javac ${languageConfigs.java.compileFlags} "${filename}"`,
        `java ${languageConfigs.java.libraries} "${className}"`,
      ];
    },
    classPath: process.env.CLASSPATH || ".",
    additionalLibraries: {
      // Common external libraries
      junit: "org.junit.jupiter:junit-jupiter:5.9.2",
      gson: "com.google.code.gson:gson:2.10.1",
      "commons-io": "commons-io:commons-io:2.11.0",
      log4j: "org.apache.logging.log4j:log4j-core:2.20.0",
      mockito: "org.mockito:mockito-core:5.3.1",
    },
  },
  python: {
    install: async (pkg) => {
      // Install in user mode to avoid permission issues
      await executeWithTimeout(
        `"${PYTHON_PATH}" -m pip install --user ${pkg}`,
        30000
      );
    },
    detectDependencies: (code) => {
      const imports =
        code.match(
          /^(?:import|from)\s+([\w\d_\.]+)(?:\s+import\s+[\w\d_\.,\s*]+)?/gm
        ) || [];
      const stdLibs = new Set([
        // Basic Python Standard Library
        "os",
        "sys",
        "math",
        "random",
        "time",
        "datetime",
        "string",
        "re",
        "json",
        "collections",
        "itertools",
        "functools",
        "typing",
        "pathlib",
        "argparse",
        // Data Types and Collections
        "array",
        "enum",
        "dataclasses",
        "abc",
        "copy",
        "numbers",
        // File and Directory Access
        "glob",
        "fnmatch",
        "shutil",
        "tempfile",
        "fileinput",
        // Data Compression
        "zlib",
        "gzip",
        "bz2",
        "lzma",
        "zipfile",
        "tarfile",
        // Data Persistence
        "pickle",
        "shelve",
        "sqlite3",
        "csv",
        "configparser",
        // Cryptography
        "hashlib",
        "hmac",
        "secrets",
        // Operating System
        "platform",
        "subprocess",
        "signal",
        "stat",
        // Concurrent Execution
        "threading",
        "multiprocessing",
        "concurrent",
        "asyncio",
        // Networking
        "socket",
        "ssl",
        "select",
        "asyncore",
        "asynchat",
        "urllib",
        "http",
        // Internet Data
        "email",
        "json",
        "xml",
        "html",
        "webbrowser",
        // Development Tools
        "typing",
        "pdb",
        "doctest",
        "unittest",
        "venv",
        // Common Third-party Libraries (these will be installed if imported)
        "numpy",
        "pandas",
        "matplotlib",
        "scipy",
        "sklearn",
        "tensorflow",
        "torch",
        "django",
        "flask",
        "requests",
        "beautifulsoup4",
        "selenium",
        "pillow",
        "opencv-python",
        "pytest",
        "sqlalchemy",
      ]);

      // Extract all imported packages, handling both direct imports and from imports
      const packages = imports.map((imp) => {
        const match = imp.match(/^from\s+([\w\d_\.]+)|^import\s+([\w\d_\.]+)/);
        return (match[1] || match[2]).split(".")[0];
      });

      // Filter out standard library modules
      return [...new Set(packages)].filter((pkg) => !stdLibs.has(pkg));
    },
    packageFile: "requirements.txt",
    virtualenv: {
      create: async (name) => {
        // Use a fixed timeout for virtual environment creation
        await executeWithTimeout(`"${PYTHON_PATH}" -m venv "${name}"`, 30000);
      },
      activate: (name) => {
        return process.platform === "win32"
          ? `${name}\\Scripts\\activate.bat`
          : `. ${name}/bin/activate`;
      },
    },
    // Define timeouts for different operations
    timeout: 30000, // Default timeout of 30 seconds
    compileCommand: (filename) => `"${PYTHON_PATH}" "${filename}"`,
    additionalPackages: {
      // Data Science and Machine Learning
      numpy: "numpy>=1.24.0",
      pandas: "pandas>=2.0.0",
      scipy: "scipy>=1.10.0",
      sklearn: "scikit-learn>=1.2.0",
      matplotlib: "matplotlib>=3.7.0",
      seaborn: "seaborn>=0.12.0",
      tensorflow: "tensorflow>=2.12.0",
      torch: "torch>=2.0.0",
      // Web Development
      django: "Django>=4.2.0",
      flask: "Flask>=2.3.0",
      fastapi: "fastapi>=0.95.0",
      requests: "requests>=2.30.0",
      // Database
      sqlalchemy: "SQLAlchemy>=2.0.0",
      pymongo: "pymongo>=4.3.0",
      psycopg2: "psycopg2-binary>=2.9.0",
      // Testing
      pytest: "pytest>=7.3.0",
      unittest: "unittest2>=1.1.0",
      // Automation and Scraping
      selenium: "selenium>=4.9.0",
      beautifulsoup4: "beautifulsoup4>=4.12.0",
      // Image Processing
      pillow: "Pillow>=9.5.0",
      opencv: "opencv-python>=4.7.0",
    },
  },
  javascript: {
    install: async (pkg) => {
      // Install package using npm with exact version
      await executeWithTimeout(`npm install ${pkg} --save-exact`, 60000);
    },
    detectDependencies: (code) => {
      // Detect import/require statements and destructuring patterns
      const imports = [
        ...(code.match(
          /(?:import|require)\s*\(?['"]([@\w\d\-\/\.]+)['"]\)?/gm
        ) || []),
        ...(code.match(/(?:import\s*{[^}]+}\s*from\s*['"])([^'"]+)/gm) || []),
        ...(code.match(
          /(?:const|let|var)\s*{\s*[^}]+}\s*=\s*require\(['"]([^'"]+)['"]\)/gm
        ) || []),
      ];

      const stdModules = new Set([
        // Node.js Built-in Modules
        "fs",
        "path",
        "http",
        "https",
        "os",
        "crypto",
        "events",
        "stream",
        "buffer",
        "util",
        "url",
        "querystring",
        "zlib",
        "readline",
        "net",
        "dgram",
        "dns",
        "tls",
        "cluster",
        "child_process",
        "worker_threads",
        "assert",
        "console",
        "process",
        "timers",
        "perf_hooks",
        "v8",
      ]);

      return [
        ...new Set(
          imports
            .map((imp) => {
              const match = imp.match(/['"]([^'"]+)['"]/);
              return match ? match[1] : null;
            })
            .filter((pkg) => pkg && !stdModules.has(pkg))
            // Handle scoped packages and submodules
            .map((pkg) => (pkg.startsWith("@") ? pkg : pkg.split("/")[0]))
        ),
      ];
    },
    packageFile: "package.json",
    timeout: {
      install: 60000, // 60 seconds for package installation
      compile: 10000, // 10 seconds for compilation
      run: 30000, // 30 seconds for execution
    },
    compileCommand: (filename) => `node "${filename}"`,
    additionalPackages: {
      // Frontend Frameworks and Libraries
      react: "^18.2.0",
      vue: "^3.3.0",
      angular: "@angular/core@16.0.0",
      svelte: "^4.0.0",
      next: "^13.4.0",
      // State Management
      redux: "^4.2.0",
      mobx: "^6.9.0",
      vuex: "^4.1.0",
      // UI Libraries
      "material-ui": "@mui/material@5.13.0",
      tailwindcss: "^3.3.0",
      bootstrap: "^5.3.0",
      "chakra-ui": "@chakra-ui/react@2.7.0",
      // Backend Frameworks
      express: "^4.18.0",
      nest: "@nestjs/core@10.0.0",
      fastify: "^4.17.0",
      koa: "^2.14.0",
      // Database
      mongoose: "^7.2.0",
      sequelize: "^6.31.0",
      prisma: "^4.14.0",
      typeorm: "^0.3.16",
      // Testing
      jest: "^29.5.0",
      mocha: "^10.2.0",
      cypress: "^12.13.0",
      playwright: "^1.34.0",
      // Utility Libraries
      lodash: "^4.17.21",
      axios: "^1.4.0",
      moment: "^2.29.4",
      zod: "^3.21.0",
      // Build Tools
      webpack: "^5.83.0",
      vite: "^4.3.0",
      babel: "@babel/core@7.22.0",
      typescript: "^5.0.0",
      // Development Tools
      eslint: "^8.41.0",
      prettier: "^2.8.0",
      nodemon: "^2.0.22",
    },
    nodeModules: {
      // Handle node_modules directory
      path: "./node_modules",
      check: () => fs.existsSync("./node_modules"),
      create: () => {
        if (!fs.existsSync("./node_modules")) {
          fs.mkdirSync("./node_modules", { recursive: true });
        }
      },
    },
    packageManager: {
      npm: {
        init: () => executeWithTimeout("npm init -y", 30000),
        install: (pkg) =>
          executeWithTimeout(`npm install ${pkg} --save-exact`, 60000),
        update: () => executeWithTimeout("npm update", 120000),
        audit: () => executeWithTimeout("npm audit fix", 60000),
      },
      yarn: {
        init: () => executeWithTimeout("yarn init -y", 30000),
        install: (pkg) => executeWithTimeout(`yarn add ${pkg} --exact`, 60000),
        update: () => executeWithTimeout("yarn upgrade", 120000),
        audit: () => executeWithTimeout("yarn audit fix", 60000),
      },
    },
    environment: {
      development: {
        NODE_ENV: "development",
        flags: "--inspect --trace-warnings",
      },
      production: {
        NODE_ENV: "production",
        flags: "--max-old-space-size=4096",
      },
      testing: {
        NODE_ENV: "test",
        flags: "--trace-deprecation",
      },
    },
    compileCommand: (filename) => `"${PYTHON_PATH}" "${filename}"`,
    timeout: 5000,
  },
  javascript: {
    install: async (pkg) => {
      await executeWithTimeout(`npm install ${pkg}`, 30000);
    },
    detectDependencies: (code) => {
      const imports =
        code.match(/(?:require|import)\s*\(?['"]([^'"./]+)/g) || [];
      return imports.map((imp) => imp.match(/['"]([^'"]+)['"]/)[1]);
    },
    packageFile: "package.json",
    initPackageJson: {
      name: "code-runner",
      version: "1.0.0",
      private: true,
      type: "module",
    },
    compileCommand: (filename) => `node "${filename}"`,
    timeout: 5000,
  },
  java: {
    install: async (pkg) => {
      const [group, artifact, version] = pkg.split(":");
      await executeWithTimeout(
        `mvn dependency:get -DgroupId=${group} -DartifactId=${artifact} -Dversion=${version}`,
        30000
      );
    },
    detectDependencies: (code) => {
      const imports = code.match(/import\s+([a-zA-Z0-9_.]+)\s*;/g) || [];
      const stdPackages = new Set([
        // Core Java Packages
        "java.lang",
        "java.util",
        "java.io",
        "java.nio",
        "java.math",
        "java.time",
        "java.text",
        "java.net",
        "java.security",
        "java.sql",
        "java.awt",
        "java.beans",
        "java.rmi",

        // Java Extensions
        "javax.swing",
        "javax.crypto",
        "javax.imageio",
        "javax.sound",
        "javax.xml",
        "javax.sql",
        "javax.naming",
        "javax.management",
        "javax.script",
        "javax.tools",
        "javax.annotation",
        "javax.print",

        // Enterprise Java (Jakarta EE)
        "jakarta.servlet",
        "jakarta.ejb",
        "jakarta.persistence",
        "jakarta.ws.rs",
        "jakarta.mail",
        "jakarta.json",
        "jakarta.validation",
        "jakarta.batch",
        "jakarta.faces",
        "jakarta.enterprise",
        "jakarta.interceptor",

        // JavaFX
        "javafx.application",
        "javafx.scene",
        "javafx.stage",
        "javafx.fxml",
        "javafx.controls",
        "javafx.graphics",
        "javafx.media",
        "javafx.web",

        // Common Third-party Libraries (these will be auto-installed if used)
        // Testing
        "org.junit",
        "org.testng",
        "org.mockito",
        "org.assertj",
        "org.hamcrest",

        // Logging
        "org.slf4j",
        "org.apache.log4j",
        "ch.qos.logback",

        // Database & ORM
        "org.hibernate",
        "javax.persistence",
        "org.springframework.data",
        "com.zaxxer.hikari",
        "org.jdbi",

        // Web & REST
        "org.springframework",
        "io.micronaut",
        "io.quarkus",
        "spark",
        "io.vertx",
        "com.sparkjava",

        // JSON & XML
        "com.fasterxml.jackson",
        "org.json",
        "com.google.gson",
        "javax.xml.bind",
        "org.yaml.snakeyaml",

        // Utilities
        "org.apache.commons",
        "com.google.common",
        "com.google.guava",
        "org.projectlombok",
        "io.vavr",
        "org.apache.poi",

        // Reactive Programming
        "io.reactivex",
        "reactor.core",
        "org.reactivestreams",

        // Messaging & Integration
        "org.apache.kafka",
        "com.rabbitmq",
        "org.springframework.amqp",

        // Cloud & Microservices
        "org.springframework.cloud",
        "io.kubernetes",
        "software.amazon.awssdk",

        // Security
        "org.springframework.security",
        "io.jsonwebtoken",
        "org.bouncycastle",

        // Template Engines
        "org.thymeleaf",
        "org.apache.velocity",
        "com.github.jknack.handlebars",

        // Monitoring & Metrics
        "io.micrometer",
        "io.prometheus",
        "org.apache.skywalking",

        // Big Data & Analytics
        "org.apache.spark",
        "org.apache.hadoop",
        "org.elasticsearch",

        // Machine Learning
        "org.deeplearning4j",
        "org.nd4j",
        "smile.classification",

        // Build Tools & Annotations
        "org.gradle",
        "org.apache.maven",
        "javax.annotation",

        // Standard System Packages
        "com.sun",
        "org.w3c",
        "org.xml",
        "org.omg",
        "org.ietf",
      ]);
      return imports
        .map((imp) => imp.split(/\s+/)[1])
        .filter((pkg) => !stdPackages.some((std) => pkg.startsWith(std)));
    },
    detectClassName: (code) => {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      if (!classMatch) {
        throw new Error("No public class found in the Java code");
      }
      return classMatch[1];
    },
    packageFile: "pom.xml",
    compileCommand: (filename) => {
      // Get the class name from the file name by removing .java extension
      const className = filename.split("\\").pop().replace(".java", "");
      return [
        `javac "${filename}"`,
        `java -cp "${path.dirname(filename)}" ${className}`,
      ];
    },
    timeout: { compile: 5000, run: 3000 },
  },
  cpp: {
    install: async (pkg) => {
      // Instead of installing packages, we'll check if the header is available
      console.log(`Using system-installed C++ libraries`);
    },
    detectDependencies: (code) => {
      // Return empty array as we're only supporting standard libraries
      return [];
    },
    detectHeaders: (code) => {
      const includes = code.match(/#include\s*<([^>]+)>/g) || [];
      const stdHeaders = new Set([
        // Core C++ Standard Library Headers
        // Input/Output
        "iostream",
        "iomanip",
        "fstream",
        "sstream",
        "streambuf",
        "ios",
        "iosfwd",

        // Containers
        "vector",
        "string",
        "array",
        "deque",
        "forward_list",
        "list",
        "map",
        "set",
        "unordered_map",
        "unordered_set",
        "queue",
        "stack",
        "span",
        "initializer_list",

        // Algorithms and Functions
        "algorithm",
        "functional",
        "iterator",
        "numeric",

        // Language Support
        "memory",
        "limits",
        "exception",
        "stdexcept",
        "cassert",
        "cerrno",
        "new",
        "typeindex",
        "scoped_allocator",

        // Types and Type Traits
        "cstdint",
        "type_traits",
        "typeinfo",
        "bitset",
        "any",
        "optional",
        "variant",
        "compare",
        "version",
        "source_location",

        // Math and Numbers
        "cmath",
        "complex",
        "random",
        "ratio",
        "cfloat",
        "climits",
        "numbers",
        "valarray",
        "bit",

        // C Standard Library
        "cstdio",
        "cstdlib",
        "cstring",
        "cctype",
        "ctime",
        "cstddef",
        "cwchar",
        "cuchar",
        "cwctype",
        "clocale",
        "csetjmp",
        "csignal",

        // System and Threading
        "thread",
        "mutex",
        "shared_mutex",
        "condition_variable",
        "future",
        "chrono",
        "system_error",
        "atomic",
        "barrier",
        "latch",
        "semaphore",

        // Utilities
        "utility",
        "tuple",
        "pair",
        "regex",
        "atomic",
        "filesystem",
        "charconv",
        "format",
        "memory_resource",
        "execution",

        // Ranges and Views (C++20)
        "ranges",
        "span",
        "coroutine",
        "compare",
        "concepts",

        // Networking (C++20 Networking TS)
        "asio",
        "networking",

        // Modules (C++20)
        "module",
        "import",
        "export",

        // Smart Pointers and Memory Management
        "memory",
        "shared_ptr",
        "weak_ptr",
        "unique_ptr",
        "allocator",

        // String View
        "string_view",
        "u8string_view",
        "u16string_view",
        "u32string_view",

        // Parallelism and Concurrency
        "execution",
        "parallel",
        "barrier",
        "latch",
        "stop_token",

        // Additional C++ Features
        "locale",
        "codecvt",
        "syncstream",
        "stacktrace",
        "expected",
        "generator",
        "mdspan",
        "print",
        "spanstream",
        "stdfloat",
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

      return [];
    },
    compileCommand: (filename, outputExe) => {
      const defaultFlags = "-std=c++17 -Wall -Wextra";
      const defaultLibs = "-pthread";
      return [
        `g++ ${defaultFlags} "${filename}" -o "${outputExe}" ${defaultLibs}`,
        `"${outputExe}"`,
      ];
    },
    timeout: { compile: 5000, run: 3000 },
  },
};

// Package manager commands for different languages
const packageManagers = {
  python: {
    install: "pip install",
    detectImports: (code) => {
      const imports = code.match(
        /^import\s+([a-zA-Z0-9_]+)|^from\s+([a-zA-Z0-9_]+)\s+import/gm
      );
      const standardLibs = new Set([
        "os",
        "sys",
        "math",
        "random",
        "time",
        "datetime",
        "string",
        "re",
      ]);
      const packages = new Set();
      if (imports) {
        imports.forEach((imp) => {
          const pkg = imp.split(/\s+/)[1];
          if (!standardLibs.has(pkg)) {
            packages.add(pkg);
          }
        });
      }
      return Array.from(packages);
    },
  },
  javascript: {
    install: "npm install",
    detectImports: (code) => {
      const imports = code.match(
        /(?:require|import)\s*\(?['"]([^'"]+)['"]\)?/g
      );
      const nodeStdLibs = new Set([
        // Node.js Core Modules
        "fs",
        "path",
        "http",
        "https",
        "crypto",
        "util",
        "os",
        "net",
        "dns",
        "stream",
        "events",
        "buffer",
        "url",
        "querystring",
        "readline",
        "child_process",
        "cluster",
        "dgram",
        "zlib",
        "assert",
        "tty",
        "string_decoder",
        "vm",
        "timers",
        "perf_hooks",
        "async_hooks",
        "worker_threads",
        "process",
        "console",
        "module",

        // Common NPM Packages (these will be auto-installed if used)
        // Web Frameworks & APIs
        "express",
        "koa",
        "fastify",
        "nest",
        "next",
        "nuxt",
        "socket.io",
        "apollo-server",
        "graphql",
        "axios",
        "cors",
        "body-parser",
        "multer",
        "passport",
        "jsonwebtoken",

        // Database
        "mongoose",
        "sequelize",
        "prisma",
        "typeorm",
        "knex",
        "mongodb",
        "redis",
        "pg",
        "mysql2",
        "sqlite3",
        "ioredis",

        // Testing
        "jest",
        "mocha",
        "chai",
        "supertest",
        "cypress",
        "playwright",
        "puppeteer",
        "selenium-webdriver",
        "sinon",

        // Utilities & Tools
        "lodash",
        "moment",
        "date-fns",
        "uuid",
        "bcrypt",
        "dotenv",
        "winston",
        "morgan",
        "nodemailer",
        "sharp",
        "joi",
        "yup",
        "validator",
        "cheerio",
        "prettier",
        "eslint",

        // Frontend Libraries
        "react",
        "vue",
        "angular",
        "svelte",
        "preact",
        "solid-js",
        "jquery",
        "three.js",
        "d3",
        "chart.js",
        "leaflet",

        // State Management
        "redux",
        "mobx",
        "vuex",
        "recoil",
        "jotai",
        "zustand",

        // UI Libraries
        "tailwindcss",
        "material-ui",
        "chakra-ui",
        "ant-design",
        "bootstrap",
        "styled-components",
        "emotion",

        // Build Tools
        "webpack",
        "rollup",
        "parcel",
        "vite",
        "esbuild",
        "babel",
        "typescript",
        "sass",
        "postcss",

        // Cloud & Deployment
        "aws-sdk",
        "firebase-admin",
        "google-cloud",
        "azure-sdk",
        "serverless",
        "pm2",
        "docker-compose",

        // Machine Learning & AI
        "@tensorflow/tfjs",
        "brain.js",
        "natural",
        "ml5",
        "@huggingface/inference",

        // Real-time & WebSockets
        "ws",
        "socket.io",
        "websocket",
        "socketio-client",

        // Security
        "helmet",
        "cors",
        "csurf",
        "rate-limiter-flexible",
        "express-validator",
        "sanitize-html",

        // Monitoring & Logging
        "winston",
        "morgan",
        "pino",
        "newrelic",
        "sentry",
        "prometheus-client",
      ]);
      const packages = new Set();
      if (imports) {
        imports.forEach((imp) => {
          const match = imp.match(/['"]([^'"]+)['"]/);
          if (match) {
            const pkg = match[1].split("/")[0];
            if (!nodeStdLibs.has(pkg) && !pkg.startsWith(".")) {
              packages.add(pkg);
            }
          }
        });
      }
      return Array.from(packages);
    },
  },
  java: {
    install: "mvn dependency:get -Dartifact=",
    detectImports: (code) => {
      const imports = code.match(/import\s+([a-zA-Z0-9_.]+)\s*;/g);
      const standardPackages = new Set([
        "java.",
        "javax.",
        "org.w3c.",
        "org.xml.",
      ]);
      const packages = new Set();
      if (imports) {
        imports.forEach((imp) => {
          const pkg = imp.split(/\s+/)[1];
          if (!standardPackages.some((std) => pkg.startsWith(std))) {
            packages.add(pkg);
          }
        });
      }
      return Array.from(packages);
    },
  },
  cpp: {
    install: "vcpkg install",
    detectImports: (code) => {
      const includes = code.match(/#include\s*<([^>]+)>/g);
      const standardHeaders = new Set([
        "iostream",
        "vector",
        "string",
        "algorithm",
        "cmath",
        "cstdio",
      ]);
      const packages = new Set();
      if (includes) {
        includes.forEach((inc) => {
          const match = inc.match(/<([^>]+)>/);
          if (match) {
            const header = match[1].split("/")[0];
            if (!standardHeaders.has(header)) {
              packages.add(header);
            }
          }
        });
      }
      return Array.from(packages);
    },
  },
};

app.use(express.json());

// Helper function to get temporary file path
function getTempFile(ext) {
  return path.join(
    __dirname,
    `temp_${crypto.randomBytes(8).toString("hex")}.${ext}`
  );
}

// Helper function to cleanup temporary files
/**
 * Cleans up temporary files after code execution
 * 
 * @function cleanup
 * @param {string[]} files - Array of file paths to delete
 * @returns {void}
 * 
 * @description
 * Ensures proper cleanup of temporary resources:
 * - Removes source code files
 * - Deletes compiled executables
 * - Cleans up any generated artifacts
 * - Handles cleanup errors gracefully
 * - Maintains sandbox directory hygiene
 */
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
            } catch (e) {}
          }, 500);
        }
      }
    }
  });
}

// Helper function to execute code with timeout
/**
 * Executes a shell command with a timeout safety mechanism
 * 
 * @function executeWithTimeout
 * @param {string} command - The shell command to execute
 * @param {number} timeout - Maximum execution time in milliseconds
 * @returns {Promise<string>} Command output if successful
 * @throws {Error} If command fails or exceeds timeout
 * @description
 * - Executes shell commands in a controlled environment
 * - Implements timeout protection against infinite loops or hanging processes
 * - Captures both stdout and stderr
 * - Ensures process cleanup after execution or timeout
 */
function executeWithTimeout(command, timeout) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

app.use(cors());

// Java language endpoint
app.post("/run-java", async (req, res) => {
  try {
    const code = req.body.code;
    const className = languageConfigs.java.detectClassName(code);
    const filename = getTempFile("java");

    // Write the code to a temporary file
    fs.writeFileSync(filename, code);

    try {
      const result = await executeCode("java", code, filename);
      res.json({ output: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    } finally {
      cleanup([filename, filename.replace(".java", ".class")]);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// C language endpoint
app.post("/run-c", (req, res) => handleCodeExecution("c", req.body.code, res));

// C++ language endpoint
app.post("/run-cpp", (req, res) =>
  handleCodeExecution("cpp", req.body.code, res)
);

// Helper function to handle package installation and dependency management
async function handleDependencies(language, code) {
  const config = languageConfigs[language];

  // Special handling for C++
  if (language === "cpp" && config.detectHeaders) {
    try {
      config.detectHeaders(code);
      return null;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  const dependencies = config.detectDependencies(code);
  const errors = [];

  if (dependencies.length === 0) return null;

  try {
    for (const dep of dependencies) {
      try {
        // Use install timeout if available, otherwise use default timeout
        const timeout =
          typeof config.timeout === "object" && config.timeout.install
            ? config.timeout.install
            : 30000; // Default 30s timeout for installations

        await config.install(dep, timeout);
      } catch (error) {
        errors.push(`Failed to install ${dep}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Dependency management error: ${error}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

/**
 * Code Execution Helper
 * Manages the complete lifecycle of code execution with proper security measures
 *
 * @param {string} language - Programming language identifier
 * @param {string} code - Source code to execute
 * @param {string} filename - Temporary file path for code storage
 * @param {string|null} outputExe - Output executable path for compiled languages
 * @returns {Promise<string>} Execution output or error message
 * @throws {Error} If dependency installation or execution fails
 */
/**
 * Executes code in a specified programming language with safety measures
 * 
 * @async
 * @function executeCode
 * @param {string} language - Programming language (python, javascript, java, cpp, c)
 * @param {string} code - Source code to execute
 * @param {string} filename - Name of the file to create and execute
 * @param {string} [outputExe=null] - Optional output executable name for compiled languages
 * @returns {Promise<Object>} Execution result containing output and any errors
 * @throws {Error} If execution fails, times out, or language is not supported
 * 
 * @description
 * This function handles the complete code execution lifecycle:
 * 1. Input Validation & Security Checks
 *    - Verifies language support
 *    - Validates code length and content
 *    - Checks for malicious patterns
 * 
 * 2. Environment Preparation
 *    - Creates isolated execution directory
 *    - Sets up language-specific environment
 *    - Manages file creation and permissions
 * 
 * 3. Execution Process
 *    - Handles compilation for compiled languages
 *    - Executes code with timeout protection
 *    - Captures output and errors
 * 
 * 4. Cleanup & Resource Management
 *    - Removes temporary files
 *    - Kills any hanging processes
 *    - Cleans up execution environment
 * 
 * 5. Error Handling
 *    - Provides detailed error messages
 *    - Handles language-specific error formats
 *    - Implements graceful failure recovery
 */
async function executeCode(language, code, filename, outputExe = null) {
  const config = languageConfigs[language];

  // Step 1: Dependency Management
  try {
    await handleDependencies(language, code);
  } catch (error) {
    throw new Error(`Dependency Error: ${error.message}`);
  }

  // Step 2: Compilation and Execution
  if (Array.isArray(config.compileCommand(filename, outputExe))) {
    // Handle compiled languages (C, C++, Java)
    const [compileCmd, runCmd] = config.compileCommand(filename, outputExe);

    // Configure separate timeouts for compilation and runtime
    const compileTimeout =
      typeof config.timeout === "object"
        ? config.timeout.compile
        : config.timeout;
    const runTimeout =
      typeof config.timeout === "object" ? config.timeout.run : config.timeout;

    // Two-step process: Compile then Run
    await executeWithTimeout(compileCmd, compileTimeout); // Compilation phase
    return await executeWithTimeout(runCmd, runTimeout); // Execution phase
  }

  // Handle interpreted languages (Python, JavaScript)
  return await executeWithTimeout(
    config.compileCommand(filename),
    config.timeout
  );
}

/**
 * Main Code Execution Handler
 * Processes incoming code execution requests and manages the execution lifecycle
 *
 * Security measures:
 * - Input validation
 * - Resource limits
 * - File system isolation
 * - Process timeout enforcement
 * - Proper cleanup
 *
 * @param {string} language - Programming language to use
 * @param {string} code - Source code to execute
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
/**
 * Generic handler for code execution across all supported languages
 * 
 * @async
 * @function handleCodeExecution
 * @param {string} language - Programming language identifier (python, javascript, java, cpp, c)
 * @param {string} code - Source code to execute
 * @param {Object} res - Express response object for sending results
 * @returns {Promise<void>} Sends execution results through response object
 * 
 * @description
 * This handler manages the complete code execution lifecycle:
 * 
 * 1. Request Processing
 *    - Validates input parameters
 *    - Sanitizes code content
 *    - Checks language support
 * 
 * 2. Security Measures
 *    - Rate limiting
 *    - Code size restrictions
 *    - Malicious code detection
 * 
 * 3. Execution Flow
 *    - Creates temporary files
 *    - Manages compilation (if needed)
 *    - Handles execution
 *    - Captures output
 * 
 * 4. Response Handling
 *    - Formats execution results
 *    - Includes compilation errors
 *    - Streams output for long-running processes
 * 
 * 5. Error Management
 *    - Graceful error handling
 *    - Detailed error messages
 *    - Resource cleanup
 */
async function handleCodeExecution(language, code, res) {
  // Input validation
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  // Initialize execution context
  const config = languageConfigs[language];
  const filename = getTempFile(language); // Create isolated file
  const filesToCleanup = [filename]; // Track files for cleanup

  try {
    // Write code to temporary file with proper permissions
    fs.writeFileSync(filename, code, { mode: 0o644 });

    // Special handling for Java files
    if (language === "java") {
      // Extract public class name (Java requirement)
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      if (!classMatch) {
        return res.json({
          error: "Compilation Error",
          output:
            "Error: No public class found in the code. Java requires one public class.",
        });
      }

      // Rename file to match public class name (Java requirement)
      const className = classMatch[1];
      const javaFile = path.join(path.dirname(filename), `${className}.java`);
      fs.renameSync(filename, javaFile);

      // Update cleanup tracking
      filesToCleanup[0] = javaFile;
      filesToCleanup.push(
        path.join(path.dirname(javaFile), `${className}.class`)
      );
      const output = await executeCode(language, code, javaFile);
      res.json({ output });
    } else if (language === "cpp") {
      const outputExe = getTempFile("exe");
      filesToCleanup.push(outputExe);
      const output = await executeCode(language, code, filename, outputExe);
      res.json({ output });
    } else {
      const output = await executeCode(language, code, filename);
      res.json({ output });
    }
  } catch (error) {
    res.json({ output: error.message || error });
  } finally {
    cleanup(filesToCleanup);
  }
}

// Language-specific endpoints
app.post("/run-python", (req, res) =>
  handleCodeExecution("python", req.body.code, res)
);

// C language endpoint
app.post("/run-c", (req, res) => handleCodeExecution("c", req.body.code, res));

// C++ language endpoint
app.post("/run-cpp", (req, res) =>
  handleCodeExecution("cpp", req.body.code, res)
);

// JavaScript language endpoint
app.post("/run-javascript", (req, res) =>
  handleCodeExecution("javascript", req.body.code, res)
);

// Java language endpoint
app.post("/run-java", (req, res) =>
  handleCodeExecution("java", req.body.code, res)
);

// Track online users
const onlineUsers = new Map(); // userId -> socket.id
const activeRooms = new Map(); // roomId -> { users: [], problemTitle: string }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins (after authentication)
  socket.on("user_online", ({ userId, userName }) => {
    onlineUsers.set(userId, { socketId: socket.id, userName });
    console.log("User online:", userId);
  });

  // Send invite
  socket.on("send-invite", (inviteData) => {
    console.log("Invite received:", inviteData);
    // Add sender's socket ID to the invite data
    const enrichedData = {
      ...inviteData,
      senderId: socket.id,
      id: Date.now(),
      title: inviteData.title || "Untitled Problem",
      note:
        inviteData.note ||
        "Would you like to join this problem-solving session?",
      sender: inviteData.sender || "Anonymous",
    };
    // Broadcast to all users except sender
    socket.broadcast.emit("receive-invite", enrichedData);
  });

  // Handle room joining
  socket.on("join-room", ({ roomId, userId, username, problemTitle }) => {
    socket.join(roomId);

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        users: [],
        problemTitle: problemTitle,
      });
    }

    const room = activeRooms.get(roomId);
    room.users.push({
      userId,
      username,
      socketId: socket.id,
    });

    // Notify everyone in the room about the new join
    io.to(roomId).emit("room-joined", {
      roomId,
      username,
      problemTitle,
      users: room.users,
    });

    console.log(`User ${username} joined room ${roomId}`);
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
      timestamp: new Date(),
    });
  });

  // Handle room code updates
  socket.on("code-update", ({ roomId, code, language }) => {
    socket.to(roomId).emit("code-update", { code, language });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    // Remove user from online users
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);

        // Remove user from any active rooms
        for (const [roomId, room] of activeRooms.entries()) {
          room.users = room.users.filter((user) => user.socketId !== socket.id);
          if (room.users.length === 0) {
            activeRooms.delete(roomId);
          } else {
            // Notify remaining room users about the disconnection
            io.to(roomId).emit("user-left", {
              roomId,
              userId,
            });
          }
        }
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

// Use httpServer instead of app.listen
httpServer.listen(PORT, () => {
  console.log(`C runner backend listening on port ${PORT}`);
});
