"use client"; 

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function PipelinePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/pipeline?role=MASTER_ADMIN")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setStudents(data.data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error talking to Python:", error);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("hot")) return "destructive";
    if (s.includes("warm") || s.includes("contacted")) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and track your student pipeline prospects.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Add New Lead
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-blue-600 font-medium animate-pulse">
            Syncing with Python AI Server...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <h3 className="text-lg font-medium text-gray-900">No leads found</h3>
            <p className="mt-1">Your database is currently empty.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>STUDENT PROFILE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>ASSIGNED TO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.phone} • {student.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(student.status) as any} className="uppercase text-[10px] tracking-wider">
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {student.assigned_to || "Unassigned"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}