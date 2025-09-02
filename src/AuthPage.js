import React, { useState } from "react";

/**
 * AuthPage Component - Handles user authentication (login and signup)
 * @param {Function} onLogin - Callback function triggered after successful login
 * @param {Function} onSignup - Callback function triggered after successful signup
 * @param {Function} onForgot - Callback function triggered when user clicks "Forgot password"
 */
export default function AuthPage({ onLogin, onSignup, onForgot }) {
  // State management for form fields and UI
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  /**
   * Validates email format and domain
   * @param {string} email - Email address to validate
   * @returns {Object} Validation result with status and message
   */
  const validateEmail = (email) => {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Please enter a valid email address" };
    }

    // Gmail-specific validation
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return { isValid: false, message: "Please use a valid Gmail address" };
    }

    // Additional checks for common fake patterns
    const localPart = email.split('@')[0];
    if (localPart.length < 6) {
      return { isValid: false, message: "Email address is too short" };
    }
    if (/^[0-9]+$/.test(localPart)) {
      return { isValid: false, message: "Email cannot contain only numbers" };
    }
    if (/(.)\1{4,}/.test(localPart)) {
      return { isValid: false, message: "Invalid email pattern detected" };
    }

    return { isValid: true, message: "" };
  };

  /**
   * Handles the login form submission
   * @param {Event} e - Form submission event
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Validate email before submission
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      return;
    }

    try {
      // Send login request to backend
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      // Handle response based on success/failure
      if (response.ok && data.success) {
        setError("");
        onLogin();
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  /**
   * Handles the signup form submission
   * @param {Event} e - Form submission event
   */
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // Validate email before registration
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }
    if (!/[!@#$%^&*]/.test(password)) {
      setError("Password must contain at least one special character (!@#$%^&*)");
      return;
    }

    try {
      // Send registration request to backend
      const response = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      // Handle registration response
      if (response.ok) {
        setIsSignup(false);
        onSignup && onSignup();
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        className="bg-white p-8 rounded-lg shadow-md w-[25rem]"
        onSubmit={isSignup ? handleSignup : handleLogin}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignup ? "Create Account" : "Sign In"}
        </h2>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Gmail</label>
          <input
            type="email"
            className={`border w-full p-2 rounded ${
              email && !validateEmail(email).isValid
                ? "border-red-500"
                : email && validateEmail(email).isValid
                ? "border-green-500"
                : ""
            }`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (e.target.value) {
                const validation = validateEmail(e.target.value);
                if (!validation.isValid) {
                  setError(validation.message);
                } else {
                  setError("");
                }
              }
            }}
            placeholder="Enter your Gmail"
            required
          />
          {email && !validateEmail(email).isValid && (
            <p className="text-xs text-red-500 mt-1">{validateEmail(email).message}</p>
          )}
          {email && validateEmail(email).isValid && (
            <p className="text-xs text-green-500 mt-1">Valid Gmail address</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Password</label>
          <input
            type="password"
            className="border w-full p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <button
          type="submit"
          className="bg-gray-700 text-white w-full py-2 rounded font-bold mb-3"
        >
          {isSignup ? "Sign Up" : "Login"}
        </button>
        <div className="flex justify-between text-sm">
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup
              ? "Already have an account? Sign In"
              : "Create new account"}
          </button>
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={onForgot}
          >
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  );
}
