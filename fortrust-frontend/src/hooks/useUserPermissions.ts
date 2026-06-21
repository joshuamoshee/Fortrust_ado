"use client";

import { useState, useEffect } from "react";

/**
 * Permission flags returned from the backend.
 * Mirrors the dict returned by GET /api/me/permissions.
 */
export interface UserPermissions {
  role: string;
  is_master_admin: boolean;
  is_manager: boolean;
  is_solo: boolean;

  // Navigation
  can_view_main_dashboard: boolean;
  can_view_student_database: boolean;
  can_view_archived_analytics: boolean;
  can_view_agent_management: boolean;
  can_view_marketing: boolean;
  can_view_budget_roi: boolean;
  can_view_strategy_intel: boolean;
  can_view_broadcast_hub: boolean;

  // Student actions
  can_create_student: boolean;
  can_reassign_students: boolean;
  can_multi_assign: boolean;
  can_archive_students_in_team: boolean;
  can_restore_archived: boolean;
  can_change_pipeline_status: boolean;

  // Agent management
  can_create_agent: boolean;
  can_edit_team_agents: boolean;
  can_archive_agents: boolean;
  can_delete_agents_permanent: boolean;
  can_change_agent_roles: boolean;
  can_set_agent_capacity: boolean;

  // System
  can_upload_sop_template: boolean;
  can_download_sop_template: boolean;
  can_edit_institution_partners: boolean;
  can_edit_commission_structure: boolean;
  can_view_all_audit_logs: boolean;
  can_view_team_audit_logs: boolean;
  can_view_others_bank_details: boolean;
}

const DEFAULT_PERMS: UserPermissions = {
  role: "",
  is_master_admin: false,
  is_manager: false,
  is_solo: false,
  can_view_main_dashboard: false,
  can_view_student_database: false,
  can_view_archived_analytics: false,
  can_view_agent_management: false,
  can_view_marketing: false,
  can_view_budget_roi: false,
  can_view_strategy_intel: true, // accessible to all by default
  can_view_broadcast_hub: false,
  can_create_student: true,
  can_reassign_students: false,
  can_multi_assign: false,
  can_archive_students_in_team: false,
  can_restore_archived: false,
  can_change_pipeline_status: true,
  can_create_agent: false,
  can_edit_team_agents: false,
  can_archive_agents: false,
  can_delete_agents_permanent: false,
  can_change_agent_roles: false,
  can_set_agent_capacity: false,
  can_upload_sop_template: false,
  can_download_sop_template: true,
  can_edit_institution_partners: false,
  can_edit_commission_structure: false,
  can_view_all_audit_logs: false,
  can_view_team_audit_logs: false,
  can_view_others_bank_details: false,
};

let cachedPerms: UserPermissions | null = null;
let cachePromise: Promise<UserPermissions> | null = null;

/**
 * Fetch permissions from /api/me/permissions.
 * Cached for the lifetime of the SPA session — refresh by calling resetPermissionsCache().
 */
async function fetchPermissions(): Promise<UserPermissions> {
  if (cachedPerms) return cachedPerms;
  if (cachePromise) return cachePromise;

cachePromise = (async (): Promise<UserPermissions> => {
    try {
      const token = localStorage.getItem("fortrust_token");
      if (!token) return DEFAULT_PERMS;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/me/permissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        console.warn("Failed to fetch permissions, using defaults");
        return DEFAULT_PERMS;
      }

      const data = await res.json();
      if (data.status === "success" && data.data) {
        const merged: UserPermissions = { ...DEFAULT_PERMS, ...data.data };
        cachedPerms = merged;
        return merged;
      }
    } catch (e) {
      console.error("Error fetching permissions:", e);
    }
    return DEFAULT_PERMS;
  })();

  return cachePromise;
}

/**
 * Clears the cached permissions (call on logout or role change).
 */
export function resetPermissionsCache() {
  cachedPerms = null;
  cachePromise = null;
}

/**
 * React hook that returns the current user's permissions.
 * 
 * Usage:
 *   const { perms, loading } = useUserPermissions();
 *   if (perms.can_view_archived_analytics) { ... }
 * 
 * Loading state lasts until first fetch completes — but `perms` is always
 * valid (returns DEFAULT_PERMS = all-false while loading).
 */
export function useUserPermissions(): { perms: UserPermissions; loading: boolean } {
  const [perms, setPerms] = useState<UserPermissions>(cachedPerms || DEFAULT_PERMS);
  const [loading, setLoading] = useState(!cachedPerms);

  useEffect(() => {
    let mounted = true;
    fetchPermissions().then(result => {
      if (mounted) {
        setPerms(result);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  return { perms, loading };
}

/**
 * Per-student permission helper.
 * Returns true if current user is in the student's assignees list OR is Master Admin/Manager.
 */
export function canAccessStudent(
  student: { assignee?: string; assignees?: string[] | string },
  currentUserName: string,
  perms: UserPermissions
): boolean {
  if (perms.is_master_admin || perms.is_manager) return true;
  if (!currentUserName) return false;

  // Check legacy assignee
  if (student.assignee === currentUserName) return true;

  // Parse assignees array
  let arr: string[] = [];
  if (Array.isArray(student.assignees)) {
    arr = student.assignees;
  } else if (typeof student.assignees === "string") {
    try {
      arr = JSON.parse(student.assignees) || [];
    } catch {
      arr = [];
    }
  }
  return arr.includes(currentUserName);
}