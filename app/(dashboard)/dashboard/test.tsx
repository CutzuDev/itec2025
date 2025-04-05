"use client";
import { Button } from "@/components/ui/button";
import { testInsertAction } from "@/app/actions";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

async function TestButton() {
  const [result, setResult] = useState<string | null>(null);
  const supabase = createClient();
  const { data: {user} } = await supabase.auth.getUser();
  async function test() {
    try {
      const response = await testInsertAction();
      if (response.success) {
        setResult("Insert successful!");
      } else {
        setResult(`Error: ${response.error}`);
      }
    } catch (err) {
      setResult(`Exception: ${err}`);
      console.error(err);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <span>{user?.user_metadata.name}</span>
      <Button onClick={test}>Insert Test User</Button>
      {result && (
        <div className="mt-2 p-2 border rounded bg-muted">{result}</div>
      )}
    </div>
  );
}

export default TestButton;
