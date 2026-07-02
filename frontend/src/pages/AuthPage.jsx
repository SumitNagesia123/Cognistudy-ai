import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, UserPlus, Lock, Mail, User, Brain } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) return;

    setLoading(true);
    setErrorMsg("");
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left panel — indigo brand */}
      <div className="auth-brand">
        <div className="auth-brand__logo">
          <div className="auth-brand__logo-icon">
            <Brain size={28} />
          </div>
          <span className="auth-brand__name">CogniStudy AI</span>
        </div>
        <h1 className="auth-brand__tagline">
          Your Intelligent AI Study Companion
        </h1>
        <p className="auth-brand__sub">
          Upload lectures, generate high-fidelity flashcards, refine study notes, and chat with local PDF files.
        </p>

        <div className="auth-brand__features">
          <div className="auth-brand__feature">
            <div className="auth-brand__feature-dot" />
            <span>AI-grounded PDF chat & citations</span>
          </div>
          <div className="auth-brand__feature">
            <div className="auth-brand__feature-dot" />
            <span>3D interactive active-recall flashcards</span>
          </div>
          <div className="auth-brand__feature">
            <div className="auth-brand__feature-dot" />
            <span>Structured note summarization & storage</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>
            {isLogin
              ? "Sign in to access your library, flashcards and study notes"
              : "Get started by building your personalized AI workspace"}
          </p>

          {errorMsg && (
            <div className="auth-error">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-col">
            {!isLogin && (
              <div className="auth-field">
                <label>Full Name</label>
                <div className="auth-field-wrap">
                  <User size={16} className="auth-field-icon" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-field-wrap">
                <Mail size={16} className="auth-field-icon" />
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-field-wrap">
                <Lock size={16} className="auth-field-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} />
              ) : isLogin ? (
                <>
                  <LogIn size={16} /> Sign In
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Create Account
                </>
              )}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? "New to CogniStudy?" : "Already have an account?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
