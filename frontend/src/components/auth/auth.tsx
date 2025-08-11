import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

//================================================================
// 1. TYPE DEFINITIONS FROM AuthContext
//================================================================
type User = {
  id: string;
  username: string;
  role: 'student' | 'teacher';
  email: string;
};

type AuthResponse = {
  token: string;
  userId: string;
  role: 'student' | 'teacher';
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
};


//================================================================
// 2. CONTEXT CREATION & PROVIDER LOGIC FROM AuthContext
//================================================================
const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const decoded = jwtDecode(token) as { exp?: number };
          
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            navigate('/login');
            return;
          }

          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Authentication error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          navigate('/login');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [navigate]);

  const login = (authData: AuthResponse) => {
    const userData: User = {
      id: authData.userId,
      username: authData.username,
      role: authData.role,
      email: authData.email
    };
    
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    navigate(`/${authData.role}/dashboard`);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

//================================================================
// 3. CUSTOM HOOK DEFINITION FROM AuthContext
//================================================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


//================================================================
// 4. AUTH PAGE COMPONENT (now the default export)
//================================================================
export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "teacher" | "">("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth(); // This hook is now defined in the same file

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const trimmedUsername = loginUsername.trim();
    const trimmedPassword = loginPassword.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setLoginError("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // This call should now be completely error-free
      login({
        token: data.token,
        userId: data.userId,
        role: data.role,
        username: trimmedUsername,
        email: data.email || ""
      });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");

    const trimmedUsername = signupUsername.trim();
    const trimmedEmail = signupEmail.trim();
    const trimmedPassword = signupPassword.trim();
    const trimmedConfirmPassword = signupConfirmPassword.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPassword || !signupRole) {
      setSignupError("Please fill in all fields");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setSignupError("Passwords do not match");
      return;
    }

    if (trimmedPassword.length < 6) {
      setSignupError("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          password: trimmedPassword,
          role: signupRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSignupSuccess("Account created successfully! You can now log in.");
      setActiveTab("login");
      setSignupUsername("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      setSignupRole("");
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">
            AI Learning Platform
          </CardTitle>
        </CardHeader>

        <div className="px-6">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              className={`flex-1 py-3 text-center font-medium text-sm ${
                activeTab === "login"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 py-3 text-center font-medium text-sm ${
                activeTab === "signup"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("signup")}
            >
              Sign Up
            </button>
          </div>
        </div>

        {activeTab === "login" && (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">Welcome back!</h3>
                <p className="text-sm text-gray-500 mt-1">Please login to continue</p>
              </div>

              {loginError && (
                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
                  {loginError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    placeholder="Enter your username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={!loginUsername.trim() || !loginPassword.trim()}
              >
                Sign In
              </Button>
            </CardFooter>
          </form>
        )}

        {activeTab === "signup" && (
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4 pt-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">Create an account</h3>
                <p className="text-sm text-gray-500 mt-1">Sign up to get started</p>
              </div>

              {signupError && (
                <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
                  {signupError}
                </div>
              )}
              {signupSuccess && (
                <div className="text-green-500 text-sm p-3 bg-green-50 rounded-md">
                  {signupSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    placeholder="Choose a username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={signupRole === "student" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSignupRole("student")}
                    >
                      Student
                    </Button>
                    <Button
                      type="button"
                      variant={signupRole === "teacher" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSignupRole("teacher")}
                    >
                      Teacher
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !signupUsername.trim() ||
                  !signupEmail.trim() ||
                  !signupPassword.trim() ||
                  !signupRole
                }
              >
                Create Account
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}