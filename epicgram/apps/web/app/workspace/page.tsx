import { redirect } from "next/navigation";

// /workspace — алиас на /client.
export default function WorkspacePage() {
  redirect("/client");
}
