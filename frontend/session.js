export const Session = {
  set({ token, user }) {
    const sessionData = { token, user };
    window.currentUser = sessionData;
    sessionStorage.setItem("currentUser", JSON.stringify(sessionData));
  },

  get() {
    // Use memory first
    if (window.currentUser) return window.currentUser;

    // Fallback to sessionStorage
    const stored = sessionStorage.getItem("currentUser");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        window.currentUser = parsed;
        return parsed;
      } catch (e) {
        console.error("Failed to parse session data:", e);
        return null;
      }
    }

    return null;
  },

  token() {
    return this.get()?.token || null;
  },

  user() {
    return this.get()?.user || null;
  },

  clear() {
    window.currentUser = null;
    sessionStorage.removeItem("currentUser");
  },
};
