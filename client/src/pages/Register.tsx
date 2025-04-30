import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to the new auth page
    setLocation("/auth");
  }, [setLocation]);
  
  return null;
}
