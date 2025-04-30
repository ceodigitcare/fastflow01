import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to the new auth page
    setLocation("/auth");
  }, [setLocation]);
  
  return null;
}
