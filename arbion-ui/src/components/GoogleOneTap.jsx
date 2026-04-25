import { useEffect } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL;

export default function GoogleOneTap({ onSuccess }) {
  useEffect(() => {
    // Load Google script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
        cancel_on_tap_outside: false,
      });

      // Render the One Tap prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log("One Tap not displayed:", notification.getNotDisplayedReason());
        }
        if (notification.isSkippedMoment()) {
          console.log("One Tap skipped:", notification.getSkippedReason());
        }
      });
    };

    return () => {
      document.body.removeChild(script);
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const res = await fetch(`${API_URL}/api/google-auth/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Google auth failed:", data.error);
        return;
      }

      // Store tokens
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Notify parent
      if (onSuccess) onSuccess(data.user);

    } catch (err) {
      console.error("Google One Tap error:", err);
    }
  };

  return null; // One Tap renders its own UI
}