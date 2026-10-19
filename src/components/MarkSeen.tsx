"use client";

import { useEffect } from "react";
import { markNotificationsSeen } from "@/app/actions";

/** Clears the unread badge a moment after the notifications page opens. */
export default function MarkSeen() {
  useEffect(() => {
    const t = setTimeout(() => void markNotificationsSeen(), 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
