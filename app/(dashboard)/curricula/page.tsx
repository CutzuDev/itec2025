"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

type Curriculum = {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  created_at: string;
};

export default function CurriculaPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<Curriculum | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCurricula = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to view your curricula");
      }

      // Fetch curricula created by the current user
      const { data, error: fetchError } = await supabase
        .from("curricula")
        .select("id, title, content, summary, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch curricula: ${fetchError.message}`);
      }

      setCurricula(data || []);
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurricula();
  }, [supabase]);

  const handleDeleteCurriculum = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);
      setSuccessMessage(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to delete curricula");
      }

      // Delete the curriculum
      const { error: deleteError } = await supabase
        .from("curricula")
        .delete()
        .eq("id", id)
        .eq("creator_id", user.id); // Ensure only creator can delete

      if (deleteError) {
        throw new Error(`Failed to delete: ${deleteError.message}`);
      }

      // Refresh the curricula list
      setSuccessMessage("Curriculum deleted successfully");

      // If the deleted curriculum was selected, unselect it
      if (selectedCurriculum?.id === id) {
        setSelectedCurriculum(null);
      }

      // Update the curricula list by removing the deleted item
      setCurricula(curricula.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        `Error deleting curriculum: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDownload = (curriculum: Curriculum) => {
    try {
      // Convert base64 string to binary
      const binaryString = atob(curriculum.content);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download link
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${curriculum.title}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        `Failed to download PDF: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="w-full p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Curricula</h1>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">Loading your curricula...</div>
        ) : curricula.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              You haven't created any curricula yet.
            </p>
            <Button onClick={() => (window.location.href = "/summaries")}>
              Create New Curriculum
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {curricula.map((curriculum) => (
              <Card key={curriculum.id} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="truncate">
                        {curriculum.title}
                      </CardTitle>
                      <CardDescription>
                        Created on {formatDate(curriculum.created_at)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(curriculum.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex space-x-2 mb-4">
                    <Button
                      onClick={() => handleDownload(curriculum)}
                      variant="outline"
                      size="sm"
                    >
                      Download PDF
                    </Button>
                    <Button
                      onClick={() =>
                        setSelectedCurriculum(
                          selectedCurriculum?.id === curriculum.id
                            ? null
                            : curriculum
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      {selectedCurriculum?.id === curriculum.id
                        ? "Hide Summary"
                        : "View Summary"}
                    </Button>
                  </div>

                  {selectedCurriculum?.id === curriculum.id && (
                    <div className="bg-gray-50 p-4 rounded-md max-h-80 overflow-y-auto">
                      {curriculum.summary ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: curriculum.summary,
                          }}
                        />
                      ) : (
                        <p className="text-gray-500 italic">
                          No summary available
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this curriculum?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              curriculum and its associated PDF content and summary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && handleDeleteCurriculum(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
