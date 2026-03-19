"use client"; 

import { useEffect, useState } from "react";

export default function Home() {
  // 1. Set up our "Variables" to hold the Python data
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Tell React to fetch data from Python the second the page loads
  useEffect(() => {
    // We are logging in as MASTER_ADMIN for this test
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

  // 3. The UI (This is HTML supercharged with Tailwind CSS)
  return (
    <main className="min-h-screen bg-gray-50 p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          Fortrust OS
        </h1>
        <p className="text-gray-500 mb-8">Master Admin Pipeline</p>

        {loading ? (
          <div className="text-blue-600 font-semibold animate-pulse">
            Loading data from Python AI Server...
          </div>
        ) : (
          <div className="grid gap-4">
            {/* 4. Loop through the students and draw a card for each one */}
            {students.length === 0 ? (
              <p className="text-gray-500">No students found in database.</p>
            ) : (
              students.map((student) => (
                <div 
                  key={student.id} 
                  className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">{student.email} • {student.phone}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase rounded-full tracking-wider">
                      {student.status}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    Assigned to: <span className="font-medium text-gray-700">{student.assigned_to || "Unassigned"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}