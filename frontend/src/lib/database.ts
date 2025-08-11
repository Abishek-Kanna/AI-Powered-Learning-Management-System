// src/lib/database.ts
interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In production, this should be hashed
  role: "student" | "teacher";
  createdAt: string;
}

class UserDatabase {
  private static readonly USERS_KEY = "ai_learning_users_db";

  static getUsers(): User[] {
    try {
      const users = localStorage.getItem(this.USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error("Error reading users from localStorage:", error);
      return [];
    }
  }

  static saveUsers(users: User[]): void {
    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error("Error saving users to localStorage:", error);
    }
  }

  static findUserByUsername(username: string): User | undefined {
  const users = this.getUsers();
  const trimmedUsername = username.trim(); // Trim the input
  return users.find(user => user.username.trim() === trimmedUsername); // Trim stored usernames too
}

static findUserByEmail(email: string): User | undefined {
  const users = this.getUsers();
  const trimmedEmail = email.trim(); // Trim the input
  return users.find(user => user.email.trim() === trimmedEmail); // Trim stored emails too
}

  static createUser(userData: Omit<User, "id" | "createdAt">): User {
    const users = this.getUsers();
    const newUser: User = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    this.saveUsers(users);
    console.log("User created:", newUser); // Debug log
    return newUser;
  }

  static validatePassword(username: string, password: string): boolean {
    const user = this.findUserByUsername(username);
    const isValid = user ? user.password === password : false;
    console.log("Password validation:", { username, password, user, isValid }); // Debug log
    return isValid;
  }

  // Helper method to see all users (for debugging)
  static debugUsers(): void {
    console.log("Current users in database:", this.getUsers());
  }
}

export { UserDatabase, type User };