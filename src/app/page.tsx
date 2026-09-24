import { connection } from "next/server";
import TodoApp from "@/components/TodoApp";
import { isAIConfigured } from "@/lib/ai";
import { listTodos } from "@/lib/todos";

export default async function Home() {
  // Render per request so the list always reflects the database.
  await connection();
  return <TodoApp initialTodos={listTodos()} aiEnabled={isAIConfigured()} />;
}
