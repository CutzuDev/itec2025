"use client";
import { Button } from "@/components/ui/button";
import { testInsertAction } from "@/app/actions";
import { useState } from "react";

function TestButton() {
  const [result, setResult] = useState<string | null>(null);

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
      <Button onClick={test}>Insert Test User</Button>
      {result && (
        <div className="mt-2 p-2 border rounded bg-muted">{result}</div>
      )}
    </div>
  );
}

export default TestButton;
