"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import XLSX from "xlsx-js-style";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSafeSrc(src: string | null | undefined) {
  return src && src.trim().length > 0 ? src : undefined;
}

interface Assignment {
  id: string;
  training_type: string;
  training_details: string | null;
  target_date: string;
  assigned_date: string;
  status: "pending" | "completed" | "missed";
  user: {
    id: string;
    username: string;
    profile_photo: string | null;
  };
}

const TRAINING_TYPES = [
  "EASY RUN ZONA 2",
  "EASY RUN (EZ)",
  "MEDIUM RUN (SPEED)",
  "LONGRUN",
  "FARTLEK RUN (SPEED)",
  "INTERVAL RUN (SPEED)",
  "RACE",
  "STRENGHT SESSION",
];

type FilterStatus = "all" | "pending" | "completed" | "missed";

export default function ActiveAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendAssignment, setResendAssignment] = useState<Assignment | null>(
    null,
  );
  const [newTargetDate, setNewTargetDate] = useState(getLocalDateString());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  useEffect(() => {
    if (user && assignments.length > 0) {
      const checkMissedAssignments = () => {
        const today = getLocalDateString();
        let hasUpdates = false;

        const updatedAssignments = assignments.map((assignment) => {
          if (
            assignment.status === "pending" &&
            assignment.target_date < today
          ) {
            hasUpdates = true;
            return { ...assignment, status: "missed" as const };
          }
          return assignment;
        });

        if (hasUpdates) {
          setAssignments(updatedAssignments);
          updateMissedStatusInDB();
        }
      };

      checkMissedAssignments();
    }
  }, [assignments, user]);

  const updateMissedStatusInDB = async () => {
    if (!user) return;
    const today = getLocalDateString();

    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today);
  };

  const fetchAssignments = async () => {
    if (!user) return;

    const today = getLocalDateString();

    await supabase
      .from("training_assignments")
      .update({ status: "missed" })
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .lt("target_date", today);

    const { data } = await supabase
      .from("training_assignments")
      .select(
        `
        id,
        training_type,
        training_details,
        target_date,
        assigned_date,
        status,
        users:user_id (
          id,
          username,
          profile_photo
        )
      `,
      )
      .eq("coach_id", user.id)
      .order("target_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      const formattedData = data.map((item: any) => ({
        id: item.id,
        training_type: item.training_type,
        training_details: item.training_details,
        target_date: item.target_date,
        assigned_date: item.assigned_date,
        status: item.status,
        user: item.users,
      }));
      setAssignments(formattedData);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border border-green-200";
      case "missed":
        return "text-red-600 bg-red-50 border border-red-200";
      default:
        return "text-blue-600 bg-blue-50 border border-blue-200";
    }
  };

  const getFilterButtonStyle = (filterType: FilterStatus) => {
    const baseStyle =
      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2";

    if (activeFilter === filterType) {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-600 text-white shadow-sm`;
        case "missed":
          return `${baseStyle} bg-red-600 text-white shadow-sm`;
        case "pending":
          return `${baseStyle} bg-blue-600 text-white shadow-sm`;
        default:
          return `${baseStyle} bg-strava text-white shadow-sm`;
      }
    } else {
      switch (filterType) {
        case "completed":
          return `${baseStyle} bg-green-50 text-green-600 hover:bg-green-100 border border-green-200`;
        case "missed":
          return `${baseStyle} bg-red-50 text-red-600 hover:bg-red-100 border border-red-200`;
        case "pending":
          return `${baseStyle} bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200`;
        default:
          return `${baseStyle} bg-white text-gray-600 hover:bg-gray-50 border border-gray-200`;
      }
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (activeFilter === "all") return true;
    return assignment.status === activeFilter;
  });

  const getStatusCount = (status: FilterStatus) => {
    if (status === "all") return assignments.length;
    return assignments.filter((a) => a.status === status).length;
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Yakin mau HAPUS data?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("training_assignments")
      .delete()
      .eq("id", id);

    if (!error) {
      setAssignments((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleResend = async () => {
    if (!resendAssignment || !newTargetDate) return;

    const { error } = await supabase
      .from("training_assignments")
      .update({
        assigned_date: getLocalDateString(),
        target_date: newTargetDate,
        status: "pending",
      })
      .eq("id", resendAssignment.id);

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === resendAssignment.id
            ? {
                ...a,
                assigned_date: getLocalDateString(),
                target_date: newTargetDate,
                status: "pending",
              }
            : a,
        ),
      );
      setResendDialogOpen(false);
      setResendAssignment(null);
    }
  };

  const handleExportReport = async () => {
    if (!user) return;

    const [
      { data: usersData, error: usersError },
      { data: reportData, error: reportError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id, username, role")
        .eq("role", "user")
        .order("username", { ascending: true }),
      supabase
        .from("training_assignments")
        .select("user_id, training_type, status")
        .eq("coach_id", user.id),
    ]);

    if (usersError || reportError) return;

    const athletes =
      (usersData || []).filter(
        (athlete: any) =>
          athlete.username &&
          athlete.username.trim().toUpperCase() !== "#BOT_TESTER",
      ) || [];

    if (athletes.length === 0) return;

    const athleteIds = new Set(athletes.map((athlete: any) => athlete.id));
    const missedCountMap = new Map<string, Record<string, number>>();

    (reportData || []).forEach((item: any) => {
      if (!athleteIds.has(item.user_id)) return;

      const normalizedType = String(item.training_type || "").toUpperCase();
      if (
        !TRAINING_TYPES.includes(
          normalizedType as (typeof TRAINING_TYPES)[number],
        )
      ) {
        return;
      }

      if (!missedCountMap.has(item.user_id)) {
        missedCountMap.set(item.user_id, {});
      }

      if (item.status === "missed") {
        const userCounts = missedCountMap.get(item.user_id)!;
        userCounts[normalizedType] = (userCounts[normalizedType] || 0) + 1;
      }
    });

    const wsData: Array<Array<string | number>> = [
      ["MTR TRAINING REPORT"],
      [
        "Athlete",
        "TRAINING MENU",
        ...Array(TRAINING_TYPES.length - 1).fill(""),
        "TOTAL",
      ],
      ["", ...TRAINING_TYPES, ""],
    ];

    athletes.forEach((athlete: any) => {
      const userCounts = missedCountMap.get(athlete.id) || {};
      let totalMissed = 0;

      const row: Array<string | number> = [athlete.username];

      TRAINING_TYPES.forEach((type) => {
        const missedCount = userCounts[type] || 0;
        totalMissed += missedCount;
        row.push(missedCount > 0 ? missedCount : "-");
      });

      row.push(totalMissed);
      wsData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const lastTrainingTypeColumn = TRAINING_TYPES.length;
    const totalColumn = TRAINING_TYPES.length + 1;

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumn } },
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: lastTrainingTypeColumn } },
      { s: { r: 1, c: totalColumn }, e: { r: 2, c: totalColumn } },
    ];

    ws["!cols"] = [
      { wch: 18 },
      ...TRAINING_TYPES.map((type) => ({ wch: Math.max(type.length + 4, 16) })),
      { wch: 10 },
    ];

    ws["!rows"] = [
      { hpt: 30 },
      { hpt: 24 },
      { hpt: 24 },
      ...athletes.map(() => ({ hpt: 22 })),
    ];

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;

        ws[cellAddress].s = {
          font: { sz: 10, name: "Arial" },
          alignment: { vertical: "center", horizontal: "center" },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "medium", color: { rgb: "000000" } },
            right: { style: "medium", color: { rgb: "000000" } },
          },
        };

        if (R === 0) {
          ws[cellAddress].s.font = {
            bold: true,
            sz: 18,
            color: { rgb: "000000" },
            name: "Arial",
          };
          ws[cellAddress].s.border = {
            top: { style: "none" },
            bottom: { style: "none" },
            left: { style: "none" },
            right: { style: "none" },
          };
        }

        if (R === 1) {
          ws[cellAddress].s.font = {
            bold: true,
            sz: 11,
            color: { rgb: "000000" },
            name: "Arial",
          };
          ws[cellAddress].s.fill = { fgColor: { rgb: "58A9E0" } };
        }

        if (R === 2) {
          ws[cellAddress].s.font = {
            bold: true,
            sz: 10,
            color: { rgb: "000000" },
            name: "Arial",
          };
          ws[cellAddress].s.fill = { fgColor: { rgb: "DCEAF8" } };
        }

        if (R >= 3) {
          if (C === 0) {
            ws[cellAddress].s.alignment.horizontal = "left";
            ws[cellAddress].s.font = { sz: 10, name: "Arial" };
          }

          if (C === totalColumn) {
            ws[cellAddress].s.font = { bold: true, sz: 10, name: "Arial" };
          }

          const val = ws[cellAddress].v;
          if (typeof val === "number" && val > 0 && C > 0) {
            ws[cellAddress].s.fill = { fgColor: { rgb: "F4C2C8" } };
            ws[cellAddress].s.font.color = { rgb: "9C0006" };
          } else if (val === "-") {
            ws[cellAddress].s.font.color = { rgb: "666666" };
          }
        }
      }
    }

    try {
      XLSX.utils.book_append_sheet(wb, ws, "Missed Summary");
      XLSX.writeFile(
        wb,
        `MTR_Missed_Summary_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-strava">
            Active Assignments
          </h1>
          <div className="text-center py-8 text-strava">
            Loading assignments...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-strava leading-tight">
                Logs Training Menu
              </h1>
              <p className="text-[10px] md:text-sm text-gray-500 uppercase tracking-widest">
                weekly training status
              </p>
            </div>
            <Button
              onClick={handleExportReport}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] md:text-sm h-7 px-3 flex items-center gap-1 font-bold rounded-md ml-11"
            >
              <Download className="h-3 w-3" />
              REPORT
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`${getFilterButtonStyle("all")} !py-1 !px-2 !text-[11px] md:text-base`}
            >
              <span>All ({getStatusCount("all")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`${getFilterButtonStyle("pending")} !py-1 !px-2 !text-[11px] md:text-base`}
            >
              <span>Pending ({getStatusCount("pending")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={`${getFilterButtonStyle("completed")} !py-1 !px-2 !text-[11px] md:text-base`}
            >
              <span>Completed ({getStatusCount("completed")})</span>
            </button>
            <button
              onClick={() => setActiveFilter("missed")}
              className={`${getFilterButtonStyle("missed")} !py-1 !px-2 !text-[11px] md:text-base`}
            >
              <span>Missed ({getStatusCount("missed")})</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 mb-2 pb-1">
            <h2 className="text-[10px] md:text-sm font-bold text-gray-900 uppercase tracking-widest leading-none">
              {activeFilter === "all"
                ? "Assignment List"
                : `${activeFilter} List`}
              <span className="text-gray-500 ml-2 font-normal">
                ({filteredAssignments.length})
              </span>
            </h2>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-12 text-center">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-xs">
                {activeFilter === "all"
                  ? "No assignments found"
                  : `No ${activeFilter} assignments`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white border border-gray-200 rounded-xl p-2.5 transition-all hover:border-strava/30 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar className="h-7 w-7 border border-gray-100">
                        <AvatarImage
                          src={
                            getSafeSrc(assignment.user.profile_photo) ||
                            "/placeholder.svg"
                          }
                        />
                        <AvatarFallback className="bg-strava text-white text-[9px] md:text-sm">
                          {assignment.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-[11px] md:text-base truncate leading-tight">
                          {assignment.user.username}
                        </p>
                        <p className="text-[9px] md:text-sm text-strava truncate leading-tight">
                          {assignment.training_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        className={`px-2 py-0.5 rounded-full text-[8px] md:text-xs font-bold uppercase tracking-tighter ${getStatusColor(assignment.status)}`}
                      >
                        {assignment.status}
                      </div>
                    </div>

                    <div className="space-y-0.5 mb-1.5">
                      <div className="flex justify-between items-center text-[9px] md:text-sm">
                        <span className="text-gray-500">Target</span>
                        <span className="font-bold text-gray-900">
                          {new Date(assignment.target_date).toLocaleDateString(
                            undefined,
                            { day: "2-digit", month: "short" },
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] md:text-xs">
                        <span className="text-gray-500">Assigned</span>
                        <span className="text-gray-400 italic">
                          {new Date(
                            assignment.assigned_date,
                          ).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-auto">
                    {assignment.training_details && (
                      <div className="mb-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-[9px] md:text-sm text-gray-500 leading-relaxed italic">
                          {assignment.training_details}
                        </p>
                      </div>
                    )}
                    {assignment.status === "missed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-6 text-[9px] md:text-sm rounded-lg font-bold border-strava text-strava hover:bg-strava hover:text-white transition-colors"
                        onClick={() => {
                          setResendAssignment(assignment);
                          setNewTargetDate(getLocalDateString());
                          setResendDialogOpen(true);
                        }}
                      >
                        <RefreshCw className="h-2.5 w-2.5 mr-1" />
                        Re-send
                      </Button>
                    )}

                    {assignment.status !== "completed" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-6 text-[9px] md:text-sm rounded-lg font-bold"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <AlertDialogContent className="bg-white border border-gray-200 text-gray-900 rounded-2xl max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-strava/10 rounded-full">
                <RefreshCw className="h-5 w-5 text-strava" />
              </div>
              <AlertDialogTitle className="text-strava font-bold">
                Re-send Training Menu
              </AlertDialogTitle>
            </div>
            <div className="text-gray-600 text-sm space-y-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p>
                  <span className="text-xs text-strava font-bold">
                    Athlete:
                  </span>{" "}
                  <span className="text-xs">
                    {resendAssignment?.user.username}
                  </span>
                </p>
                <p>
                  <span className="text-xs text-strava font-bold">Menu:</span>{" "}
                  <span className="text-xs">
                    {resendAssignment?.training_type}
                  </span>
                </p>
                <p>
                  <span className="text-xs text-strava font-bold">
                    Details:
                  </span>{" "}
                  <span className="text-xs">
                    {resendAssignment?.training_details}
                  </span>
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <Label
                  htmlFor="new_target_date"
                  className="text-strava text-xs font-bold"
                >
                  Set New Target Date
                </Label>
                <Input
                  id="new_target_date"
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="bg-white border-gray-200 text-gray-900 text-xs focus:border-strava focus:ring-strava"
                />
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel
              className="bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl text-xs h-9"
              onClick={() => {
                setResendDialogOpen(false);
                setResendAssignment(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResend}
              className="bg-strava hover:bg-strava-light text-white border-none rounded-xl text-xs h-9 font-bold"
            >
              Re-Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
