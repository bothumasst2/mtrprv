"use client";

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
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

interface User {
  id: string;
  username: string;
  email: string;
}

const TRAINING_TYPES = [
  "EASY RUN ZONA 2",
  "LONGRUN",
  "MEDIUM RUN (SPEED)",
  "EASY RUN (EZ)",
  "STRENGHT SESSION",
  "FARTLEK RUN (SPEED)",
  "INTERVAL RUN (SPEED)",
  "RACE",
];

export default function CoachTrainingMenuPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    training_type: "",
    training_details: "",
    target_date: getLocalDateString(),
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("role", "user")
      .order("username", { ascending: true });
    setUsers(data || []);
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedUsers.length === 0) return;

    setLoading(true);
    setSuccess(false);

    const assignments = selectedUsers.map((userId) => ({
      coach_id: user.id,
      user_id: userId,
      training_type: formData.training_type,
      training_details: formData.training_details,
      assigned_date: getLocalDateString(),
      target_date: formData.target_date,
      status: "pending",
    }));

    const { error } = await supabase
      .from("training_assignments")
      .insert(assignments);

    if (!error) {
      setSuccess(true);
      setSuccessCount(selectedUsers.length);
      setSelectedUsers([]);
      setFormData({
        training_type: "",
        training_details: "",
        target_date: getLocalDateString(),
      });
    }

    setLoading(false);
  };

  const isFormValid =
    selectedUsers.length > 0 &&
    formData.training_type &&
    formData.target_date &&
    formData.training_details;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-strava">
            Training Menu
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-0">
            Assign training programs to your athletes
          </p>
        </div>

        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-md font-semibold text-strava flex items-center gap-2">
              <Plus className="h-5 w-5 text-strava" />
              Add Training Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 text-xs md:text-sm md:text-base font-bold uppercase tracking-wider">
                    Athletes ({selectedUsers.length} selected)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs md:text-sm md:text-base border-strava text-strava hover:bg-strava hover:text-white transition-colors"
                  >
                    {selectedUsers.length === users.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleUserToggle(u.id)}
                      className={`
                        px-4 py-2 rounded-full text-xs md:text-sm md:text-base font-medium transition-all duration-200
                        ${
                          selectedUsers.includes(u.id)
                            ? "bg-strava text-white border-strava shadow-sm"
                            : "bg-white border border-gray-300 text-gray-600 hover:border-strava/50 hover:text-strava"
                        }
                      `}
                    >
                      {u.username}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="training_type" className="text-gray-700 text-xs md:text-sm md:text-base font-bold uppercase tracking-wider">
                  Training Menu
                </Label>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          training_type: type,
                        }))
                      }
                      className={`
                        px-4 py-2 rounded-full text-xs md:text-sm md:text-base font-medium transition-all duration-200
                        ${
                          formData.training_type === type
                            ? "bg-strava text-white border-strava shadow-sm"
                            : "bg-white border border-gray-300 text-gray-600 hover:border-strava/50 hover:text-strava"
                        }
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_date" className="text-gray-700 text-xs md:text-sm md:text-base font-bold uppercase tracking-wider">
                  Target Date
                </Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      target_date: e.target.value,
                    }))
                  }
                  required
                  className="text-sm md:text-base bg-white border-gray-300 text-gray-900 focus:border-strava focus:ring-strava"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="training_details"
                  className="text-gray-700 text-xs md:text-sm md:text-base font-bold uppercase tracking-wider"
                >
                  Training Details
                </Label>
                <Textarea
                  id="training_details"
                  value={formData.training_details}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      training_details: e.target.value,
                    }))
                  }
                  placeholder="Enter specific instructions, distance, pace, etc."
                  rows={4}
                  className="text-sm md:text-base bg-white border-gray-300 text-gray-900 focus:border-strava"
                />
              </div>

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 text-sm md:text-base font-medium">
                    Training assignment sent to {successCount} athlete(s)
                    successfully!
                  </p>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={loading || !isFormValid}
                    className="text-xs md:text-sm md:text-base w-full bg-strava hover:bg-strava-light active:scale-95 transition-all duration-150 text-white font-bold h-10 rounded-xl"
                  >
                    <Send className="h-3 w-3 mr-2" />
                    {loading
                      ? "Sending..."
                      : `Send Training to ${selectedUsers.length} Athlete(s)`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white border border-gray-200 text-gray-900 rounded-2xl max-w-[90vw] sm:max-w-lg">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-strava/10 rounded-full">
                        <AlertCircle className="h-5 w-5 text-strava" />
                      </div>
                      <AlertDialogTitle className="text-strava font-bold">
                        Send Training to Athletes?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 text-sm md:text-base">
                      This will send the{" "}
                      <span className="text-strava font-bold">
                        {formData.training_type}
                      </span>{" "}
                      program to{" "}
                      <span className="text-strava font-bold">
                        {selectedUsers.length}
                      </span>{" "}
                      selected athlete(s), for{" "}
                      <span className="text-strava font-bold">
                        {new Date(formData.target_date).toLocaleDateString()}
                      </span>
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 mt-4">
                    <AlertDialogCancel className="bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl text-xs md:text-sm md:text-base h-9">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSubmit}
                      className="bg-strava hover:bg-strava-light text-white border-none rounded-xl text-xs md:text-sm md:text-base h-9 font-bold"
                    >
                      Send Now
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
