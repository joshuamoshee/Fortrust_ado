"use client";

import { useState, useEffect } from "react";
import { Users, UploadCloud, FileText, Plus, CheckCircle2, UserCircle } from "lucide-react";

export default function AgentPipeline() {
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("pipeline"); // 'pipeline' | 'add_student' | 'bulk_upload'
  
  // User Data
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");

  // Student Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [reportCards, setReportCards] = useState<FileList | null>(null);
  const [psychTests, setPsychTests] = useState<FileList | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Get the logged-in agent's details from the token
    const token = localStorage.getItem("fortrust_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAgentName(payload.name || "Agent");
        setAgentRole(payload.role || "Agent");
        fetchMyStudents(payload.name);
      } catch (e) {
        console.error("Invalid token");
      }
    }
  }, []);

  const fetchMyStudents = async (agentName: string) => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=AGENT&agent_code=${agentName}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setStudents(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", wa);
    formData.append("assignee", agentName); // Automatically assigns to the logged-in agent!
    
    // Append Files securely
    if (reportCards) {
      for (let i = 0; i < reportCards.length; i++) {
        formData.append("report_cards", reportCards[i]);
      }
    }
    if (psychTests) {
      for (let i = 0; i < psychTests.length; i++) {
        formData.append("psych_tests", psychTests[i]);
      }
    }

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      
      const data = await res.json();
      if (data.status === "success") {
        alert("Student and documents securely uploaded to Cloud Vault!");
        // Reset Form
        setName(""); setEmail(""); setWa(""); setReportCards(null); setPsychTests(null);
        setActiveTab("pipeline");
        fetchMyStudents(agentName);
      } else {
        alert("Upload failed. Please try again.");
      }
    } catch (error) {
      alert("Network error during upload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <UserCircle size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#282860]">My Pipeline</h1>
            <p className="text-slate-500 text-sm mt-1">{agentName} | {agentRole}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab("pipeline")} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'pipeline' ? 'bg-[#282860] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>My Students</button>
          <button onClick={() => setActiveTab("add_student")} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'add_student' ? 'bg-[#BAD133] text-[#282860]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Plus size={16}/> Add Student Data</button>
          <button onClick={() => setActiveTab("bulk_upload")} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'bulk_upload' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><UploadCloud size={16}/> Bulk Upload</button>
        </div>
      </div>

      {/* VIEW 1: MANUAL ADD FORM WITH DOCUMENT UPLOADS */}
      {activeTab === "add_student" && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-[#282860] mb-6 flex items-center gap-2"><FileText className="text-[#BAD133]"/> Add New Student</h2>
          
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-bold text-slate-600">Student Name</label><input required value={name} onChange={(e)=>setName(e.target.value)} type="text" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" /></div>
              <div><label className="text-sm font-bold text-slate-600">Email Address</label><input required value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" /></div>
              <div className="md:col-span-2"><label className="text-sm font-bold text-slate-600">WhatsApp Number</label><input value={wa} onChange={(e)=>setWa(e.target.value)} type="tel" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" /></div>
            </div>

            {/* SECURE DOCUMENT UPLOADERS */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800">Required Documents (Optional but Recommended)</h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-300">
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Report Card & High School Certificate (.pdf, .jpg)</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setReportCards(e.target.files)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#282860] file:text-white hover:file:bg-[#1a1a40] cursor-pointer"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-300">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Profiling Test / Psychological Test (.pdf)</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf"
                  onChange={(e) => setPsychTests(e.target.files)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#BAD133] file:text-[#282860] hover:file:bg-[#a3b827] cursor-pointer"
                />
              </div>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full bg-[#282860] hover:bg-[#1a1a40] text-white font-bold py-4 rounded-xl mt-4 transition-colors">
              {isSubmitting ? "Uploading Securely to Vault..." : "Save Student & Upload Documents"}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: PIPELINE */}
      {activeTab === "pipeline" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-500 text-sm">Student</th>
                <th className="p-4 font-bold text-slate-500 text-sm">Contact</th>
                <th className="p-4 font-bold text-slate-500 text-sm">Status</th>
                <th className="p-4 font-bold text-slate-500 text-sm">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No students in your pipeline yet.</td></tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{student.name}</td>
                    <td className="p-4 text-sm text-slate-600">{student.email}<br/><span className="text-xs text-slate-400">WA: {student.phone}</span></td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">{student.status || "NEW LEAD"}</span>
                    </td>
                    <td className="p-4">
                      {student.documents && student.documents.length > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <CheckCircle2 size={14} /> {student.documents.length} Files
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No files</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 3: BULK UPLOAD (Placeholder for next step) */}
      {activeTab === "bulk_upload" && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-2xl mx-auto">
           <UploadCloud className="mx-auto h-16 w-16 text-blue-500 mb-4" />
           <h2 className="text-xl font-bold text-slate-800">Bulk Upload Students</h2>
           <p className="text-slate-500 text-sm mt-2 mb-8">Upload an Excel/CSV file to instantly add multiple students to your pipeline.</p>
           <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">
              Select CSV File
           </button>
        </div>
      )}

    </div>
  );
}