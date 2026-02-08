import { redirect } from "next/navigation";

export default function Home() {
  // TODO: Check if user is logged in (locked in)
  // If logged in, redirect to dashboard instead
  // For now, redirect everyone to login
  redirect("/Routes");
}
